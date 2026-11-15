/**
 * Đồng hồ chờ phản hồi (watchdog) — cùng cơ chế màn hình đăng nhập đã dùng.
 *
 * Dùng cho request mà giao thức không có timeout: `MATCH_HISTORY_GET`, `QUIZ_SET_LIST`…
 * Nếu máy chủ nhận frame nhưng không trả lời, UI phải rời trạng thái loading và hiện
 * lỗi có nút thử lại thay vì quay vô hạn.
 *
 * Đây **không** phải timeout nghiệp vụ: nó không huỷ request, không kết luận kết quả,
 * chỉ mở lại UI để người dùng thử lại.
 */
export const RESPONSE_TIMEOUT_MS = 10_000

export interface Watchdog {
  /** Đặt lại hạn phản hồi; lần `arm` sau thay lần trước. */
  arm: (ms: number, onTimeout: () => void) => void
  clear: () => void
}

export function createWatchdog(): Watchdog {
  let handle: ReturnType<typeof setTimeout> | null = null

  const clear = (): void => {
    if (handle !== null) {
      clearTimeout(handle)
      handle = null
    }
  }

  return {
    arm(ms, onTimeout) {
      clear()
      handle = setTimeout(() => {
        handle = null
        onTimeout()
      }, ms)
    },
    clear
  }
}
