/**
 * Nhịp re-render cho đồng hồ hiển thị (Ranked và Quiz Room dùng chung).
 *
 * Mọi mốc thời gian thật do máy chủ quyết định; hook này chỉ tạo nhịp để tính "còn bao
 * nhiêu giây" từ duration server vừa gửi. Nó không kết thúc câu hỏi hay trận đấu.
 */
import { useEffect, useState } from 'react'

/** `now` (epoch ms) cập nhật theo `intervalMs` khi `active`. */
export function useNow(intervalMs = 250, active = true): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs, active])

  return now
}
