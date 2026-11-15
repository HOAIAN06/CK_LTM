/**
 * Thông báo hiển thị dùng chung cho các store nghiệp vụ (bộ đề, bạn bè, phòng Quiz).
 *
 * Mọi câu chữ lỗi đi qua mapper `error-codes` — không route nào tự viết lại mã lỗi.
 */
import { describeErrorCode } from './error-codes'

export type NoticeTone = 'info' | 'success' | 'warning' | 'danger'

export interface UiNotice {
  tone: NoticeTone
  title: string
  description?: string
}

export function noticeFromErrorCode(
  code: string | null | undefined,
  tone: NoticeTone = 'danger'
): UiNotice {
  const copy = describeErrorCode(code)
  return { tone, title: copy.title, description: copy.description }
}

export function successNotice(title: string, description?: string): UiNotice {
  return { tone: 'success', title, description }
}

export function infoNotice(title: string, description?: string): UiNotice {
  return { tone: 'info', title, description }
}

/** Mã lỗi UI (không có trên wire) — khớp với `UI_ERROR` của mapper. */
export { UI_ERROR } from './error-codes'
