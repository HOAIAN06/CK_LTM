import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConnectionStatus, NqBridge } from '@shared/ipc'
import { createIdleConnectionStatus } from '@shared/ipc'
import type { PlayerStats } from '@shared/protocol'
import { setBridgeOverride } from './bridge'
import {
  resetConnectionStore,
  subscribeServerMessages,
  useConnectionStore
} from './connection-store'
import { resetSessionStore, useSessionStore } from './session-store'

const PLAYER: PlayerStats = {
  id: 7,
  username: 'minh_anh',
  wins: 3,
  losses: 1,
  draws: 0,
  totalScore: 420,
  questionsAnswered: 40,
  correctAnswers: 31
}

function status(state: ConnectionStatus['state']): ConnectionStatus {
  return {
    state,
    host: state === 'idle' ? null : 'localhost',
    port: state === 'idle' ? null : 5000,
    lastError: null,
    connectedAt: state === 'connected' ? 1_700_000_000_000 : null
  }
}

function createFakeBridge(): NqBridge {
  return {
    connect: vi.fn(() => Promise.resolve({ ok: true })),
    disconnect: vi.fn(() => Promise.resolve()),
    send: vi.fn(() => Promise.resolve({ ok: true })),
    getStatus: vi.fn(() => Promise.resolve(createIdleConnectionStatus())),
    onEvent: vi.fn(() => () => undefined),
    app: { version: 'test', platform: 'linux', packaged: false }
  }
}

beforeEach(() => {
  resetConnectionStore()
  resetSessionStore()
  setBridgeOverride(createFakeBridge())
})

afterEach(() => {
  setBridgeOverride(null)
  resetConnectionStore()
  resetSessionStore()
})

describe('connection status', () => {
  it('mirrors the status events pushed by the main process', () => {
    const store = useConnectionStore.getState()
    store.handleEvent({ kind: 'status', status: status('connecting') })
    expect(useConnectionStore.getState().status.state).toBe('connecting')

    useConnectionStore.getState().handleEvent({ kind: 'status', status: status('connected') })
    expect(useConnectionStore.getState().status.state).toBe('connected')
    expect(useConnectionStore.getState().status.port).toBe(5000)
  })

  it('keeps the last transport error so the UI can explain the failure', () => {
    useConnectionStore
      .getState()
      .handleEvent({ kind: 'transport-error', error: { code: 'CONNECT_TIMEOUT', message: 'hết giờ' } })

    const state = useConnectionStore.getState()
    expect(state.transportError?.code).toBe('CONNECT_TIMEOUT')
    expect(state.lastError).toBe('CONNECT_TIMEOUT')
  })

  it('clears the previous error once a connection is re-established', () => {
    const store = useConnectionStore.getState()
    store.handleEvent({ kind: 'transport-error', error: { code: 'SEND_FAILED', message: 'x' } })
    store.handleEvent({ kind: 'status', status: status('connected') })

    expect(useConnectionStore.getState().lastError).toBeNull()
    expect(useConnectionStore.getState().transportError).toBeNull()
  })
})

describe('global message routing', () => {
  it('pushes PROFILE_DATA into the session store', () => {
    useConnectionStore.getState().handleEvent({
      kind: 'message',
      message: { type: 'PROFILE_DATA', payload: PLAYER }
    })
    expect(useSessionStore.getState().player).toEqual(PLAYER)
  })

  it('opens the session on LOGIN_OK', () => {
    useConnectionStore.getState().handleEvent({
      kind: 'message',
      message: { type: 'LOGIN_OK', payload: PLAYER }
    })
    expect(useSessionStore.getState().player?.username).toBe('minh_anh')
  })

  it('forwards messages to the screen listeners and unsubscribes cleanly', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeServerMessages(listener)

    useConnectionStore.getState().handleEvent({
      kind: 'message',
      message: { type: 'MATCH_HISTORY_DATA', payload: { matches: [] } }
    })
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    useConnectionStore.getState().handleEvent({
      kind: 'message',
      message: { type: 'MATCH_HISTORY_DATA', payload: { matches: [] } }
    })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('ends the session when the socket drops after a successful login', () => {
    const store = useConnectionStore.getState()
    store.handleEvent({ kind: 'status', status: status('connected') })
    store.handleEvent({ kind: 'message', message: { type: 'LOGIN_OK', payload: PLAYER } })

    useConnectionStore.getState().handleEvent({ kind: 'status', status: status('disconnected') })

    const state = useConnectionStore.getState()
    expect(state.connectionLost).toBe(true)
    expect(useSessionStore.getState().player).toBeNull()
  })

  it('does not flag a lost connection when no session was open', () => {
    const store = useConnectionStore.getState()
    store.handleEvent({ kind: 'status', status: status('connected') })
    store.handleEvent({ kind: 'status', status: status('error') })

    expect(useConnectionStore.getState().connectionLost).toBe(false)
  })
})

describe('message listener isolation', () => {
  it('contains a throwing listener, keeps delivering and never rethrows (F-09)', () => {
    // Log DEV không được assert; chặn nó để output test sạch.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const received: string[] = []
    const unsubscribeThrowing = subscribeServerMessages(() => {
      throw new Error('listener hỏng')
    })
    const unsubscribeGood = subscribeServerMessages((message) => {
      received.push(message.type)
    })

    try {
      expect(() => {
        useConnectionStore.getState().handleEvent({
          kind: 'message',
          message: { type: 'PROFILE_DATA', payload: PLAYER }
        })
      }).not.toThrow()

      // Listener còn lại vẫn nhận message, và routing toàn cục vẫn chạy.
      expect(received).toEqual(['PROFILE_DATA'])
      expect(useSessionStore.getState().player).toEqual(PLAYER)
    } finally {
      unsubscribeThrowing()
      unsubscribeGood()
      consoleSpy.mockRestore()
    }
  })
})

describe('send()', () => {
  it('returns the IPC error instead of throwing when the bridge is missing', async () => {
    setBridgeOverride(null)
    const result = await useConnectionStore.getState().send({ type: 'CONNECT', payload: '' })
    expect(result).toEqual({ ok: false, error: 'BRIDGE_UNAVAILABLE' })
    expect(useConnectionStore.getState().lastError).toBe('BRIDGE_UNAVAILABLE')
  })

  it('never throws when the bridge rejects', async () => {
    const bridge = createFakeBridge()
    bridge.send = vi.fn(() => Promise.reject(new Error('boom')))
    setBridgeOverride(bridge)

    const result = await useConnectionStore.getState().send({ type: 'CONNECT', payload: '' })
    expect(result.ok).toBe(false)
    expect(result.error).toBe('SEND_FAILED')
  })
})

describe('signOut()', () => {
  it('sends DISCONNECT, clears the session and closes the socket', async () => {
    const bridge = createFakeBridge()
    setBridgeOverride(bridge)
    useConnectionStore.getState().handleEvent({
      kind: 'message',
      message: { type: 'LOGIN_OK', payload: PLAYER }
    })
    useConnectionStore.getState().handleEvent({ kind: 'status', status: status('connected') })

    await useConnectionStore.getState().signOut()

    expect(bridge.send).toHaveBeenCalledWith({ type: 'DISCONNECT', payload: '' })
    expect(bridge.disconnect).toHaveBeenCalledTimes(1)
    expect(useSessionStore.getState().player).toBeNull()
    expect(useConnectionStore.getState().connectionLost).toBe(false)
  })
})
