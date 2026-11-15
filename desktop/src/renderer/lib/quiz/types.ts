/**
 * Kiểu dữ liệu của Quiz Room phía renderer.
 *
 * Quiz Room khác Ranked ở ba điểm luật (docs/protocol.md §7):
 * - `sessionId` **bằng** `pin`; phòng bật proctoring tối đa 6 người, không thì 20.
 * - Điểm mỗi câu đúng là 500–1000 theo thời gian còn lại; client chỉ hiển thị.
 * - Có lobby, host điều khiển, và phòng có thể bị hủy (`HOST_CANCELLED`/`SERVER_STOPPED`).
 *
 * Vì vậy state machine nằm riêng (`lib/quiz/`), không dùng chung reducer với Ranked;
 * chỉ những helper thật sự giống nhau (`countdown.ts`, `choice-visual.ts`) là dùng chung.
 */
import type { NoticeTone, UiNotice } from '../notices'
import type {
  QuizAnswerResult,
  QuizLeaderboardData,
  QuizLobbyData,
  QuizQuestionData,
  QuizRoomStarted
} from '@shared/protocol'

export const QUIZ_MIN_DURATION_MINUTES = 1
export const QUIZ_MAX_DURATION_MINUTES = 15
export const QUIZ_PIN_LENGTH = 6
/** `QuizRoom.MIN_PLAYERS`. */
export const QUIZ_MIN_PLAYERS = 2
/** `QuizRoom.MAX_HD_PROCTORED_PLAYERS`. */
export const QUIZ_MAX_PROCTORED_PLAYERS = 6
/** `QuizRoom.MAX_PLAYERS`. */
export const QUIZ_MAX_PLAYERS = 20

export type QuizRestoreTarget = 'lobby' | 'battle'

export type QuizNoticeTone = NoticeTone

/** Cùng shape với thông báo dùng chung (`lib/notices.ts`). */
export type QuizNotice = UiNotice

export type QuizBattlePhase =
  /** Đã vào phòng, chưa có câu hỏi đầu tiên. */
  | 'waiting'
  /** Đang nhận đáp án cho câu hiện tại. */
  | 'question'
  /** Đã gửi đáp án (hoặc hết giờ cục bộ) — chờ máy chủ chốt. */
  | 'locked'
  /** `QUIZ_ANSWER_RESULT` đã tới cho câu hiện tại. */
  | 'revealed'
  /** `QUIZ_ROOM_FINISHED`. */
  | 'finished'
  /** `QUIZ_ROOM_CANCEL`. */
  | 'cancelled'

/** Bản sao kết quả máy chủ trả trong `QUIZ_ANSWER_RESULT`; client không tự tính điểm. */
export interface QuizOutcome {
  correct: boolean
  chosenChoiceId: number | null
  correctChoiceId: number
  scoreAwarded: number
}

export interface QuizBattleState {
  pin: string
  phase: QuizBattlePhase
  attempt: number
  question: QuizQuestionData | null
  /** `attempt` client đã khoá để gửi `QUIZ_ANSWER`; `null` khi chưa gửi. */
  answeredAttempt: number | null
  selectedChoiceId: number | null
  outcome: QuizOutcome | null
  /** Tổng điểm của **chính mình** theo `QuizAnswerResult.totalScore`. */
  totalScore: number
  questionTotalSeconds: number
  questionDeadlineAt: number | null
  /** Số giây phòng còn lại theo message gần nhất (server gửi). */
  roomRemainingSeconds: number
  roomDeadlineAt: number | null
  timedOut: boolean
  notice: string | null
}

export type QuizBattleAction =
  | { type: 'question'; question: QuizQuestionData; now: number }
  | { type: 'choose'; choiceId: number }
  | { type: 'answerResult'; result: QuizAnswerResult }
  | { type: 'timeout'; now: number }
  | { type: 'finished' }
  | { type: 'cancelled' }
  | { type: 'notice'; message: string }

/** Bối cảnh phòng đang mở (từ `QUIZ_ROOM_START` hoặc `QUIZ_REJOINED`). */
export type QuizRoomContext = QuizRoomStarted

export type {
  QuizAnswerResult,
  QuizLeaderboardData,
  QuizLobbyData,
  QuizQuestionData,
  QuizRoomStarted
}
