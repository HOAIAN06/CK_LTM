/**
 * Phiên Quiz Room phía renderer.
 *
 * Kiến trúc giống Ranked (`lib/ranked/ranked-store.ts`): store giữ bối cảnh phòng và đẩy
 * message của máy chủ qua reducer thuần. Khác ở hai điểm:
 *
 * 1. **Kênh luôn mở.** `QUIZ_REJOINED` được server gửi ngay sau `LOGIN_OK`, trước khi bất
 *    kỳ route Quiz nào mount; nếu chỉ đăng ký listener khi vào màn hình Quiz thì message
 *    đó sẽ mất. Vì vậy listener được đăng ký một lần ở module scope.
 * 2. **Có lobby.** `QUIZ_ROOM_CREATED` / `QUIZ_LOBBY_UPDATE` / `QUIZ_REJOINED` đều đưa
 *    phòng vào cùng một state, còn `restoreTarget` do layout tiêu thụ để điều hướng.
 *
 * Store không tính điểm 500–1000, không quyết định đúng/sai, không tự kết luận timeout.
 */
import { create } from 'zustand'
import type { NqResult } from '@shared/ipc'
import type { OutboundMessage, ServerMessage } from '@shared/protocol'
import { describeErrorCode, UI_ERROR } from '../error-codes'
import { useConnectionStore, subscribeServerMessages } from '../connection-store'
import { useSessionStore } from '../session-store'
import { RESPONSE_TIMEOUT_MS, createWatchdog } from '../watchdog'
import { cancelReasonNotice } from './lobby'
import { createQuizBattleState, quizBattleReducer } from './reducer'
import type {
  QuizBattleState,
  QuizLeaderboardData,
  QuizLobbyData,
  QuizNotice,
  QuizRestoreTarget,
  QuizRoomContext,
  QuizRoomStarted
} from './types'

/** Chờ `QUIZ_REJOINED` sau khi đăng nhập lại; quá hạn thì coi như phòng đã mất. */
export const REJOIN_TIMEOUT_MS = 3_000

export interface QuizState {
  lobby: QuizLobbyData | null
  started: QuizRoomContext | null
  battle: QuizBattleState | null
  leaderboard: QuizLeaderboardData | null
  /** `QUIZ_ROOM_FINISHED` — bảng xếp hạng cuối cùng. */
  finalBoard: QuizLeaderboardData | null
  /** Thông báo một lần cho màn hình menu (lỗi, hủy phòng, phòng đã mất…). */
  notice: QuizNotice | null
  /** Layout tiêu thụ để đưa người chơi về lobby/battle sau khi khôi phục phiên. */
  restoreTarget: QuizRestoreTarget | null
  createPending: boolean
  joinPending: boolean
  startPending: boolean
  /** Đang chờ máy chủ khôi phục phòng sau khi mất kết nối. */
  rejoinPending: boolean

  createRoom: (input: {
    quizSetId: number
    durationMinutes: number
    hostPlays: boolean
    proctoringEnabled: boolean
  }) => Promise<NqResult>
  joinRoom: (pin: string) => Promise<NqResult>
  startRoom: () => Promise<NqResult>
  leaveRoom: () => Promise<NqResult>
  cancelRoom: () => Promise<NqResult>
  /** Chọn đáp án: khoá state rồi gửi đúng một frame `QUIZ_ANSWER`. */
  choose: (choiceId: number) => void
  noteTimeout: (now?: number) => void
  clearNotice: () => void
  clearRestoreTarget: () => void
  applyServerMessage: (message: ServerMessage, now?: number) => void
  resetQuiz: () => void
}

const createRoomWatchdog = createWatchdog()
const joinRoomWatchdog = createWatchdog()
const startRoomWatchdog = createWatchdog()

let rejoinTimer: ReturnType<typeof setTimeout> | null = null
/** Người chơi tự bấm "Hủy phòng" → thông báo khác với bị host khác hủy. */
let selfCancelling = false
let channelReady = false
let connectionWatched = false

function stopRejoinTimer(): void {
  if (rejoinTimer !== null) {
    clearTimeout(rejoinTimer)
    rejoinTimer = null
  }
}

function clearAllWatchdogs(): void {
  createRoomWatchdog.clear()
  joinRoomWatchdog.clear()
  startRoomWatchdog.clear()
}

function noticeFromCode(code: string | null | undefined): QuizNotice {
  const copy = describeErrorCode(code)
  return { tone: 'danger', title: copy.title, description: copy.description }
}

function errorNotice(result: NqResult): QuizNotice {
  return noticeFromCode(result.error ?? 'SEND_FAILED')
}

function ensureChannel(): void {
  if (channelReady) return
  channelReady = true
  subscribeServerMessages((message) => {
    useQuizStore.getState().applyServerMessage(message, Date.now())
  })
}

/**
 * Mất kết nối ≠ đăng xuất:
 * - mất kết nối khi đang ở trong phòng → giữ state và chờ `QUIZ_REJOINED`;
 * - đăng xuất (player = null mà không có `connectionLost`) → bỏ toàn bộ phòng.
 */
function watchConnection(): void {
  if (connectionWatched) return
  connectionWatched = true
  useConnectionStore.subscribe((state, previous) => {
    if (!previous.connectionLost && state.connectionLost) {
      const quiz = useQuizStore.getState()
      if (quiz.lobby || quiz.started || quiz.battle) {
        useQuizStore.setState({ rejoinPending: true })
      }
      return
    }
    if (
      !state.connectionLost &&
      useSessionStore.getState().player === null &&
      !useQuizStore.getState().rejoinPending
    ) {
      stopRejoinTimer()
      useQuizStore.getState().resetQuiz()
    }
  })
}

const EMPTY = {
  lobby: null,
  started: null,
  battle: null,
  leaderboard: null,
  finalBoard: null,
  createPending: false,
  joinPending: false,
  startPending: false,
  restoreTarget: null
} as const

export const useQuizStore = create<QuizState>()((set, get) => ({
  ...EMPTY,
  notice: null,
  rejoinPending: false,

  createRoom: async (input) => {
    set({ createPending: true, notice: null })
    const result = await useConnectionStore.getState().send({
      type: 'QUIZ_ROOM_CREATE',
      payload: {
        quizSetId: input.quizSetId,
        durationMinutes: input.durationMinutes,
        hostPlays: input.hostPlays,
        proctoringEnabled: input.proctoringEnabled
      }
    })
    if (!result.ok) {
      createRoomWatchdog.clear()
      set({ createPending: false, notice: errorNotice(result) })
      return result
    }
    if (get().createPending) {
      createRoomWatchdog.arm(RESPONSE_TIMEOUT_MS, () => {
        set({ createPending: false, notice: noticeFromCode(UI_ERROR.requestTimeout) })
      })
    }
    return result
  },

  joinRoom: async (pin) => {
    set({ joinPending: true, notice: null })
    const result = await useConnectionStore.getState().send({
      type: 'QUIZ_ROOM_JOIN',
      payload: { pin }
    })
    if (!result.ok) {
      joinRoomWatchdog.clear()
      set({ joinPending: false, notice: errorNotice(result) })
      return result
    }
    if (get().joinPending) {
      joinRoomWatchdog.arm(RESPONSE_TIMEOUT_MS, () => {
        set({ joinPending: false, notice: noticeFromCode(UI_ERROR.requestTimeout) })
      })
    }
    return result
  },

  startRoom: async () => {
    if (!get().started && !get().lobby) return { ok: false, error: 'NOT_IN_ROOM' }
    set({ startPending: true, notice: null })
    const result = await useConnectionStore.getState().send({ type: 'QUIZ_ROOM_START', payload: '' })
    if (!result.ok) {
      startRoomWatchdog.clear()
      set({ startPending: false, notice: errorNotice(result) })
      return result
    }
    if (get().startPending) {
      startRoomWatchdog.arm(RESPONSE_TIMEOUT_MS, () => {
        set({ startPending: false, notice: noticeFromCode(UI_ERROR.requestTimeout) })
      })
    }
    return result
  },

  leaveRoom: async () => {
    const result = await useConnectionStore.getState().send({ type: 'QUIZ_ROOM_LEAVE', payload: '' })
    clearAllWatchdogs()
    stopRejoinTimer()
    set({
      ...EMPTY,
      notice: { tone: 'info', title: 'Bạn đã rời phòng', description: 'Bạn có thể tạo hoặc vào phòng khác.' }
    })
    return result
  },

  cancelRoom: async () => {
    selfCancelling = true
    set({ ...EMPTY, notice: null })
    const result = await useConnectionStore.getState().send({ type: 'QUIZ_ROOM_CANCEL', payload: '' })
    if (!result.ok) {
      selfCancelling = false
      set({ notice: errorNotice(result) })
    }
    return result
  },

  choose: (choiceId) => {
    const { battle } = get()
    if (!battle || !battle.question) return
    if (battle.phase !== 'question' || battle.answeredAttempt !== null) return

    const next = quizBattleReducer(battle, { type: 'choose', choiceId })
    if (next === battle) return
    set({ battle: next })

    const question = battle.question
    const frame: OutboundMessage = {
      type: 'QUIZ_ANSWER',
      payload: {
        sessionId: question.sessionId,
        attempt: question.attempt,
        questionId: question.questionId,
        choiceId
      }
    }

    void useConnectionStore.getState().send(frame).then((result) => {
      if (result.ok) return
      const current = useQuizStore.getState().battle
      if (!current) return
      const copy = describeErrorCode(result.error)
      useQuizStore.setState({
        battle: quizBattleReducer(current, {
          type: 'notice',
          message: copy.description ? `${copy.title} ${copy.description}` : copy.title
        })
      })
    })
  },

  noteTimeout: (now = Date.now()) => {
    const { battle } = get()
    if (!battle) return
    const next = quizBattleReducer(battle, { type: 'timeout', now })
    if (next !== battle) set({ battle: next })
  },

  clearNotice: () => set({ notice: null }),

  clearRestoreTarget: () => set({ restoreTarget: null }),

  applyServerMessage: (message, now = Date.now()) => {
    switch (message.type) {
      case 'QUIZ_ROOM_CREATED': {
        createRoomWatchdog.clear()
        set({
          lobby: message.payload.lobby,
          started: null,
          battle: null,
          createPending: false,
          notice: null,
          // Vừa có phòng (tạo mới, hoặc được mời) → shell đưa thẳng vào lobby.
          restoreTarget: 'lobby'
        })
        break
      }

      case 'QUIZ_LOBBY_UPDATE': {
        const lobby = message.payload
        joinRoomWatchdog.clear()
        // Lần đầu nhận lobby (join qua PIN hoặc qua lời mời) thì shell nên mở sảnh chờ;
        // các cập nhật sau đó (presence, camera) chỉ thay dữ liệu, không điều hướng lại.
        const fresh = get().lobby === null && get().started === null
        set({ lobby, joinPending: false, ...(fresh ? { restoreTarget: 'lobby' as const } : {}) })
        break
      }

      case 'QUIZ_ROOM_START': {
        const started: QuizRoomStarted = message.payload
        startRoomWatchdog.clear()
        set({
          started,
          battle: createQuizBattleState(started.pin, now, started.durationSeconds),
          leaderboard: null,
          finalBoard: null,
          startPending: false,
          notice: null
        })
        break
      }

      case 'QUIZ_REJOINED': {
        stopRejoinTimer()
        const data = message.payload
        const pin = data.lobby.pin
        const restore: QuizRestoreTarget = data.running ? 'battle' : 'lobby'
        set({
          lobby: data.lobby,
          started: {
            pin,
            title: data.lobby.title,
            durationSeconds: data.running ? Math.max(1, data.remainingSeconds) : 0,
            playing: data.playing,
            host: data.lobby.currentUserHost,
            proctoringEnabled: data.proctoringEnabled
          },
          battle: data.running ? createQuizBattleState(pin, now, data.remainingSeconds) : null,
          leaderboard: null,
          finalBoard: null,
          restoreTarget: restore,
          rejoinPending: false,
          createPending: false,
          joinPending: false,
          startPending: false,
          notice: null
        })
        break
      }

      case 'QUIZ_QUESTION': {
        const { battle } = get()
        if (!battle) return
        set({ battle: quizBattleReducer(battle, { type: 'question', question: message.payload, now }) })
        break
      }

      case 'QUIZ_ANSWER_RESULT': {
        const { battle } = get()
        if (!battle) return
        set({ battle: quizBattleReducer(battle, { type: 'answerResult', result: message.payload }) })
        break
      }

      case 'QUIZ_LEADERBOARD': {
        set({ leaderboard: message.payload })
        break
      }

      case 'QUIZ_ROOM_FINISHED': {
        const { battle } = get()
        set({
          finalBoard: message.payload,
          leaderboard: message.payload,
          battle: battle ? quizBattleReducer(battle, { type: 'finished' }) : battle,
          restoreTarget: null
        })
        break
      }

      case 'QUIZ_ROOM_CANCEL': {
        clearAllWatchdogs()
        stopRejoinTimer()
        const notice = cancelReasonNotice(message.payload, selfCancelling)
        selfCancelling = false
        set({ ...EMPTY, rejoinPending: false, notice })
        break
      }

      case 'QUIZ_ERROR': {
        clearAllWatchdogs()
        const notice = noticeFromCode(message.payload)
        const current = get()
        const battle = current.battle
        const nextBattle =
          battle && battle.phase !== 'finished' && battle.phase !== 'cancelled'
            ? quizBattleReducer(battle, {
                type: 'notice',
                message: notice.description ?? notice.title
              })
            : battle
        set({
          createPending: false,
          joinPending: false,
          startPending: false,
          notice,
          battle: nextBattle
        })
        break
      }

      case 'LOGIN_OK': {
        if (!get().rejoinPending) return
        stopRejoinTimer()
        rejoinTimer = setTimeout(() => {
          rejoinTimer = null
          if (!useQuizStore.getState().rejoinPending) return
          useQuizStore.setState({
            ...EMPTY,
            rejoinPending: false,
            notice: {
              tone: 'warning',
              title: 'Phòng Quiz trước đó đã kết thúc',
              description:
                'Máy chủ không còn phòng cho tài khoản này, nên bạn ở lại màn hình Phòng Quiz để tạo hoặc vào phòng mới.'
            }
          })
        }, REJOIN_TIMEOUT_MS)
        break
      }

      default:
        break
    }
  },

  resetQuiz: () => {
    clearAllWatchdogs()
    stopRejoinTimer()
    selfCancelling = false
    set({ ...EMPTY, notice: null, rejoinPending: false })
  }
}))

ensureChannel()
watchConnection()

/** Chỉ dùng cho test: xoá state, timer và cờ nội bộ (kênh message vẫn mở). */
export function resetQuizStore(): void {
  clearAllWatchdogs()
  stopRejoinTimer()
  selfCancelling = false
  useQuizStore.setState({ ...EMPTY, notice: null, rejoinPending: false })
}
