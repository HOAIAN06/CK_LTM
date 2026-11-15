/**
 * Test cho ranh giới IPC điều khiển (`src/main/ipc/register-control-handlers.ts`).
 *
 * Trọng tâm:
 * - Validator của dữ liệu renderer gửi lên (host/port/envelope) — renderer là KHÔNG tin cậy.
 * - Handler **không bao giờ ném lỗi qua IPC**: mọi thất bại mong đợi trả `NqResult`.
 * - Sender lạ bị từ chối nhưng không làm sập handler.
 * - Trạng thái do main quyết định và được phát cho renderer qua `nq:event`.
 *
 * `electron` được mock: test này không chạy app thật, không mở cửa sổ, không mở socket
 * (transport được thay bằng fake qua `createChannel`).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IpcMainInvokeEvent } from 'electron'
import {
  IPC_CHANNELS,
  NQ_ERROR,
  createIdleConnectionStatus,
  type ConnectionStatus,
  type NqEvent,
  type NqResult,
  type OutboundMessage,
  type ServerMessage
} from '@shared/ipc'
import type { ControlChannel, ControlChannelOptions } from '@main/net'
import {
  isOutboundFrame,
  normalizeStatus,
  parseConnectOptions,
  parsePort,
  registerControlHandlers,
  sanitizeErrorMessage,
  sanitizeHost
} from './register-control-handlers'

/** IPC handler đã đăng ký, theo channel. `vi.hoisted` để mock factory thấy được map này. */
const ipc = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>()
  return {
    handlers,
    electron: {
      // `security.ts` đọc `app.isPackaged` ở module scope để quyết định có tin dev server.
      app: { isPackaged: false },
      ipcMain: {
        handle(channel: string, handler: (...args: unknown[]) => unknown): void {
          handlers.set(channel, handler)
        },
        removeHandler(channel: string): void {
          handlers.delete(channel)
        }
      },
      BrowserWindow: {
        getAllWindows: () => [] as unknown[]
      }
    }
  }
})

vi.mock('electron', () => ipc.electron)

// `security.ts` đọc biến này ở module scope; test phải chạy như bản production.
vi.hoisted(() => {
  delete process.env['ELECTRON_RENDERER_URL']
})

const TRUSTED_URL = 'nq-app://nihongoquest/index.html'
const UNTRUSTED_URL = 'https://evil.example/app'

interface FakeEventOptions {
  url?: string
  /** `false` mô phỏng IPC từ iframe (không phải main frame). */
  mainFrame?: boolean
}

function makeEvent(options: FakeEventOptions = {}): IpcMainInvokeEvent {
  const frame = { url: options.url ?? TRUSTED_URL }
  const mainFrame = options.mainFrame === false ? { url: TRUSTED_URL } : frame
  return { senderFrame: frame, sender: { mainFrame } } as unknown as IpcMainInvokeEvent
}

function invoke(channel: string, event: IpcMainInvokeEvent, ...args: unknown[]): unknown {
  const handler = ipc.handlers.get(channel)
  if (!handler) throw new Error(`Chưa đăng ký handler cho ${channel}`)
  return handler(event, ...args)
}

interface Deferred {
  promise: Promise<void>
  resolve: () => void
}

function deferred(): Deferred {
  let resolve: () => void = () => undefined
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

interface FakeTransport {
  state: {
    connected: boolean
    connectCalls: Array<{ host: string; port: number }>
    disconnectCalls: number
    sent: OutboundMessage[]
    pendingConnect: Deferred | null
    connectError: Error | null
    sendError: Error | null
  }
  createChannel: (options: ControlChannelOptions) => ControlChannel
  options: () => ControlChannelOptions
}

function createFakeTransport(): FakeTransport {
  const state: FakeTransport['state'] = {
    connected: false,
    connectCalls: [],
    disconnectCalls: 0,
    sent: [],
    pendingConnect: null,
    connectError: null,
    sendError: null
  }

  let captured: ControlChannelOptions | null = null

  const createChannel = (options: ControlChannelOptions): ControlChannel => {
    captured = options
    return {
      async connect(host: string, port: number): Promise<void> {
        state.connectCalls.push({ host, port })
        if (state.pendingConnect) await state.pendingConnect.promise
        if (state.connectError) throw state.connectError
        state.connected = true
        options.onStatus({
          state: 'connected',
          host,
          port,
          lastError: null,
          connectedAt: 1_700_000_000_000
        })
      },
      async disconnect(): Promise<void> {
        state.disconnectCalls += 1
        state.connected = false
        options.onStatus({
          state: 'disconnected',
          host: null,
          port: null,
          lastError: null,
          connectedAt: null
        })
      },
      send(frame: OutboundMessage): void {
        if (state.sendError) throw state.sendError
        state.sent.push(frame)
      },
      isConnected(): boolean {
        return state.connected
      },
      getStatus(): ConnectionStatus {
        return createIdleConnectionStatus()
      }
    }
  }

  return {
    state,
    createChannel,
    options: () => {
      if (!captured) throw new Error('transport chưa được tạo')
      return captured
    }
  }
}

interface Harness {
  transport: FakeTransport
  events: NqEvent[]
  rejected: Array<{ channel: string; origin: string }>
  dispose: () => void
}

function setup(): Harness {
  ipc.handlers.clear()
  const transport = createFakeTransport()
  const events: NqEvent[] = []
  const rejected: Array<{ channel: string; origin: string }> = []

  const dispose = registerControlHandlers({
    createChannel: transport.createChannel,
    publish: (event) => events.push(event),
    onRejectedSender: (channel, origin) => rejected.push({ channel, origin })
  })

  return { transport, events, rejected, dispose }
}

beforeEach(() => {
  ipc.handlers.clear()
})

describe('sanitizeHost', () => {
  it('chấp nhận hostname, IPv4 và IPv6 in được', () => {
    expect(sanitizeHost('localhost')).toBe('localhost')
    expect(sanitizeHost(' 192.168.1.10 ')).toBe('192.168.1.10')
    expect(sanitizeHost('::1')).toBe('::1')
    expect(sanitizeHost('nq.example.com')).toBe('nq.example.com')
  })

  it('từ chối ký tự có thể dùng để injection hoặc đường dẫn', () => {
    for (const bad of ['', '   ', 'a b', 'a/b', 'a\\b', 'user@host', 'host?x', 'host#frag']) {
      expect(sanitizeHost(bad)).toBeNull()
    }
  })

  it('từ chối kiểu không phải string và chuỗi quá dài', () => {
    expect(sanitizeHost(undefined)).toBeNull()
    expect(sanitizeHost(1234)).toBeNull()
    expect(sanitizeHost('a'.repeat(256))).toBeNull()
  })
})

describe('parsePort', () => {
  it('chấp nhận số nguyên 1..65535 và chuỗi toàn chữ số', () => {
    expect(parsePort(5000)).toBe(5000)
    expect(parsePort('5000')).toBe(5000)
    expect(parsePort(' 1 ')).toBe(1)
    expect(parsePort(65535)).toBe(65535)
  })

  it('từ chối ngoài khoảng, số thực, số âm và chuỗi không hợp lệ', () => {
    expect(parsePort(0)).toBeNull()
    expect(parsePort(65536)).toBeNull()
    expect(parsePort(5000.5)).toBeNull()
    expect(parsePort(-1)).toBeNull()
    expect(parsePort('5000abc')).toBeNull()
    expect(parsePort('')).toBeNull()
    expect(parsePort(null)).toBeNull()
  })
})

describe('parseConnectOptions', () => {
  it('trả lỗi INVALID_HOST cho dữ liệu không phải object', () => {
    expect(parseConnectOptions(null)).toEqual({ ok: false, error: NQ_ERROR.invalidHost })
    expect(parseConnectOptions('localhost:5000')).toEqual({
      ok: false,
      error: NQ_ERROR.invalidHost
    })
    expect(parseConnectOptions([])).toEqual({ ok: false, error: NQ_ERROR.invalidHost })
  })

  it('phân biệt lỗi host và lỗi port', () => {
    expect(parseConnectOptions({ host: '', port: 5000 })).toEqual({
      ok: false,
      error: NQ_ERROR.invalidHost
    })
    expect(parseConnectOptions({ host: 'localhost', port: 0 })).toEqual({
      ok: false,
      error: NQ_ERROR.invalidPort
    })
  })

  it('chuẩn hoá giá trị hợp lệ', () => {
    expect(parseConnectOptions({ host: ' localhost ', port: '5000' })).toEqual({
      ok: true,
      value: { host: 'localhost', port: 5000 }
    })
  })
})

describe('isOutboundFrame', () => {
  it('chỉ chấp nhận object có type là chuỗi hợp lý', () => {
    expect(isOutboundFrame({ type: 'LOGIN_REQUEST', payload: {} })).toBe(true)
    expect(isOutboundFrame({ type: '', payload: {} })).toBe(false)
    expect(isOutboundFrame({ payload: {} })).toBe(false)
    expect(isOutboundFrame({ type: 'A'.repeat(65) })).toBe(false)
    expect(isOutboundFrame(null)).toBe(false)
    expect(isOutboundFrame([])).toBe(false)
    expect(isOutboundFrame('LOGIN_REQUEST')).toBe(false)
  })
})

describe('normalizeStatus', () => {
  it('làm sạch lastError và bỏ field sai kiểu', () => {
    const status = normalizeStatus({
      state: 'error',
      host: 'localhost',
      port: 5000,
      lastError: 'ECONNREFUSED\n\tat 127.0.0.1',
      connectedAt: null
    })
    expect(status.lastError).toBe('ECONNREFUSED at 127.0.0.1')
    expect(status.host).toBe('localhost')
    expect(status.port).toBe(5000)
  })

  it('giữ connectedAt = null khi chưa kết nối', () => {
    const status = normalizeStatus(createIdleConnectionStatus())
    expect(status).toEqual(createIdleConnectionStatus())
  })
})

describe('sanitizeErrorMessage', () => {
  it('loại control character và cắt độ dài', () => {
    expect(sanitizeErrorMessage('a\u0000b\u001fc')).toBe('a b c')
    expect(sanitizeErrorMessage('')).toBe('Lỗi không xác định')
    expect(sanitizeErrorMessage(new Error('   '))).toBe('Lỗi không xác định')
    expect(sanitizeErrorMessage(new Error('x'.repeat(400)))).toHaveLength(301)
  })
})

describe('registerControlHandlers — kênh điều khiển', () => {
  it('đăng ký đủ 4 channel invoke và dispose gỡ hết', () => {
    const harness = setup()
    for (const channel of [
      IPC_CHANNELS.connect,
      IPC_CHANNELS.disconnect,
      IPC_CHANNELS.send,
      IPC_CHANNELS.status
    ]) {
      expect(ipc.handlers.has(channel)).toBe(true)
    }
    expect(ipc.handlers.size).toBe(4)

    harness.dispose()
    expect(ipc.handlers.size).toBe(0)
    expect(harness.transport.state.disconnectCalls).toBe(1)
  })

  it('connect hợp lệ → ok:true, phát trạng thái connecting rồi connected', async () => {
    const harness = setup()
    const result = (await invoke(IPC_CHANNELS.connect, makeEvent(), {
      host: 'localhost',
      port: 5000
    })) as NqResult

    expect(result).toEqual({ ok: true })
    expect(harness.transport.state.connectCalls).toEqual([{ host: 'localhost', port: 5000 }])
    const states = harness.events.filter((e) => e.kind === 'status').map((e) => e.status?.state)
    expect(states).toEqual(['connecting', 'connected'])
  })

  it('connect với host/port sai → trả mã lỗi, không chạm transport', async () => {
    const harness = setup()

    const badHost = (await invoke(IPC_CHANNELS.connect, makeEvent(), {
      host: 'bad host',
      port: 5000
    })) as NqResult
    const badPort = (await invoke(IPC_CHANNELS.connect, makeEvent(), {
      host: 'localhost',
      port: 70000
    })) as NqResult

    expect(badHost).toEqual({ ok: false, error: NQ_ERROR.invalidHost })
    expect(badPort).toEqual({ ok: false, error: NQ_ERROR.invalidPort })
    expect(harness.transport.state.connectCalls).toHaveLength(0)
  })

  it('hai connect đồng thời → lệnh thứ hai nhận CONNECT_IN_PROGRESS', async () => {
    const harness = setup()
    const gate = deferred()
    harness.transport.state.pendingConnect = gate

    const first = invoke(IPC_CHANNELS.connect, makeEvent(), { host: 'localhost', port: 5000 })
    const second = (await invoke(IPC_CHANNELS.connect, makeEvent(), {
      host: 'localhost',
      port: 5000
    })) as NqResult

    expect(second).toEqual({ ok: false, error: NQ_ERROR.connectInProgress })

    gate.resolve()
    await expect(first).resolves.toEqual({ ok: true })
  })

  it('connect thất bại → CONNECT_FAILED kèm trạng thái error đã làm sạch', async () => {
    const harness = setup()
    harness.transport.state.connectError = new Error('connect ECONNREFUSED\n127.0.0.1:5000')

    const result = (await invoke(IPC_CHANNELS.connect, makeEvent(), {
      host: 'localhost',
      port: 5000
    })) as NqResult

    expect(result).toEqual({ ok: false, error: NQ_ERROR.connectFailed })
    const last = harness.events.filter((e) => e.kind === 'status').at(-1)
    expect(last?.status?.state).toBe('error')
    expect(last?.status?.lastError).toBe('connect ECONNREFUSED 127.0.0.1:5000')
  })

  it('timeout của transport → mã CONNECT_TIMEOUT riêng cho UI', async () => {
    const harness = setup()
    harness.transport.state.connectError = Object.assign(new Error('Hết thời gian kết nối'), {
      code: 'CONNECT_TIMEOUT'
    })

    const result = (await invoke(IPC_CHANNELS.connect, makeEvent(), {
      host: 'localhost',
      port: 5000
    })) as NqResult

    expect(result).toEqual({ ok: false, error: NQ_ERROR.connectTimeout })
  })

  it('send khi chưa kết nối → NOT_CONNECTED; frame sai hình dạng → INVALID_FRAME', () => {
    const harness = setup()

    expect(invoke(IPC_CHANNELS.send, makeEvent(), { type: 'LOGIN_REQUEST' })).toEqual({
      ok: false,
      error: NQ_ERROR.notConnected
    })
    expect(invoke(IPC_CHANNELS.send, makeEvent(), null)).toEqual({
      ok: false,
      error: NQ_ERROR.invalidFrame
    })
    expect(harness.transport.state.sent).toHaveLength(0)
  })

  it('send sau khi kết nối → chuyển nguyên frame cho transport', async () => {
    const harness = setup()
    await invoke(IPC_CHANNELS.connect, makeEvent(), { host: 'localhost', port: 5000 })

    const frame = { type: 'LOGIN_REQUEST', payload: { username: 'u', password: 'p' } }
    expect(invoke(IPC_CHANNELS.send, makeEvent(), frame)).toEqual({ ok: true })
    expect(harness.transport.state.sent).toEqual([frame])
  })

  it('transport ném lỗi khi send → SEND_FAILED, không ném qua IPC', async () => {
    const harness = setup()
    await invoke(IPC_CHANNELS.connect, makeEvent(), { host: 'localhost', port: 5000 })
    harness.transport.state.sendError = Object.assign(new Error('write EPIPE'), {
      code: 'SEND_FAILED'
    })

    const result = invoke(IPC_CHANNELS.send, makeEvent(), { type: 'LOGIN_REQUEST' }) as NqResult

    expect(result).toEqual({ ok: false, error: NQ_ERROR.sendFailed })
    expect(harness.transport.state.sent).toHaveLength(0)
  })

  it('disconnect phát trạng thái disconnected và giữ host/port gần nhất', async () => {
    const harness = setup()
    await invoke(IPC_CHANNELS.connect, makeEvent(), { host: 'localhost', port: 5000 })

    await invoke(IPC_CHANNELS.disconnect, makeEvent())

    const last = harness.events.filter((e) => e.kind === 'status').at(-1)
    expect(last?.status).toMatchObject({
      state: 'disconnected',
      host: 'localhost',
      port: 5000,
      connectedAt: null
    })
    expect(harness.transport.state.disconnectCalls).toBe(1)
  })

  it('status trả snapshot do main giữ', async () => {
    setup()
    await invoke(IPC_CHANNELS.connect, makeEvent(), { host: 'localhost', port: 5000 })

    const status = invoke(IPC_CHANNELS.status, makeEvent()) as ConnectionStatus
    expect(status.state).toBe('connected')
    expect(status.host).toBe('localhost')
    expect(status.port).toBe(5000)
  })

  it('transport đẩy message server → phát đúng một event kind=message', () => {
    const harness = setup()
    const message: ServerMessage = {
      type: 'LOGIN_RESPONSE',
      payload: { success: true }
    } as unknown as ServerMessage
    harness.transport.options().onMessage(message)

    const messages = harness.events.filter((e) => e.kind === 'message')
    expect(messages).toHaveLength(1)
    expect(messages[0]?.message).toMatchObject({ type: 'LOGIN_RESPONSE' })
  })

  it('transport đẩy transport-error → event đã làm sạch, không lẫn payload', () => {
    const harness = setup()
    harness.transport.options().onError({
      code: 'CONNECTION_LOST',
      message: 'Server đã đóng kết nối\r\n'
    })

    const errors = harness.events.filter((e) => e.kind === 'transport-error')
    expect(errors).toHaveLength(1)
    expect(errors[0]?.error).toEqual({
      code: 'CONNECTION_LOST',
      message: 'Server đã đóng kết nối'
    })
  })

  it('transport báo frame không encode được → INVALID_FRAME_DATA', async () => {
    const harness = setup()
    await invoke(IPC_CHANNELS.connect, makeEvent(), { host: 'localhost', port: 5000 })
    harness.transport.state.sendError = Object.assign(new Error('payload sai'), {
      code: 'INVALID_FRAME'
    })

    const result = invoke(IPC_CHANNELS.send, makeEvent(), { type: 'LOGIN_REQUEST' }) as NqResult

    expect(result).toEqual({ ok: false, error: NQ_ERROR.invalidFrameData })
  })

  it('sender ngoài origin app → UNTRUSTED_SENDER, không chạm transport', async () => {
    const harness = setup()

    const result = (await invoke(
      IPC_CHANNELS.connect,
      makeEvent({ url: UNTRUSTED_URL }),
      { host: 'localhost', port: 5000 }
    )) as NqResult

    expect(result).toEqual({ ok: false, error: NQ_ERROR.untrustedSender })
    expect(harness.transport.state.connectCalls).toHaveLength(0)
    expect(harness.rejected).toEqual([
      { channel: IPC_CHANNELS.connect, origin: 'https://evil.example' }
    ])
  })

  it('IPC từ iframe (không phải main frame) bị từ chối', async () => {
    const harness = setup()

    const result = (await invoke(IPC_CHANNELS.connect, makeEvent({ mainFrame: false }), {
      host: 'localhost',
      port: 5000
    })) as NqResult

    expect(result).toEqual({ ok: false, error: NQ_ERROR.untrustedSender })
    expect(harness.transport.state.connectCalls).toHaveLength(0)
  })

  it('sender lạ không làm sập disconnect/status (không throw qua IPC)', async () => {
    const harness = setup()
    const event = makeEvent({ url: UNTRUSTED_URL })

    await expect(invoke(IPC_CHANNELS.disconnect, event)).resolves.toBeUndefined()
    expect(invoke(IPC_CHANNELS.status, event)).toEqual(createIdleConnectionStatus())
    expect(harness.transport.state.disconnectCalls).toBe(0)
    expect(harness.rejected).toHaveLength(2)
  })
})
