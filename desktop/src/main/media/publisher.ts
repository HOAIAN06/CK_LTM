/**
 * Publisher của kênh media: một TCP socket nhị phân gửi JPEG lên `ProctorMediaRelay`.
 *
 * Hợp đồng hành vi (giữ đúng `ProctorMediaPublisher` bên JavaFX):
 * - Handshake PUBLISHER + ticket, chờ **một byte ACK**; timeout 10 giây
 *   (`MediaProtocol.HANDSHAKE_TIMEOUT_MILLIS`). ACK != 0 là thất bại, không retry.
 * - **Latest-frame**: chỉ một frame đang ghi; frame mới đến khi đang bận sẽ thay thế frame
 *   đang chờ. Không có hàng đợi, nên bộ nhớ bị chặn trên bởi một ảnh JPEG (≤ 512 KiB).
 * - Lỗi socket → trạng thái `error`; `publish()` sau đó trả `false` và không ghi gì thêm.
 * - Không log ticket, không log nội dung frame.
 */
import { connect as createConnection, type Socket } from 'node:net'
import {
  MEDIA_HANDSHAKE_TIMEOUT_MILLIS,
  MEDIA_ROLE_CODES,
  mediaAckMessage,
  type MediaAckCode
} from '@shared/protocol/media'
import {
  MEDIA_ERROR,
  createMediaMetrics,
  type MediaChannelMetrics,
  type MediaChannelState,
  type MediaChannelStatus,
  type MediaSessionTarget
} from '@shared/media-ipc'
import { encodeHandshake, encodePublishedFrame, decodeAck, type PublishedFrameInput } from './codec'
import { MediaTransportError } from './errors'
import { sanitizeDetail } from './text'

export interface MediaPublisherOptions {
  /** Phát mỗi khi trạng thái đổi (main sẽ forward xuống renderer). */
  onStatus?: (status: MediaChannelStatus) => void
  /** Phát metrics theo cửa sổ (mặc định 5 giây, giống `proctor_pipeline` bên Java). */
  onMetrics?: (metrics: MediaChannelMetrics) => void
  now?: () => number
  handshakeTimeoutMs?: number
  metricsIntervalMs?: number
  /**
   * Packet writer dùng cho test: mặc định ghi thẳng vào socket. Callback báo khi đã đẩy
   * xong buffer (tương đương `socket.write(buf, cb)`).
   */
  writeFrame?: (
    socket: Socket,
    buffer: Buffer,
    done: (error?: Error | null) => void
  ) => void
}

export interface MediaPublisher {
  /** Mở kết nối + handshake. Resolve bằng ACK (luôn 0 khi thành công). */
  start(target: MediaSessionTarget): Promise<MediaAckCode>
  /**
   * Đưa frame vào kênh. `false` khi kênh chưa mở/đã lỗi (frame bị bỏ, không ném lỗi).
   * `true` khi frame được ghi ngay hoặc thay thế frame đang chờ.
   */
  publish(frame: PublishedFrameInput): boolean
  stop(): Promise<void>
  status(): MediaChannelStatus
  metrics(): MediaChannelMetrics
  /** Số frame đang chờ ghi (0 hoặc 1) — bất biến latest-frame. */
  pendingFrames(): number
}

export function createMediaPublisher(options: MediaPublisherOptions = {}): MediaPublisher {
  const now = options.now ?? Date.now
  const handshakeTimeoutMs = options.handshakeTimeoutMs ?? MEDIA_HANDSHAKE_TIMEOUT_MILLIS
  const metricsIntervalMs = options.metricsIntervalMs ?? 5_000
  const writeTo =
    options.writeFrame ??
    ((socket: Socket, buffer: Buffer, done: (error?: Error | null) => void): void => {
      socket.write(buffer, (error?: Error | null) => done(error))
    })

  let socket: Socket | null = null
  let state: MediaChannelState = 'idle'
  let target: MediaSessionTarget | null = null
  let lastError: string | null = null
  let lastAck: number | null = null
  let statusUpdatedAt = now()

  let pending: PublishedFrameInput | null = null
  let busy = false

  const counters = { offered: 0, completed: 0, dropped: 0, bytes: 0 }
  let windowStart = now()
  let windowFrames = 0
  let windowBytes = 0
  let lastFps = 0
  let lastBytesPerSecond = 0
  let lastWindowMs = 0

  const emitStatus = (): void => {
    statusUpdatedAt = now()
    options.onStatus?.(status())
  }

  const setState = (next: MediaChannelState, error: string | null = null): void => {
    if (state === next && error === lastError) return
    state = next
    lastError = error
    emitStatus()
  }

  const emitMetrics = (): void => {
    options.onMetrics?.(metrics())
  }

  const recordCompleted = (bytes: number): void => {
    counters.completed += 1
    counters.bytes += bytes
    windowFrames += 1
    windowBytes += bytes

    const timestamp = now()
    const elapsed = timestamp - windowStart
    if (elapsed >= metricsIntervalMs) {
      lastFps = windowFrames === 0 ? 0 : (windowFrames * 1000) / elapsed
      lastBytesPerSecond = (windowBytes * 1000) / elapsed
      lastWindowMs = elapsed
      windowStart = timestamp
      windowFrames = 0
      windowBytes = 0
      emitMetrics()
    }
  }

  const fail = (code: string, detail: string): void => {
    pending = null
    busy = false
    const current = socket
    socket = null
    setState('error', detail === '' ? code : detail)
    if (current !== null) {
      current.removeAllListeners()
      current.destroy()
    }
  }

  const writeFrame = (frame: PublishedFrameInput): void => {
    const active = socket
    if (active === null || state !== 'connected') return

    let buffer: Buffer
    try {
      buffer = encodePublishedFrame(frame)
    } catch (error) {
      // Frame hỏng (JPEG rỗng/quá lớn) không được làm chết kênh: bỏ frame, đếm dropped.
      counters.dropped += 1
      void error
      return
    }

    busy = true
    writeTo(active, buffer, (error?: Error | null) => {
      busy = false
      if (error !== undefined) {
        fail(MEDIA_ERROR.sendFailed, sanitizeDetail(error))
        return
      }
      recordCompleted(buffer.length)
      const next = pending
      pending = null
      if (next !== null) writeFrame(next)
    })
  }

  const status = (): MediaChannelStatus => ({
    role: 'PUBLISHER',
    state,
    host: target?.host ?? null,
    port: target?.mediaPort ?? null,
    lastError,
    ack: lastAck,
    updatedAt: statusUpdatedAt
  })

  const metrics = (): MediaChannelMetrics => ({
    ...createMediaMetrics(),
    offered: counters.offered,
    completed: counters.completed,
    dropped: counters.dropped,
    bytes: counters.bytes,
    fps: lastFps,
    bytesPerSecond: lastBytesPerSecond,
    windowMs: lastWindowMs
  })

  const start = (nextTarget: MediaSessionTarget): Promise<MediaAckCode> => {
    // Kết nối lại cùng mục tiêu là no-op, tránh rung UI khi renderer gọi lặp.
    if (
      state === 'connected' &&
      target !== null &&
      target.host === nextTarget.host &&
      target.mediaPort === nextTarget.mediaPort &&
      target.ticket === nextTarget.ticket &&
      socket !== null &&
      !socket.destroyed
    ) {
      return Promise.resolve(0 as MediaAckCode)
    }

    // Đóng kết nối cũ trước: không bao giờ có hai socket media cùng lúc.
    closeSocket()

    target = { host: nextTarget.host, mediaPort: nextTarget.mediaPort, ticket: nextTarget.ticket }
    lastAck = null
    state = 'connecting'
    lastError = null
    emitStatus()

    return new Promise<MediaAckCode>((resolve, reject) => {
      let settled = false
      const settle = (fn: () => void): void => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        fn()
      }

      let connection: Socket
      try {
        connection = createConnection({ host: nextTarget.host, port: nextTarget.mediaPort })
      } catch (error) {
        setState('error', sanitizeDetail(error))
        reject(new MediaTransportError(MEDIA_ERROR.connectFailed, sanitizeDetail(error)))
        return
      }
      connection.setNoDelay(true)
      socket = connection

      const onHandshakeData = (chunk: Buffer): void => {
        settle(() => {
          connection.removeListener('data', onHandshakeData)
          // Chỉ cần byte đầu: server trả đúng một byte ACK.
          let ack: MediaAckCode
          try {
            ack = decodeAck(chunk.length > 0 ? chunk.readUInt8(0) : -1)
          } catch (error) {
            fail(MEDIA_ERROR.ackRejected, sanitizeDetail(error))
            reject(new MediaTransportError(MEDIA_ERROR.ackRejected, sanitizeDetail(error)))
            return
          }
          lastAck = ack
          if (ack !== 0) {
            fail(MEDIA_ERROR.ackRejected, mediaAckMessage(ack))
            reject(new MediaTransportError(MEDIA_ERROR.ackRejected, mediaAckMessage(ack), ack))
            return
          }
          state = 'connected'
          lastError = null
          emitStatus()
          // TCP có thể trả ACK cùng lúc với byte đầu của luồng sau; hiện server không gửi gì
          // thêm cho publisher nên bỏ phần dư (nếu có) là an toàn.
          connection.resume()
          resolve(ack)
        })
      }

      const timer = setTimeout(() => {
        settle(() => {
          connection.removeListener('data', onHandshakeData)
          fail(MEDIA_ERROR.connectTimeout, 'Handshake media quá 10 giây')
          reject(
            new MediaTransportError(MEDIA_ERROR.connectTimeout, 'Handshake media quá 10 giây')
          )
        })
      }, handshakeTimeoutMs)
      // Không giữ event loop sống chỉ vì hạn handshake.
      timer.unref?.()

      connection.on('connect', () => {
        try {
          connection.write(encodeHandshake(MEDIA_ROLE_CODES.PUBLISHER, nextTarget.ticket))
        } catch (error) {
          settle(() => {
            fail(MEDIA_ERROR.connectFailed, sanitizeDetail(error))
            reject(new MediaTransportError(MEDIA_ERROR.connectFailed, sanitizeDetail(error)))
          })
          return
        }
        connection.on('data', onHandshakeData)
      })

      connection.on('error', (error: Error) => {
        if (settled) {
          if (state === 'connected') fail(MEDIA_ERROR.sendFailed, sanitizeDetail(error))
          return
        }
        settle(() => {
          fail(MEDIA_ERROR.connectFailed, sanitizeDetail(error))
          reject(new MediaTransportError(MEDIA_ERROR.connectFailed, sanitizeDetail(error)))
        })
      })

      connection.on('close', () => {
        if (settled) {
          if (state === 'connected' || state === 'connecting') {
            fail(MEDIA_ERROR.socketClosed, 'Media server đã đóng kết nối')
          }
          return
        }
        settle(() => {
          state = 'disconnected'
          lastError = 'Media server đã đóng kết nối trước khi handshake xong'
          // Socket đã chết: bỏ tham chiếu để lần `stop()`/`start()` sau không giữ rác.
          socket = null
          emitStatus()
          reject(new MediaTransportError(MEDIA_ERROR.socketClosed, lastError))
        })
      })
    })
  }

  const publish = (frame: PublishedFrameInput): boolean => {
    counters.offered += 1
    if (state !== 'connected' || socket === null || socket.destroyed) {
      counters.dropped += 1
      return false
    }
    if (busy) {
      // Latest-frame: thay frame đang chờ, frame cũ bị bỏ (không xếp hàng).
      if (pending !== null) counters.dropped += 1
      pending = frame
      return true
    }
    writeFrame(frame)
    return true
  }

  function closeSocket(): void {
    const current = socket
    socket = null
    busy = false
    pending = null
    if (current === null) return
    current.removeAllListeners()
    current.destroy()
  }

  const stop = async (): Promise<void> => {
    closeSocket()
    if (state !== 'idle') {
      state = 'idle'
      lastError = null
      emitStatus()
    }
    emitMetrics()
  }

  return {
    start,
    publish,
    stop,
    status,
    metrics,
    pendingFrames: () => (pending === null ? 0 : 1)
  }
}
