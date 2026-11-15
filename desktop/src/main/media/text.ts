/**
 * Chuỗi an toàn để đưa vào log/status của kênh media.
 *
 * Quy tắc giống `sanitizeErrorMessage` của control handler: bỏ control character, gộp
 * khoảng trắng, cắt độ dài. Module riêng để media không phải import từ tầng IPC.
 * Không bao giờ dùng hàm này cho ticket/JWT: ticket không được đi vào log dưới bất kỳ dạng nào.
 */

const MAX_DETAIL_LENGTH = 300

export function sanitizeDetail(error: unknown): string {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  const cleaned = raw
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (cleaned.length === 0) return 'Lỗi media không xác định'
  return cleaned.length > MAX_DETAIL_LENGTH ? `${cleaned.slice(0, MAX_DETAIL_LENGTH)}…` : cleaned
}

/**
 * Ticket là bí mật dùng một lần. Khi buộc phải nhắc tới trong log, chỉ log độ dài đã mask.
 */
export function maskTicket(ticket: string): string {
  const length = typeof ticket === 'string' ? ticket.length : 0
  return length === 0 ? '<empty>' : `<ticket:${length}>`
}
