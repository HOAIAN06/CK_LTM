/**
 * Test cho ranh giới IPC của kênh media (`src/main/ipc/register-media-handlers.ts`).
 *
 * Trọng tâm:
 * - Validator: kích thước buffer, hình dạng frame, host/port/ticket — renderer là KHÔNG tin cậy.
 * - Handler **không bao giờ ném lỗi qua IPC**; mọi thất bại trả `MediaCommandResult`.
 * - Sender lạ bị từ chối và không chạm transport.
 * - Ticket không bị echo/log.
 * - Frame relayed được chuyển thành `MediaInboundFrame` (ArrayBuffer) cho renderer.
 *
 * `electron` được mock: không mở cửa sổ, không mở socket (transport là fake).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IpcMainInvokeEvent } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc'
import {
  MEDIA_ERROR,
  NQ_MEDIA_CHANNELS,
  parseMediaPublishFrame,
  type MediaChannelStatus
} from '@shared/media-ipc'
import { unavailableVisionMetadata } from '@shared/protocol/media'
import type { RelayedFrame } from '@main/media/codec'
import type { MediaPublisher } from '@main/media/publisher'
import type { MediaSubscriber } from '@main/media/subscriber'
import { MediaTransportError } from '@main/media/errors'
import {
  parseMediaTarget,
  registerMediaHandlers,
  type MediaTransportCallbacks
} from './register-media-handlers'

const ipc = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>()
  return {
    handlers,
    electron: {
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

vi.hoisted(() => {
  delete process.env['ELECTRON_RENDERER_URL']
})

const TRUSTED_URL = 'nq-app://nihongoquest/index.html'
const UNTRUSTED_URL = 'https://evil.example/app'
const TICKET = 'secret-ticket-value'

function makeEvent(url = TRUSTED_URL, mainFrame = true): IpcMainInvokeEvent {
  const frame = { url }
  const main = mainFrame ? frame : { url: TRUSTED_URL }
  return { senderFrame: frame, sender: { mainFrame: main } } as unknown as IpcMainInvokeEvent
}

interface FakeTransport {
  publisher: MediaPublisher
  subscriber: MediaSubscriber
  callbacks: MediaTransportCallbacks[]
  publishCalls: Array<{ sequence: number; captureEpochMillis: number; jpegLength: number }>
  startPublisher: ReturnType<typeof vi.fn>
  startSubscriber: ReturnType<typeof vi.fn>
  stopPublisher: ReturnType<typeof vi.fn>
  stopSubscriber: ReturnType<typeof vi.fn>
}

function createFakeTransport(state: 'connected' | 'idle' = 'connected'): FakeTransport {
  const callbacks: MediaTransportCallbacks[] = []
  const publishCalls: FakeTransport['publishCalls'] = []

  const status = (role: 'PUBLISHER' | 'HOST_SUBSCRIBER'): MediaChannelStatus => ({
    role,
    state: state === 'connected' ? 'connected' : 'idle',
    host: '127.0.0.1',
    port: 5001,
    lastError: null,
    ack: 0,
    updatedAt: 1
  })

  const startPublisher = vi.fn(async () => 0 as const)
  const startSubscriber = vi.fn(async () => 0 as const)
  const stopPublisher = vi.fn(async () => undefined)
  const stopSubscriber = vi.fn(async () => undefined)

  const publisher: MediaPublisher = {
    start: startPublisher as unknown as MediaPublisher['start'],
    publish: (frame) => {
      publishCalls.push({
        sequence: frame.sequence,
        captureEpochMillis: frame.captureEpochMillis,
        jpegLength: frame.jpeg.length
      })
      return true
    },
    stop: stopPublisher,
    status: () => status('PUBLISHER'),
    metrics: () => ({
      offered: publishCalls.length,
      completed: publishCalls.length,
      dropped: 0,
      bytes: 0,
      fps: 0,
      bytesPerSecond: 0,
      windowMs: 0
    }),
    pendingFrames: () => 0
  }

  const subscriber: MediaSubscriber = {
    start: startSubscriber as unknown as MediaSubscriber['start'],
    stop: stopSubscriber,
    flush: () => 0,
    status: () => status('HOST_SUBSCRIBER'),
    metrics: () => ({
      offered: 0,
      completed: 0,
      dropped: 0,
      bytes: 0,
      fps: 0,
      bytesPerSecond: 0,
      windowMs: 0
    }),
    pendingUsers: () => 2
  }

  return {
    publisher,
    subscriber,
    callbacks,
    publishCalls,
    startPublisher,
    startSubscriber,
    stopPublisher,
    stopSubscriber
  }
}

const published: Array<{ channel: string; payload: unknown }> = []

function register(transport: FakeTransport, state: 'connected' | 'idle' = 'connected'): () => void {
  return registerMediaHandlers({
    createPublisher: (callbacks) => {
      transport.callbacks.push(callbacks)
      return {
        ...transport.publisher,
        status: () => ({ ...transport.publisher.status(), state })
      }
    },
    createSubscriber: (callbacks) => {
      transport.callbacks.push(callbacks)
      return transport.subscriber
    },
    publish: (channel, payload) => {
      published.push({ channel, payload })
    },
    onRejectedSender: () => undefined,
    now: () => 1_700_000_000_000
  })
}

function handler(channel: string): (...args: unknown[]) => unknown {
  const entry = ipc.handlers.get(channel)
  if (entry === undefined) throw new Error(`Chưa đăng ký handler ${channel}`)
  return entry
}

function jpegPayload(size = 128): { meta: Record<string, unknown>; data: ArrayBuffer } {
  return {
    meta: {
      sequence: 3,
      capturedAt: 1_700_000_000_000,
      width: 640,
      height: 480,
      mimeType: 'image/jpeg'
    },
    data: new Uint8Array(size).buffer
  }
}

const validTarget = { host: '127.0.0.1', mediaPort: 5001, ticket: TICKET }

beforeEach(() => {
  ipc.handlers.clear()
  published.length = 0
})

describe('channel names', () => {
  it('reuses the two channel names reserved in shared/ipc.ts', () => {
    expect(NQ_MEDIA_CHANNELS.publishFrame).toBe(IPC_CHANNELS.mediaPublishFrame)
    expect(NQ_MEDIA_CHANNELS.frame).toBe(IPC_CHANNELS.mediaFrame)
  })

  it('pins the reserved names from docs/desktop/contracts.md §4', () => {
    expect(NQ_MEDIA_CHANNELS).toEqual({
      publishFrame: 'nq:media:publish-frame',
      startPublish: 'nq:media:start-publish',
      stopPublish: 'nq:media:stop-publish',
      startSubscribe: 'nq:media:start-subscribe',
      stopSubscribe: 'nq:media:stop-subscribe',
      status: 'nq:media:status',
      frame: 'nq:media:frame'
    })
  })
})

describe('parseMediaTarget', () => {
  it('accepts a valid target and a numeric-string port', () => {
    expect(parseMediaTarget(validTarget)).toEqual({ ok: true, value: validTarget })
    expect(parseMediaTarget({ host: ' 127.0.0.1 ', mediaPort: '5001', ticket: 't' })).toEqual({
      ok: true,
      value: { host: '127.0.0.1', mediaPort: 5001, ticket: 't' }
    })
  })

  it('rejects a bad host', () => {
    expect(parseMediaTarget({ ...validTarget, host: 'has space' })).toEqual({
      ok: false,
      error: MEDIA_ERROR.invalidHost
    })
    expect(parseMediaTarget({ ...validTarget, host: '' })).toEqual({
      ok: false,
      error: MEDIA_ERROR.invalidHost
    })
    expect(parseMediaTarget({ ...validTarget, host: 'a/b' })).toEqual({
      ok: false,
      error: MEDIA_ERROR.invalidHost
    })
  })

  it('rejects a port outside 1..65535', () => {
    for (const mediaPort of [0, 65_536, -1, 1.5, 'abc', null]) {
      expect(parseMediaTarget({ ...validTarget, mediaPort })).toEqual({
        ok: false,
        error: MEDIA_ERROR.invalidPort
      })
    }
  })

  it('rejects an empty, non-string or over-long ticket', () => {
    expect(parseMediaTarget({ ...validTarget, ticket: '' })).toEqual({
      ok: false,
      error: MEDIA_ERROR.invalidTicket
    })
    expect(parseMediaTarget({ ...validTarget, ticket: 42 })).toEqual({
      ok: false,
      error: MEDIA_ERROR.invalidTicket
    })
    expect(parseMediaTarget({ ...validTarget, ticket: 'a'.repeat(513) })).toEqual({
      ok: false,
      error: MEDIA_ERROR.invalidTicket
    })
    expect(parseMediaTarget({ ...validTarget, ticket: 'a'.repeat(512) }).ok).toBe(true)
  })

  it('rejects non-object payloads', () => {
    for (const raw of [null, undefined, 'abc', 42, []]) {
      expect(parseMediaTarget(raw)).toEqual({ ok: false, error: MEDIA_ERROR.invalidHost })
    }
  })
})

describe('parseMediaPublishFrame', () => {
  const MAX = 524_288

  it('accepts an ArrayBuffer payload and a typed-array view', () => {
    const parsed = parseMediaPublishFrame(jpegPayload(64), MAX)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.value.sequence).toBe(3)
      expect(parsed.value.jpeg.length).toBe(64)
      expect(parsed.value.width).toBe(640)
    }

    const view = new Uint8Array(new ArrayBuffer(32), 8, 16)
    const parsedView = parseMediaPublishFrame(
      { meta: (jpegPayload().meta as never), data: view },
      MAX
    )
    expect(parsedView.ok).toBe(true)
    if (parsedView.ok) expect(parsedView.value.jpeg.length).toBe(16)
  })

  it('rejects an oversized buffer', () => {
    expect(parseMediaPublishFrame(jpegPayload(MAX + 1), MAX)).toEqual({
      ok: false,
      error: MEDIA_ERROR.invalidFrame
    })
  })

  it('rejects an empty buffer', () => {
    expect(parseMediaPublishFrame(jpegPayload(0), MAX)).toEqual({
      ok: false,
      error: MEDIA_ERROR.invalidFrame
    })
  })

  it('accepts exactly the protocol maximum', () => {
    expect(parseMediaPublishFrame(jpegPayload(MAX), MAX).ok).toBe(true)
  })

  it('rejects a wrong or missing mime type', () => {
    const frame = jpegPayload()
    expect(
      parseMediaPublishFrame({ ...frame, meta: { ...frame.meta, mimeType: 'image/png' } }, MAX)
    ).toEqual({ ok: false, error: MEDIA_ERROR.invalidFrame })
    expect(parseMediaPublishFrame({ data: frame.data }, MAX)).toEqual({
      ok: false,
      error: MEDIA_ERROR.invalidFrame
    })
  })

  it('rejects non-integer sequence/capture time and non-buffer data', () => {
    const frame = jpegPayload()
    expect(
      parseMediaPublishFrame({ ...frame, meta: { ...frame.meta, sequence: 1.5 } }, MAX)
    ).toEqual({ ok: false, error: MEDIA_ERROR.invalidFrame })
    expect(
      parseMediaPublishFrame({ ...frame, meta: { ...frame.meta, capturedAt: -1 } }, MAX)
    ).toEqual({ ok: false, error: MEDIA_ERROR.invalidFrame })
    expect(parseMediaPublishFrame({ ...frame, data: 'not-a-buffer' }, MAX)).toEqual({
      ok: false,
      error: MEDIA_ERROR.invalidFrame
    })
    expect(parseMediaPublishFrame(null, MAX)).toEqual({
      ok: false,
      error: MEDIA_ERROR.invalidFrame
    })
  })
})

describe('handler registration', () => {
  it('registers and removes all six media channels', () => {
    const dispose = register(createFakeTransport())
    for (const channel of Object.values(NQ_MEDIA_CHANNELS)) {
      if (channel === NQ_MEDIA_CHANNELS.frame) continue
      expect(ipc.handlers.has(channel)).toBe(true)
    }
    dispose()
    for (const channel of Object.values(NQ_MEDIA_CHANNELS)) {
      expect(ipc.handlers.has(channel)).toBe(false)
    }
  })
})

describe('start-publish', () => {
  it('starts the publisher and reports ok', async () => {
    const transport = createFakeTransport()
    register(transport)

    const result = await handler(NQ_MEDIA_CHANNELS.startPublish)(makeEvent(), validTarget)
    expect(result).toEqual({ ok: true })
    expect(transport.startPublisher).toHaveBeenCalledWith(validTarget)
    expect(published.some((entry) => entry.channel === NQ_MEDIA_CHANNELS.status)).toBe(true)
  })

  it('maps a rejected ACK to MEDIA_ACK_REJECTED with the ack byte', async () => {
    const transport = createFakeTransport()
    transport.startPublisher.mockRejectedValueOnce(
      new MediaTransportError(MEDIA_ERROR.ackRejected, 'ticket expired', 4)
    )
    register(transport)

    const result = await handler(NQ_MEDIA_CHANNELS.startPublish)(makeEvent(), validTarget)
    expect(result).toEqual({ ok: false, error: MEDIA_ERROR.ackRejected, ack: 4 })
  })

  it('never echoes the ticket in a result or status', async () => {
    const transport = createFakeTransport()
    transport.startPublisher.mockRejectedValueOnce(new Error('boom'))
    register(transport)

    const result = await handler(NQ_MEDIA_CHANNELS.startPublish)(makeEvent(), validTarget)
    expect(JSON.stringify(result)).not.toContain(TICKET)
    const statuses = published
      .filter((entry) => entry.channel === NQ_MEDIA_CHANNELS.status)
      .map((entry) => JSON.stringify(entry.payload))
    for (const status of statuses) {
      expect(status).not.toContain(TICKET)
      expect(status).not.toContain('ticket')
    }
  })

  it('rejects an untrusted sender without touching the transport', async () => {
    const transport = createFakeTransport()
    register(transport)

    const result = await handler(NQ_MEDIA_CHANNELS.startPublish)(makeEvent(UNTRUSTED_URL), validTarget)
    expect(result).toEqual({ ok: false, error: MEDIA_ERROR.untrustedSender })
    expect(transport.startPublisher).not.toHaveBeenCalled()

    const fromIframe = await handler(NQ_MEDIA_CHANNELS.startPublish)(
      makeEvent(TRUSTED_URL, false),
      validTarget
    )
    expect(fromIframe).toEqual({ ok: false, error: MEDIA_ERROR.untrustedSender })
  })
})

describe('publish-frame', () => {
  it('refuses before start-publish', () => {
    register(createFakeTransport())
    const result = handler(NQ_MEDIA_CHANNELS.publishFrame)(makeEvent(), jpegPayload())
    expect(result).toEqual({ ok: false, error: MEDIA_ERROR.notStarted })
  })

  it('accepts a valid frame after start and forwards it to the publisher', async () => {
    const transport = createFakeTransport()
    register(transport)
    await handler(NQ_MEDIA_CHANNELS.startPublish)(makeEvent(), validTarget)

    const result = handler(NQ_MEDIA_CHANNELS.publishFrame)(makeEvent(), jpegPayload(200))
    expect(result).toEqual({ ok: true })
    expect(transport.publishCalls).toEqual([
      { sequence: 3, captureEpochMillis: 1_700_000_000_000, jpegLength: 200 }
    ])
  })

  it('rejects an oversized or malformed frame without touching the publisher', async () => {
    const transport = createFakeTransport()
    register(transport)
    await handler(NQ_MEDIA_CHANNELS.startPublish)(makeEvent(), validTarget)

    const oversized = handler(NQ_MEDIA_CHANNELS.publishFrame)(
      makeEvent(),
      jpegPayload(524_289)
    )
    expect(oversized).toEqual({ ok: false, error: MEDIA_ERROR.invalidFrame })
    expect(transport.publishCalls).toHaveLength(0)
  })

  it('rejects an untrusted sender', () => {
    register(createFakeTransport())
    const result = handler(NQ_MEDIA_CHANNELS.publishFrame)(
      makeEvent(UNTRUSTED_URL),
      jpegPayload()
    )
    expect(result).toEqual({ ok: false, error: MEDIA_ERROR.untrustedSender })
  })
})

describe('stop-publish / stop-subscribe', () => {
  it('stops an existing publisher and never throws for an untrusted sender', async () => {
    const transport = createFakeTransport()
    register(transport)
    await handler(NQ_MEDIA_CHANNELS.startPublish)(makeEvent(), validTarget)

    await expect(
      handler(NQ_MEDIA_CHANNELS.stopPublish)(makeEvent())
    ).resolves.toBeUndefined()
    expect(transport.stopPublisher).toHaveBeenCalledTimes(1)

    await expect(
      handler(NQ_MEDIA_CHANNELS.stopPublish)(makeEvent(UNTRUSTED_URL))
    ).resolves.toBeUndefined()
    expect(transport.stopPublisher).toHaveBeenCalledTimes(1)
  })
})

describe('start-subscribe', () => {
  it('forwards relayed frames to the renderer as MediaInboundFrame', async () => {
    const transport = createFakeTransport()
    register(transport)
    const result = await handler(NQ_MEDIA_CHANNELS.startSubscribe)(makeEvent(), validTarget)
    expect(result).toEqual({ ok: true })
    expect(transport.callbacks).toHaveLength(1)

    const relayed: RelayedFrame = {
      userId: 7,
      sequence: 12,
      serverReceivedEpochMillis: 1_700_000_000_500,
      jpeg: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      vision: unavailableVisionMetadata(12)
    }
    transport.callbacks[0].onFrame(relayed)

    const frameMessage = published.find((entry) => entry.channel === NQ_MEDIA_CHANNELS.frame)
    expect(frameMessage).toBeDefined()
    const payload = frameMessage?.payload as {
      userId: number
      sequence: number
      serverReceivedAt: number
      mimeType: string
      data: ArrayBuffer
      vision: { attention: string }
    }
    expect(payload.userId).toBe(7)
    expect(payload.sequence).toBe(12)
    expect(payload.serverReceivedAt).toBe(1_700_000_000_500)
    expect(payload.mimeType).toBe('image/jpeg')
    expect(payload.vision.attention).toBe('UNKNOWN')
    expect(payload.data).toBeInstanceOf(ArrayBuffer)
    expect(new Uint8Array(payload.data)).toEqual(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))
  })

  it('stops the previous subscriber before starting a new one', async () => {
    const transport = createFakeTransport()
    register(transport)
    await handler(NQ_MEDIA_CHANNELS.startSubscribe)(makeEvent(), validTarget)
    await handler(NQ_MEDIA_CHANNELS.startSubscribe)(makeEvent(), validTarget)
    expect(transport.stopSubscriber).toHaveBeenCalledTimes(1)
    expect(transport.startSubscriber).toHaveBeenCalledTimes(2)
  })
})

describe('status', () => {
  it('returns a snapshot with both channels', async () => {
    const transport = createFakeTransport()
    register(transport)
    await handler(NQ_MEDIA_CHANNELS.startPublish)(makeEvent(), validTarget)

    const snapshot = (await handler(NQ_MEDIA_CHANNELS.status)(makeEvent())) as {
      publisher: { role: string; state: string }
      subscriberPendingUsers: number
    }
    expect(snapshot.publisher).toMatchObject({ role: 'PUBLISHER', state: 'connected' })
    expect(snapshot.subscriberPendingUsers).toBe(0)
  })

  it('returns an empty snapshot for an untrusted sender', async () => {
    register(createFakeTransport())
    await handler(NQ_MEDIA_CHANNELS.startPublish)(makeEvent(), validTarget)

    const snapshot = (await handler(NQ_MEDIA_CHANNELS.status)(makeEvent(UNTRUSTED_URL))) as {
      publisher: { state: string; host: string | null }
    }
    expect(snapshot.publisher.state).toBe('idle')
    expect(snapshot.publisher.host).toBeNull()
  })
})
