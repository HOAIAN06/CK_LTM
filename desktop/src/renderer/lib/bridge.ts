/**
 * Adapter duy nhất giữa renderer và `window.nq`.
 *
 * Bất biến (docs/desktop/contracts.md §4):
 * - Renderer không mở socket; mọi lời gọi đi qua preload → main process.
 * - Nếu bridge không tồn tại (chạy thử trong trình duyệt, unit test, hoặc preload
 *   fail-closed) thì trả về một stub **offline** rõ ràng thay vì ném lỗi: UI phải
 *   render được trạng thái "cầu nối không khả dụng" thay vì màn hình trắng.
 * - Không log payload/frame ở bất kỳ đâu trong file này: frame có thể chứa username
 *   hoặc mật khẩu.
 */
import type {
  ConnectionStatus,
  NqBridge,
  NqEvent,
  NqPlatform,
  NqResult
} from '@shared/ipc'
import { createIdleConnectionStatus } from '@shared/ipc'

/** Mã lỗi nội bộ của UI khi không có cầu nối desktop (không phải mã của protocol). */
export const BRIDGE_UNAVAILABLE = 'BRIDGE_UNAVAILABLE'

/**
 * Nền tảng chỉ dùng để hiển thị thông tin; bridge thật luôn lấy từ `window.nq.app`.
 * Stub chỉ chạy khi không có bridge nên đoán theo user agent là đủ.
 */
function detectPlatform(): NqPlatform {
  if (typeof navigator === 'undefined') return 'linux'
  const agent = navigator.userAgent
  if (/Windows/i.test(agent)) return 'win32'
  if (/Mac OS X|Macintosh/i.test(agent)) return 'darwin'
  return 'linux'
}

/** Stub offline: mọi lệnh đều trả lỗi có kiểm soát, không có kết nối mạng nào. */
export function createOfflineBridge(): NqBridge {
  return {
    connect(): Promise<NqResult> {
      return Promise.resolve({ ok: false, error: BRIDGE_UNAVAILABLE })
    },
    disconnect(): Promise<void> {
      return Promise.resolve()
    },
    send(): Promise<NqResult> {
      return Promise.resolve({ ok: false, error: BRIDGE_UNAVAILABLE })
    },
    getStatus(): Promise<ConnectionStatus> {
      return Promise.resolve(createIdleConnectionStatus())
    },
    onEvent(): () => void {
      return () => undefined
    },
    app: {
      version: '0.0.0',
      platform: detectPlatform(),
      packaged: false
    }
  }
}

const offlineBridge = createOfflineBridge()

/**
 * Bridge do fixture demo (dev-only) cài vào. Tách khỏi `window.nq` để renderer
 * không bao giờ ghi đè bề mặt preload đã được kiểm soát.
 */
let override: NqBridge | null = null

/** Chỉ fixture demo (DEV) và test được gọi. `null` để trả về bề mặt thật. */
export function setBridgeOverride(bridge: NqBridge | null): void {
  override = bridge
}

/** Đọc `window.nq` nếu preload đã chạy và bề mặt đủ hàm tối thiểu. */
export function readWindowBridge(): NqBridge | null {
  if (typeof window === 'undefined') return null
  const candidate = (window as Window & { nq?: NqBridge }).nq
  if (!candidate) return null
  if (
    typeof candidate.connect !== 'function' ||
    typeof candidate.send !== 'function' ||
    typeof candidate.onEvent !== 'function'
  ) {
    return null
  }
  return candidate
}

/** Có cầu nối desktop thật (hoặc fixture demo) hay không. */
export function isBridgeAvailable(): boolean {
  return override !== null || readWindowBridge() !== null
}

/** Bridge đang dùng: fixture demo → preload → stub offline. Không bao giờ ném lỗi. */
export function getBridge(): NqBridge {
  return override ?? readWindowBridge() ?? offlineBridge
}

/** Tiện cho app shell: tên tiến trình không tồn tại thì trả `null`. */
export function readAppInfo(): { version: string; platform: NqPlatform } | null {
  if (!isBridgeAvailable()) return null
  return { version: getBridge().app.version, platform: getBridge().app.platform }
}

/** Danh sách event hợp lệ — dùng trong test và để chặn dữ liệu sai hình dạng. */
export function isNqEvent(value: unknown): value is NqEvent {
  if (typeof value !== 'object' || value === null) return false
  const kind = (value as { kind?: unknown }).kind
  return kind === 'message' || kind === 'status' || kind === 'transport-error'
}
