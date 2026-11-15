/**
 * Cổng duy nhất từ feature proctoring tới `window.nq.media`.
 *
 * Vì sao không đọc `window.nq.media` trực tiếp: `NqBridge` nằm ở `@shared/ipc` (architecture
 * sở hữu) và **chưa** khai báo `media`; thêm field vào đó là thay đổi ngoài phạm vi camera.
 * Runtime `window.nq.media` luôn tồn tại (preload expose), còn kiểu được kiểm tra ở đây.
 *
 * Fail closed: không có bridge → API stub trả `MEDIA_UNAVAILABLE` cho mọi lệnh. UI hiển thị
 * "camera chưa khả dụng" và quiz vẫn chạy bình thường.
 */
import {
  MEDIA_ERROR,
  createMediaStatusSnapshot,
  type MediaCommandResult,
  type MediaInboundFrame,
  type MediaPublishFrameRequest,
  type MediaStatusSnapshot,
  type NqMediaApi
} from '@shared/media-ipc'

/** Mã lỗi khi không có preload bridge (chạy thử trong browser, unit test, preload fail-closed). */
export const MEDIA_BRIDGE_UNAVAILABLE = MEDIA_ERROR.unavailable

function isMediaApi(value: unknown): value is NqMediaApi {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<NqMediaApi>
  return (
    typeof candidate.startPublish === 'function' &&
    typeof candidate.startSubscribe === 'function' &&
    typeof candidate.publishFrame === 'function' &&
    typeof candidate.onFrame === 'function' &&
    typeof candidate.getStatus === 'function'
  )
}

/** `window.nq.media` nếu preload đã chạy và bề mặt đủ hàm tối thiểu. */
export function readMediaBridge(): NqMediaApi | null {
  if (typeof window === 'undefined') return null
  const bridge = (window as unknown as { nq?: { media?: unknown } }).nq
  if (bridge === undefined || bridge === null) return null
  return isMediaApi(bridge.media) ? bridge.media : null
}

/** Stub offline: mọi lệnh trả lỗi có kiểm soát, không mở socket, không ném lỗi. */
export function createUnavailableMediaApi(): NqMediaApi {
  const failed = (): Promise<MediaCommandResult> =>
    Promise.resolve({ ok: false, error: MEDIA_BRIDGE_UNAVAILABLE })

  return {
    startPublish: failed,
    startSubscribe: failed,
    stopPublish: () => Promise.resolve(),
    stopSubscribe: () => Promise.resolve(),
    publishFrame: (frame: MediaPublishFrameRequest) => {
      void frame
      return failed()
    },
    getStatus: (): Promise<MediaStatusSnapshot> =>
      Promise.resolve(createMediaStatusSnapshot(Date.now())),
    onFrame: (listener: (frame: MediaInboundFrame) => void): (() => void) => {
      void listener
      return () => undefined
    },
    onStatus: (listener: (status: MediaStatusSnapshot) => void): (() => void) => {
      void listener
      return () => undefined
    }
  }
}

const unavailableApi = createUnavailableMediaApi()

/** API media đang dùng: bridge thật của preload, hoặc stub offline. Không bao giờ ném lỗi. */
export function getMediaApi(): NqMediaApi {
  return readMediaBridge() ?? unavailableApi
}

/** Có kênh media thật hay không (để hiển thị trạng thái "proctoring chưa khả dụng"). */
export function isMediaBridgeAvailable(): boolean {
  return readMediaBridge() !== null
}
