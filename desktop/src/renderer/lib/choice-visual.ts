/**
 * Trạng thái hiển thị của một lựa chọn đáp án — dùng chung cho Ranked và Quiz Room.
 *
 * Hai chế độ có payload và luật điểm khác nhau, nhưng cách tô một lựa chọn thì giống hệt:
 * trước khi máy chủ trả `ANSWER_RESULT` chỉ được hiện "đã chọn" (không phán đúng/sai),
 * sau đó tô đáp án đúng theo `correctChoiceId` của máy chủ.
 */

export type ChoiceVisual = 'idle' | 'selected' | 'correct' | 'wrong' | 'muted'

export interface ChoiceVisualInput {
  /** `ANSWER_RESULT` của máy chủ đã tới. */
  revealed: boolean
  /** Không còn nhận đáp án (đã gửi, hết giờ cục bộ, hoặc câu đã đóng). */
  locked: boolean
  selectedChoiceId: number | null
  outcome: { chosenChoiceId: number | null; correctChoiceId: number } | null
}

export function resolveChoiceVisual(input: ChoiceVisualInput, choiceId: number): ChoiceVisual {
  const { revealed, locked, selectedChoiceId, outcome } = input

  if (!revealed || !outcome) {
    if (selectedChoiceId === choiceId) return 'selected'
    return locked ? 'muted' : 'idle'
  }

  if (choiceId === outcome.correctChoiceId) return 'correct'
  if (choiceId === outcome.chosenChoiceId) return 'wrong'
  return 'muted'
}
