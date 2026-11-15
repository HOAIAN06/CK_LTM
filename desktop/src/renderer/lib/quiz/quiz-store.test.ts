import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NqBridge } from '@shared/ipc'
import { createIdleConnectionStatus } from '@shared/ipc'
import type {
  PlayerStats,
  QuizAnswerResult,
  QuizLeaderboardData,
  QuizLobbyData,
  QuizQuestionData
} from '@shared/protocol'
import { setBridgeOverride } from '../bridge'
import { resetConnectionStore, useConnectionStore } from '../connection-store'
import { resetSessionStore, useSessionStore } from '../session-store'
import { resetQuizStore, useQuizStore } from './quiz-store'

const PLAYER: PlayerStats = {
  id: 7,
  username: 'minh_anh',
  wins: 0,
  losses: 0,
  draws: 0,
  totalScore: 0,
  questionsAnswered: 0,
  correctAnswers: 0
}

const PIN = '123456'

function lobby(overrides: Partial<QuizLobbyData> = {}): QuizLobbyData {
  return {
    pin: PIN,
    title: 'Luyện N5',
    hostUsername: 'minh_anh',
    currentUserHost: true,
    hostPlays: true,
    proctoringEnabled: false,
    started: false,
    playerCount: 2,
    members: [
      {
        userId: 7,
        username: 'minh_anh',
        host: true,
        playing: true,
        connected: true,
        cameraStatus: 'NOT_REQUIRED',
        calibrationStatus: 'NOT_REQUIRED',
        warningCount: 0
      },
      {
        userId: 8,
        username: 'binh_tran',
        host: false,
        playing: true,
        connected: true,
        cameraStatus: 'NOT_REQUIRED',
        calibrationStatus: 'NOT_REQUIRED',
        warningCount: 0
      }
    ],
    ...overrides
  }
}

function question(overrides: Partial<QuizQuestionData> = {}): QuizQuestionData {
  return {
    sessionId: PIN,
    pin: PIN,
    attempt: 1,
    questionId: 42,
    content: 'Câu hỏi mẫu?',
    choices: [
      { choiceId: 101, content: 'A', position: 1 },
      { choiceId: 102, content: 'B', position: 2 },
      { choiceId: 103, content: 'C', position: 3 },
      { choiceId: 104, content: 'D', position: 4 }
    ],
    questionDurationSeconds: 30,
    roomRemainingSeconds: 300,
    ...overrides
  }
}

function answerResult(overrides: Partial<QuizAnswerResult> = {}): QuizAnswerResult {
  return {
    sessionId: PIN,
    attempt: 1,
    questionId: 42,
    correct: true,
    chosenChoiceId: 101,
    correctChoiceId: 101,
    scoreAwarded: 750,
    totalScore: 750,
    ...overrides
  }
}

function leaderboard(finished = false): QuizLeaderboardData {
  return {
    pin: PIN,
    finished,
    entries: [
      { rank: 1, userId: 8, username: 'binh_tran', score: 900, correctAnswers: 1, connected: true },
      { rank: 2, userId: 7, username: 'minh_anh', score: 750, correctAnswers: 1, connected: true }
    ]
  }
}

function createFakeBridge(): NqBridge {
  return {
    connect: vi.fn(() => Promise.resolve({ ok: true })),
    disconnect: vi.fn(() => Promise.resolve()),
    send: vi.fn(() => Promise.resolve({ ok: true })),
    getStatus: vi.fn(() => Promise.resolve(createIdleConnectionStatus())),
    onEvent: vi.fn(() => () => undefined),
    app: { version: 'test', platform: 'linux', packaged: false }
  }
}

let bridge: NqBridge

beforeEach(() => {
  resetConnectionStore()
  resetSessionStore()
  resetQuizStore()
  bridge = createFakeBridge()
  setBridgeOverride(bridge)
  useSessionStore.setState({ player: PLAYER })
})

afterEach(() => {
  resetQuizStore()
  resetSessionStore()
  setBridgeOverride(null)
  vi.useRealTimers()
})

describe('quiz store — create / join / start', () => {
  it('creates a room and adopts the lobby sent by the server', async () => {
    await useQuizStore.getState().createRoom({
      quizSetId: 4,
      durationMinutes: 3,
      hostPlays: true,
      proctoringEnabled: false
    })

    expect(bridge.send).toHaveBeenCalledWith({
      type: 'QUIZ_ROOM_CREATE',
      payload: { quizSetId: 4, durationMinutes: 3, hostPlays: true, proctoringEnabled: false }
    })
    expect(useQuizStore.getState().createPending).toBe(true)

    useQuizStore.getState().applyServerMessage({
      type: 'QUIZ_ROOM_CREATED',
      payload: { lobby: lobby() }
    })

    expect(useQuizStore.getState().lobby?.pin).toBe(PIN)
    expect(useQuizStore.getState().createPending).toBe(false)
  })

  it('joins a room through QUIZ_LOBBY_UPDATE', async () => {
    await useQuizStore.getState().joinRoom(PIN)
    expect(bridge.send).toHaveBeenCalledWith({ type: 'QUIZ_ROOM_JOIN', payload: { pin: PIN } })
    expect(useQuizStore.getState().joinPending).toBe(true)

    useQuizStore.getState().applyServerMessage({ type: 'QUIZ_LOBBY_UPDATE', payload: lobby() })

    expect(useQuizStore.getState().lobby?.title).toBe('Luyện N5')
    expect(useQuizStore.getState().joinPending).toBe(false)
  })

  it('starts the room and opens the battle state', () => {
    useQuizStore.getState().applyServerMessage({ type: 'QUIZ_LOBBY_UPDATE', payload: lobby() })
    useQuizStore.getState().applyServerMessage({
      type: 'QUIZ_ROOM_START',
      payload: {
        pin: PIN,
        title: 'Luyện N5',
        durationSeconds: 180,
        playing: true,
        host: true,
        proctoringEnabled: false
      }
    })

    const state = useQuizStore.getState()
    expect(state.started?.pin).toBe(PIN)
    expect(state.battle?.phase).toBe('waiting')
    expect(state.battle?.roomRemainingSeconds).toBe(180)
  })

  it('reports create failures from QUIZ_ERROR and re-opens the form', async () => {
    await useQuizStore.getState().createRoom({
      quizSetId: 4,
      durationMinutes: 3,
      hostPlays: false,
      proctoringEnabled: true
    })
    useQuizStore.getState().applyServerMessage({
      type: 'QUIZ_ERROR',
      payload: 'PROCTORING_HOST_CANNOT_PLAY'
    })

    const state = useQuizStore.getState()
    expect(state.createPending).toBe(false)
    expect(state.notice?.tone).toBe('danger')
    expect(state.notice?.title).toBeTruthy()
  })
})

describe('quiz store — battle', () => {
  function startBattle(): void {
    useQuizStore.getState().applyServerMessage({ type: 'QUIZ_LOBBY_UPDATE', payload: lobby() })
    useQuizStore.getState().applyServerMessage({
      type: 'QUIZ_ROOM_START',
      payload: {
        pin: PIN,
        title: 'Luyện N5',
        durationSeconds: 300,
        playing: true,
        host: true,
        proctoringEnabled: false
      }
    })
    useQuizStore.getState().applyServerMessage({ type: 'QUIZ_QUESTION', payload: question() })
  }

  it('opens a question and sends exactly one QUIZ_ANSWER', () => {
    startBattle()
    expect(useQuizStore.getState().battle?.phase).toBe('question')

    useQuizStore.getState().choose(103)
    useQuizStore.getState().choose(101)

    expect(bridge.send).toHaveBeenCalledTimes(1)
    expect(bridge.send).toHaveBeenCalledWith({
      type: 'QUIZ_ANSWER',
      payload: { sessionId: PIN, attempt: 1, questionId: 42, choiceId: 103 }
    })
    expect(useQuizStore.getState().battle?.phase).toBe('locked')
  })

  it('stores the server verdict and the live leaderboard', () => {
    startBattle()
    useQuizStore.getState().choose(101)
    useQuizStore.getState().applyServerMessage({ type: 'QUIZ_ANSWER_RESULT', payload: answerResult() })
    useQuizStore.getState().applyServerMessage({ type: 'QUIZ_LEADERBOARD', payload: leaderboard() })

    const state = useQuizStore.getState()
    expect(state.battle?.phase).toBe('revealed')
    expect(state.battle?.totalScore).toBe(750)
    expect(state.leaderboard?.entries).toHaveLength(2)
    expect(state.leaderboard?.entries[0]?.rank).toBe(1)
  })

  it('finishes the room and keeps the final board', () => {
    startBattle()
    useQuizStore
      .getState()
      .applyServerMessage({ type: 'QUIZ_ROOM_FINISHED', payload: leaderboard(true) })

    const state = useQuizStore.getState()
    expect(state.battle?.phase).toBe('finished')
    expect(state.finalBoard?.finished).toBe(true)
    expect(state.leaderboard?.entries[0]?.username).toBe('binh_tran')
  })

  it('drops the room on QUIZ_ROOM_CANCEL and explains why', () => {
    startBattle()
    useQuizStore.getState().applyServerMessage({ type: 'QUIZ_ROOM_CANCEL', payload: 'HOST_CANCELLED' })

    const state = useQuizStore.getState()
    expect(state.lobby).toBeNull()
    expect(state.battle).toBeNull()
    expect(state.notice?.title).toContain('Chủ phòng')
  })

  it('uses a neutral notice when the host cancels their own room', async () => {
    startBattle()
    await useQuizStore.getState().cancelRoom()
    useQuizStore.getState().applyServerMessage({ type: 'QUIZ_ROOM_CANCEL', payload: 'HOST_CANCELLED' })

    expect(useQuizStore.getState().notice?.title).toBe('Bạn đã hủy phòng')
  })

  it('keeps a protocol error visible inside the battle without ending it', () => {
    startBattle()
    useQuizStore.getState().applyServerMessage({ type: 'QUIZ_ERROR', payload: 'NOT_IN_ROOM' })

    const state = useQuizStore.getState()
    expect(state.battle?.phase).toBe('question')
    expect(state.battle?.notice).toBeTruthy()
  })
})

describe('quiz store — reconnect', () => {
  it('restores the running battle from QUIZ_REJOINED', () => {
    useQuizStore.getState().applyServerMessage({
      type: 'QUIZ_REJOINED',
      payload: {
        lobby: lobby(),
        running: true,
        playing: true,
        proctoringEnabled: false,
        remainingSeconds: 120
      }
    })

    const state = useQuizStore.getState()
    expect(state.restoreTarget).toBe('battle')
    expect(state.battle?.phase).toBe('waiting')
    expect(state.battle?.roomRemainingSeconds).toBe(120)
    expect(state.started?.playing).toBe(true)
  })

  it('restores the lobby when the room has not started', () => {
    useQuizStore.getState().applyServerMessage({
      type: 'QUIZ_REJOINED',
      payload: {
        lobby: lobby(),
        running: false,
        playing: true,
        proctoringEnabled: false,
        remainingSeconds: 0
      }
    })

    expect(useQuizStore.getState().restoreTarget).toBe('lobby')
    expect(useQuizStore.getState().battle).toBeNull()
  })

  it('waits for the rejoin and reports a lost room after the timeout', async () => {
    vi.useFakeTimers()
    useQuizStore.getState().applyServerMessage({ type: 'QUIZ_LOBBY_UPDATE', payload: lobby() })

    // Mất kết nối khi đang trong phòng: giữ state và chờ khôi phục.
    useConnectionStore.setState({ connectionLost: true })
    expect(useQuizStore.getState().rejoinPending).toBe(true)

    useQuizStore.getState().applyServerMessage({ type: 'LOGIN_OK', payload: PLAYER })
    await vi.advanceTimersByTimeAsync(3_000)

    const state = useQuizStore.getState()
    expect(state.rejoinPending).toBe(false)
    expect(state.lobby).toBeNull()
    expect(state.notice?.title).toContain('đã kết thúc')
  })

  it('clears everything on explicit sign-out', () => {
    useQuizStore.getState().applyServerMessage({ type: 'QUIZ_LOBBY_UPDATE', payload: lobby() })

    // Đúng thứ tự của `signOut`: xoá phiên trước, rồi cập nhật trạng thái kết nối.
    useSessionStore.getState().clear()
    useConnectionStore.setState({ connectionLost: false })

    expect(useQuizStore.getState().lobby).toBeNull()
  })
})
