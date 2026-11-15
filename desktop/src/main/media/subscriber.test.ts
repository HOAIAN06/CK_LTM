/**
 * Subscriber test với TCP loopback thật.
 *
 * Trọng tâm: handshake HOST_SUBSCRIBER, latest-frame theo từng user, dedupe theo sequence và
 * trần tốc độ đẩy xuống renderer. Không cần webcam/display.
 */
import { createServer, type Server, type Socket } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { MEDIA_ACK_ROOM_CLOSED, MEDIA_ROLE_CODES, MEDIA_VERSION } from '@shared/protocol/media'
import { createMediaSubscriber, type MediaSubscriber } from './subscriber'
import { MediaTransportError } from './errors'
import { encodeRelayedFrame } from './codec'

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xd9])
const TICKET = 'host-ticket-1'

interface FakeServer {
  port: number
  /** Gửi byte thô tới subscriber. */
  send: (buffer: Buffer) => void
  /** Số kết nối đã chấp nhận (để chứng minh không auto-retry). */
  connections: () => number
  handshake: () => Buffer
  close: () => Promise<void>
}

function startServer(ack: number, options: { closeAfterAck?: boolean } = {}): Promise<FakeServer> {
  return new Promise((resolve, reject) => {
    const sockets: Socket[] = []
    let accepted = 0
    let handshake = Buffer.alloc(0)

    const server: Server = createServer((socket) => {
      accepted += 1
      sockets.push(socket)
      socket.on('error', () => undefined)
      socket.once('data', (chunk) => {
        handshake = Buffer.from(chunk)
        socket.write(Buffer.from([ack]))
        if (options.closeAfterAck === true) socket.end()
      })
    })
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address === null || typeof address === 'string') {
        reject(new Error('Không lấy được cổng server giả'))
        return
      }
      resolve({
        port: address.port,
        connections: () => accepted,
        handshake: () => handshake,
        send: (buffer) => {
          const socket = sockets[sockets.length - 1]
          if (socket !== undefined) socket.write(buffer)
        },
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

const relays: Array<() => Promise<void>> = []
const subscribers: MediaSubscriber[] = []

afterEach(async () => {
  for (const subscriber of subscribers.splice(0)) await subscriber.stop()
  for (const cleanup of relays.splice(0)) await cleanup()
})

function frame(userId: number, sequence: number): Buffer {
  return encodeRelayedFrame({
    userId,
    sequence,
    serverReceivedEpochMillis: 1_700_000_000_000 + sequence,
    jpeg: JPEG
  })
}

describe('subscriber handshake', () => {
  it('sends MAGIC/VERSION/HOST_SUBSCRIBER/ticket and accepts ACK 0', async () => {
    const server = await startServer(0)
    relays.push(server.close)

    const received: Array<{ userId: number; sequence: number }> = []
    const subscriber = createMediaSubscriber({
      autoFlush: false,
      onFrame: (incoming) => received.push({ userId: incoming.userId, sequence: incoming.sequence })
    })
    subscribers.push(subscriber)

    const ack = await subscriber.start({
      host: '127.0.0.1',
      mediaPort: server.port,
      ticket: TICKET
    })
    expect(ack).toBe(0)
    expect(subscriber.status()).toMatchObject({
      role: 'HOST_SUBSCRIBER',
      state: 'connected',
      ack: 0
    })

    const handshake = server.handshake()
    expect(handshake.readInt32BE(0)).toBe(0x4e514d50)
    expect(handshake.readUInt8(4)).toBe(MEDIA_VERSION)
    expect(handshake.readUInt8(5)).toBe(MEDIA_ROLE_CODES.HOST_SUBSCRIBER)
    expect(handshake.readUInt16BE(6)).toBe(TICKET.length)
    expect(handshake.subarray(8, 8 + TICKET.length).toString('utf8')).toBe(TICKET)
  })

  it('rejects a non-zero ACK with the byte code', async () => {
    const server = await startServer(MEDIA_ACK_ROOM_CLOSED)
    relays.push(server.close)

    const subscriber = createMediaSubscriber({ autoFlush: false })
    subscribers.push(subscriber)

    const error = await subscriber
      .start({ host: '127.0.0.1', mediaPort: server.port, ticket: TICKET })
      .then(() => null)
      .catch((reason: unknown) => reason)

    expect((error as MediaTransportError).code).toBe('MEDIA_ACK_REJECTED')
    expect((error as MediaTransportError).ack).toBe(MEDIA_ACK_ROOM_CLOSED)
    expect(subscriber.status().state).toBe('error')
  })
})

describe('subscriber latest-frame per user', () => {
  it('keeps only the newest frame of each player in one flush', async () => {
    const server = await startServer(0)
    relays.push(server.close)

    const received: Array<{ userId: number; sequence: number }> = []
    const subscriber = createMediaSubscriber({
      autoFlush: false,
      onFrame: (incoming) => received.push({ userId: incoming.userId, sequence: incoming.sequence })
    })
    subscribers.push(subscriber)
    await subscriber.start({ host: '127.0.0.1', mediaPort: server.port, ticket: TICKET })

    // Ba frame trong cùng một lần ghi: user 1 (seq 1, 2) và user 2 (seq 5).
    server.send(Buffer.concat([frame(1, 1), frame(1, 2), frame(5, 1)]))

    await waitFor(() => received.length >= 2)
    expect(received).toEqual([
      { userId: 1, sequence: 2 },
      { userId: 5, sequence: 1 }
    ])
    expect(subscriber.metrics()).toMatchObject({ offered: 3, completed: 2, dropped: 1 })
    expect(subscriber.pendingUsers()).toBe(0)
  })

  it('drops a frame with an older sequence than the last one shown', async () => {
    const server = await startServer(0)
    relays.push(server.close)

    const received: number[] = []
    const subscriber = createMediaSubscriber({
      autoFlush: false,
      // interval 0 = mỗi lần nhận là một lượt đẩy, để test dedupe tất định.
      frameIntervalMs: 0,
      onFrame: (incoming) => received.push(incoming.sequence)
    })
    subscribers.push(subscriber)
    await subscriber.start({ host: '127.0.0.1', mediaPort: server.port, ticket: TICKET })

    server.send(frame(1, 9))
    await waitFor(() => received.length === 1)

    server.send(frame(1, 4))
    await waitFor(() => subscriber.metrics().offered === 2)
    expect(received).toEqual([9])
    expect(subscriber.metrics().dropped).toBe(1)

    server.send(frame(1, 10))
    await waitFor(() => received.length === 2)
    expect(received).toEqual([9, 10])
  })

  it('accepts sequence 1 again after a new media session', async () => {
    const first = await startServer(0)
    relays.push(first.close)

    const received: number[] = []
    const subscriber = createMediaSubscriber({
      autoFlush: false,
      frameIntervalMs: 0,
      onFrame: (incoming) => received.push(incoming.sequence)
    })
    subscribers.push(subscriber)
    await subscriber.start({ host: '127.0.0.1', mediaPort: first.port, ticket: TICKET })

    first.send(frame(1, 9))
    await waitFor(() => received.length === 1)
    await subscriber.stop()

    // Phiên mới: publisher đánh sequence lại từ 1, host vẫn phải thấy frame.
    const second = await startServer(0)
    relays.push(second.close)
    await subscriber.start({ host: '127.0.0.1', mediaPort: second.port, ticket: 'ticket-2' })
    second.send(frame(1, 1))
    await waitFor(() => received.length === 2)
    expect(received).toEqual([9, 1])
  })

  it('bounds the number of players kept in memory', async () => {
    const server = await startServer(0)
    relays.push(server.close)

    const received: number[] = []
    const subscriber = createMediaSubscriber({
      autoFlush: false,
      frameIntervalMs: 0,
      maxUsers: 1,
      onFrame: (incoming) => received.push(incoming.userId)
    })
    subscribers.push(subscriber)
    await subscriber.start({ host: '127.0.0.1', mediaPort: server.port, ticket: TICKET })

    server.send(Buffer.concat([frame(1, 1), frame(2, 1)]))
    await waitFor(() => received.length === 1)
    expect(received).toEqual([1])
    expect(subscriber.metrics().dropped).toBe(1)
    // Người chơi thứ hai không được giữ trong bộ nhớ.
    expect(subscriber.pendingUsers()).toBe(0)
  })
})

describe('subscriber rate cap', () => {
  it('emits at most once per interval unless forced', async () => {
    const server = await startServer(0)
    relays.push(server.close)

    let clock = 1_000
    const received: number[] = []
    const subscriber = createMediaSubscriber({
      autoFlush: false,
      frameIntervalMs: 66,
      now: () => clock,
      onFrame: (incoming) => received.push(incoming.sequence)
    })
    subscribers.push(subscriber)
    await subscriber.start({ host: '127.0.0.1', mediaPort: server.port, ticket: TICKET })

    server.send(frame(1, 1))
    await waitFor(() => subscriber.metrics().offered === 1)
    expect(received).toEqual([1])

    // Frame thứ hai tới ngay sau đó: chưa đủ 66 ms nên chưa được đẩy xuống.
    clock += 10
    server.send(frame(1, 2))
    await waitFor(() => subscriber.metrics().offered === 2)
    expect(received).toEqual([1])
    expect(subscriber.pendingUsers()).toBe(1)

    // Timer flush bỏ qua rate cap và chỉ đẩy frame mới nhất.
    clock += 60
    expect(subscriber.flush(true)).toBe(1)
    expect(received).toEqual([1, 2])
  })
})

describe('subscriber failure behaviour', () => {
  it('reports the disconnect and does not retry', async () => {
    const server = await startServer(0, { closeAfterAck: true })
    relays.push(server.close)

    const statuses: string[] = []
    const subscriber = createMediaSubscriber({
      autoFlush: false,
      onStatus: (status) => statuses.push(status.state)
    })
    subscribers.push(subscriber)
    await subscriber.start({ host: '127.0.0.1', mediaPort: server.port, ticket: TICKET })

    await waitFor(() => subscriber.status().state !== 'connected' && subscriber.status().state !== 'connecting')
    expect(subscriber.status().state).toBe('error')
    expect(statuses).toContain('error')
    // Không có vòng retry: chỉ một kết nối duy nhất tới server.
    await new Promise((done) => setTimeout(done, 50))
    expect(server.connections()).toBe(1)
  })

  it('never puts the ticket into status', async () => {
    const server = await startServer(0)
    relays.push(server.close)

    const subscriber = createMediaSubscriber({ autoFlush: false })
    subscribers.push(subscriber)
    await subscriber.start({ host: '127.0.0.1', mediaPort: server.port, ticket: TICKET })

    const serialized = JSON.stringify(subscriber.status())
    expect(serialized).not.toContain(TICKET)
    expect(serialized).not.toContain('ticket')
  })
})
