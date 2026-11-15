// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NqBridge, NqEvent } from '@shared/ipc'
import { isServerToClientType } from '@shared/protocol'
import { getBridge, isBridgeAvailable, setBridgeOverride } from '../bridge'
import { resetSessionStore, useSessionStore } from '../session-store'
import { isDemoMode, setDemoMode } from './flag'
import {
  DEMO_FRIENDS,
  DEMO_LEADERBOARD,
  DEMO_PLAYER,
  DEMO_QUIZ_SET_DETAIL,
  DEMO_SCREEN_PATHS,
  applyDemoDeepLink,
  createDemoBridge,
  demoLobby,
  demoUserSearch,
  enableDemoIfRequested,
  isDemoScreen
} from './fixture'

/** Gắn một listener vào bridge giả và trả về mảng message đã nhận. */
function listen(bridge: NqBridge): NqEvent[] {
  const events: NqEvent[] = []
  bridge.onEvent((event) => events.push(event))
  return events
}

function messagesOf(events: NqEvent[]): Array<NonNullable<NqEvent['message']>> {
  return events.flatMap((event) => (event.kind === 'message' && event.message ? [event.message] : []))
}

async function flush(ms = 30): Promise<void> {
  await new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function setUrl(search: string): void {
  window.history.replaceState({}, '', `/${search}`)
}

beforeEach(() => {
  setBridgeOverride(null)
  resetSessionStore()
  setDemoMode(false)
  setUrl('')
})

afterEach(() => {
  setBridgeOverride(null)
  resetSessionStore()
  setDemoMode(false)
  setUrl('')
  vi.useRealTimers()
})

describe('demo gating', () => {
  it('does nothing without ?demo=1', () => {
    expect(enableDemoIfRequested()).toBe(false)
    expect(isDemoMode()).toBe(false)
    expect(isBridgeAvailable()).toBe(false)
    expect(useSessionStore.getState().player).toBeNull()
  })

  it('installs the bridge, the session and the visible demo flag with ?demo=1', () => {
    setUrl('?demo=1')
    expect(enableDemoIfRequested()).toBe(true)

    expect(isDemoMode()).toBe(true)
    expect(isBridgeAvailable()).toBe(true)
    expect(useSessionStore.getState().player?.username).toBe(DEMO_PLAYER.username)
    expect(getBridge().app.packaged).toBe(false)
  })

  it('keeps the login screen without a fake session for ?demo=1&screen=login', () => {
    setUrl('?demo=1&screen=login')
    expect(enableDemoIfRequested()).toBe(true)
    expect(useSessionStore.getState().player).toBeNull()
  })

  it('only accepts known screen names for deep links', () => {
    expect(isDemoScreen('sets')).toBe(true)
    expect(isDemoScreen('nope')).toBe(false)
    expect(isDemoScreen(null)).toBe(false)
  })

  it('does not change the route unless the fixture is active', () => {
    setUrl('?demo=1&screen=friends')
    window.location.hash = '#/'
    expect(applyDemoDeepLink()).toBe(false)
    expect(window.location.hash).toBe('#/')
  })

  it.each(Object.entries(DEMO_SCREEN_PATHS))(
    'deep links %s to %s before render',
    (screen, path) => {
      setUrl(`?demo=1&screen=${screen}`)
      expect(enableDemoIfRequested()).toBe(true)
      expect(applyDemoDeepLink()).toBe(true)
      expect(window.location.hash).toBe(`#${path}`)
    }
  )
})

describe('profile, history and leaderboard payloads', () => {
  it('answers PROFILE_GET and MATCH_HISTORY_GET with typed payloads', async () => {
    const bridge = createDemoBridge()
    const events = listen(bridge)

    await bridge.send({ type: 'PROFILE_GET', payload: '' })
    await bridge.send({ type: 'MATCH_HISTORY_GET', payload: '' })
    await flush()

    const messages = messagesOf(events)
    const profile = messages.find((message) => message.type === 'PROFILE_DATA')
    expect(profile && profile.type === 'PROFILE_DATA' ? profile.payload.id : null).toBe(DEMO_PLAYER.id)

    const history = messages.find((message) => message.type === 'MATCH_HISTORY_DATA')
    expect(history && history.type === 'MATCH_HISTORY_DATA' ? history.payload.matches.length : 0).toBe(8)
    for (const message of messages) {
      expect(isServerToClientType(message.type)).toBe(true)
    }
  })

  it('offers ten ranked players including the demo account, in server order', async () => {
    const bridge = createDemoBridge()
    const events = listen(bridge)
    await bridge.send({ type: 'LEADERBOARD_GET', payload: '' })
    await flush()

    const message = messagesOf(events).find((candidate) => candidate.type === 'LEADERBOARD_DATA')
    expect(message?.type).toBe('LEADERBOARD_DATA')
    if (message?.type !== 'LEADERBOARD_DATA') return

    const players = message.payload.players
    expect(players).toHaveLength(10)
    expect(players.map((entry) => entry.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(players.some((entry) => entry.username === DEMO_PLAYER.username)).toBe(true)

    for (let index = 1; index < players.length; index += 1) {
      const previous = players[index - 1]!
      const current = players[index]!
      expect(previous.wins).toBeGreaterThanOrEqual(current.wins)
    }
    expect(players).toEqual(DEMO_LEADERBOARD.players)
  })
})

describe('quiz set payloads', () => {
  it('splits OWN and PUBLISHED the way the server does', async () => {
    const bridge = createDemoBridge()
    const events = listen(bridge)

    await bridge.send({ type: 'QUIZ_SET_LIST', payload: { scope: 'OWN' } })
    await bridge.send({ type: 'QUIZ_SET_LIST', payload: { scope: 'PUBLISHED' } })
    await flush()

    const lists = messagesOf(events).filter((message) => message.type === 'QUIZ_SET_LIST_RESULT')
    expect(lists).toHaveLength(2)
    const [own, published] = lists
    if (own?.type !== 'QUIZ_SET_LIST_RESULT' || published?.type !== 'QUIZ_SET_LIST_RESULT') return

    expect(own.payload.items).toHaveLength(3)
    expect(own.payload.items.every((item) => item.ownedByMe)).toBe(true)
    expect(own.payload.items.filter((item) => !item.published)).toHaveLength(2)

    expect(published.payload.items).toHaveLength(2)
    expect(published.payload.items.some((item) => !item.ownedByMe)).toBe(true)
    expect(published.payload.items.every((item) => item.published)).toBe(true)

    // Bốn bộ đề khác nhau, mỗi bộ có id riêng.
    const ids = [...own.payload.items, ...published.payload.items].map((item) => item.id)
    expect(new Set(ids).size).toBe(4)
  })

  it('answers QUIZ_SET_GET with a valid three-question set', async () => {
    const bridge = createDemoBridge()
    const events = listen(bridge)
    await bridge.send({ type: 'QUIZ_SET_GET', payload: { quizSetId: 4 } })
    await flush()

    const message = messagesOf(events).find((candidate) => candidate.type === 'QUIZ_SET_DETAIL')
    expect(message?.type).toBe('QUIZ_SET_DETAIL')
    if (message?.type !== 'QUIZ_SET_DETAIL') return

    const detail = message.payload
    expect(detail.id).toBe(4)
    expect(detail.questions).toHaveLength(3)
    for (const question of detail.questions) {
      expect(question.content.trim().length).toBeGreaterThan(0)
      expect(question.choices).toHaveLength(4)
      expect(question.choices.map((choice) => choice.position)).toEqual([1, 2, 3, 4])
      expect(question.choices.filter((choice) => choice.correct)).toHaveLength(1)
      expect(question.choices.every((choice) => choice.content.trim().length > 0)).toBe(true)
    }
    expect(detail).toEqual(DEMO_QUIZ_SET_DETAIL)

    // Editor cần các lệnh ghi cũng có phản hồi, nếu không nút sẽ quay vô hạn.
    events.length = 0
    await bridge.send({ type: 'QUIZ_SET_SAVE', payload: { ...DEMO_QUIZ_SET_DETAIL, id: null } })
    await bridge.send({ type: 'QUIZ_SET_PUBLISH', payload: { quizSetId: 77, published: true } })
    await bridge.send({ type: 'QUIZ_SET_DELETE', payload: { quizSetId: 5 } })
    await flush()

    const types = messagesOf(events).map((message) => message.type)
    expect(types).toEqual(['QUIZ_SET_SAVED', 'QUIZ_SET_PUBLISHED', 'QUIZ_SET_DELETED'])
  })
})

describe('social payloads', () => {
  it('answers friend lists with online / busy / offline variety', async () => {
    const bridge = createDemoBridge()
    const events = listen(bridge)

    await bridge.send({ type: 'FRIEND_LIST', payload: '' })
    await bridge.send({ type: 'FRIEND_REQUEST_LIST', payload: '' })
    await flush()

    const messages = messagesOf(events)
    const friends = messages.find((message) => message.type === 'FRIEND_LIST')
    if (friends?.type !== 'FRIEND_LIST') throw new Error('missing FRIEND_LIST')
    expect(friends.payload.friends).toHaveLength(4)
    expect(friends.payload.friends.some((friend) => friend.online && !friend.busy)).toBe(true)
    expect(friends.payload.friends.some((friend) => friend.online && friend.busy)).toBe(true)
    expect(friends.payload.friends.some((friend) => !friend.online)).toBe(true)
    expect(friends.payload.friends).toEqual([...DEMO_FRIENDS])

    const requests = messages.find((message) => message.type === 'FRIEND_REQUEST_LIST')
    if (requests?.type !== 'FRIEND_REQUEST_LIST') throw new Error('missing FRIEND_REQUEST_LIST')
    expect(requests.payload.requests).toHaveLength(2)
  })

  it('filters user search deterministically and never invents rows', async () => {
    const bridge = createDemoBridge()
    const events = listen(bridge)

    await bridge.send({ type: 'USER_SEARCH', payload: { query: '  HOANG ' } })
    await bridge.send({ type: 'USER_SEARCH', payload: { query: 'zzz' } })
    await flush()

    const results = messagesOf(events).filter((message) => message.type === 'USER_SEARCH_RESULT')
    const [match, empty] = results
    if (match?.type !== 'USER_SEARCH_RESULT' || empty?.type !== 'USER_SEARCH_RESULT') {
      throw new Error('missing USER_SEARCH_RESULT')
    }
    expect(match.payload.users.map((user) => user.username)).toEqual(['mai_hoang'])
    expect(empty.payload.users).toEqual([])
    expect(demoUserSearch('a').users.length).toBeGreaterThan(0)
  })

  it('pushes one presence update after subscribing', async () => {
    vi.useFakeTimers()
    const bridge = createDemoBridge()
    const events = listen(bridge)

    expect(messagesOf(events)).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(600)

    const presence = messagesOf(events).filter((message) => message.type === 'PRESENCE_UPDATE')
    expect(presence).toHaveLength(1)
    if (presence[0]?.type !== 'PRESENCE_UPDATE') return
    expect(presence[0].payload).toEqual({ userId: 12, online: true, busy: false })
  })
})

describe('quiz lobby payloads', () => {
  it('creates a lobby with three members, one camera DENIED, without blocking start', async () => {
    const bridge = createDemoBridge()
    const events = listen(bridge)

    await bridge.send({
      type: 'QUIZ_ROOM_CREATE',
      payload: { quizSetId: 4, durationMinutes: 5, hostPlays: false, proctoringEnabled: true }
    })
    await flush(950)

    const messages = messagesOf(events)
    const created = messages.find((message) => message.type === 'QUIZ_ROOM_CREATED')
    expect(created?.type).toBe('QUIZ_ROOM_CREATED')
    if (created?.type !== 'QUIZ_ROOM_CREATED') return

    const lobby = created.payload.lobby
    expect(lobby.members).toHaveLength(3)
    expect(lobby.currentUserHost).toBe(true)
    expect(lobby.proctoringEnabled).toBe(true)
    expect(lobby.hostPlays).toBe(false)
    expect(lobby.members.some((member) => member.cameraStatus === 'DENIED')).toBe(true)

    // 2 người chơi đang kết nối → host bắt đầu được dù có camera DENIED.
    const connectedPlayers = lobby.members.filter((member) => member.playing && member.connected)
    expect(connectedPlayers.length).toBeGreaterThanOrEqual(2)

    // Sau đó có một QUIZ_LOBBY_UPDATE (camera mở xong) nhưng DENIED vẫn còn.
    const update = messages.find((message) => message.type === 'QUIZ_LOBBY_UPDATE')
    expect(update?.type).toBe('QUIZ_LOBBY_UPDATE')
    if (update?.type !== 'QUIZ_LOBBY_UPDATE') return
    expect(update.payload.members.some((member) => member.cameraStatus === 'DENIED')).toBe(true)
  })

  it('joins as a normal player with a different host', async () => {
    const bridge = createDemoBridge()
    const events = listen(bridge)
    await bridge.send({ type: 'QUIZ_ROOM_JOIN', payload: { pin: '246810' } })
    await flush()

    const lobby = demoLobby({ viewerIsHost: false, hostPlays: true, proctoringEnabled: false })
    expect(lobby.currentUserHost).toBe(false)
    expect(lobby.members.find((member) => member.host)?.username).toBe('khoa_tran')
    expect(lobby.members.some((member) => member.userId === DEMO_PLAYER.id)).toBe(true)

    const message = messagesOf(events).find((candidate) => candidate.type === 'QUIZ_LOBBY_UPDATE')
    expect(message?.type).toBe('QUIZ_LOBBY_UPDATE')
  })

  it('starts the room without inventing any question stream', async () => {
    const bridge = createDemoBridge()
    const events = listen(bridge)

    await bridge.send({
      type: 'QUIZ_ROOM_CREATE',
      payload: { quizSetId: 4, durationMinutes: 3, hostPlays: true, proctoringEnabled: false }
    })
    await flush()
    await bridge.send({ type: 'QUIZ_ROOM_START', payload: '' })
    await flush()

    const types = messagesOf(events).map((message) => message.type)
    expect(types).toContain('QUIZ_ROOM_START')
    // Không có màn thi giả: fixture không bao giờ phát QUESTION/ANSWER_RESULT/GAME_OVER.
    expect(types).not.toContain('QUESTION')
    expect(types).not.toContain('QUIZ_QUESTION')
    expect(types).not.toContain('ANSWER_RESULT')
    expect(types).not.toContain('GAME_OVER')
  })
})
