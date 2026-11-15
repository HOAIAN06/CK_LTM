/**
 * Kiểu dữ liệu của Đấu hạng 1v1 phía renderer.
 *
 * Không có kiểu nào ở đây quyết định đúng/sai, điểm hay thời hạn: tất cả đều được
 * máy chủ gửi xuống trong `QUESTION` / `ANSWER_RESULT` / `SCORE_UPDATE` / `GAME_OVER`.
 * Client chỉ giữ trạng thái hiển thị và mốc thời gian **suy ra từ duration của server**
 * để vẽ countdown (xem `docs/ranked.md` §5.1: client chỉ hiển thị, server quyết định).
 */
import type { AnswerResult, GameOver, QuestionData, Scores } from '@shared/protocol'

/** Hai thời lượng duy nhất `GameRoom` chấp nhận (`THREE_MINUTES` / `FIVE_MINUTES`). */
export const RANKED_DURATIONS = [180, 300] as const

export type RankedDuration = (typeof RANKED_DURATIONS)[number]

export function isRankedDuration(value: unknown): value is RankedDuration {
  return value === 180 || value === 300
}

/** Bối cảnh một trận đã ghép, lấy từ `MATCH_FOUND` (không suy diễn thêm). */
export interface MatchContext {
  roomId: string
  opponent: string
  durationSeconds: RankedDuration
  /** Epoch ms lúc client nhận `MATCH_FOUND`; chỉ dùng để hiển thị. */
  startedAt: number
}

export type BattlePhase =
  /** Đã ghép trận, chưa có câu hỏi đầu tiên. */
  | 'waiting'
  /** Đang nhận đáp án cho câu hiện tại. */
  | 'question'
  /** Đã gửi đáp án (hoặc hết giờ cục bộ) — chờ máy chủ chốt. */
  | 'locked'
  /** Máy chủ đã trả `ANSWER_RESULT` cho câu hiện tại. */
  | 'revealed'
  /** `GAME_OVER` đã tới (có hoặc không có kết quả lưu được). */
  | 'finished'
  /** Mất kết nối giữa trận; không tự tạo kết quả. */
  | 'forfeit'

/** Bản sao kết quả máy chủ trả trong `ANSWER_RESULT`; client không tự tính. */
export interface AnswerOutcome {
  correct: boolean
  chosenChoiceId: number | null
  correctChoiceId: number
  scoreAwarded: number
}

export interface BattleState {
  roomId: string
  phase: BattlePhase
  /** `attempt` của câu hiện tại (0 khi chưa có câu nào). */
  attempt: number
  question: QuestionData | null
  /** `attempt` mà client đã khoá để gửi `ANSWER`; `null` khi chưa gửi. */
  answeredAttempt: number | null
  /** Đáp án người chơi đã chọn (hoặc `null` khi hết giờ), chỉ để tô màu. */
  selectedChoiceId: number | null
  outcome: AnswerOutcome | null
  score: Scores
  /** Số giây server cấp cho câu hiện tại (dùng vẽ vòng tròn). */
  questionTotalSeconds: number
  /** Mốc tuyệt đối (epoch ms) do client tính từ duration của server — chỉ hiển thị. */
  questionDeadlineAt: number | null
  matchDeadlineAt: number | null
  matchTotalSeconds: number
  /** Khoá vì countdown cục bộ đã về 0; chưa có kết quả. */
  timedOut: boolean
  finalResult: GameOver | null
  /** Thông điệp lỗi giao thức gần nhất; hiển thị nhưng không chặn câu tiếp theo. */
  notice: string | null
}

export type BattleAction =
  | { type: 'question'; question: QuestionData; now: number }
  | { type: 'choose'; choiceId: number }
  | { type: 'answerResult'; result: AnswerResult }
  | { type: 'score'; scores: Scores }
  | { type: 'timeout'; now: number }
  | { type: 'gameOver'; gameOver: GameOver }
  /** Trận bị dừng phía máy chủ (ví dụ `MATCH_ERROR: DATABASE_ERROR`): không có kết quả. */
  | { type: 'aborted'; message: string }
  | { type: 'forfeit'; message: string }

/* -------------------------------------------------------------------------- */
/* Tìm trận                                                                    */
/* -------------------------------------------------------------------------- */

export type SearchPhase = 'idle' | 'sending' | 'waiting' | 'cancelling'

export interface SearchState {
  phase: SearchPhase
  duration: RankedDuration
  /** Epoch ms lúc bắt đầu chờ; `null` khi chưa gửi yêu cầu. */
  startedAt: number | null
  /** Mã lỗi `MATCH_ERROR` gần nhất; `null` khi không có. */
  errorCode: string | null
  /** Thông báo ngắn (huỷ thành công…) — không phải lỗi. */
  notice: string | null
}

export type SearchAction =
  | { type: 'duration'; duration: RankedDuration }
  | { type: 'requested'; now: number }
  | { type: 'queued'; now: number }
  | { type: 'failed'; code: string }
  | { type: 'cancelRequested' }
  | { type: 'cancelled' }
  | { type: 'matched' }
  | { type: 'clear' }

/* -------------------------------------------------------------------------- */
/* Kết quả trận                                                                */
/* -------------------------------------------------------------------------- */

export interface MatchResult {
  /** `WIN | LOSE | DRAW` nguyên văn từ `GAME_OVER`. */
  result: string
  myScore: number
  opponentScore: number
  opponent: string
  durationSeconds: RankedDuration
  finishedAt: number
}
