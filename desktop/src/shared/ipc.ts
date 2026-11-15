/**
 * Hợp đồng IPC dùng chung giữa main process, preload (sandbox) và renderer.
 *
 * Bất biến (docs/desktop/contracts.md §4):
 * - Renderer không mở socket, không đọc file, không chạm database.
 * - Main process là nguồn sự thật duy nhất về trạng thái kết nối TCP.
 * - Mọi giá trị đi qua IPC là dữ liệu thuần (structured clone), không truyền hàm/class.
 * - Tên channel cố định: đổi tên là breaking change với cả ba phía.
 *
 * File này KHÔNG import runtime từ Electron hay `node:*` để renderer dùng được trực tiếp.
 */
import type { OutboundMessage, ServerMessage } from './protocol/payloads'

/**
 * Tên channel IPC. Dùng đúng các hằng này ở main, preload và test.
 */
export const IPC_CHANNELS = {
  /** renderer → main, invoke */
  connect: 'nq:connect',
  /** renderer → main, invoke */
  disconnect: 'nq:disconnect',
  /** renderer → main, invoke */
  send: 'nq:send',
  /** renderer → main, invoke */
  status: 'nq:status',
  /** main → renderer, webContents.send */
  event: 'nq:event',
  /**
   * renderer → main, invoke (giai đoạn camera).
   * Tên được giữ theo hợp đồng nhưng **chưa có handler nào** ở main; preload không expose.
   */
  mediaPublishFrame: 'nq:media:publish-frame',
  /** main → renderer, webContents.send (giai đoạn camera). Chưa dùng. */
  mediaFrame: 'nq:media:frame'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

/** Trạng thái kết nối do main process quyết định, renderer chỉ hiển thị. */
export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

export interface ConnectionStatus {
  state: ConnectionState
  /** Host của lần kết nối gần nhất; `null` khi chưa từng kết nối. */
  host: string | null
  port: number | null
  /** Thông điệp lỗi đã được làm sạch để hiển thị; `null` khi không có lỗi. */
  lastError: string | null
  /** Epoch ms của thời điểm kết nối thành công; `null` khi chưa/chẳng còn kết nối. */
  connectedAt: number | null
}

/** Trạng thái ban đầu, dùng chung cho main và state khởi tạo của renderer. */
export function createIdleConnectionStatus(): ConnectionStatus {
  return { state: 'idle', host: null, port: null, lastError: null, connectedAt: null }
}

/**
 * Envelope gửi lên/nhận từ server: dùng lại đúng kiểu của `@shared/protocol` (một nguồn
 * sự thật duy nhất, mirror `Payloads.java`). `payload` là discriminated union theo
 * `MessageType`, nên renderer có type-safety thật khi gửi/nhận.
 */
export type { OutboundMessage, ServerMessage } from './protocol/payloads'

/** Lỗi tầng transport; `code` ổn định để UI ánh xạ thông điệp, `message` để log/hiển thị. */
export interface TransportError {
  code: string
  message: string
}

/**
 * Sự kiện main đẩy xuống renderer qua `nq:event`.
 *
 * Giữ đúng dạng optional-field như hợp đồng để phía renderer có thể switch theo
 * `kind` mà không phải xử lý union phức tạp.
 */
export interface NqEvent {
  kind: 'message' | 'status' | 'transport-error'
  /** Có khi `kind === 'message'`. */
  message?: ServerMessage
  /** Có khi `kind === 'status'`. */
  status?: ConnectionStatus
  /** Có khi `kind === 'transport-error'`. */
  error?: TransportError
}

/** Kết quả của một lệnh IPC có thể thất bại nhưng không nên ném lỗi qua ranh giới. */
export interface NqResult {
  ok: boolean
  /** Mã lỗi ổn định (xem `NQ_ERROR`); không chứa dữ liệu nhạy cảm. */
  error?: string
}

export interface ConnectOptions {
  host: string
  port: number
}

/**
 * Mã lỗi ổn định trả về cho renderer.
 *
 * UI ánh xạ mã → câu tiếng Việt; chi tiết kỹ thuật đi qua `ConnectionStatus.lastError`
 * hoặc sự kiện `transport-error` để không lẫn giữa "mã để lập trình" và "chữ để đọc".
 */
export const NQ_ERROR = {
  invalidHost: 'INVALID_HOST',
  invalidPort: 'INVALID_PORT',
  invalidFrame: 'INVALID_FRAME',
  untrustedSender: 'UNTRUSTED_SENDER',
  notConnected: 'NOT_CONNECTED',
  connectInProgress: 'CONNECT_IN_PROGRESS',
  connectFailed: 'CONNECT_FAILED',
  /** Kết nối TCP không hoàn tất trong 5000 ms (`CONTROL_CONNECT_TIMEOUT_MS`). */
  connectTimeout: 'CONNECT_TIMEOUT',
  sendFailed: 'SEND_FAILED',
  invalidFrameData: 'INVALID_FRAME_DATA'
} as const

export type NqErrorCode = (typeof NQ_ERROR)[keyof typeof NQ_ERROR]

/**
 * Nền tảng chạy app. Khai báo literal union thay vì `NodeJS.Platform` để file này
 * type-check được trong cả tsconfig.node (không có DOM) và tsconfig.web (không có @types/node).
 */
export type NqPlatform =
  | 'aix'
  | 'android'
  | 'darwin'
  | 'freebsd'
  | 'haiku'
  | 'linux'
  | 'netbsd'
  | 'openbsd'
  | 'sunos'
  | 'win32'
  | 'cygwin'

export interface AppInfo {
  /** Phiên bản app (`app.getVersion()`), main truyền vào preload qua additionalArguments. */
  version: string
  platform: NqPlatform
  /** `false` khi chạy từ source bằng electron-vite. */
  packaged: boolean
}

/**
 * Khung hình media đi qua IPC (giai đoạn camera).
 *
 * CHƯA ĐƯỢC EXPOSE qua `window.nq` — không có `media` trong `NqBridge` (xem lý do bên dưới).
 * Kiểu được giữ lại để camera dùng ngay khi handler main (`src/main/media/**`) tồn tại.
 *
 * HỢP ĐỒNG TẠM THỜI: hình dạng này do architecture đề xuất trong Phase 2 và có thể
 * được camera tinh chỉnh (thêm trường là additive). Quy ước bắt buộc:
 * - `data` là frame ĐÃ encode (JPEG), không phải bitmap thô.
 * - `sequence` tăng đơn điệu theo từng publisher; bên nhận được phép bỏ frame cũ.
 * - Không giữ frame cũ trong hàng đợi: chỉ frame mới nhất có ý nghĩa.
 */
export interface MediaFrameMeta {
  sequence: number
  /** Epoch ms lúc capture. */
  capturedAt: number
  width: number
  height: number
  /** MIME của `data`, ví dụ `image/jpeg`. */
  mimeType: string
}

export interface MediaFrame {
  meta: MediaFrameMeta
  data: ArrayBuffer
}

/**
 * Bề mặt media DỰ KIẾN cho giai đoạn camera.
 *
 * Không được nối vào `NqBridge` cho tới khi main process thật sự có handler
 * `nq:media:publish-frame`: expose một API không hoạt động sẽ khiến renderer gọi vào
 * channel không có handler và nhận lỗi khó hiểu. `preload/index.ts` chỉ expose những gì đã chạy.
 */
export interface NqMediaBridge {
  /** Gửi frame đã encode lên main để chuyển tiếp theo kênh media riêng. */
  publishFrame(frame: MediaFrame): Promise<NqResult>
  /** Nhận frame từ người chơi khác; trả về hàm huỷ đăng ký. */
  onFrame(listener: (frame: MediaFrame) => void): () => void
}

/**
 * Bề mặt duy nhất renderer được thấy: `window.nq`.
 *
 * Không expose `ipcRenderer`, `require`, `process` hay bất kỳ API Node/Electron nào khác.
 * Mọi hàm ở đây đều có handler thật ở main process (xem `main/ipc/register-control-handlers.ts`).
 */
export interface NqBridge {
  connect(options: ConnectOptions): Promise<NqResult>
  disconnect(): Promise<void>
  send(frame: OutboundMessage): Promise<NqResult>
  getStatus(): Promise<ConnectionStatus>
  /** Đăng ký nhận sự kiện từ main; trả về hàm huỷ đăng ký. */
  onEvent(listener: (event: NqEvent) => void): () => void
  app: AppInfo
}

/**
 * Khai báo `window.nq` đặt ở shared (không đặt ở preload/api.d.ts) vì tsconfig.web
 * chỉ include `src/renderer/**` và `src/shared/**`; nếu để ở preload thì renderer
 * không thấy kiểu. `preload/api.d.ts` re-export lại để làm tài liệu bề mặt.
 */
declare global {
  interface Window {
    readonly nq: NqBridge
  }
}
