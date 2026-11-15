/**
 * Cầu nối IPC cho kênh điều khiển (`nq:connect|disconnect|send|status`).
 *
 * Trách nhiệm:
 * - Kiểm tra mọi dữ liệu renderer gửi lên (host/port/frame) trước khi chạm transport.
 * - Giữ `ConnectionStatus` duy nhất và phát nó cho renderer qua `nq:event`.
 * - Chuyển tiếp message server → renderer, không tự diễn giải nghiệp vụ.
 *
 * KHÔNG chứa logic gameplay: đáp án/điểm/timer vẫn do Java server quyết định.
 * KHÔNG tự retry vô hạn: transport báo trạng thái, renderer quyết định UI.
 *
 * QUY ƯỚC LỖI (quan trọng): **không handler nào ném lỗi qua ranh giới IPC.**
 * Ném lỗi từ `ipcMain.handle` khiến Electron trả một rejected promise với chuỗi
 * `Error invoking remote method 'nq:…': …` — renderer nhận nội bộ main dưới dạng text,
 * UI buộc phải parse chuỗi để hiển thị, và lỗi "mong đợi" bị trộn với crash thật.
 * Vì vậy:
 * - `nq:connect` / `nq:send` → luôn resolve `NqResult` (`{ ok:false, error:<mã> }`).
 * - `nq:status` → luôn resolve `ConnectionStatus` (không có field lỗi trong hợp đồng).
 * - `nq:disconnect` → luôn resolve `void`.
 * Mọi nhánh thất bại đều trả về, không throw.
 */
import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { createControlChannel, type ControlChannel } from '@main/net'
import {
  IPC_CHANNELS,
  NQ_ERROR,
  createIdleConnectionStatus,
  type ConnectOptions,
  type ConnectionStatus,
  type NqEvent,
  type NqResult
} from '@shared/ipc'
import { isTrustedRendererUrl } from '@main/security'

/**
 * Kiểu frame mà transport chấp nhận. Lấy từ chính `ControlChannel` của protocol để
 * không phải khai báo lại payload và không tạo vòng import.
 */
type TransportFrame = Parameters<ControlChannel['send']>[0]

const MAX_HOST_LENGTH = 255
const MAX_MESSAGE_TYPE_LENGTH = 64
const MAX_ERROR_LENGTH = 300
const MIN_PORT = 1
const MAX_PORT = 65535

export interface ControlHandlerOptions {
  /** Thay transport thật bằng fake trong test. */
  createChannel?: typeof createControlChannel
  /** Nơi phát sự kiện; mặc định gửi tới mọi cửa sổ đang mở (test truyền hàm ghi nhận). */
  publish?: (event: NqEvent) => void
  /** Thay `console.warn` khi bị từ chối sender (test không cần in log). */
  onRejectedSender?: (channel: string, origin: string) => void
}

/** Làm sạch thông điệp lỗi trước khi đưa vào UI/log: bỏ control char, cắt độ dài. */
export function sanitizeErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  const cleaned = raw
    // Cố tình loại control character khỏi chuỗi đưa vào log/UI.
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (cleaned.length === 0) return 'Lỗi không xác định'
  return cleaned.length > MAX_ERROR_LENGTH ? `${cleaned.slice(0, MAX_ERROR_LENGTH)}…` : cleaned
}

/**
 * Host chỉ nhận ký tự ASCII in được (hostname, IPv4, IPv6) và bị từ chối nếu chứa ký tự
 * có thể mở đường cho injection (`/ \ @ ? #`) hoặc khoảng trắng.
 */
export function sanitizeHost(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const host = value.trim()
  if (host.length === 0 || host.length > MAX_HOST_LENGTH) return null

  for (const char of host) {
    const code = char.codePointAt(0)
    if (code === undefined || code < 0x21 || code > 0x7e) return null
    if ('/\\@?#'.includes(char)) return null
  }
  return host
}

/** Port: số nguyên 1..65535. Chấp nhận chuỗi toàn chữ số để tiện cho form nhập liệu. */
export function parsePort(value: unknown): number | null {
  const numeric =
    typeof value === 'string' && /^\d{1,5}$/.test(value.trim()) ? Number(value.trim()) : value
  if (typeof numeric !== 'number' || !Number.isInteger(numeric)) return null
  if (numeric < MIN_PORT || numeric > MAX_PORT) return null
  return numeric
}

export type ParsedConnectOptions =
  | { ok: true; value: ConnectOptions }
  | { ok: false; error: string }

export function parseConnectOptions(raw: unknown): ParsedConnectOptions {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: NQ_ERROR.invalidHost }
  }
  const record = raw as { host?: unknown; port?: unknown }
  const host = sanitizeHost(record.host)
  if (host === null) return { ok: false, error: NQ_ERROR.invalidHost }
  const port = parsePort(record.port)
  if (port === null) return { ok: false, error: NQ_ERROR.invalidPort }
  return { ok: true, value: { host, port } }
}

/**
 * Kiểm tra hình dạng tối thiểu của frame gửi lên. Nội dung payload do codec của protocol
 * kiểm tra theo đúng `MessageType`; ở đây chỉ chặn dữ liệu không thể là một envelope.
 */
export function isOutboundFrame(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const type = (value as { type?: unknown }).type
  return typeof type === 'string' && type.length > 0 && type.length <= MAX_MESSAGE_TYPE_LENGTH
}

/** Bảo đảm trạng thái nhận từ transport luôn đủ field và sạch để hiển thị. */
export function normalizeStatus(next: ConnectionStatus): ConnectionStatus {
  return {
    state: next.state,
    host: typeof next.host === 'string' ? next.host : null,
    port: typeof next.port === 'number' && Number.isInteger(next.port) ? next.port : null,
    lastError: typeof next.lastError === 'string' ? sanitizeErrorMessage(next.lastError) : null,
    connectedAt: typeof next.connectedAt === 'number' ? next.connectedAt : null
  }
}

function broadcastToWindows(event: NqEvent): void {
  for (const win of BrowserWindow.getAllWindows()) {
    const contents = win.webContents
    if (contents.isDestroyed()) continue
    contents.send(IPC_CHANNELS.event, event)
  }
}

/** Origin rút gọn để log: không log query/hash vì có thể chứa token. */
function describeOrigin(rawUrl: string): string {
  try {
    return new URL(rawUrl).origin
  } catch {
    return '<invalid>'
  }
}

/**
 * Chỉ chấp nhận IPC từ main frame của chính renderer đã được nạp (scheme `nq-app` hoặc
 * dev server). Frame con/iframe hoặc nội dung lạ bị từ chối.
 *
 * Đây là lớp phòng thủ theo chiều sâu: navigation ra ngoài origin đã bị chặn, `webviewTag`
 * tắt, CSP `frame-src 'none'` — nên bình thường không tồn tại sender lạ.
 */
function isTrustedInvokeSender(event: IpcMainInvokeEvent): boolean {
  try {
    const frame = event.senderFrame
    if (frame === null || frame === undefined) return false
    if (frame !== event.sender.mainFrame) return false
    return isTrustedRendererUrl(frame.url)
  } catch {
    // sender/senderFrame có thể đã bị destroy — coi như không tin cậy.
    return false
  }
}

/** Lỗi transport (nếu có) mang `code` ổn định; đọc không cần import class của protocol. */
function readErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) return null
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' ? code : null
}

/** Ánh xạ lỗi transport → mã ổn định cho UI, giữ nguyên các mã đã có trong hợp đồng. */
function mapConnectFailure(error: unknown): string {
  return readErrorCode(error) === 'CONNECT_TIMEOUT' ? NQ_ERROR.connectTimeout : NQ_ERROR.connectFailed
}

/**
 * Lỗi khi gửi: transport phân biệt "chưa kết nối" và "frame không encode được" — giữ lại
 * hai mã đó thay vì gộp tất cả thành `SEND_FAILED`, vì UI xử lý hai tình huống rất khác nhau.
 */
function mapSendFailure(error: unknown): string {
  const code = readErrorCode(error)
  if (code === 'NOT_CONNECTED') return NQ_ERROR.notConnected
  if (code === 'INVALID_FRAME') return NQ_ERROR.invalidFrameData
  return NQ_ERROR.sendFailed
}

/**
 * Đăng ký toàn bộ handler điều khiển. Trả về hàm dispose để gọi khi app thoát.
 * Chỉ gọi một lần cho mỗi app: đăng ký trùng sẽ bị Electron ném lỗi ngay.
 */
export function registerControlHandlers(options: ControlHandlerOptions = {}): () => void {
  const factory = options.createChannel ?? createControlChannel
  const publish = options.publish ?? broadcastToWindows
  const reportRejectedSender =
    options.onRejectedSender ??
    ((channel: string, origin: string): void => {
      console.warn(`[nq] từ chối IPC ${channel} từ nguồn không tin cậy (${origin})`)
    })

  let status: ConnectionStatus = createIdleConnectionStatus()
  let connecting = false
  /**
   * Mục tiêu của lần kết nối gần nhất. Phải nhớ riêng vì transport phát
   * `status{host:null,port:null}` khi đóng socket, và hợp đồng yêu cầu `disconnect` vẫn giữ
   * host/port để UI hiển thị lại server vừa dùng (contracts.md §7.1).
   */
  let lastTarget: { host: string | null; port: number | null } = { host: null, port: null }

  const emitStatus = (next: ConnectionStatus): void => {
    status = next
    publish({ kind: 'status', status: { ...status } })
  }

  const channel: ControlChannel = factory({
    onMessage(message) {
      publish({ kind: 'message', message })
    },
    onStatus(next) {
      emitStatus(normalizeStatus(next))
    },
    onError(error) {
      publish({
        kind: 'transport-error',
        error: {
          code: typeof error.code === 'string' ? error.code : 'TRANSPORT_ERROR',
          message: sanitizeErrorMessage(error.message)
        }
      })
    }
  })

  /** Trả `true` khi sender hợp lệ; khi không, log origin và để handler tự trả kết quả. */
  const acceptSender = (event: IpcMainInvokeEvent, ipcChannel: string): boolean => {
    if (isTrustedInvokeSender(event)) return true
    let origin = '<none>'
    try {
      origin = describeOrigin(event.senderFrame?.url ?? '')
    } catch {
      origin = '<none>'
    }
    reportRejectedSender(ipcChannel, origin)
    return false
  }

  const handleConnect = async (event: IpcMainInvokeEvent, raw: unknown): Promise<NqResult> => {
    if (!acceptSender(event, IPC_CHANNELS.connect)) {
      return { ok: false, error: NQ_ERROR.untrustedSender }
    }

    const parsed = parseConnectOptions(raw)
    if (!parsed.ok) return { ok: false, error: parsed.error }
    if (connecting) return { ok: false, error: NQ_ERROR.connectInProgress }

    const { host, port } = parsed.value
    connecting = true
    lastTarget = { host, port }
    emitStatus({ state: 'connecting', host, port, lastError: null, connectedAt: null })

    try {
      // Đổi server khi đang kết nối: đóng kênh cũ trước để không có hai socket cùng lúc.
      if (channel.isConnected()) await channel.disconnect()
      await channel.connect(host, port)
      return { ok: true }
    } catch (error) {
      emitStatus({
        state: 'error',
        host,
        port,
        lastError: sanitizeErrorMessage(error),
        connectedAt: null
      })
      return { ok: false, error: mapConnectFailure(error) }
    } finally {
      connecting = false
    }
  }

  const handleDisconnect = async (event: IpcMainInvokeEvent): Promise<void> => {
    // Sender lạ: không chạm transport, cũng không ném lỗi (hợp đồng trả `void`).
    if (!acceptSender(event, IPC_CHANNELS.disconnect)) return

    try {
      await channel.disconnect()
    } catch (error) {
      console.error('[nq] ngắt kết nối thất bại:', sanitizeErrorMessage(error))
    }
    // Giữ host/port của lần kết nối gần nhất để UI hiển thị lại mục tiêu cũ.
    emitStatus({
      state: 'disconnected',
      host: lastTarget.host,
      port: lastTarget.port,
      lastError: null,
      connectedAt: null
    })
  }

  const handleSend = (event: IpcMainInvokeEvent, raw: unknown): NqResult => {
    if (!acceptSender(event, IPC_CHANNELS.send)) {
      return { ok: false, error: NQ_ERROR.untrustedSender }
    }
    if (!isOutboundFrame(raw)) return { ok: false, error: NQ_ERROR.invalidFrame }
    if (!channel.isConnected()) return { ok: false, error: NQ_ERROR.notConnected }

    try {
      // `raw` không thể mang kiểu compile-time qua IPC; codec của protocol kiểm tra payload
      // theo MessageType trước khi serialize. Ép kiểu nằm đúng một chỗ ở ranh giới này.
      channel.send(raw as TransportFrame)
      return { ok: true }
    } catch (error) {
      // Không log frame: payload có thể chứa username/PIN/ticket.
      console.error('[nq] gửi message thất bại:', readErrorCode(error) ?? 'UNKNOWN')
      return { ok: false, error: mapSendFailure(error) }
    }
  }

  /**
   * Trạng thái hiện tại. Sender lạ vẫn nhận snapshot (không phải bí mật, và hợp đồng không
   * có kiểu lỗi cho kênh này) — nhưng sự kiện đã bị log để phát hiện bất thường.
   */
  const handleStatus = (event: IpcMainInvokeEvent): ConnectionStatus => {
    if (!acceptSender(event, IPC_CHANNELS.status)) {
      return createIdleConnectionStatus()
    }
    return { ...status }
  }

  ipcMain.handle(IPC_CHANNELS.connect, handleConnect)
  ipcMain.handle(IPC_CHANNELS.disconnect, handleDisconnect)
  ipcMain.handle(IPC_CHANNELS.send, handleSend)
  ipcMain.handle(IPC_CHANNELS.status, handleStatus)

  return () => {
    ipcMain.removeHandler(IPC_CHANNELS.connect)
    ipcMain.removeHandler(IPC_CHANNELS.disconnect)
    ipcMain.removeHandler(IPC_CHANNELS.send)
    ipcMain.removeHandler(IPC_CHANNELS.status)
    void channel.disconnect().catch(() => undefined)
  }
}
