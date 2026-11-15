/**
 * Cầu nối IPC cho kênh media (camera proctoring).
 *
 * Trách nhiệm:
 * - Kiểm tra **mọi** dữ liệu renderer gửi lên (host/port/ticket/frame) trước khi chạm socket.
 * - Giữ đúng một publisher và một subscriber; mỗi lần start là một kết nối duy nhất.
 * - Forward frame mới nhất của từng người chơi xuống renderer qua `nq:media:frame`.
 *
 * KHÔNG chứa logic nghiệp vụ: trạng thái phòng, quyền publish, ticket đều do Java server
 * cấp qua control channel. Main chỉ là transport.
 *
 * QUY ƯỚC LỖI (giống control handler): **không handler nào ném lỗi qua IPC**. Mọi nhánh thất
 * bại trả `MediaCommandResult` với mã trong `MEDIA_ERROR`.
 *
 * BẢO MẬT: ticket là bí mật dùng một lần. Handler không log, không echo, không đưa ticket vào
 * status trả về renderer.
 */
import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { isTrustedRendererUrl } from '@main/security'
import { sanitizeHost, parsePort } from '@main/ipc/register-control-handlers'
import { MEDIA_MAX_JPEG_BYTES } from '@shared/protocol/media'
import {
  MEDIA_ERROR,
  NQ_MEDIA_CHANNELS,
  createMediaStatusSnapshot,
  parseMediaPublishFrame,
  type MediaChannelMetrics,
  type MediaCommandResult,
  type MediaInboundFrame,
  type MediaSessionTarget,
  type MediaStatusSnapshot
} from '@shared/media-ipc'
import type { VisionMetadata } from '@shared/protocol/media'
import { createMediaPublisher, type MediaPublisher } from '@main/media/publisher'
import { createMediaSubscriber, type MediaSubscriber } from '@main/media/subscriber'
import { MediaTransportError } from '@main/media/errors'
import type { RelayedFrame } from '@main/media/codec'
import { sanitizeDetail } from '@main/media/text'

/** Ticket tối đa 512 byte UTF-8 (`MediaProtocol.MAX_TICKET_BYTES`). */
const MAX_TICKET_BYTES = 512

/**
 * Callback mà handler đưa vào transport: transport không tự biết renderer, handler quyết định
 * phát gì xuống IPC. Test truyền factory riêng cũng nhận đúng bộ callback này.
 */
export interface MediaTransportCallbacks {
  onStatus: () => void
  onFrame: (frame: RelayedFrame) => void
}

export interface MediaHandlerOptions {
  /** Thay transport bằng fake trong test. */
  createPublisher?: (callbacks: MediaTransportCallbacks) => MediaPublisher
  createSubscriber?: (callbacks: MediaTransportCallbacks) => MediaSubscriber
  /**
   * Nơi phát sự kiện main → renderer. Mặc định gửi tới mọi cửa sổ đang mở; test truyền hàm
   * ghi nhận.
   */
  publish?: (channel: string, payload: unknown) => void
  /** Thay `console.warn` khi từ chối sender. */
  onRejectedSender?: (channel: string, origin: string) => void
  now?: () => number
}

export type ParsedMediaTarget =
  | { ok: true; value: MediaSessionTarget }
  | { ok: false; error: string }

/**
 * Validate mục tiêu kết nối media. `ticket` phải là chuỗi 1..512 byte UTF-8 — dùng đúng
 * giới hạn server áp dụng, để lỗi hiện ra ở UI thay vì bị server đóng socket.
 */
export function parseMediaTarget(raw: unknown): ParsedMediaTarget {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: MEDIA_ERROR.invalidHost }
  }
  const record = raw as { host?: unknown; mediaPort?: unknown; ticket?: unknown }
  const host = sanitizeHost(record.host)
  if (host === null) return { ok: false, error: MEDIA_ERROR.invalidHost }

  const mediaPort = parsePort(record.mediaPort)
  if (mediaPort === null) return { ok: false, error: MEDIA_ERROR.invalidPort }

  if (typeof record.ticket !== 'string') return { ok: false, error: MEDIA_ERROR.invalidTicket }
  const ticketBytes = Buffer.byteLength(record.ticket, 'utf8')
  if (ticketBytes < 1 || ticketBytes > MAX_TICKET_BYTES) {
    return { ok: false, error: MEDIA_ERROR.invalidTicket }
  }

  return { ok: true, value: { host, mediaPort, ticket: record.ticket } }
}

/** Origin rút gọn để log — không log query/hash vì có thể chứa token. */
function describeOrigin(rawUrl: string): string {
  try {
    return new URL(rawUrl).origin
  } catch {
    return '<invalid>'
  }
}

/**
 * Chỉ chấp nhận IPC từ main frame của renderer tin cậy. Sao chép đúng luật của control
 * handler; không import hàm private để hai file vẫn độc lập khi một bên đổi.
 */
function isTrustedInvokeSender(event: IpcMainInvokeEvent): boolean {
  try {
    const frame = event.senderFrame
    if (frame === null || frame === undefined) return false
    if (frame !== event.sender.mainFrame) return false
    return isTrustedRendererUrl(frame.url)
  } catch {
    return false
  }
}

function broadcastToWindows(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    const contents = win.webContents
    if (contents.isDestroyed()) continue
    contents.send(channel, payload)
  }
}

/** Chuyển `MediaInboundFrame.data` sang ArrayBuffer độc lập (structured clone an toàn). */
function toTransferable(jpeg: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(jpeg.length)
  copy.set(jpeg)
  return copy.buffer
}

/** Vision metadata gửi kèm frame renderer — đã đầy đủ field sau khi chuẩn hoá. */
function readVision(raw: unknown): Partial<VisionMetadata> | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  return raw as Partial<VisionMetadata>
}

/**
 * Đăng ký toàn bộ handler media. Trả về hàm dispose để gọi khi app thoát.
 *
 * LƯU Ý TÍCH HỢP: `src/main/index.ts` (architecture sở hữu) phải gọi
 * `registerMediaHandlers()` cạnh `registerControlHandlers()` thì `window.nq.media` mới hoạt
 * động ở runtime. Nếu chưa nối, preload fail closed bằng `MEDIA_UNAVAILABLE`.
 */
export function registerMediaHandlers(options: MediaHandlerOptions = {}): () => void {
  const emit = options.publish ?? broadcastToWindows
  const now = options.now ?? Date.now
  const reportRejectedSender =
    options.onRejectedSender ??
    ((channel: string, origin: string): void => {
      console.warn(`[nq] từ chối IPC ${channel} từ nguồn không tin cậy (${origin})`)
    })

  let publisher: MediaPublisher | null = null
  let subscriber: MediaSubscriber | null = null
  let lastPublisherMetrics: MediaChannelMetrics | null = null
  let lastSubscriberMetrics: MediaChannelMetrics | null = null

  const snapshot = (): MediaStatusSnapshot => {
    const base = createMediaStatusSnapshot(now())
    return {
      publisher: publisher?.status() ?? base.publisher,
      subscriber: subscriber?.status() ?? base.subscriber,
      publisherMetrics: publisher?.metrics() ?? lastPublisherMetrics ?? base.publisherMetrics,
      subscriberMetrics:
        subscriber?.metrics() ?? lastSubscriberMetrics ?? base.subscriberMetrics,
      subscriberPendingUsers: subscriber?.pendingUsers() ?? 0
    }
  }

  const pushStatus = (): void => {
    emit(NQ_MEDIA_CHANNELS.status, snapshot())
  }

  /** Frame relayed → `MediaInboundFrame` structured-clone-safe cho renderer. */
  const forwardFrame: MediaTransportCallbacks['onFrame'] = (frame) => {
    const payload: MediaInboundFrame = {
      userId: frame.userId,
      sequence: frame.sequence,
      serverReceivedAt: frame.serverReceivedEpochMillis,
      mimeType: 'image/jpeg',
      vision: frame.vision,
      data: toTransferable(frame.jpeg)
    }
    emit(NQ_MEDIA_CHANNELS.frame, payload)
  }

  const callbacks: MediaTransportCallbacks = { onStatus: () => pushStatus(), onFrame: forwardFrame }

  const publisherFactory: (callbacks: MediaTransportCallbacks) => MediaPublisher =
    options.createPublisher ??
    ((next) =>
      createMediaPublisher({
        onStatus: () => next.onStatus()
      }))

  const subscriberFactory: (callbacks: MediaTransportCallbacks) => MediaSubscriber =
    options.createSubscriber ??
    ((next) =>
      createMediaSubscriber({
        onFrame: (frame) => next.onFrame(frame),
        onStatus: () => next.onStatus()
      }))

  /** Publisher được tạo một lần cho mỗi phiên app để metrics tích luỹ đúng. */
  const ensurePublisher = (): MediaPublisher => {
    if (publisher !== null) return publisher
    publisher = publisherFactory(callbacks)
    return publisher
  }

  const acceptSender = (event: IpcMainInvokeEvent, channel: string): boolean => {
    if (isTrustedInvokeSender(event)) return true
    let origin = '<none>'
    try {
      origin = describeOrigin(event.senderFrame?.url ?? '')
    } catch {
      origin = '<none>'
    }
    reportRejectedSender(channel, origin)
    return false
  }

  const mapFailure = (error: unknown): MediaCommandResult => {
    const transport = error instanceof MediaTransportError ? error : null
    const code = transport?.code ?? MEDIA_ERROR.connectFailed
    return {
      ok: false,
      error: code,
      ...(transport?.ack === null || transport?.ack === undefined ? {} : { ack: transport.ack })
    }
  }

  const handleStartPublish = async (
    event: IpcMainInvokeEvent,
    raw: unknown
  ): Promise<MediaCommandResult> => {
    if (!acceptSender(event, NQ_MEDIA_CHANNELS.startPublish)) {
      return { ok: false, error: MEDIA_ERROR.untrustedSender }
    }
    const parsed = parseMediaTarget(raw)
    if (!parsed.ok) return { ok: false, error: parsed.error }

    try {
      const active = ensurePublisher()
      await active.start(parsed.value)
      return { ok: true }
    } catch (error) {
      console.error('[nq] media publish không mở được:', sanitizeDetail(error))
      return mapFailure(error)
    } finally {
      pushStatus()
    }
  }

  const handleStopPublish = async (event: IpcMainInvokeEvent): Promise<void> => {
    if (!acceptSender(event, NQ_MEDIA_CHANNELS.stopPublish)) return
    if (publisher !== null) {
      lastPublisherMetrics = publisher.metrics()
      await publisher.stop()
    }
    pushStatus()
  }

  const handlePublishFrame = (event: IpcMainInvokeEvent, raw: unknown): MediaCommandResult => {
    if (!acceptSender(event, NQ_MEDIA_CHANNELS.publishFrame)) {
      return { ok: false, error: MEDIA_ERROR.untrustedSender }
    }
    const parsed = parseMediaPublishFrame(raw, MEDIA_MAX_JPEG_BYTES)
    if (!parsed.ok) return { ok: false, error: parsed.error }
    if (publisher === null || publisher.status().state !== 'connected') {
      return { ok: false, error: MEDIA_ERROR.notStarted }
    }

    const frame = parsed.value
    const accepted = publisher.publish({
      sequence: frame.sequence,
      captureEpochMillis: frame.capturedAt,
      jpeg: frame.jpeg,
      vision: readVision(frame.vision)
    })
    return accepted ? { ok: true } : { ok: false, error: MEDIA_ERROR.sendFailed }
  }

  const handleStartSubscribe = async (
    event: IpcMainInvokeEvent,
    raw: unknown
  ): Promise<MediaCommandResult> => {
    if (!acceptSender(event, NQ_MEDIA_CHANNELS.startSubscribe)) {
      return { ok: false, error: MEDIA_ERROR.untrustedSender }
    }
    const parsed = parseMediaTarget(raw)
    if (!parsed.ok) return { ok: false, error: parsed.error }

    try {
      if (subscriber !== null) await subscriber.stop()
      lastSubscriberMetrics = null
      // Subscriber được dựng lại mỗi lần start để gắn callback phát frame/status của phiên này.
      subscriber = subscriberFactory(callbacks)
      await subscriber.start(parsed.value)
      return { ok: true }
    } catch (error) {
      console.error('[nq] media subscribe không mở được:', sanitizeDetail(error))
      return mapFailure(error)
    } finally {
      pushStatus()
    }
  }

  const handleStopSubscribe = async (event: IpcMainInvokeEvent): Promise<void> => {
    if (!acceptSender(event, NQ_MEDIA_CHANNELS.stopSubscribe)) return
    if (subscriber !== null) {
      lastSubscriberMetrics = subscriber.metrics()
      await subscriber.stop()
      subscriber = null
    }
    pushStatus()
  }

  const handleStatus = (event: IpcMainInvokeEvent): MediaStatusSnapshot => {
    if (!acceptSender(event, NQ_MEDIA_CHANNELS.status)) {
      // Snapshot rỗng: không phải bí mật nhưng không hé trạng thái của phiên thật.
      return createMediaStatusSnapshot(now())
    }
    return snapshot()
  }

  // Subscriber do handler tạo phải phát frame + status; factory riêng trong test tự lo callback.

  ipcMain.handle(NQ_MEDIA_CHANNELS.startPublish, handleStartPublish)
  ipcMain.handle(NQ_MEDIA_CHANNELS.stopPublish, handleStopPublish)
  ipcMain.handle(NQ_MEDIA_CHANNELS.publishFrame, handlePublishFrame)
  ipcMain.handle(NQ_MEDIA_CHANNELS.startSubscribe, handleStartSubscribe)
  ipcMain.handle(NQ_MEDIA_CHANNELS.stopSubscribe, handleStopSubscribe)
  ipcMain.handle(NQ_MEDIA_CHANNELS.status, handleStatus)

  return () => {
    ipcMain.removeHandler(NQ_MEDIA_CHANNELS.startPublish)
    ipcMain.removeHandler(NQ_MEDIA_CHANNELS.stopPublish)
    ipcMain.removeHandler(NQ_MEDIA_CHANNELS.publishFrame)
    ipcMain.removeHandler(NQ_MEDIA_CHANNELS.startSubscribe)
    ipcMain.removeHandler(NQ_MEDIA_CHANNELS.stopSubscribe)
    ipcMain.removeHandler(NQ_MEDIA_CHANNELS.status)
    void publisher?.stop().catch(() => undefined)
    void subscriber?.stop().catch(() => undefined)
    publisher = null
    subscriber = null
  }
}
