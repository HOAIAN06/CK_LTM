/**
 * Publisher test với **TCP loopback thật** (`node:net`), không mock socket.
 *
 * Nhờ vậy test chứng minh được: handshake đúng byte, framing đúng, và bất biến latest-frame
 * (không có hàng đợi vô hạn) mà không cần webcam hay display.
 */
import { createServer, type Server, type Socket } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { MEDIA_ACK_INVALID_TICKET, MEDIA_ROLE_CODES, MEDIA_VERSION } from '@shared/protocol/media'
import { createMediaPublisher, type MediaPublisher } from './publisher'
import { MediaTransportError } from './errors'
import { RelayedFrameDecoder, decodePublishedFrame, encodeRelayedFrame } from './codec'

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xd9])
const TICKET = 'ticket-abc'

interface FakeRelay {
  port: number
  close: () => Promise<void>
  /** Byte thô client gửi tới (sau handshake là các publisher frame). */
  received: () => Buffer
  sockets: Socket[]
}

function startRelay(ack: number, options: { closeAfterAck?: boolean } = {}): Promise<FakeRelay> {
  return new Promise((resolve, reject) => {
    const sockets: Socket[] = []
    const chunks: Buffer[] = []
    let acknowledged = false
    const server: Server = createServer((socket) => {
      sockets.push(socket)
      socket.on('error', () => undefined)
      socket.on('data', (chunk) => {
        // Giữ nguyên byte thô: test tự cắt handshake và frame theo offset đã biết.
        chunks.push(Buffer.from(chunk))
        if (acknowledged) return
        acknowledged = true
        socket.write(Buffer.from([ack]))
        if (options.closeAfterAck === true) socket.destroy()
      })
    })
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address === null || typeof address === 'string') {
        reject(new Error('Không lấy được cổng relay giả'))
        return
      }
      resolve({
        port: address.port,
        sockets,
        received: () => Buffer.concat(chunks),
        close: () =>
          new Promise<void>((done) => {
            for (const socket of sockets) socket.destroy()
            server.close(() => done())
          })
      })
    })
  })
}

async function waitFor(predicate: () => boolean, timeoutMs = 2_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('Hết thời gian chờ điều kiện test')
    await new Promise((done) => setTimeout(done, 10))
  }
}

const cleanups: Array<() => Promise<void>> = []
const publishers: MediaPublisher[] = []

afterEach(async () => {
  for (const publisher of publishers.splice(0)) await publisher.stop()
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

function track(publisher: MediaPublisher): MediaPublisher {
  publishers.push(publisher)
  return publisher
}

describe('publisher handshake', () => {
  it('sends MAGIC/VERSION/PUBLISHER/ticket and accepts ACK 0', async () => {
    const relay = await startRelay(0)
    cleanups.push(relay.close)

    const publisher = track(createMediaPublisher())
    const ack = await publisher.start({ host: '127.0.0.1', mediaPort: relay.port, ticket: TICKET })

    expect(ack).toBe(0)
    expect(publisher.status()).toMatchObject({
      role: 'PUBLISHER',
      state: 'connected',
      host: '127.0.0.1',
      port: relay.port,
      lastError: null,
      ack: 0
    })

    publisher.publish({ sequence: 1, captureEpochMillis: 1000, jpeg: JPEG })
    await waitFor(() => relay.received().length >= 8 + TICKET.length + 21 + 4 + 38)

    const bytes = relay.received()
    expect(bytes.readInt32BE(0)).toBe(0x4e514d50)
    expect(bytes.readUInt8(4)).toBe(MEDIA_VERSION)
    expect(bytes.readUInt8(5)).toBe(MEDIA_ROLE_CODES.PUBLISHER)
    expect(bytes.readUInt16BE(6)).toBe(TICKET.length)
    expect(bytes.subarray(8, 8 + TICKET.length).toString('utf8')).toBe(TICKET)

    const frame = decodePublishedFrame(bytes.subarray(8 + TICKET.length))
    expect(frame.sequence).toBe(1)
    expect(Buffer.from(frame.jpeg)).toEqual(JPEG)
  })

  it('rejects a non-zero ACK with the byte code and never sends frames', async () => {
    const relay = await startRelay(MEDIA_ACK_INVALID_TICKET)
    cleanups.push(relay.close)

    const publisher = track(createMediaPublisher())
    const error = await publisher
      .start({ host: '127.0.0.1', mediaPort: relay.port, ticket: TICKET })
      .then(() => null)
      .catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(MediaTransportError)
    expect((error as MediaTransportError).code).toBe('MEDIA_ACK_REJECTED')
    expect((error as MediaTransportError).ack).toBe(MEDIA_ACK_INVALID_TICKET)
    expect(publisher.status().state).toBe('error')
    expect(publisher.publish({ sequence: 1, captureEpochMillis: 1, jpeg: JPEG })).toBe(false)
    expect(publisher.metrics().offered).toBe(1)
    expect(publisher.metrics().dropped).toBe(1)
  })

  it('fails a silent server after the handshake timeout', async () => {
    // Server không bao giờ trả ACK.
    const silentSockets: Socket[] = []
    const server = createServer((socket) => {
      silentSockets.push(socket)
      socket.on('error', () => undefined)
      // Phải đọc dữ liệu, nếu không socket bị pause sẽ không bao giờ thấy FIN và
      // `server.close()` treo.
      socket.on('data', () => undefined)
    })
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', () => done()))
    const address = server.address()
    const port = address !== null && typeof address === 'object' ? address.port : 0
    cleanups.push(
      () =>
        new Promise<void>((done) => {
          for (const socket of silentSockets) socket.destroy()
          server.close(() => done())
        })
    )

    const publisher = track(createMediaPublisher({ handshakeTimeoutMs: 40 }))
    const error = await publisher
      .start({ host: '127.0.0.1', mediaPort: port, ticket: TICKET })
      .then(() => null)
      .catch((reason: unknown) => reason)

    expect((error as MediaTransportError).code).toBe('MEDIA_CONNECT_TIMEOUT')
    expect(publisher.status().state).toBe('error')
  })

  it('reports connect failure when nothing is listening', async () => {
    const publisher = track(createMediaPublisher())
    const error = await publisher
      .start({ host: '127.0.0.1', mediaPort: 1, ticket: TICKET })
      .then(() => null)
      .catch((reason: unknown) => reason)

    expect((error as MediaTransportError).code).toBe('MEDIA_CONNECT_FAILED')
    expect(publisher.status().state).toBe('error')
  })
})

describe('publisher latest-frame semantics', () => {
  it('keeps only the newest pending frame while the socket is busy', async () => {
    const relay = await startRelay(0)
    cleanups.push(relay.close)

    // Ghi bị giữ lại: callback chỉ chạy khi test giải phóng.
    const pendingWrites: Array<{ buffer: Buffer; done: () => void }> = []
    const publisher = track(
      createMediaPublisher({
        writeFrame: (_socket, buffer, done) => {
          pendingWrites.push({ buffer, done: () => done(undefined) })
        }
      })
    )
    await publisher.start({ host: '127.0.0.1', mediaPort: relay.port, ticket: TICKET })

    expect(publisher.publish({ sequence: 1, captureEpochMillis: 1, jpeg: JPEG })).toBe(true)
    expect(pendingWrites).toHaveLength(1)

    // Trong lúc bận: frame 2 rồi 3, chỉ frame 3 được giữ.
    expect(publisher.publish({ sequence: 2, captureEpochMillis: 2, jpeg: JPEG })).toBe(true)
    expect(publisher.publish({ sequence: 3, captureEpochMillis: 3, jpeg: JPEG })).toBe(true)
    expect(publisher.pendingFrames()).toBe(1)

    // Hoàn tất lượt ghi đầu → frame 3 được ghi tiếp, frame 2 bị bỏ.
    pendingWrites[0].done()
    await waitFor(() => pendingWrites.length === 2)
    expect(decodePublishedFrame(pendingWrites[0].buffer).sequence).toBe(1)
    expect(decodePublishedFrame(pendingWrites[1].buffer).sequence).toBe(3)
    expect(publisher.pendingFrames()).toBe(0)
    expect(publisher.metrics()).toMatchObject({ offered: 3, dropped: 1, completed: 1 })
  })

  it('never queues more than one frame even under a burst', async () => {
    const relay = await startRelay(0)
    cleanups.push(relay.close)

    const pendingWrites: Array<() => void> = []
    const publisher = track(
      createMediaPublisher({
        writeFrame: (_socket, _buffer, done) => {
          pendingWrites.push(() => done(undefined))
        }
      })
    )
    await publisher.start({ host: '127.0.0.1', mediaPort: relay.port, ticket: TICKET })

    for (let sequence = 1; sequence <= 50; sequence += 1) {
      publisher.publish({ sequence, captureEpochMillis: sequence, jpeg: JPEG })
    }
    expect(publisher.pendingFrames()).toBe(1)
    expect(pendingWrites).toHaveLength(1)
    expect(publisher.metrics()).toMatchObject({ offered: 50, dropped: 48 })
  })
})

describe('publisher failure behaviour', () => {
  it('refuses to send after the socket errors', async () => {
    const relay = await startRelay(0, { closeAfterAck: true })
    cleanups.push(relay.close)

    const publisher = track(createMediaPublisher())
    await publisher.start({ host: '127.0.0.1', mediaPort: relay.port, ticket: TICKET })

    await waitFor(() => publisher.status().state === 'error')
    expect(publisher.status().lastError).not.toBeNull()
    expect(publisher.publish({ sequence: 1, captureEpochMillis: 1, jpeg: JPEG })).toBe(false)
    expect(publisher.metrics().dropped).toBe(1)
  })

  it('drops an oversized frame without killing the channel', async () => {
    const relay = await startRelay(0)
    cleanups.push(relay.close)

    const publisher = track(createMediaPublisher())
    await publisher.start({ host: '127.0.0.1', mediaPort: relay.port, ticket: TICKET })

    const oversized = Buffer.alloc(524_289, 1)
    expect(publisher.publish({ sequence: 1, captureEpochMillis: 1, jpeg: oversized })).toBe(true)
    expect(publisher.status().state).toBe('connected')
    expect(publisher.metrics().dropped).toBe(1)

    // Kênh vẫn dùng được với frame hợp lệ.
    expect(publisher.publish({ sequence: 2, captureEpochMillis: 2, jpeg: JPEG })).toBe(true)
    await waitFor(() => relay.received().length >= 8 + TICKET.length + 21 + 4 + 38)
  })

  it('never logs or returns the ticket in status', async () => {
    const relay = await startRelay(0)
    cleanups.push(relay.close)

    const publisher = track(createMediaPublisher())
    await publisher.start({ host: '127.0.0.1', mediaPort: relay.port, ticket: TICKET })

    const serialized = JSON.stringify(publisher.status())
    expect(serialized).not.toContain(TICKET)
    expect(serialized).not.toContain('ticket')
  })

  it('is idempotent when start is called twice with the same target', async () => {
    const relay = await startRelay(0)
    cleanups.push(relay.close)

    const publisher = track(createMediaPublisher())
    await publisher.start({ host: '127.0.0.1', mediaPort: relay.port, ticket: TICKET })
    await publisher.start({ host: '127.0.0.1', mediaPort: relay.port, ticket: TICKET })
    expect(relay.sockets).toHaveLength(1)
  })
})

describe('codec helpers used by relayed traffic', () => {
  it('round-trips a relayed frame through the decoder', () => {
    const decoder = new RelayedFrameDecoder()
    const frames = decoder.push(
      encodeRelayedFrame({
        userId: 4,
        sequence: 2,
        serverReceivedEpochMillis: 1_700_000_000_000,
        jpeg: JPEG
      })
    )
    expect(frames).toHaveLength(1)
    expect(frames[0].userId).toBe(4)
  })
})
