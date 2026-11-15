/**
 * Đồng hồ hiển thị dùng chung cho Ranked và Quiz Room.
 *
 * Không có deadline nào được *quyết định* ở đây: mọi mốc thời gian đều do máy chủ gửi
 * (`questionDurationSeconds`, `matchRemainingSeconds`, `roomRemainingSeconds`). Các hàm
 * này chỉ đổi mốc đó thành "còn bao nhiêu giây" để vẽ vòng tròn và đọc cho trình đọc
 * màn hình.
 */

/** Giây còn lại (làm tròn lên) tính từ một mốc tuyệt đối; `null` → 0. */
export function secondsUntil(deadlineAt: number | null, now: number): number {
  if (deadlineAt === null) return 0
  return Math.max(0, Math.ceil((deadlineAt - now) / 1000))
}

/** `mm:ss` cho đồng hồ trận/phòng; âm hoặc không hữu hạn → `0:00`. */
export function formatClock(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/**
 * Câu thông báo cho vùng `aria-live` của countdown: chỉ đổi ở các ngưỡng 10 / 5 / 0
 * để trình đọc màn hình không đọc số mỗi giây.
 */
export function countdownAnnouncementFor(remaining: number): string {
  if (remaining <= 0) return 'Hết giờ cho câu này. Đang chờ máy chủ chốt kết quả.'
  if (remaining === 10) return 'Còn 10 giây.'
  if (remaining === 5) return 'Còn 5 giây.'
  return ''
}
