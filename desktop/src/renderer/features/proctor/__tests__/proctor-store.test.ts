// @vitest-environment jsdom
/**
 * Proctor store: cổng gửi status/event, xử lý `PROCTOR_MEDIA_SESSION` theo role, tile/feed của
 * host, và các đường lỗi media.
 *
 * Transport được thay bằng fake bridge (`setBridgeOverride`) và fake `window.nq.media` — không
 * có socket thật, không có webcam.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OutboundMessage, ProctorEventData, ProctorMediaSession, ProctorStatusUpdate } from '@shared/protocol'
import { unavailableVisionMetadata } from '@shared/protocol/media'
import {
  MEDIA_ERROR,
  createMediaStatusSnapshot,
  type MediaInboundFrame,
  type MediaPublishFrameRequest,
  type NqMediaApi
} from '@shared/media-ipc'
import { createIdleConnectionStatus } from '@shared/ipc'
import { setBridgeOverride } from '../../../lib/bridge'
import { resetConnectionStore, useConnectionStore } from '../../../lib/connection-store'
import { clearHubFrames, getHubFrame } from '../frame-hub'
import type { ProctorRoomContext } from '../proctor-protocol'
import {
  PROCTOR_FEED_LIMIT,
  resetProctorStore,
  useProctorStore
} from '../proctor-store'

const PIN = '123456'

const PLAYER: ProctorRoomContext = {
  pin: PIN,
  proctoringEnabled: true,
  playing: true,
  host: false,
  phase: 'running'
}

const HOST: ProctorRoomContext = {
  pin: PIN,
  proctoringEnabled: true,
  playing: false,
  host: true,
  phase: 'running'
}

interface SentRecorder {
  sent: OutboundMessage[]
}

interface MediaRecorder {
  publishes: Array<{ host: string; mediaPort: number; ticket: string }>
  subscribes: Array<{ host: string; mediaPort: number; ticket: string }>
  published: MediaPublishFrameRequest[]
  stops: number
  frameListeners: Array<(frame: MediaInboundFrame) => void>
  statusListeners: Array<(snapshot: ReturnType<typeof createMediaStatusSnapshot>) => void>
  startSubscribeResult: { ok: boolean; error?: string; ack?: number }
}

function installBridge(): SentRecorder {
  const recorder: SentRecorder = { sent: [] }
  setBridgeOverride({
    connect: async () => ({ ok: true }),
    disconnect: async () => undefined,
    send: async (frame) => {
      recorder.sent.push(frame)
      return { ok: true }
    },
    getStatus: async () => createIdleConnectionStatus(),
    onEvent: () => () => undefined,
    app: { version: 'test', platform: 'linux', packaged: false }
  })
  useConnectionStore.setState({
    status: {
      state: 'connected',
      host: '127.0.0.1',
      port: 5000,
      lastError: null,
      connectedAt: 1_700_000_000_000
    }
  })
  return recorder
}

function installMedia(): MediaRecorder {
  const recorder: MediaRecorder = {
    publishes: [],
    subscribes: [],
    published: [],
    stops: 0,
    frameListeners: [],
    statusListeners: [],
    startSubscribeResult: { ok: true }
  }
  const api: NqMediaApi = {
    startPublish: async (target) => {
      recorder.publishes.push(target)
      return { ok: true }
    },
    stopPublish: async () => {
      recorder.stops += 1
    },
    startSubscribe: async (target) => {
      recorder.subscribes.push(target)
      return recorder.startSubscribeResult
    },
    stopSubscribe: async () => {
      recorder.stops += 1
    },
    publishFrame: async (frame) => {
      recorder.published.push(frame)
      return { ok: true }
    },
    getStatus: async () => createMediaStatusSnapshot(0),
    onFrame: (listener) => {
      recorder.frameListeners.push(listener)
      return () => undefined
    },
    onStatus: (listener) => {
      recorder.statusListeners.push(listener)
      return () => undefined
    }
  }
  Object.defineProperty(window, 'nq', { configurable: true, value: { media: api } })
  return recorder
}

function mediaSession(role: ProctorMediaSession['role'], overrides: Partial<ProctorMediaSession> = {}): ProctorMediaSession {
  return {
    pin: PIN,
    role,
    mediaPort: 5001,
    ticket: `ticket-${role.toLowerCase()}`,
    expiresAtEpochMillis: 9_999_999_999_999,
    ...overrides
  }
}

function statusUpdate(
  userId: number,
  username: string,
  warningCount = 0,
  cameraStatus: ProctorStatusUpdate['cameraStatus'] = 'READY'
): ProctorStatusUpdate {
  return {
    pin: PIN,
    userId,
    username,
    cameraStatus,
    calibrationStatus: 'NOT_REQUIRED',
    connected: true,
    warningCount,
    serverTimeEpochMillis: 1_700_000_000_000
  }
}

function eventData(userId: number, username: string, warningCount: number): ProctorEventData {
  return {
    pin: PIN,
    eventId: `event-${userId}-${warningCount}`,
    userId,
    username,
    type: 'APP_FOCUS_LOST',
    severity: 'EVIDENCE',
    frameSequence: 4,
    clientOccurredAtEpochMillis: 1_700_000_000_000,
    serverReceivedAtEpochMillis: 1_700_000_000_100,
    durationMillis: 6_000,
    confidence: 0,
    warningCount
  }
}

function frame(userId: number, sequence: number): MediaInboundFrame {
  return {
    userId,
    sequence,
    serverReceivedAt: 1_700_000_000_000 + sequence,
    mimeType: 'image/jpeg',
    vision: unavailableVisionMetadata(sequence),
    data: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]).buffer
  }
}

const flushAsync = async (): Promise<void> => {
  await new Promise((done) => setTimeout(done, 0))
  await new Promise((done) => setTimeout(done, 0))
}

let bridge: SentRecorder
let media: MediaRecorder

beforeEach(() => {
  resetConnectionStore()
  bridge = installBridge()
  media = installMedia()
  resetProctorStore()
  clearHubFrames()
})

afterEach(() => {
  resetProctorStore()
  setBridgeOverride(null)
  Reflect.deleteProperty(window, 'nq')
})

const statusReports = (): OutboundMessage[] =>
  bridge.sent.filter((message) => message.type === 'PROCTOR_STATUS_REPORT')

const eventReports = (): OutboundMessage[] =>
  bridge.sent.filter((message) => message.type === 'PROCTOR_EVENT_REPORT')

describe('status reports', () => {
  it('reports once per camera transition with no calibration claim', () => {
    useProctorStore.getState().enterRoom(PLAYER)

    expect(useProctorStore.getState().reportCamera('INITIALIZING')).toBe(true)
    // Cùng trạng thái: không gửi lần hai (UI có thể gọi lại mỗi render).
    expect(useProctorStore.getState().reportCamera('INITIALIZING')).toBe(false)
    expect(useProctorStore.getState().reportCamera('READY')).toBe(true)

    const reports = statusReports()
    expect(reports).toHaveLength(2)
    expect(reports[0].payload).toMatchObject({
      pin: PIN,
      cameraStatus: 'INITIALIZING',
      calibrationStatus: 'NOT_REQUIRED'
    })
    expect(reports[1].payload).toMatchObject({ cameraStatus: 'READY' })
  })

  it('never sends NOT_REQUIRED / NOT_APPLICABLE to the server', () => {
    useProctorStore.getState().enterRoom(PLAYER)
    useProctorStore.getState().reportCamera('NOT_REQUIRED')
    useProctorStore.getState().reportCamera('NOT_APPLICABLE')

    expect(statusReports()).toHaveLength(0)
    // UI vẫn phản ánh trạng thái, chỉ là không gửi.
    expect(useProctorStore.getState().cameraStatus).toBe('NOT_APPLICABLE')
  })

  it('does not report for a host or when proctoring is off', () => {
    useProctorStore.getState().enterRoom(HOST)
    expect(useProctorStore.getState().reportCamera('READY')).toBe(false)

    useProctorStore.getState().enterRoom({ ...PLAYER, pin: '654321', proctoringEnabled: false })
    expect(useProctorStore.getState().reportCamera('READY')).toBe(false)

    expect(statusReports()).toHaveLength(0)
  })

  it('stops reporting after the room finishes', async () => {
    useProctorStore.getState().enterRoom(PLAYER)
    useProctorStore.getState().decideConsent('granted')
    useProctorStore.getState().applyServerMessage({
      type: 'PROCTOR_MEDIA_SESSION',
      payload: mediaSession('PUBLISHER')
    })
    await flushAsync()

    useProctorStore.getState().applyServerMessage({
      type: 'QUIZ_ROOM_FINISHED',
      payload: {
        pin: PIN,
        finished: true,
        entries: [{ rank: 1, userId: 2, username: 'an', score: 900, correctAnswers: 2, connected: true }]
      }
    })

    expect(useProctorStore.getState().context?.phase).toBe('ended')
    expect(useProctorStore.getState().reportCamera('READY')).toBe(false)
    expect(statusReports()).toHaveLength(0)
    expect(media.stops).toBeGreaterThan(0)
  })
})

describe('consent', () => {
  it('reports DENIED once when the player declines and keeps the room usable', () => {
    useProctorStore.getState().enterRoom(PLAYER)
    useProctorStore.getState().decideConsent('declined')

    expect(useProctorStore.getState().consent).toBe('declined')
    expect(useProctorStore.getState().cameraStatus).toBe('DENIED')
    expect(statusReports()).toHaveLength(1)
    // Không có gì chặn phòng: context vẫn nguyên, không có cờ "blocked".
    expect(useProctorStore.getState().context).toEqual(PLAYER)
  })
})

describe('media sessions', () => {
  it('starts the publisher for a PUBLISHER session after consent', async () => {
    useProctorStore.getState().enterRoom(PLAYER)
    useProctorStore.getState().decideConsent('granted')
    useProctorStore.getState().applyServerMessage({
      type: 'PROCTOR_MEDIA_SESSION',
      payload: mediaSession('PUBLISHER')
    })
    await flushAsync()

    expect(media.publishes).toEqual([
      { host: '127.0.0.1', mediaPort: 5001, ticket: 'ticket-publisher' }
    ])
    expect(useProctorStore.getState().publisher.state).toBe('live')
    expect(media.subscribes).toHaveLength(0)
  })

  it('waits for consent, then opens the publisher with the stored session', async () => {
    useProctorStore.getState().enterRoom(PLAYER)
    useProctorStore.getState().applyServerMessage({
      type: 'PROCTOR_MEDIA_SESSION',
      payload: mediaSession('PUBLISHER')
    })
    await flushAsync()

    expect(media.publishes).toHaveLength(0)
    expect(useProctorStore.getState().publisher).toMatchObject({ state: 'idle' })

    useProctorStore.getState().decideConsent('granted')
    await flushAsync()
    expect(media.publishes).toHaveLength(1)
  })

  it('starts the subscriber for a HOST_SUBSCRIBER session', async () => {
    useProctorStore.getState().enterRoom(HOST)
    useProctorStore.getState().applyServerMessage({
      type: 'PROCTOR_MEDIA_SESSION',
      payload: mediaSession('HOST_SUBSCRIBER')
    })
    await flushAsync()

    expect(media.subscribes).toHaveLength(1)
    expect(media.publishes).toHaveLength(0)
    expect(useProctorStore.getState().subscriber.state).toBe('live')
  })

  it('ignores a PUBLISHER session for the host and a session for another room', async () => {
    useProctorStore.getState().enterRoom(HOST)
    useProctorStore.getState().applyServerMessage({
      type: 'PROCTOR_MEDIA_SESSION',
      payload: mediaSession('PUBLISHER')
    })
    useProctorStore.getState().applyServerMessage({
      type: 'PROCTOR_MEDIA_SESSION',
      payload: mediaSession('HOST_SUBSCRIBER', { pin: '999999' })
    })
    await flushAsync()

    expect(media.publishes).toHaveLength(0)
    expect(media.subscribes).toHaveLength(0)
  })

  it('ignores an already expired ticket and waits for the server to reissue', async () => {
    useProctorStore.getState().enterRoom(HOST)
    useProctorStore.getState().applyServerMessage({
      type: 'PROCTOR_MEDIA_SESSION',
      payload: mediaSession('HOST_SUBSCRIBER', { expiresAtEpochMillis: 1 })
    }, 2_000)
    await flushAsync()

    expect(media.subscribes).toHaveLength(0)
  })

  it('restarts the subscriber when a new session arrives (reissue path)', async () => {
    useProctorStore.getState().enterRoom(HOST)
    useProctorStore.getState().applyServerMessage({
      type: 'PROCTOR_MEDIA_SESSION',
      payload: mediaSession('HOST_SUBSCRIBER', { ticket: 'first' })
    })
    useProctorStore.getState().applyServerMessage({
      type: 'PROCTOR_MEDIA_SESSION',
      payload: mediaSession('HOST_SUBSCRIBER', { ticket: 'second' })
    })
    await flushAsync()

    expect(media.subscribes.map((entry) => entry.ticket)).toEqual(['first', 'second'])
  })

  it('surfaces a rejected handshake and retries on demand', async () => {
    media.startSubscribeResult = { ok: false, error: MEDIA_ERROR.ackRejected, ack: 4 }
    useProctorStore.getState().enterRoom(HOST)
    useProctorStore.getState().applyServerMessage({
      type: 'PROCTOR_MEDIA_SESSION',
      payload: mediaSession('HOST_SUBSCRIBER')
    })
    await flushAsync()

    expect(useProctorStore.getState().subscriber).toMatchObject({ state: 'error' })
    expect(useProctorStore.getState().subscriber.message).toMatch(/hết hạn/i)

    media.startSubscribeResult = { ok: true }
    useProctorStore.getState().retrySubscriber()
    await flushAsync()
    expect(media.subscribes).toHaveLength(2)
    expect(useProctorStore.getState().subscriber.state).toBe('live')
  })
})

describe('host tiles and feed', () => {
  it('fills tiles from status updates and sorts by warnings then username', () => {
    useProctorStore.getState().enterRoom(HOST)
    useProctorStore.getState().syncMembers([
      {
        userId: 1,
        username: 'binh',
        cameraStatus: 'INITIALIZING',
        calibrationStatus: 'NOT_REQUIRED',
        connected: true,
        warningCount: 0
      },
      {
        userId: 2,
        username: 'an',
        cameraStatus: 'INITIALIZING',
        calibrationStatus: 'NOT_REQUIRED',
        connected: true,
        warningCount: 0
      }
    ])

    useProctorStore.getState().applyServerMessage({
      type: 'PROCTOR_STATUS_UPDATE',
      payload: statusUpdate(1, 'binh', 2, 'READY')
    })
    useProctorStore.getState().applyServerMessage({
      type: 'PROCTOR_STATUS_UPDATE',
      payload: statusUpdate(2, 'an', 0, 'DENIED')
    })

    const tiles = useProctorStore.getState().tiles
    expect(tiles).toHaveLength(2)
    expect(tiles.find((tile) => tile.userId === 2)?.cameraStatus).toBe('DENIED')

    // Sort helper là nguồn sự thật cho thứ tự hiển thị.
    const sorted = [...tiles].sort((left, right) => {
      if (right.warnings !== left.warnings) return right.warnings - left.warnings
      return left.username.localeCompare(right.username, 'vi')
    })
    expect(sorted.map((tile) => tile.username)).toEqual(['binh', 'an'])
  })

  it('keeps the feed bounded to the newest 100 events', () => {
    useProctorStore.getState().enterRoom(HOST)
    for (let index = 1; index <= PROCTOR_FEED_LIMIT + 5; index += 1) {
      useProctorStore.getState().applyServerMessage({
        type: 'PROCTOR_EVENT',
        payload: { ...eventData(2, 'an', index), eventId: `evt-${index}` }
      })
    }

    const state = useProctorStore.getState()
    expect(state.feed).toHaveLength(PROCTOR_FEED_LIMIT)
    // Mới nhất đứng đầu.
    expect(state.feed[0].eventId).toBe(`evt-${PROCTOR_FEED_LIMIT + 5}`)
    expect(state.tiles[0].warnings).toBe(PROCTOR_FEED_LIMIT + 5)
    expect(state.tiles[0].lastEvent?.type).toBe('APP_FOCUS_LOST')
  })

  it('ignores events from another room', () => {
    useProctorStore.getState().enterRoom(HOST)
    useProctorStore.getState().applyServerMessage({
      type: 'PROCTOR_EVENT',
      payload: { ...eventData(2, 'an', 1), pin: '999999' }
    })
    expect(useProctorStore.getState().feed).toHaveLength(0)
  })
})

describe('frames and camera events', () => {
  it('publishes frames only when the publisher is live', async () => {
    useProctorStore.getState().enterRoom(PLAYER)

    const request: MediaPublishFrameRequest = {
      meta: { sequence: 1, capturedAt: 1, width: 640, height: 480, mimeType: 'image/jpeg' },
      data: new Uint8Array([1, 2, 3]).buffer
    }
    await expect(useProctorStore.getState().publishFrame(request)).resolves.toMatchObject({
      ok: false,
      error: MEDIA_ERROR.notStarted
    })
    expect(media.published).toHaveLength(0)

    useProctorStore.getState().decideConsent('granted')
    useProctorStore.getState().applyServerMessage({
      type: 'PROCTOR_MEDIA_SESSION',
      payload: mediaSession('PUBLISHER')
    })
    await flushAsync()

    await expect(useProctorStore.getState().publishFrame(request)).resolves.toEqual({ ok: true })
    expect(media.published).toHaveLength(1)
  })

  it('routes relayed frames into the hub and keeps only the newest per user', () => {
    useProctorStore.getState().enterRoom(HOST)
    useProctorStore.getState().applyServerMessage({
      type: 'PROCTOR_MEDIA_SESSION',
      payload: mediaSession('HOST_SUBSCRIBER')
    })

    const listener = media.frameListeners[0]
    expect(listener).toBeDefined()
    listener(frame(7, 1))
    listener(frame(7, 2))
    listener(frame(7, 1)) // frame cũ: bị bỏ

    expect(getHubFrame(7)?.sequence).toBe(2)
  })

  it('reports CAMERA_BLOCKED once when the track mutes, with the last frame sequence', async () => {
    useProctorStore.getState().enterRoom(PLAYER)
    useProctorStore.getState().decideConsent('granted')
    useProctorStore.getState().applyServerMessage({
      type: 'PROCTOR_MEDIA_SESSION',
      payload: mediaSession('PUBLISHER')
    })
    await flushAsync()

    await useProctorStore.getState().publishFrame({
      meta: { sequence: 42, capturedAt: 1, width: 640, height: 480, mimeType: 'image/jpeg' },
      data: new Uint8Array([1]).buffer
    })

    useProctorStore.getState().noteTrackIssue('mute')
    useProctorStore.getState().noteTrackIssue('mute') // cooldown: không gửi lần hai

    const events = eventReports()
    expect(events).toHaveLength(1)
    expect(events[0].payload).toMatchObject({
      pin: PIN,
      type: 'CAMERA_BLOCKED',
      severity: 'EVIDENCE',
      frameSequence: 42,
      confidence: 0
    })
    expect(statusReports().at(-1)?.payload).toMatchObject({ cameraStatus: 'BLOCKED' })
  })

  it('does not emit events outside a running room', () => {
    useProctorStore.getState().enterRoom({ ...PLAYER, phase: 'lobby' })
    expect(useProctorStore.getState().emitEvent('APP_FOCUS_LOST', 'EVIDENCE', 6_000)).toBe(false)
    expect(eventReports()).toHaveLength(0)
  })

  it('never emits events after the room finished', () => {
    useProctorStore.getState().enterRoom(PLAYER)
    useProctorStore.getState().applyServerMessage({
      type: 'QUIZ_ROOM_FINISHED',
      payload: { pin: PIN, finished: true, entries: [] }
    })

    expect(useProctorStore.getState().emitEvent('APP_FOCUS_LOST', 'EVIDENCE', 6_000)).toBe(false)
    expect(useProctorStore.getState().noteTrackIssue('mute')).toBeUndefined()
    expect(eventReports()).toHaveLength(0)
  })

  it('emits one focus event after a long absence and none for a short one', () => {
    useProctorStore.getState().enterRoom(PLAYER)

    useProctorStore.getState().noteFocusLost('APP_FOCUS_LOST', 1_000)
    expect(useProctorStore.getState().noteFocusReturn(3_000)).toBe(false)

    useProctorStore.getState().noteFocusLost('APP_FOCUS_LOST', 20_000)
    expect(useProctorStore.getState().tickFocus(26_000)).toBe(true)
    expect(useProctorStore.getState().noteFocusReturn(27_000)).toBe(false)

    const events = eventReports()
    expect(events).toHaveLength(1)
    expect(events[0].payload).toMatchObject({
      type: 'APP_FOCUS_LOST',
      severity: 'EVIDENCE',
      durationMillis: 6_000,
      confidence: 0
    })
  })
})

describe('teardown', () => {
  it('stops media and clears host data when the room disappears', async () => {
    useProctorStore.getState().enterRoom(HOST)
    useProctorStore.getState().applyServerMessage({
      type: 'PROCTOR_MEDIA_SESSION',
      payload: mediaSession('HOST_SUBSCRIBER')
    })
    await flushAsync()
    useProctorStore.getState().applyServerMessage({
      type: 'PROCTOR_EVENT',
      payload: eventData(2, 'an', 1)
    })

    useProctorStore.getState().leaveRoom()

    expect(useProctorStore.getState().context).toBeNull()
    expect(useProctorStore.getState().tiles).toHaveLength(0)
    expect(useProctorStore.getState().feed).toHaveLength(0)
    expect(useProctorStore.getState().subscriber.state).toBe('idle')
    expect(media.stops).toBeGreaterThan(0)
  })

  it('tears down media when the room is cancelled', async () => {
    useProctorStore.getState().enterRoom(HOST)
    useProctorStore.getState().applyServerMessage({
      type: 'PROCTOR_MEDIA_SESSION',
      payload: mediaSession('HOST_SUBSCRIBER')
    })
    await flushAsync()

    useProctorStore.getState().applyServerMessage({ type: 'QUIZ_ROOM_CANCEL', payload: 'HOST_CANCELLED' })
    expect(useProctorStore.getState().context?.phase).toBe('ended')
    expect(media.stops).toBeGreaterThan(0)
  })

  it('re-entering the same room keeps the live subscriber', async () => {
    useProctorStore.getState().enterRoom(HOST)
    useProctorStore.getState().applyServerMessage({
      type: 'PROCTOR_MEDIA_SESSION',
      payload: mediaSession('HOST_SUBSCRIBER')
    })
    await flushAsync()
    const before = media.stops

    useProctorStore.getState().enterRoom({ ...HOST })
    useProctorStore.getState().enterRoom({ ...HOST, phase: 'running' })

    expect(media.stops).toBe(before)
    expect(useProctorStore.getState().subscriber.state).toBe('live')
  })

  it('is not tricked by a stale "running" context after the room ended', () => {
    useProctorStore.getState().enterRoom(PLAYER)
    useProctorStore.getState().applyServerMessage({ type: 'QUIZ_ROOM_CANCEL', payload: 'SERVER_STOPPED' })
    useProctorStore.getState().enterRoom({ ...PLAYER, phase: 'running' })

    expect(useProctorStore.getState().context?.phase).toBe('ended')
  })
})

describe('media socket push', () => {
  it('marks the subscriber as errored when main reports a socket failure', async () => {
    useProctorStore.getState().enterRoom(HOST)
    useProctorStore.getState().applyServerMessage({
      type: 'PROCTOR_MEDIA_SESSION',
      payload: mediaSession('HOST_SUBSCRIBER')
    })
    await flushAsync()

    const snapshot = createMediaStatusSnapshot(1)
    const listener = media.statusListeners[0]
    expect(listener).toBeDefined()
    listener({
      ...snapshot,
      subscriber: { ...snapshot.subscriber, state: 'error', lastError: 'Media server đã đóng kết nối' }
    })

    expect(useProctorStore.getState().subscriber.state).toBe('error')
    expect(useProctorStore.getState().subscriber.message).toContain('đóng kết nối')
  })

  it('does not resurrect a stopped subscriber from an idle status push', async () => {
    useProctorStore.getState().enterRoom(HOST)
    const listener = media.statusListeners[0]
    listener(createMediaStatusSnapshot(1))
    expect(useProctorStore.getState().subscriber.state).toBe('idle')
  })
})

describe('reset', () => {
  it('resetProctorStore clears context, consent and camera status', () => {
    useProctorStore.getState().enterRoom(PLAYER)
    useProctorStore.getState().decideConsent('declined')
    resetProctorStore()

    const state = useProctorStore.getState()
    expect(state.context).toBeNull()
    expect(state.consent).toBe('pending')
    expect(state.cameraStatus).toBe('STOPPED')
    expect(vi.isMockFunction(state.enterRoom)).toBe(false)
  })
})
