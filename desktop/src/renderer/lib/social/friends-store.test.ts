import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NqBridge } from '@shared/ipc'
import { createIdleConnectionStatus } from '@shared/ipc'
import type { FriendItem, GameInviteReceived } from '@shared/protocol'
import { setBridgeOverride } from '../bridge'
import { resetConnectionStore, useConnectionStore } from '../connection-store'
import { resetFriendsStore, useFriendsStore } from './friends-store'

const FRIEND: FriendItem = {
  userId: 8,
  username: 'binh_tran',
  online: true,
  busy: false
}

function invite(overrides: Partial<GameInviteReceived> = {}): GameInviteReceived {
  return {
    inviteId: 'invite-1',
    fromUserId: 8,
    fromUsername: 'binh_tran',
    type: 'RANKED',
    durationSeconds: 180,
    roomPin: null,
    expiresAtEpochMillis: Date.now() + 60_000,
    ...overrides
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

let bridge: NqBridge

beforeEach(() => {
  resetConnectionStore()
  resetFriendsStore()
  bridge = createFakeBridge()
  setBridgeOverride(bridge)
})

afterEach(() => {
  resetFriendsStore()
  setBridgeOverride(null)
  vi.useRealTimers()
})

describe('friends store — search', () => {
  it('sends USER_SEARCH and stores the result', async () => {
    await useFriendsStore.getState().search('  binh  ')
    expect(bridge.send).toHaveBeenCalledWith({ type: 'USER_SEARCH', payload: { query: 'binh' } })

    useFriendsStore.getState().applyServerMessage({
      type: 'USER_SEARCH_RESULT',
      payload: { users: [{ userId: 8, username: 'binh_tran', online: true, busy: false }] }
    })

    const state = useFriendsStore.getState()
    expect(state.searchQuery).toBe('binh')
    expect(state.searchResults).toHaveLength(1)
    expect(state.searchLoading).toBe(false)
  })

  it('maps SOCIAL_ERROR to a Vietnamese notice and stops the spinner', async () => {
    await useFriendsStore.getState().search('binh')
    useFriendsStore.getState().applyServerMessage({ type: 'SOCIAL_ERROR', payload: 'INVALID_QUERY' })

    const state = useFriendsStore.getState()
    expect(state.searchLoading).toBe(false)
    expect(state.notice?.tone).toBe('danger')
    expect(state.notice?.title).toBeTruthy()
  })
})

describe('friends store — lists and presence', () => {
  it('asks for both lists and stores them', () => {
    useFriendsStore.getState().requestLists()
    const types = (bridge.send as ReturnType<typeof vi.fn>).mock.calls.map(
      (call) => (call[0] as { type: string }).type
    )
    expect(types).toEqual(['FRIEND_LIST', 'FRIEND_REQUEST_LIST'])

    useFriendsStore.getState().applyServerMessage({
      type: 'FRIEND_LIST',
      payload: { friends: [FRIEND] }
    })
    useFriendsStore.getState().applyServerMessage({
      type: 'FRIEND_REQUEST_LIST',
      payload: { requests: [{ userId: 9, username: 'chi_le' }] }
    })

    const state = useFriendsStore.getState()
    expect(state.friends).toEqual([FRIEND])
    expect(state.requests).toHaveLength(1)
    expect(state.friendsLoading).toBe(false)
  })

  it('applies presence updates from the server, not local guesses', () => {
    useFriendsStore.setState({
      friends: [FRIEND],
      searchResults: [{ userId: 8, username: 'binh_tran', online: true, busy: false }]
    })

    useFriendsStore.getState().applyServerMessage({
      type: 'PRESENCE_UPDATE',
      payload: { userId: 8, online: true, busy: true }
    })

    expect(useFriendsStore.getState().friends?.[0]).toMatchObject({ online: true, busy: true })
    expect(useFriendsStore.getState().searchResults?.[0]).toMatchObject({ busy: true })
  })

  it('marks a sent friend request so the button cannot be pressed twice', async () => {
    await useFriendsStore.getState().sendFriendRequest(8)
    expect(bridge.send).toHaveBeenCalledWith({ type: 'FRIEND_REQUEST_SEND', payload: { userId: 8 } })

    useFriendsStore.getState().applyServerMessage({ type: 'FRIEND_REQUEST_SENT', payload: { userId: 8 } })

    expect(useFriendsStore.getState().sentRequests).toContain(8)
    expect(useFriendsStore.getState().notice?.title).toContain('lời mời kết bạn')
  })

  it('answers a friend request and drops it from the list', async () => {
    useFriendsStore.setState({ requests: [{ userId: 9, username: 'chi_le' }] })

    await useFriendsStore.getState().respondRequest(9, true)

    expect(bridge.send).toHaveBeenCalledWith({
      type: 'FRIEND_REQUEST_RESPOND',
      payload: { userId: 9, accept: true }
    })

    useFriendsStore.getState().applyServerMessage({
      type: 'FRIEND_REQUEST_RESPOND',
      payload: { userId: 9, accept: true }
    })

    expect(useFriendsStore.getState().requests).toEqual([])
    expect(useFriendsStore.getState().responding).toEqual([])
  })

  it('removes a friend only after the server confirms', async () => {
    useFriendsStore.setState({ friends: [FRIEND] })
    await useFriendsStore.getState().removeFriend(8)

    // Chưa có FRIEND_REMOVED → danh sách vẫn giữ nguyên (không lạc quan).
    expect(useFriendsStore.getState().friends).toHaveLength(1)

    useFriendsStore.getState().applyServerMessage({ type: 'FRIEND_REMOVED', payload: { userId: 8 } })
    expect(useFriendsStore.getState().friends).toEqual([])
  })
})

describe('friends store — game invites', () => {
  it('sends a RANKED invite with no room pin', async () => {
    useFriendsStore.setState({ friends: [FRIEND] })
    await useFriendsStore.getState().inviteRanked(8, 300)

    expect(bridge.send).toHaveBeenCalledWith({
      type: 'GAME_INVITE_SEND',
      payload: { targetUserId: 8, type: 'RANKED', durationSeconds: 300, roomPin: null }
    })
    expect(useFriendsStore.getState().outgoingInvite?.status).toBe('SENT')
  })

  it('sends a QUIZ invite with the lobby PIN', async () => {
    useFriendsStore.setState({ friends: [FRIEND] })
    await useFriendsStore.getState().inviteQuiz(8, '246810')

    expect(bridge.send).toHaveBeenCalledWith({
      type: 'GAME_INVITE_SEND',
      payload: { targetUserId: 8, type: 'QUIZ', durationSeconds: 0, roomPin: '246810' }
    })
  })

  it('receives an invite once and answers it', async () => {
    useFriendsStore.getState().applyServerMessage({
      type: 'GAME_INVITE_RECEIVED',
      payload: invite()
    })
    useFriendsStore.getState().applyServerMessage({
      type: 'GAME_INVITE_RECEIVED',
      payload: invite()
    })

    expect(useFriendsStore.getState().incomingInvites).toHaveLength(1)

    await useFriendsStore.getState().respondInvite('invite-1', true)
    expect(bridge.send).toHaveBeenCalledWith({
      type: 'GAME_INVITE_RESPOND',
      payload: { inviteId: 'invite-1', accept: true }
    })
    expect(useFriendsStore.getState().incomingInvites).toEqual([])
  })

  it('drops the invite and explains when the server reports EXPIRED', () => {
    useFriendsStore.getState().applyServerMessage({
      type: 'GAME_INVITE_RECEIVED',
      payload: invite()
    })
    useFriendsStore.getState().applyServerMessage({
      type: 'GAME_INVITE_STATUS',
      payload: { inviteId: 'invite-1', status: 'EXPIRED' }
    })

    const state = useFriendsStore.getState()
    expect(state.incomingInvites).toEqual([])
    expect(state.outgoingInvite?.status).toBe('EXPIRED')
    expect(state.notice?.title).toContain('hết hạn')
  })

  it('prunes an invite that passes its 60 second deadline', () => {
    const expiresAt = Date.now() - 1_000
    useFriendsStore.getState().applyServerMessage({
      type: 'GAME_INVITE_RECEIVED',
      payload: invite({ expiresAtEpochMillis: expiresAt })
    })
    expect(useFriendsStore.getState().incomingInvites).toHaveLength(1)

    useFriendsStore.getState().pruneExpiredInvites(Date.now())

    const state = useFriendsStore.getState()
    expect(state.incomingInvites).toEqual([])
    expect(state.notice?.title).toContain('hết hạn')
  })

  it('keeps other invites pending when one is answered', async () => {
    useFriendsStore.getState().applyServerMessage({
      type: 'GAME_INVITE_RECEIVED',
      payload: invite({ inviteId: 'a' })
    })
    useFriendsStore.getState().applyServerMessage({
      type: 'GAME_INVITE_RECEIVED',
      payload: invite({ inviteId: 'b', fromUsername: 'chi_le' })
    })

    await useFriendsStore.getState().respondInvite('a', false)

    const remaining = useFriendsStore.getState().incomingInvites
    expect(remaining).toHaveLength(1)
    expect(remaining[0]?.inviteId).toBe('b')
  })

  it('reports a rejected outgoing invite', () => {
    useFriendsStore.setState({ outgoingInvite: { status: 'SENT', targetUsername: 'binh_tran' } })
    useFriendsStore.getState().applyServerMessage({
      type: 'GAME_INVITE_STATUS',
      payload: { inviteId: 'x', status: 'REJECTED' }
    })

    const state = useFriendsStore.getState()
    expect(state.outgoingInvite?.status).toBe('REJECTED')
    expect(state.notice?.title).toContain('từ chối')
  })
})

describe('friends store — connection hygiene', () => {
  it('surfaces a failed send instead of spinning forever', async () => {
    const failing: NqBridge = {
      ...createFakeBridge(),
      send: vi.fn(() => Promise.resolve({ ok: false, error: 'NOT_CONNECTED' }))
    }
    setBridgeOverride(failing)

    useFriendsStore.getState().requestLists()

    await vi.waitFor(() => {
      expect(useFriendsStore.getState().friendsError).toBe('NOT_CONNECTED')
    })
    expect(useFriendsStore.getState().friendsLoading).toBe(false)
  })

  it('keeps the connection usable when the bridge rejects', async () => {
    const rejecting: NqBridge = {
      ...createFakeBridge(),
      send: vi.fn(() => Promise.reject(new Error('boom')))
    }
    setBridgeOverride(rejecting)

    const result = await useConnectionStore.getState().send({ type: 'FRIEND_LIST', payload: '' })
    expect(result.ok).toBe(false)
    expect(result.error).toBe('SEND_FAILED')
  })
})
