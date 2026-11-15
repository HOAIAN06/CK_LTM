import { createServer, type Server, type Socket } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ConnectionStatus } from '@shared/ipc'
import type { ServerMessage } from '@shared/protocol'
import {
  TransportFailure,
  createControlChannel,
  type ControlChannel,
  type TransportError
} from './control-channel'

interface TestServer {
  port: number
  nextConnection(): Promise<Socket>
  close(): Promise<void>
}

let cleanups: Array<() => void | Promise<void>> = []

afterEach(async () => {
  const pending = cleanups
  cleanups = []
  for (const cleanup of pending.reverse()) {
    try {
      await cleanup()
    } catch {
      // Best-effort teardown: a failed test must not leak a listening socket.
    }
  }
})

async function startServer(onConnection?: (socket: Socket) => void): Promise<TestServer> {
  const sockets = new Set<Socket>()
  const waiting: Array<(socket: Socket) => void> = []
  const queued: Socket[] = []
  let closed = false

  const server: Server = createServer((socket) => {
    sockets.add(socket)
    socket.on('error', () => {
      // Reset by the test is expected; never let it become an unhandled 'error' event.
    })
    socket.on('close', () => sockets.delete(socket))
    // A paused socket never emits 'end', so a half-close from the client would wait for the
    // transport's 2 s fallback timer. Real servers always drain.
    socket.resume()

    onConnection?.(socket)

    const waiter = waiting.shift()
    if (waiter) waiter(socket)
    else queued.push(socket)
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })
  server.on('error', () => {
    // Listener kept alive for post-listen errors.
  })

  const address = server.address()
  if (typeof address !== 'object' || address === null) {
    throw new Error('Test server không có địa chỉ')
  }

  const close = async (): Promise<void> => {
    if (closed) return
    closed = true
    for (const socket of sockets) socket.destroy()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }

  const testServer: TestServer = {
    port: address.port,
    nextConnection: () => {
      const socket = queued.shift()
      if (socket) return Promise.resolve(socket)
      return new Promise<Socket>((resolve) => waiting.push(resolve))
    },
    close
  }

  cleanups.push(close)
  return testServer
}

/** Ask the OS for a port, then release it so the next connect is refused. */
async function reserveClosedPort(): Promise<number> {
  const server = await startServer()
  const port = server.port
  await server.close()
  return port
}

interface Harness {
  channel: ControlChannel
  messages: ServerMessage[]
  statuses: ConnectionStatus[]
  errors: TransportError[]
  waitForState(state: ConnectionStatus['state'], timeoutMs?: number): Promise<ConnectionStatus>
}

function createHarness(): Harness {
  const messages: ServerMessage[] = []
  const statuses: ConnectionStatus[] = []
  const errors: TransportError[] = []

  interface Waiter {
    state: ConnectionStatus['state']
    resolve: (status: ConnectionStatus) => void
    timer: NodeJS.Timeout
  }
  let waiters: Waiter[] = []

  const channel = createControlChannel({
    onMessage: (message) => messages.push(message),
    onStatus: (status) => {
      statuses.push(status)
      const matching = waiters.filter((waiter) => waiter.state === status.state)
      waiters = waiters.filter((waiter) => waiter.state !== status.state)
      for (const waiter of matching) {
        clearTimeout(waiter.timer)
        waiter.resolve(status)
      }
    },
    onError: (error) => errors.push(error)
  })

  cleanups.push(() => channel.disconnect())

  const waitForState = (
    state: ConnectionStatus['state'],
    timeoutMs = 2_000
  ): Promise<ConnectionStatus> => {
    const existing = statuses.find((status) => status.state === state)
    if (existing) return Promise.resolve(existing)

    return new Promise<ConnectionStatus>((resolve, reject) => {
      const waiter: Waiter = {
        state,
        resolve,
        timer: setTimeout(() => undefined, 0)
      }
      clearTimeout(waiter.timer)
      waiter.timer = setTimeout(() => {
        waiters = waiters.filter((candidate) => candidate !== waiter)
        reject(new Error(`Hết thời gian chờ trạng thái ${state}`))
      }, timeoutMs)
      waiters.push(waiter)
    })
  }

  return { channel, messages, statuses, errors, waitForState }
}

/** Attach a newline splitter to a peer socket; returns the live array of received frames. */
function recordLines(socket: Socket): string[] {
  const lines: string[] = []
  let buffer = ''
  socket.on('data', (chunk: Buffer) => {
    buffer += chunk.toString('utf8')
    let newline = buffer.indexOf('\n')
    while (newline >= 0) {
      lines.push(buffer.slice(0, newline))
      buffer = buffer.slice(newline + 1)
      newline = buffer.indexOf('\n')
    }
  })
  return lines
}

describe('createControlChannel', () => {
  it('rejects missing callbacks', () => {
    expect(() => createControlChannel({} as never)).toThrow(TypeError)
  })

  it('rejects invalid connection options before opening a socket', async () => {
    const harness = createHarness()

    await expect(harness.channel.connect('', 5000)).rejects.toMatchObject({
      code: 'INVALID_OPTIONS'
    })
    await expect(harness.channel.connect('127.0.0.1', 0)).rejects.toMatchObject({
      code: 'INVALID_OPTIONS'
    })
    await expect(harness.channel.connect('127.0.0.1', 65_536)).rejects.toMatchObject({
      code: 'INVALID_OPTIONS'
    })
    expect(harness.statuses).toHaveLength(0)
  })

  it('connects, publishes status and disconnects cleanly', async () => {
    const server = await startServer()
    const harness = createHarness()

    await harness.channel.connect('127.0.0.1', server.port)
    expect(harness.channel.isConnected()).toBe(true)
    expect(harness.statuses.map((status) => status.state)).toEqual(['connecting', 'connected'])
    expect(harness.statuses[1]?.host).toBe('127.0.0.1')
    expect(harness.statuses[1]?.port).toBe(server.port)
    expect(harness.statuses[1]?.connectedAt).toEqual(expect.any(Number))

    const peer = await server.nextConnection()
    const peerClosed = new Promise<void>((resolve) => peer.once('close', () => resolve()))

    await harness.channel.disconnect()
    await peerClosed

    expect(harness.channel.isConnected()).toBe(false)
    expect(harness.channel.getStatus().state).toBe('disconnected')
    expect(harness.statuses.at(-1)?.state).toBe('disconnected')
    expect(harness.errors).toHaveLength(0)
  })

  it('sends a DISCONNECT frame before closing the socket', async () => {
    let lines: string[] = []
    const server = await startServer((socket) => {
      lines = recordLines(socket)
    })
    const harness = createHarness()

    await harness.channel.connect('127.0.0.1', server.port)
    await server.nextConnection()
    await harness.channel.disconnect()

    await vi.waitFor(() =>
      expect(lines).toContain('{"type":"DISCONNECT","payload":""}')
    )
  })

  it('keeps 100 back-to-back sends complete and ordered (single write path)', async () => {
    let lines: string[] = []
    const server = await startServer((socket) => {
      lines = recordLines(socket)
    })
    const harness = createHarness()

    await harness.channel.connect('127.0.0.1', server.port)
    await server.nextConnection()

    for (let index = 0; index < 100; index += 1) {
      harness.channel.send({ type: 'QUIZ_ROOM_JOIN', payload: { pin: String(100000 + index) } })
    }

    await vi.waitFor(() => expect(lines).toHaveLength(100))
    lines.forEach((line, index) => {
      expect(JSON.parse(line)).toEqual({
        type: 'QUIZ_ROOM_JOIN',
        payload: { pin: String(100000 + index) }
      })
    })
  })

  it('rejects a second connect while already connected', async () => {
    const server = await startServer()
    const harness = createHarness()

    await harness.channel.connect('127.0.0.1', server.port)
    await expect(harness.channel.connect('127.0.0.1', server.port)).rejects.toMatchObject({
      code: 'ALREADY_CONNECTED'
    })
  })

  it('reports CONNECT_FAILED when nothing is listening', async () => {
    const port = await reserveClosedPort()
    const harness = createHarness()

    await expect(harness.channel.connect('127.0.0.1', port)).rejects.toMatchObject({
      code: 'CONNECT_FAILED'
    })

    const status = await harness.waitForState('error')
    expect(status.lastError).toBeTruthy()
    expect(harness.channel.isConnected()).toBe(false)
    expect(harness.errors.map((error) => error.code)).toContain('CONNECT_FAILED')
  })

  it('sends one newline-terminated JSON frame per message', async () => {
    const lines: string[] = []
    const server = await startServer((socket) => {
      let buffer = ''
      socket.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf8')
        let newline = buffer.indexOf('\n')
        while (newline >= 0) {
          lines.push(buffer.slice(0, newline))
          buffer = buffer.slice(newline + 1)
          newline = buffer.indexOf('\n')
        }
      })
    })
    const harness = createHarness()
    await harness.channel.connect('127.0.0.1', server.port)

    harness.channel.send({
      type: 'LOGIN',
      payload: { username: 'an', password: 'secret' }
    })
    harness.channel.send({ type: 'CANCEL_MATCH', payload: '' })

    await vi.waitFor(() => expect(lines).toHaveLength(2))
    expect(lines[0]).toBe('{"type":"LOGIN","payload":{"username":"an","password":"secret"}}')
    expect(lines[1]).toBe('{"type":"CANCEL_MATCH","payload":""}')
    expect(lines.every((line) => !line.endsWith('\r'))).toBe(true)
  })

  it('decodes multiple frames per chunk and frames split across chunks', async () => {
    const server = await startServer()
    const harness = createHarness()
    await harness.channel.connect('127.0.0.1', server.port)
    const peer = await server.nextConnection()

    const question = JSON.stringify({
      type: 'QUIZ_QUESTION',
      payload: {
        sessionId: '123456',
        pin: '123456',
        attempt: 1,
        questionId: 42,
        content: 'こんにちは',
        choices: [{ choiceId: 101, content: 'Hello', position: 1 }],
        questionDurationSeconds: 30,
        roomRemainingSeconds: 300
      }
    })
    const score = JSON.stringify({
      type: 'SCORE_UPDATE',
      payload: { myScore: 3, opponentScore: 2 }
    })

    peer.write(`${score}\n${question.slice(0, 20)}`)
    peer.write(`${question.slice(20)}\n`)

    await vi.waitFor(() => expect(harness.messages).toHaveLength(2))

    const first = harness.messages[0]
    const second = harness.messages[1]
    if (first?.type !== 'SCORE_UPDATE' || second?.type !== 'QUIZ_QUESTION') {
      throw new Error('Unexpected message order')
    }
    expect(first.payload).toEqual({ myScore: 3, opponentScore: 2 })
    expect(second.payload.content).toBe('こんにちは')
    expect(second.payload.choices[0]?.choiceId).toBe(101)
  })

  it('reports CONNECTION_LOST when the server closes unexpectedly', async () => {
    const server = await startServer()
    const harness = createHarness()
    await harness.channel.connect('127.0.0.1', server.port)
    const peer = await server.nextConnection()

    peer.destroy()

    const status = await harness.waitForState('error')
    expect(status.lastError).toBeTruthy()
    expect(harness.channel.isConnected()).toBe(false)
    expect(harness.errors.map((error) => error.code)).toContain('CONNECTION_LOST')
  })

  it('reports PROTOCOL_ERROR for an invalid server frame and keeps reading the stream', async () => {
    const server = await startServer()
    const harness = createHarness()
    await harness.channel.connect('127.0.0.1', server.port)
    const peer = await server.nextConnection()

    peer.write('not-json\n{"type":"WAITING","payload":null}\n')

    await vi.waitFor(() => expect(harness.messages).toHaveLength(1))
    expect(harness.errors.map((error) => error.code)).toContain('PROTOCOL_ERROR')
    // A complete-but-invalid line does not desynchronize framing, so the session stays usable.
    expect(harness.channel.isConnected()).toBe(true)
    expect(harness.messages[0]).toEqual({ type: 'WAITING', payload: null })
  })

  it('ignores unknown-but-valid JSON and never echoes its payload in the error', async () => {
    const server = await startServer()
    const harness = createHarness()
    await harness.channel.connect('127.0.0.1', server.port)
    const peer = await server.nextConnection()

    peer.write('{"type":"NOPE","payload":{"password":"hunter2"}}\n')
    peer.write('{"type":"QUIZ_ERROR","payload":"INVALID_PIN"}\n')

    await vi.waitFor(() => expect(harness.messages).toHaveLength(1))
    expect(harness.errors).toHaveLength(1)
    expect(harness.errors[0]?.code).toBe('PROTOCOL_ERROR')
    expect(harness.errors[0]?.message).not.toContain('hunter2')
    expect(harness.errors[0]?.message).not.toContain('password')
    expect(harness.messages[0]).toEqual({ type: 'QUIZ_ERROR', payload: 'INVALID_PIN' })
    expect(harness.channel.isConnected()).toBe(true)
  })

  it('rejects send before connect', () => {
    const harness = createHarness()

    try {
      harness.channel.send({ type: 'CONNECT', payload: '' })
      throw new Error('expected send to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(TransportFailure)
      expect((error as TransportFailure).code).toBe('NOT_CONNECTED')
    }
  })

  it('allows a fresh connect after a clean disconnect', async () => {
    const server = await startServer()
    const harness = createHarness()

    await harness.channel.connect('127.0.0.1', server.port)
    await harness.channel.disconnect()
    await harness.channel.connect('127.0.0.1', server.port)

    expect(harness.channel.isConnected()).toBe(true)
    expect(harness.statuses.map((status) => status.state)).toEqual([
      'connecting',
      'connected',
      'disconnected',
      'connecting',
      'connected'
    ])
  })
})
