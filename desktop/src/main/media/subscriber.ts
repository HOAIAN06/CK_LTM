/**
 * Subscriber của kênh media (host xem camera người chơi).
 *
 * Hợp đồng hành vi (giữ đúng `ProctorMediaSubscriber` bên JavaFX):
 * - Handshake HOST_SUBSCRIBER + ticket, chờ ACK; timeout 10 giây; ACK != 0 là thất bại.
 * - Giữ **một frame mới nhất cho mỗi userId**; frame đến sau thay frame trước, không xếp hàng.
 * - Đẩy xuống renderer với tốc độ bị chặn (`frameIntervalMs`, mặc định ~15 fps): mỗi lượt
 *   tối đa một frame/người, nên UI không bao giờ bị dồn frame.
 * - Mất kết nối: báo trạng thái rồi dừng. **Không** tự retry vô hạn — server Java cấp ticket
 *   mới qua control channel, renderer quyết định mở lại.
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
import {
  RelayedFrameDecoder,
  decodeAck,
  encodeHandshake,
  type RelayedFrame
} from './codec'
import { MediaTransportError } from './errors'
import { sanitizeDetail } from './text'

/** ~15 fps: đủ mượt cho dashboard proctoring, không đốt CPU renderer. */
export const DEFAULT_SUBSCRIBER_FRAME_INTERVAL_MS = 66

/** Trần số người chơi đang giữ frame (phòng proctoring tối đa 6, dư địa cho an toàn). */
const DEFAULT_MAX_USERS = 32

export interface MediaSubscriberOptions {
  onFrame?: (frame: RelayedFrame) => void
  onStatus?: (status: MediaChannelStatus) => void
  onMetrics?: (metrics: MediaChannelMetrics) => void
  now?: () => number
  handshakeTimeoutMs?: number
  /** Khoảng cách tối thiểu giữa hai lần đẩy frame xuống renderer. */
  frameIntervalMs?: number
  maxUsers?: number
  /** Bật/tắt timer tự flush (test tắt để gọi `flush()` thủ công). */
  autoFlush?: boolean
}

export interface MediaSubscriber {
  start(target: MediaSessionTarget): Promise<MediaAckCode>
  stop(): Promise<void>
  /** Đẩy frame mới nhất xuống `onFrame`; trả số frame thực sự đẩy. `force` bỏ qua rate cap. */
  flush(force?: boolean): number
  status(): MediaChannelStatus
  metrics(): MediaChannelMetrics
  pendingUsers(): number
}

export function createMediaSubscriber(options: MediaSubscriberOptions = {}): MediaSubscriber {
  const now = options.now ?? Date.now
  const handshakeTimeoutMs = options.handshakeTimeoutMs ?? MEDIA_HANDSHAKE_TIMEOUT_MILLIS
  const frameIntervalMs = options.frameIntervalMs ?? DEFAULT_SUBSCRIBER_FRAME_INTERVAL_MS
  const maxUsers = options.maxUsers ?? DEFAULT_MAX_USERS
  const autoFlush = options.autoFlush ?? true

  let socket: Socket | null = null
  let decoder = new RelayedFrameDecoder()
  let state: MediaChannelState = 'idle'
  let target: MediaSessionTarget | null = null
  let lastError: string | null = null
  let lastAck: number | null = null
  let statusUpdatedAt = now()
  let flushTimer: ReturnType<typeof setInterval> | null = null
  let lastFlushAt = 0

  const latest = new Map<number, RelayedFrame>()
  const lastEmitted = new Map<number, number>()
  const counters = { offered: 0, completed: 0, dropped: 0, bytes: 0 }

  const emitStatus = (): void => {
    statusUpdatedAt = now()
    options.onStatus?.(status())
  }

  const setState = (next: MediaChannelState, error: string | null): void => {
    state = next
    lastError = error
    emitStatus()
  }

  const clearFlushTimer = (): void => {
    if (flushTimer !== null) {
      clearInterval(flushTimer)
      flushTimer = null
    }
  }

  const flush = (force = false): number => {
    const timestamp = now()
    if (!force && timestamp - lastFlushAt < frameIntervalMs) return 0
    lastFlushAt = timestamp
    if (latest.size === 0) return 0

    let emitted = 0
    for (const [userId, frame] of latest) {
      latest.delete(userId)
      const previous = lastEmitted.get(userId)
      if (previous !== undefined && frame.sequence <= previous) {
        // Frame cũ hơn frame đã hiển thị: bỏ (TCP đã giữ thứ tự, phòng khi server replay).
        counters.dropped += 1
        continue
      }
      lastEmitted.set(userId, frame.sequence)
      counters.completed += 1
      emitted += 1
      options.onFrame?.(frame)
    }
    if (emitted > 0) options.onMetrics?.(metrics())
    return emitted
  }

  const fail = (code: string, detail: string): void => {
    clearFlushTimer()
    latest.clear()
    const current = socket
    socket = null
    state = 'error'
    lastError = detail === '' ? code : detail
    emitStatus()
    if (current !== null) {
      current.removeAllListeners()
      current.destroy()
    }
  }

  const status = (): MediaChannelStatus => ({
    role: 'HOST_SUBSCRIBER',
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
    fps: 0,
    bytesPerSecond: 0,
    windowMs: 0
  })

  const stop = async (): Promise<void> => {
    clearFlushTimer()
    latest.clear()
    const current = socket
    socket = null
    if (current !== null) {
      current.removeAllListeners()
      current.destroy()
    }
    if (state !== 'idle') {
      state = 'idle'
      lastError = null
      emitStatus()
    }
  }

  const start = (nextTarget: MediaSessionTarget): Promise<MediaAckCode> => {
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

    clearFlushTimer()
    latest.clear()
    const previous = socket
    socket = null
    if (previous !== null) {
      previous.removeAllListeners()
      previous.destroy()
    }

    decoder = new RelayedFrameDecoder()
    // Sequence của publisher bắt đầu lại từ 1 sau khi server cấp phiên mới, nên phải xoá ký ức
    // "đã hiển thị sequence nào" — nếu không, frame đầu tiên của phiên mới bị coi là cũ.
    lastEmitted.clear()
    target = { host: nextTarget.host, mediaPort: nextTarget.mediaPort, ticket: nextTarget.ticket }
    lastAck = null
    lastError = null
    lastFlushAt = 0
    state = 'connecting'
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

      const timer = setTimeout(() => {
        settle(() => {
          fail(MEDIA_ERROR.connectTimeout, 'Handshake media quá 10 giây')
          reject(
            new MediaTransportError(MEDIA_ERROR.connectTimeout, 'Handshake media quá 10 giây')
          )
        })
      }, handshakeTimeoutMs)
      timer.unref?.()

      const onHandshakeData = (chunk: Buffer): void => {
        settle(() => {
          connection.removeListener('data', onHandshakeData)
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
          const leftover = chunk.length > 1 ? Uint8Array.from(chunk.subarray(1)) : null
          listenForFrames(leftover)
          resolve(ack)
        })
      }

      const listenForFrames = (leftover: Uint8Array | null): void => {
        if (autoFlush) {
          flushTimer = setInterval(() => flush(true), frameIntervalMs)
          flushTimer.unref?.()
        }

        const consume = (chunk: Uint8Array): void => {
          counters.bytes += chunk.length
          let frames: RelayedFrame[]
          try {
            frames = decoder.push(chunk)
          } catch (error) {
            fail(MEDIA_ERROR.sendFailed, sanitizeDetail(error))
            return
          }
          for (const frame of frames) {
            counters.offered += 1
            if (latest.size >= maxUsers && !latest.has(frame.userId)) {
              counters.dropped += 1
              continue
            }
            if (latest.has(frame.userId)) counters.dropped += 1
            latest.set(frame.userId, frame)
          }
          if (frames.length > 0) flush(false)
        }

        connection.on('data', consume)
        // Server có thể gửi frame ngay sau ACK trong cùng một packet.
        if (leftover !== null) consume(leftover)
      }

      connection.on('connect', () => {
        try {
          connection.write(encodeHandshake(MEDIA_ROLE_CODES.HOST_SUBSCRIBER, nextTarget.ticket))
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
          if (state === 'connected') fail(MEDIA_ERROR.socketClosed, sanitizeDetail(error))
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

  return {
    start,
    stop,
    flush,
    status,
    metrics,
    pendingUsers: () => latest.size
  }
}
