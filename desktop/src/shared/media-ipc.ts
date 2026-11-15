/**
 * Hợp đồng IPC cho kênh media (camera proctoring) — giai đoạn camera.
 *
 * File này được cả ba phía dùng (main, preload, renderer) nên **không** import runtime từ
 * Electron hay `node:*`; chỉ kiểu dữ liệu thuần + hằng số + hàm validate không phụ thuộc
 * môi trường (không dùng `Buffer`, không dùng DOM).
 *
 * Bất biến:
 * - Renderer không mở socket; main process giữ `node:net` của kênh media nhị phân.
 * - Chỉ frame **đã encode** (JPEG) đi qua IPC. Không có bitmap thô, không có audio.
 * - Ngữ nghĩa latest-frame: bên nhận luôn được phép bỏ frame cũ, không xếp hàng vô hạn.
 * - Media không bao giờ đi qua kênh control JSON-line.
 * - Ticket **không** bao giờ được log, echo lại hay đưa vào status trả về renderer.
 *
 * Tên channel: `docs/desktop/contracts.md` §4 đã giữ chỗ `nq:media:publish-frame` và
 * `nq:media:frame`. Bốn channel còn lại là phần mở rộng additive của giai đoạn camera
 * (`start-publish`/`stop-publish`/`start-subscribe`/`stop-subscribe`), cộng `status`.
 */
import type { MediaFrameMeta } from './ipc'
import type { VisionAttention, VisionMetadata } from './protocol/media'

/** Tên channel IPC của kênh media. Đổi tên là breaking change với cả ba phía. */
export const NQ_MEDIA_CHANNELS = {
  /** renderer → main, invoke: gửi một frame JPEG đã encode. */
  publishFrame: 'nq:media:publish-frame',
  /** renderer → main, invoke: mở kết nối PUBLISHER tới media port. */
  startPublish: 'nq:media:start-publish',
  /** renderer → main, invoke: đóng kết nối PUBLISHER. */
  stopPublish: 'nq:media:stop-publish',
  /** renderer → main, invoke: mở kết nối HOST_SUBSCRIBER tới media port. */
  startSubscribe: 'nq:media:start-subscribe',
  /** renderer → main, invoke: đóng kết nối HOST_SUBSCRIBER. */
  stopSubscribe: 'nq:media:stop-subscribe',
  /** renderer → main, invoke (snapshot) **và** main → renderer (push khi trạng thái đổi). */
  status: 'nq:media:status',
  /** main → renderer, `webContents.send`: frame mới nhất của một người chơi. */
  frame: 'nq:media:frame'
} as const

export type NqMediaChannel = (typeof NQ_MEDIA_CHANNELS)[keyof typeof NQ_MEDIA_CHANNELS]

/** Vai trò kết nối media, cùng giá trị với `MediaProtocol.Role`. */
export type MediaChannelRole = 'PUBLISHER' | 'HOST_SUBSCRIBER'

/** Trạng thái kết nối media do **main** quyết định; renderer chỉ hiển thị. */
export type MediaChannelState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * Mã lỗi ổn định của đường media. UI ánh xạ sang câu tiếng Việt; chi tiết kỹ thuật đã được
 * làm sạch nằm trong `lastError` của status.
 */
export const MEDIA_ERROR = {
  invalidHost: 'MEDIA_INVALID_HOST',
  invalidPort: 'MEDIA_INVALID_PORT',
  invalidTicket: 'MEDIA_INVALID_TICKET',
  invalidFrame: 'MEDIA_INVALID_FRAME',
  untrustedSender: 'UNTRUSTED_SENDER',
  /** Chưa `start-publish`/`start-subscribe` (hoặc đã stop). */
  notStarted: 'MEDIA_NOT_STARTED',
  connectFailed: 'MEDIA_CONNECT_FAILED',
  connectTimeout: 'MEDIA_CONNECT_TIMEOUT',
  /** Handshake bị server từ chối; `ack` (0..5) nói lý do. */
  ackRejected: 'MEDIA_ACK_REJECTED',
  sendFailed: 'MEDIA_SEND_FAILED',
  socketClosed: 'MEDIA_SOCKET_CLOSED',
  /** Preload không có handler main (chưa nối `registerMediaHandlers()`). */
  unavailable: 'MEDIA_UNAVAILABLE'
} as const

export type MediaErrorCode = (typeof MEDIA_ERROR)[keyof typeof MEDIA_ERROR]

/** Kết quả một lệnh media. Không bao giờ ném lỗi qua ranh giới IPC. */
export interface MediaCommandResult {
  ok: boolean
  /** Mã trong `MEDIA_ERROR`. */
  error?: string
  /** Byte ACK của handshake khi `error === MEDIA_ACK_REJECTED`. */
  ack?: number
}

/** Trạng thái một kênh media. Không chứa ticket, không chứa dữ liệu frame. */
export interface MediaChannelStatus {
  role: MediaChannelRole
  state: MediaChannelState
  host: string | null
  port: number | null
  /** Thông điệp đã làm sạch (≤300 ký tự), `null` khi không có lỗi. */
  lastError: string | null
  /** ACK của handshake gần nhất, `null` khi chưa handshake. */
  ack: number | null
  /** Epoch ms của lần chuyển trạng thái gần nhất. */
  updatedAt: number
}

/** Số đo một chiều (publish hoặc subscribe), cửa sổ trượt. */
export interface MediaChannelMetrics {
  /** Frame renderer đưa xuống / frame nhận từ socket. */
  offered: number
  /** Frame đã ghi hết vào socket / đã đẩy xuống renderer. */
  completed: number
  /** Frame bị bỏ vì bận (latest-frame) hoặc vì lỗi encode. */
  dropped: number
  /** Byte JPEG đã ghi / đã đọc. */
  bytes: number
  /** Ước lượng theo cửa sổ đo gần nhất. */
  fps: number
  bytesPerSecond: number
  windowMs: number
}

export interface MediaStatusSnapshot {
  publisher: MediaChannelStatus
  subscriber: MediaChannelStatus
  publisherMetrics: MediaChannelMetrics
  subscriberMetrics: MediaChannelMetrics
  /** Số người chơi đang có frame chờ đẩy xuống renderer (chỉ có nghĩa với host). */
  subscriberPendingUsers: number
}

/** Frame publisher gửi xuống main. `data` là JPEG đã encode, không phải bitmap. */
export interface MediaPublishFrameRequest {
  meta: MediaFrameMeta
  data: ArrayBuffer | ArrayBufferView
  /** Kết quả phân tích đi kèm (additive so với `MediaFrame` của `@shared/ipc`). */
  vision?: VisionMetadataLike | null
}

/**
 * Tập con của `VisionMetadata` mà renderer thật sự gửi kèm. Giữ optional để publisher
 * hiện tại (chưa có detector chạy trong Electron) vẫn dùng được `unavailable`.
 */
export interface VisionMetadataLike {
  frameSequence?: number
  analysedAtEpochMillis?: number
  faces?: Array<{
    x: number
    y: number
    width: number
    height: number
    leftEyeX: number
    leftEyeY: number
    rightEyeX: number
    rightEyeY: number
  }>
  gazeX?: number
  gazeY?: number
  attention?: VisionAttention
  confidence?: number
}

/** Frame nhận từ server (relayed) và chuyển tiếp cho renderer. */
export interface MediaInboundFrame {
  userId: number
  sequence: number
  /** Epoch ms server ghi nhận frame. */
  serverReceivedAt: number
  mimeType: 'image/jpeg'
  /** Phân tích đi kèm; `UNKNOWN`/0 khi detector không chạy. */
  vision: VisionMetadata
  data: ArrayBuffer
}

/** Tham số mở một kết nối media. `ticket` là bí mật: chỉ đi từ renderer → main. */
export interface MediaSessionTarget {
  host: string
  mediaPort: number
  ticket: string
}

/** Bề mặt `window.nq.media` (preload expose, main xử lý). */
export interface NqMediaApi {
  startPublish(target: MediaSessionTarget): Promise<MediaCommandResult>
  stopPublish(): Promise<void>
  startSubscribe(target: MediaSessionTarget): Promise<MediaCommandResult>
  stopSubscribe(): Promise<void>
  /** Frame đã encode; trả `ok:false` khi kênh chưa mở/đang bận. */
  publishFrame(frame: MediaPublishFrameRequest): Promise<MediaCommandResult>
  getStatus(): Promise<MediaStatusSnapshot>
  /** Frame mới nhất của từng người chơi; trả về hàm huỷ đăng ký. */
  onFrame(listener: (frame: MediaInboundFrame) => void): () => void
  /** Trạng thái/metrics khi main phát; trả về hàm huỷ đăng ký. */
  onStatus(listener: (status: MediaStatusSnapshot) => void): () => void
}

// ---------------------------------------------------------------------------------------------
// Validate (dùng chung main + test). Không phụ thuộc Buffer/DOM.
// ---------------------------------------------------------------------------------------------

/** Số byte thật của `ArrayBuffer | ArrayBufferView`. */
export function byteLengthOf(value: ArrayBuffer | ArrayBufferView): number {
  return ArrayBuffer.isView(value) ? value.byteLength : value.byteLength
}

/** Copy sang `ArrayBuffer` độc lập để main giữ được sau khi IPC trả về. */
export function toArrayBuffer(value: ArrayBuffer | ArrayBufferView): ArrayBuffer {
  if (!ArrayBuffer.isView(value)) {
    return value.slice(0)
  }
  const source = new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
  const copy = new Uint8Array(source.length)
  copy.set(source)
  return copy.buffer
}

export type ParsedMediaFrame =
  | { ok: true; value: { sequence: number; capturedAt: number; width: number; height: number; jpeg: Uint8Array; vision: VisionMetadataLike | null } }
  | { ok: false; error: string }

/**
 * Kiểm tra frame renderer gửi lên trước khi encode ra socket.
 *
 * Renderer là **không tin cậy**: kích thước bị chặn cứng ở `maxJpegBytes` (mặc định
 * 524288 = `MediaProtocol.MAX_JPEG_BYTES`) và mọi trường phải đúng kiểu. Không bao giờ
 * echo lại giá trị nhận được trong thông điệp lỗi.
 */
export function parseMediaPublishFrame(raw: unknown, maxJpegBytes: number): ParsedMediaFrame {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: MEDIA_ERROR.invalidFrame }
  }
  const record = raw as Partial<MediaPublishFrameRequest>
  const meta = record.meta
  if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) {
    return { ok: false, error: MEDIA_ERROR.invalidFrame }
  }
  if (meta.mimeType !== 'image/jpeg') return { ok: false, error: MEDIA_ERROR.invalidFrame }

  const sequence = meta.sequence
  if (!isIntegerInRange(sequence, 0, Number.MAX_SAFE_INTEGER)) {
    return { ok: false, error: MEDIA_ERROR.invalidFrame }
  }
  const capturedAt = meta.capturedAt
  if (!isIntegerInRange(capturedAt, 0, Number.MAX_SAFE_INTEGER)) {
    return { ok: false, error: MEDIA_ERROR.invalidFrame }
  }
  const width = isIntegerInRange(meta.width, 0, 8192) ? meta.width : 0
  const height = isIntegerInRange(meta.height, 0, 8192) ? meta.height : 0

  const data = record.data
  if (!(data instanceof ArrayBuffer) && !ArrayBuffer.isView(data)) {
    return { ok: false, error: MEDIA_ERROR.invalidFrame }
  }
  const length = byteLengthOf(data)
  // 1..maxJpegBytes: frame 0 byte không phải JPEG hợp lệ, quá lớn thì server từ chối.
  if (length <= 0 || length > maxJpegBytes) {
    return { ok: false, error: MEDIA_ERROR.invalidFrame }
  }

  const vision =
    record.vision === null || record.vision === undefined ? null : record.vision

  return {
    ok: true,
    value: {
      sequence,
      capturedAt,
      width,
      height,
      jpeg: data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
      vision
    }
  }
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

/** Trạng thái rỗng dùng cho snapshot khởi tạo (main) và UI chưa kết nối (renderer). */
export function createMediaChannelStatus(
  role: MediaChannelRole,
  now: number
): MediaChannelStatus {
  return { role, state: 'idle', host: null, port: null, lastError: null, ack: null, updatedAt: now }
}

/** Metrics rỗng. */
export function createMediaMetrics(): MediaChannelMetrics {
  return {
    offered: 0,
    completed: 0,
    dropped: 0,
    bytes: 0,
    fps: 0,
    bytesPerSecond: 0,
    windowMs: 0
  }
}

/** Snapshot rỗng (main trước khi có kết nối, renderer khi chưa có bridge). */
export function createMediaStatusSnapshot(now: number): MediaStatusSnapshot {
  return {
    publisher: createMediaChannelStatus('PUBLISHER', now),
    subscriber: createMediaChannelStatus('HOST_SUBSCRIBER', now),
    publisherMetrics: createMediaMetrics(),
    subscriberMetrics: createMediaMetrics(),
    subscriberPendingUsers: 0
  }
}
