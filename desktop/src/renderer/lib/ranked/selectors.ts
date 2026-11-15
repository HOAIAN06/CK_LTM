/**
 * Selector hiển thị cho trận đấu. Tất cả đều **suy ra** từ state đã nhận từ server —
 * không có phép tính nghiệp vụ nào (không cộng điểm, không phán đúng/sai).
 */
import { countdownAnnouncementFor, formatClock, secondsUntil } from '../countdown'
import { resolveChoiceVisual, type ChoiceVisual } from '../choice-visual'
import type { BattleState } from './types'

export type { ChoiceVisual }
export { formatClock }

export function isInputLocked(state: BattleState | null): boolean {
  if (!state) return true
  return state.phase !== 'question' || state.answeredAttempt !== null || state.timedOut
}

/** Giây còn lại của câu (làm tròn lên) — hiển thị, không phải deadline thật. */
export function questionRemainingSeconds(state: BattleState | null, now: number): number {
  if (!state) return 0
  return secondsUntil(state.questionDeadlineAt, now)
}

/** Giây còn lại của trận (làm tròn lên) theo mốc server gửi gần nhất. */
export function matchRemainingSeconds(state: BattleState | null, now: number): number {
  if (!state) return 0
  return secondsUntil(state.matchDeadlineAt, now)
}

export function choiceVisual(state: BattleState | null, choiceId: number): ChoiceVisual {
  if (!state) return 'muted'
  return resolveChoiceVisual(
    {
      revealed: state.phase === 'revealed',
      locked: isInputLocked(state),
      selectedChoiceId: state.selectedChoiceId,
      outcome: state.outcome
    },
    choiceId
  )
}

/** Chỉ đổi ở ngưỡng 10 / 5 / 0 giây (xem `countdown.ts`). */
export function countdownAnnouncement(state: BattleState | null, now: number): string {
  if (!state) return ''
  if (state.phase !== 'question' && state.phase !== 'locked') return ''
  return countdownAnnouncementFor(questionRemainingSeconds(state, now))
}

/** Nhãn thời lượng dùng lại ở matchmaking và kết quả. */
export function durationLabel(seconds: number): string {
  if (seconds === 300) return '5 phút'
  if (seconds === 180) return '3 phút'
  return `${Math.round(seconds / 60)} phút`
}

/** Copy của kết quả trận, theo đúng cách `ResultController` gọi tên. */
export function resultCopy(result: string): {
  label: string
  detail: string
  tone: 'success' | 'danger' | 'neutral'
} {
  switch (result.trim().toUpperCase()) {
    case 'WIN':
      return {
        label: 'CHIẾN THẮNG',
        detail: 'Bạn ghi nhiều điểm hơn đối thủ khi hết giờ.',
        tone: 'success'
      }
    case 'LOSE':
    case 'LOSS':
      return {
        label: 'THẤT BẠI',
        detail: 'Đối thủ ghi nhiều điểm hơn trong trận này.',
        tone: 'danger'
      }
    case 'DRAW':
      return {
        label: 'HÒA',
        detail: 'Hai bên bằng điểm khi hết giờ.',
        tone: 'neutral'
      }
    default:
      return { label: 'KẾT THÚC TRẬN', detail: 'Kết quả do máy chủ gửi.', tone: 'neutral' }
  }
}
