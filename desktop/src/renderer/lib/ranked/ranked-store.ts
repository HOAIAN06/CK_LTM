/**
 * Phiên Đấu hạng 1v1 phía renderer.
 *
 * Vì sao trạng thái trận nằm ở store chứ không ở route: máy chủ gửi `MATCH_FOUND` rồi
 * **ngay sau đó** là `QUESTION` (docs/ranked.md §4). Nếu trận chỉ sống trong component
 * của `/battle`, câu hỏi đầu tiên có thể tới đúng lúc route chưa mount và bị mất.
 *
 * Kênh message được mở **một lần** ở module scope, nên:
 * - `MATCH_FOUND` từ lời mời bạn bè được nhận ở bất kỳ màn hình nào (`restoreTarget` để
 *   shell đưa người chơi vào `/battle`);
 * - người chơi rời màn hình rồi quay lại vẫn thấy trận đang diễn ra.
 *
 * Store **không** tính điểm, không kết luận thắng/thua. Nó chỉ giữ bối cảnh trận + state do
 * reducer thuần sinh ra, gửi `ANSWER` đúng một lần cho mỗi câu, và ghi lại `GAME_OVER`.
 */
import { create } from 'zustand'
import type { OutboundMessage, ServerMessage } from '@shared/protocol'
import { useConnectionStore, subscribeServerMessages } from '../connection-store'
import { useSessionStore } from '../session-store'
import { describeErrorCode } from '../error-codes'
import { battleReducer, createBattleState } from './reducer'
import { isRankedDuration } from './types'
import type { BattleState, MatchContext, MatchResult } from './types'

export interface RankedState {
  match: MatchContext | null
  battle: BattleState | null
  /** Kết quả `GAME_OVER` gần nhất; `/result` đọc từ đây. */
  result: MatchResult | null
  /** Shell dùng để điều hướng khi trận đến từ lời mời (không qua màn tìm trận). */
  restoreTarget: 'battle' | null

  /** `MATCH_FOUND`: dựng state trận (gọi từ message handler hoặc test). */
  startMatch: (match: MatchContext, now?: number) => void
  /** Nạp một message máy chủ vào trận đang mở; message ngoài trận bị bỏ qua. */
  applyServerMessage: (message: ServerMessage, now?: number) => void
  /** Chọn đáp án: khoá state rồi gửi đúng một frame `ANSWER`. */
  choose: (choiceId: number) => void
  /** Countdown cục bộ về 0: khoá lựa chọn, chờ server. */
  noteTimeout: (now?: number) => void
  /** Mất kết nối: không tạo kết quả. */
  forfeit: (message?: string) => void
  clearRestoreTarget: () => void
  clearResult: () => void
  resetRanked: () => void
}

let channelReady = false
let sessionWatched = false

function ensureChannel(): void {
  if (channelReady) return
  channelReady = true
  subscribeServerMessages((message) => {
    useRankedStore.getState().applyServerMessage(message, Date.now())
  })
}

/** Kết thúc phiên (đăng xuất hoặc mất kết nối) thì bỏ trận đang giữ. */
function watchSession(): void {
  if (sessionWatched) return
  sessionWatched = true
  useSessionStore.subscribe((state) => {
    if (state.player !== null) return
    const current = useRankedStore.getState()
    if (current.match || current.battle || current.result) {
      useRankedStore.setState({ match: null, battle: null, result: null, restoreTarget: null })
    }
  })
}

const EMPTY = { match: null, battle: null, result: null, restoreTarget: null } as const

export const useRankedStore = create<RankedState>()((set, get) => ({
  match: null,
  battle: null,
  result: null,
  restoreTarget: null,

  startMatch: (match, now = Date.now()) => {
    set({ match, battle: createBattleState(match, now), result: null })
  },

  applyServerMessage: (message, now = Date.now()) => {
    const { battle, match } = get()

    // `MATCH_FOUND` mở trận mới — đến từ hàng chờ hoặc từ lời mời bạn bè.
    if (message.type === 'MATCH_FOUND') {
      const found = message.payload
      if (typeof found.roomId !== 'string' || found.roomId.trim().length === 0) return
      if (typeof found.opponent !== 'string' || found.opponent.trim().length === 0) return
      if (!isRankedDuration(found.durationSeconds)) return
      set({
        match: {
          roomId: found.roomId,
          opponent: found.opponent,
          durationSeconds: found.durationSeconds,
          startedAt: now
        },
        battle: createBattleState(
          {
            roomId: found.roomId,
            opponent: found.opponent,
            durationSeconds: found.durationSeconds,
            startedAt: now
          },
          now
        ),
        result: null,
        restoreTarget: 'battle'
      })
      return
    }

    if (!battle || !match) return

    switch (message.type) {
      case 'QUESTION': {
        set({ battle: battleReducer(battle, { type: 'question', question: message.payload, now }) })
        break
      }
      case 'ANSWER_RESULT': {
        set({ battle: battleReducer(battle, { type: 'answerResult', result: message.payload }) })
        break
      }
      case 'SCORE_UPDATE': {
        set({ battle: battleReducer(battle, { type: 'score', scores: message.payload }) })
        break
      }
      case 'GAME_OVER': {
        const next = battleReducer(battle, { type: 'gameOver', gameOver: message.payload })
        if (next.phase !== 'finished' || next.finalResult === null) return
        set({
          battle: next,
          result: {
            result: message.payload.result,
            myScore: message.payload.myScore,
            opponentScore: message.payload.opponentScore,
            opponent: match.opponent,
            durationSeconds: match.durationSeconds,
            finishedAt: now
          }
        })
        break
      }
      case 'MATCH_ERROR': {
        // Trong trận, đây là lỗi phía server (ví dụ DATABASE_ERROR): trận dừng và
        // **không** có GAME_OVER — không được tự tạo kết quả.
        const copy = describeErrorCode(message.payload)
        set({
          battle: battleReducer(battle, {
            type: 'aborted',
            message: copy.description ? `${copy.title} ${copy.description}` : copy.title
          })
        })
        break
      }
      default:
        break
    }
  },

  choose: (choiceId) => {
    const { battle } = get()
    if (!battle || !battle.question) return
    if (battle.phase !== 'question' || battle.answeredAttempt !== null) return

    const next = battleReducer(battle, { type: 'choose', choiceId })
    if (next === battle) return
    set({ battle: next })

    const question = battle.question
    const frame: OutboundMessage = {
      type: 'ANSWER',
      payload: {
        sessionId: question.sessionId,
        attempt: question.attempt,
        questionId: question.questionId,
        choiceId
      }
    }

    void useConnectionStore.getState().send(frame).then((result) => {
      if (result.ok) return
      const current = useRankedStore.getState().battle
      if (!current) return
      const copy = describeErrorCode(result.error)
      useRankedStore.setState({
        battle: battleReducer(current, {
          type: 'aborted',
          message: copy.description ? `${copy.title} ${copy.description}` : copy.title
        })
      })
    })
  },

  noteTimeout: (now = Date.now()) => {
    const { battle } = get()
    if (!battle) return
    const next = battleReducer(battle, { type: 'timeout', now })
    if (next !== battle) set({ battle: next })
  },

  forfeit: (message) => {
    const { battle } = get()
    if (!battle) return
    const next = battleReducer(battle, {
      type: 'forfeit',
      message: message ?? 'Mất kết nối tới máy chủ. Trận đấu kết thúc theo luật Ranked.'
    })
    if (next !== battle) set({ battle: next })
  },

  clearRestoreTarget: () => set({ restoreTarget: null }),

  clearResult: () => set({ result: null }),

  resetRanked: () => set({ ...EMPTY })
}))

ensureChannel()
watchSession()

/** Chỉ dùng cho test: xoá state (kênh message vẫn mở như ở app thật). */
export function resetRankedStore(): void {
  useRankedStore.setState({ ...EMPTY })
}
