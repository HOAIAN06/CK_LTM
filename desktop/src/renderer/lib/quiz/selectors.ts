/**
 * Selector hiển thị của Quiz Room. Không có phép tính điểm nào: `scoreAwarded`,
 * `totalScore` và thứ hạng đều lấy nguyên từ message của máy chủ.
 */
import { countdownAnnouncementFor, formatClock, secondsUntil } from '../countdown'
import { resolveChoiceVisual, type ChoiceVisual } from '../choice-visual'
import type { QuizAnswerResult, QuizBattleState, QuizLeaderboardData } from './types'

export type { ChoiceVisual }
export { formatClock }

export function isQuizInputLocked(state: QuizBattleState | null): boolean {
  if (!state) return true
  return state.phase !== 'question' || state.answeredAttempt !== null || state.timedOut
}

export function quizQuestionRemainingSeconds(state: QuizBattleState | null, now: number): number {
  if (!state) return 0
  return secondsUntil(state.questionDeadlineAt, now)
}

export function quizRoomRemainingSeconds(state: QuizBattleState | null, now: number): number {
  if (!state) return 0
  return secondsUntil(state.roomDeadlineAt, now)
}

export function quizChoiceVisual(state: QuizBattleState | null, choiceId: number): ChoiceVisual {
  if (!state) return 'muted'
  return resolveChoiceVisual(
    {
      revealed: state.phase === 'revealed',
      locked: isQuizInputLocked(state),
      selectedChoiceId: state.selectedChoiceId,
      outcome: state.outcome
    },
    choiceId
  )
}

export function quizCountdownAnnouncement(state: QuizBattleState | null, now: number): string {
  if (!state) return ''
  if (state.phase !== 'question' && state.phase !== 'locked') return ''
  return countdownAnnouncementFor(quizQuestionRemainingSeconds(state, now))
}

/** Bản ghi của chính người chơi trong bảng xếp hạng (máy chủ đã sắp thứ hạng). */
export function myLeaderboardEntry(
  board: QuizLeaderboardData | null,
  userId: number | null
): QuizLeaderboardData['entries'][number] | null {
  if (!board || userId === null) return null
  return board.entries.find((entry) => entry.userId === userId) ?? null
}

/** Nhãn điểm một câu, luôn nói rõ máy chủ tính. */
export function scoreAwardedLabel(outcome: QuizAnswerResult | null): string | null {
  if (!outcome) return null
  if (outcome.chosenChoiceId === null) return 'Máy chủ xử lý như không trả lời (0 điểm).'
  if (!outcome.correct) return 'Máy chủ không cộng điểm cho câu này.'
  return `Máy chủ cộng ${outcome.scoreAwarded} điểm cho câu này.`
}
