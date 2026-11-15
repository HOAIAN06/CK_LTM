/**
 * Bạn bè, presence và lời mời chơi — toàn bộ là push từ máy chủ, không polling.
 *
 * Hợp đồng (docs/protocol.md §4):
 *   USER_SEARCH/FRIEND_* → USER_SEARCH_RESULT, FRIEND_LIST, FRIEND_REQUEST_LIST,
 *   FRIEND_REQUEST_SENT, FRIEND_REQUEST_RESPOND, FRIEND_REMOVED, PRESENCE_UPDATE,
 *   SOCIAL_ERROR
 *   GAME_INVITE_* → GAME_INVITE_RECEIVED (60 giây), GAME_INVITE_STATUS
 *
 * Bất biến: không có trạng thái bạn bè "lạc quan" nào được tạo ở client — danh sách chỉ
 * đổi khi server gửi message. Lời mời hết hạn sau 60 giây; store giữ mốc `expiresAt` của
 * server và dọn khi quá hạn (server cũng gửi EXPIRED).
 */
import { create } from 'zustand'
import type { NqResult } from '@shared/ipc'
import type {
  FriendItem,
  FriendRequestItem,
  OutboundMessage,
  ServerMessage,
  UserSearchItem
} from '@shared/protocol'
import { useConnectionStore, subscribeServerMessages } from '../connection-store'
import { UI_ERROR } from '../error-codes'
import { infoNotice, noticeFromErrorCode, type UiNotice } from '../notices'
import { RESPONSE_TIMEOUT_MS, createWatchdog } from '../watchdog'

export interface IncomingInvite {
  inviteId: string
  fromUserId: number
  fromUsername: string
  /** `RANKED` hoặc `QUIZ`. */
  type: string
  durationSeconds: number
  roomPin: string | null
  /** Epoch ms do server cấp. */
  expiresAt: number
}

export interface SocialState {
  searchQuery: string
  searchResults: UserSearchItem[] | null
  searchLoading: boolean
  searchError: string | null
  /** Những userId đã gửi lời mời kết bạn trong phiên này. */
  sentRequests: number[]

  friends: FriendItem[] | null
  friendsLoading: boolean
  friendsError: string | null
  requests: FriendRequestItem[] | null
  requestsLoading: boolean
  requestsError: string | null
  /** Lời mời kết bạn đã phản hồi (server sẽ gửi lại danh sách). */
  responding: number[]

  incomingInvites: IncomingInvite[]
  /** Trạng thái lời mời chơi mình đã gửi (SENT/ACCEPTED/REJECTED/EXPIRED/CANCELLED). */
  outgoingInvite: { status: string; targetUsername?: string } | null
  invitePending: boolean
  notice: UiNotice | null

  search: (query: string) => Promise<NqResult>
  clearSearch: () => void
  sendFriendRequest: (userId: number) => Promise<NqResult>
  requestLists: () => void
  respondRequest: (userId: number, accept: boolean) => Promise<NqResult>
  removeFriend: (userId: number) => Promise<NqResult>
  inviteRanked: (targetUserId: number, durationSeconds: number) => Promise<NqResult>
  inviteQuiz: (targetUserId: number, roomPin: string) => Promise<NqResult>
  respondInvite: (inviteId: string, accept: boolean) => Promise<NqResult>
  dismissInvite: (inviteId: string) => void
  /** Dọn lời mời đã quá hạn theo đồng hồ máy; gọi mỗi giây khi có modal. */
  pruneExpiredInvites: (now?: number) => void
  clearNotice: () => void
  applyServerMessage: (message: ServerMessage, now?: number) => void
}

const searchWatchdog = createWatchdog()
const friendsWatchdog = createWatchdog()
const requestsWatchdog = createWatchdog()
const inviteWatchdog = createWatchdog()

let channelReady = false

const INVITE_STATUS_COPY: Record<string, { tone: 'info' | 'success' | 'warning'; title: string }> = {
  SENT: { tone: 'info', title: 'Đã gửi lời mời chơi' },
  ACCEPTED: { tone: 'success', title: 'Lời mời đã được chấp nhận' },
  REJECTED: { tone: 'warning', title: 'Lời mời đã bị từ chối' },
  EXPIRED: { tone: 'warning', title: 'Lời mời đã hết hạn' },
  CANCELLED: { tone: 'info', title: 'Lời mời đã bị hủy' }
}

function ensureChannel(): void {
  if (channelReady) return
  channelReady = true
  subscribeServerMessages((message) => {
    useFriendsStore.getState().applyServerMessage(message, Date.now())
  })
}

function toIncomingInvite(payload: {
  inviteId: string
  fromUserId: number
  fromUsername: string
  type: string
  durationSeconds: number
  roomPin: string | null
  expiresAtEpochMillis: number
}): IncomingInvite {
  return {
    inviteId: payload.inviteId,
    fromUserId: payload.fromUserId,
    fromUsername: payload.fromUsername,
    type: payload.type,
    durationSeconds: payload.durationSeconds,
    roomPin: payload.roomPin,
    expiresAt: payload.expiresAtEpochMillis
  }
}

export const useFriendsStore = create<SocialState>()((set, get) => ({
  searchQuery: '',
  searchResults: null,
  searchLoading: false,
  searchError: null,
  sentRequests: [],

  friends: null,
  friendsLoading: false,
  friendsError: null,
  requests: null,
  requestsLoading: false,
  requestsError: null,
  responding: [],

  incomingInvites: [],
  outgoingInvite: null,
  invitePending: false,
  notice: null,

  search: async (query) => {
    const trimmed = query.trim()
    set({ searchQuery: trimmed, searchLoading: true, searchError: null })
    searchWatchdog.clear()

    const result = await useConnectionStore
      .getState()
      .send({ type: 'USER_SEARCH', payload: { query: trimmed } })

    if (!result.ok) {
      set({ searchLoading: false, searchError: result.error ?? 'SEND_FAILED' })
      return result
    }
    searchWatchdog.arm(RESPONSE_TIMEOUT_MS, () => {
      set({ searchLoading: false, searchError: UI_ERROR.requestTimeout })
    })
    return result
  },

  clearSearch: () =>
    set({ searchQuery: '', searchResults: null, searchLoading: false, searchError: null }),

  sendFriendRequest: async (userId) => {
    const result = await useConnectionStore
      .getState()
      .send({ type: 'FRIEND_REQUEST_SEND', payload: { userId } })
    if (result.ok) {
      set((state) => ({ sentRequests: [...new Set([...state.sentRequests, userId])] }))
    } else {
      set({ notice: noticeFromErrorCode(result.error) })
    }
    return result
  },

  requestLists: () => {
    const send = useConnectionStore.getState().send
    friendsWatchdog.clear()
    requestsWatchdog.clear()
    set({ friendsLoading: true, requestsLoading: true, friendsError: null, requestsError: null })

    void send({ type: 'FRIEND_LIST', payload: '' }).then((result) => {
      if (result.ok) {
        friendsWatchdog.arm(RESPONSE_TIMEOUT_MS, () =>
          set({ friendsLoading: false, friendsError: UI_ERROR.requestTimeout })
        )
        return
      }
      set({ friendsLoading: false, friendsError: result.error ?? 'SEND_FAILED' })
    })

    void send({ type: 'FRIEND_REQUEST_LIST', payload: '' }).then((result) => {
      if (result.ok) {
        requestsWatchdog.arm(RESPONSE_TIMEOUT_MS, () =>
          set({ requestsLoading: false, requestsError: UI_ERROR.requestTimeout })
        )
        return
      }
      set({ requestsLoading: false, requestsError: result.error ?? 'SEND_FAILED' })
    })
  },

  respondRequest: async (userId, accept) => {
    set((state) => ({ responding: [...new Set([...state.responding, userId])] }))
    const result = await useConnectionStore
      .getState()
      .send({ type: 'FRIEND_REQUEST_RESPOND', payload: { userId, accept } })
    if (!result.ok) {
      set((state) => ({
        responding: state.responding.filter((id) => id !== userId),
        notice: noticeFromErrorCode(result.error)
      }))
    }
    return result
  },

  removeFriend: async (userId) => {
    const result = await useConnectionStore
      .getState()
      .send({ type: 'FRIEND_REMOVE', payload: { userId } })
    if (!result.ok) set({ notice: noticeFromErrorCode(result.error) })
    return result
  },

  inviteRanked: async (targetUserId, durationSeconds) => {
    if (get().invitePending) return { ok: false, error: 'SEND_FAILED' }
    inviteWatchdog.clear()
    set({ invitePending: true, notice: null })

    const target = get().friends?.find((friend) => friend.userId === targetUserId)
    const frame: OutboundMessage = {
      type: 'GAME_INVITE_SEND',
      payload: {
        targetUserId,
        type: 'RANKED',
        durationSeconds,
        roomPin: null
      }
    }

    const result = await useConnectionStore.getState().send(frame)
    if (!result.ok) {
      set({ invitePending: false, notice: noticeFromErrorCode(result.error) })
      return result
    }
    set({
      outgoingInvite: { status: 'SENT', targetUsername: target?.username },
      notice: infoNotice(
        'Đã gửi lời mời Ranked',
        `${target?.username ?? 'Người chơi'} có 60 giây để chấp nhận.`
      )
    })
    inviteWatchdog.arm(RESPONSE_TIMEOUT_MS, () => set({ invitePending: false }))
    return result
  },

  inviteQuiz: async (targetUserId, roomPin) => {
    if (get().invitePending) return { ok: false, error: 'SEND_FAILED' }
    inviteWatchdog.clear()
    set({ invitePending: true, notice: null })

    const target = get().friends?.find((friend) => friend.userId === targetUserId)
    const frame: OutboundMessage = {
      type: 'GAME_INVITE_SEND',
      payload: {
        targetUserId,
        type: 'QUIZ',
        // `GameClient.inviteQuiz` gửi 0: phòng Quiz không dùng trường này.
        durationSeconds: 0,
        roomPin
      }
    }

    const result = await useConnectionStore.getState().send(frame)
    if (!result.ok) {
      set({ invitePending: false, notice: noticeFromErrorCode(result.error) })
      return result
    }
    set({
      outgoingInvite: { status: 'SENT', targetUsername: target?.username },
      notice: infoNotice(
        'Đã gửi lời mời vào phòng Quiz',
        `PIN ${roomPin} · ${target?.username ?? 'Người chơi'} có 60 giây để chấp nhận.`
      )
    })
    inviteWatchdog.arm(RESPONSE_TIMEOUT_MS, () => set({ invitePending: false }))
    return result
  },

  respondInvite: async (inviteId, accept) => {
    const invite = get().incomingInvites.find((item) => item.inviteId === inviteId)
    set((state) => ({
      incomingInvites: state.incomingInvites.filter((item) => item.inviteId !== inviteId)
    }))
    const result = await useConnectionStore
      .getState()
      .send({ type: 'GAME_INVITE_RESPOND', payload: { inviteId, accept } })
    if (!result.ok) {
      set({ notice: noticeFromErrorCode(result.error) })
      return result
    }
    if (!accept) {
      set({ notice: infoNotice('Đã từ chối lời mời', invite ? `Từ ${invite.fromUsername}.` : undefined) })
    }
    return result
  },

  dismissInvite: (inviteId) =>
    set((state) => ({
      incomingInvites: state.incomingInvites.filter((item) => item.inviteId !== inviteId)
    })),

  pruneExpiredInvites: (now = Date.now()) => {
    const expired = get().incomingInvites.filter((invite) => invite.expiresAt <= now)
    if (expired.length === 0) return
    set((state) => ({
      incomingInvites: state.incomingInvites.filter((invite) => invite.expiresAt > now),
      notice: infoNotice(
        'Lời mời đã hết hạn',
        expired.length === 1
          ? `Lời mời từ ${expired[0]?.fromUsername ?? 'người chơi'} đã quá 60 giây.`
          : `${expired.length} lời mời đã quá 60 giây.`
      )
    }))
  },

  clearNotice: () => set({ notice: null }),

  applyServerMessage: (message) => {
    switch (message.type) {
      case 'USER_SEARCH_RESULT': {
        searchWatchdog.clear()
        set({ searchResults: message.payload.users, searchLoading: false, searchError: null })
        break
      }

      case 'FRIEND_LIST': {
        friendsWatchdog.clear()
        set({ friends: message.payload.friends, friendsLoading: false, friendsError: null })
        break
      }

      case 'FRIEND_REQUEST_LIST': {
        requestsWatchdog.clear()
        set({
          requests: message.payload.requests,
          requestsLoading: false,
          requestsError: null
        })
        break
      }

      case 'FRIEND_REQUEST_SENT': {
        const userId = message.payload.userId
        set((state) => ({
          sentRequests: [...new Set([...state.sentRequests, userId])],
          notice: infoNotice('Đã gửi lời mời kết bạn', 'Lời mời sẽ xuất hiện khi người đó đồng ý.')
        }))
        break
      }

      case 'FRIEND_REQUEST_RESPOND': {
        const { userId } = message.payload
        set((state) => ({
          responding: state.responding.filter((id) => id !== userId),
          requests: state.requests?.filter((request) => request.userId !== userId) ?? state.requests
        }))
        get().requestLists()
        break
      }

      case 'FRIEND_REMOVED': {
        const { userId } = message.payload
        set((state) => ({
          friends: state.friends?.filter((friend) => friend.userId !== userId) ?? state.friends,
          notice: infoNotice('Đã xóa bạn')
        }))
        break
      }

      case 'PRESENCE_UPDATE': {
        const { userId, online, busy } = message.payload
        set((state) => ({
          friends:
            state.friends?.map((friend) =>
              friend.userId === userId ? { ...friend, online, busy } : friend
            ) ?? state.friends,
          searchResults:
            state.searchResults?.map((user) =>
              user.userId === userId ? { ...user, online, busy } : user
            ) ?? state.searchResults
        }))
        break
      }

      case 'GAME_INVITE_RECEIVED': {
        const invite = toIncomingInvite(message.payload)
        set((state) => ({
          incomingInvites: state.incomingInvites.some((item) => item.inviteId === invite.inviteId)
            ? state.incomingInvites
            : [...state.incomingInvites, invite]
        }))
        break
      }

      case 'GAME_INVITE_STATUS': {
        const { inviteId, status } = message.payload
        const normalized = String(status ?? '').toUpperCase()
        set((state) => ({
          incomingInvites: state.incomingInvites.filter((invite) => invite.inviteId !== inviteId),
          outgoingInvite: { status: normalized, targetUsername: state.outgoingInvite?.targetUsername },
          invitePending: false,
          notice:
            normalized === 'SENT'
              ? state.notice
              : {
                  ...(INVITE_STATUS_COPY[normalized] ?? {
                    tone: 'info' as const,
                    title: 'Trạng thái lời mời đã thay đổi'
                  }),
                  description:
                    normalized === 'ACCEPTED'
                      ? 'Máy chủ đang mở trận cho hai người.'
                      : normalized === 'REJECTED'
                        ? 'Người chơi đã từ chối lời mời.'
                        : undefined
                }
        }))
        break
      }

      case 'SOCIAL_ERROR': {
        searchWatchdog.clear()
        friendsWatchdog.clear()
        requestsWatchdog.clear()
        inviteWatchdog.clear()
        set({
          searchLoading: false,
          friendsLoading: false,
          requestsLoading: false,
          invitePending: false,
          searchError: null,
          notice: noticeFromErrorCode(message.payload)
        })
        break
      }

      default:
        break
    }
  }
}))

ensureChannel()

/** Chỉ dùng cho test. */
export function resetFriendsStore(): void {
  searchWatchdog.clear()
  friendsWatchdog.clear()
  requestsWatchdog.clear()
  inviteWatchdog.clear()
  useFriendsStore.setState({
    searchQuery: '',
    searchResults: null,
    searchLoading: false,
    searchError: null,
    sentRequests: [],
    friends: null,
    friendsLoading: false,
    friendsError: null,
    requests: null,
    requestsLoading: false,
    requestsError: null,
    responding: [],
    incomingInvites: [],
    outgoingInvite: null,
    invitePending: false,
    notice: null
  })
}
