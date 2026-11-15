/**
 * `/friends` — tìm người chơi, lời mời kết bạn, danh sách bạn bè và lời mời chơi.
 *
 * Hợp đồng (docs/protocol.md §4): mọi cập nhật là **push** (`PRESENCE_UPDATE`,
 * `FRIEND_LIST`, `FRIEND_REQUEST_LIST`, `GAME_INVITE_STATUS`, `SOCIAL_ERROR`); không có
 * polling. Nút "Làm mới" chỉ gửi lại hai lệnh `FRIEND_LIST` + `FRIEND_REQUEST_LIST`.
 *
 * Trạng thái bạn bè/presence chỉ đổi khi server gửi message — không có cập nhật lạc quan.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { PageHeader } from '../components/shell'
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  Dialog,
  EmptyState,
  ErrorBanner,
  Input,
  Select,
  Skeleton,
  type BadgeTone
} from '../components/ui'
import { RefreshCw, Search, Users, X } from '../components/ui/icons'
import { useFriendsStore } from '../lib/social/friends-store'
import { availabilityOf, inviteBlockReason, outgoingInviteCopy } from '../lib/social/invite'
import { useQuizStore } from '../lib/quiz'
import { useSessionStore } from '../lib/session-store'
import { describeErrorCode } from '../lib/error-codes'
import type { FriendItem } from '@shared/protocol'

const SEARCH_MIN = 1
const SEARCH_MAX = 20
const SEARCH_DEBOUNCE_MS = 350

const DURATION_OPTIONS = [
  { value: '180', label: 'Ranked 3 phút' },
  { value: '300', label: 'Ranked 5 phút' }
]

const AVAILABILITY_TONE: Record<string, BadgeTone> = {
  success: 'success',
  warning: 'warning',
  neutral: 'neutral',
  danger: 'danger'
}

export function FriendsRoute(): ReactNode {
  const me = useSessionStore((state) => state.player)
  const myLobby = useQuizStore((state) => state.lobby)

  const searchResults = useFriendsStore((state) => state.searchResults)
  const searchLoading = useFriendsStore((state) => state.searchLoading)
  const searchError = useFriendsStore((state) => state.searchError)
  const sentRequests = useFriendsStore((state) => state.sentRequests)
  const friends = useFriendsStore((state) => state.friends)
  const friendsLoading = useFriendsStore((state) => state.friendsLoading)
  const friendsError = useFriendsStore((state) => state.friendsError)
  const requests = useFriendsStore((state) => state.requests)
  const requestsLoading = useFriendsStore((state) => state.requestsLoading)
  const responding = useFriendsStore((state) => state.responding)
  const notice = useFriendsStore((state) => state.notice)
  const outgoingInvite = useFriendsStore((state) => state.outgoingInvite)
  const invitePending = useFriendsStore((state) => state.invitePending)

  const search = useFriendsStore((state) => state.search)
  const clearSearch = useFriendsStore((state) => state.clearSearch)
  const sendFriendRequest = useFriendsStore((state) => state.sendFriendRequest)
  const requestLists = useFriendsStore((state) => state.requestLists)
  const respondRequest = useFriendsStore((state) => state.respondRequest)
  const removeFriend = useFriendsStore((state) => state.removeFriend)
  const inviteRanked = useFriendsStore((state) => state.inviteRanked)
  const inviteQuiz = useFriendsStore((state) => state.inviteQuiz)
  const clearNotice = useFriendsStore((state) => state.clearNotice)

  const [query, setQuery] = useState('')
  const [duration, setDuration] = useState<'180' | '300'>('180')
  const [pendingRemove, setPendingRemove] = useState<FriendItem | null>(null)
  const searchTimer = useRef<number | null>(null)

  useEffect(() => {
    requestLists()
  }, [requestLists])

  useEffect(
    () => () => {
      if (searchTimer.current !== null) window.clearTimeout(searchTimer.current)
    },
    []
  )

  const trimmedQuery = query.trim()
  const queryTooLong = trimmedQuery.length > SEARCH_MAX
  const canSearch = trimmedQuery.length >= SEARCH_MIN && !queryTooLong

  /* Debounce tìm kiếm: chỉ gửi khi người dùng dừng gõ. */
  useEffect(() => {
    if (searchTimer.current !== null) window.clearTimeout(searchTimer.current)
    if (!canSearch) return

    searchTimer.current = window.setTimeout(() => {
      searchTimer.current = null
      void search(trimmedQuery)
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      if (searchTimer.current !== null) window.clearTimeout(searchTimer.current)
      searchTimer.current = null
    }
  }, [trimmedQuery, canSearch, search])

  const friendIds = useMemo(() => new Set((friends ?? []).map((friend) => friend.userId)), [friends])
  const sentSet = useMemo(() => new Set(sentRequests), [sentRequests])

  const searchErrorCopy = searchError ? describeErrorCode(searchError) : null
  const friendsErrorCopy = friendsError ? describeErrorCode(friendsError) : null
  const hosting = myLobby?.currentUserHost === true
  const hostPin = hosting ? myLobby?.pin ?? null : null

  const handleInviteQuiz = async (friend: FriendItem): Promise<void> => {
    if (!hostPin) return
    await inviteQuiz(friend.userId, hostPin)
  }

  return (
    <>
      <PageHeader
        eyebrow="Cộng đồng"
        title="Bạn bè"
        subtitle="Tìm người chơi, nhận lời mời kết bạn và rủ nhau vào một trận Ranked hoặc phòng Quiz."
        meta={
          <>
            <Badge tone="neutral" appearance="outline">
              {friends ? `${friends.length} bạn bè` : 'Đang tải…'}
            </Badge>
            {requests && requests.length > 0 ? (
              <Badge tone="warning" appearance="soft" dot>
                {requests.length} lời mời kết bạn
              </Badge>
            ) : null}
            {hosting ? (
              <Badge tone="primary" appearance="soft">
                Bạn đang host phòng PIN {myLobby?.pin}
              </Badge>
            ) : null}
          </>
        }
        actions={
          <Button
            variant="secondary"
            leftIcon={<RefreshCw size={15} />}
            onClick={requestLists}
            loading={friendsLoading || requestsLoading}
          >
            Làm mới
          </Button>
        }
      />

      {notice ? (
        <ErrorBanner
          className="mb-4"
          tone={notice.tone}
          title={notice.title}
          description={notice.description}
          onDismiss={clearNotice}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="lg">
          <CardHeader
            icon={<Search size={18} aria-hidden="true" />}
            title="Tìm người chơi"
            description={`Nhập ${SEARCH_MIN}–${SEARCH_MAX} ký tự username. Kết quả chỉ hiện người chơi trên máy chủ này.`}
          />

          <div className="mt-4">
            <Input
              id="friend-search"
              label="Username"
              value={query}
              maxLength={SEARCH_MAX}
              onChange={(event) => {
                setQuery(event.target.value)
                if (event.target.value.trim().length === 0) clearSearch()
              }}
              error={queryTooLong ? `Tối đa ${SEARCH_MAX} ký tự` : undefined}
              rightSlot={
                searchLoading ? (
                  <span className="size-3.5 animate-spin rounded-nq-full border-2 border-nq-text-tertiary border-t-transparent" />
                ) : undefined
              }
              autoComplete="off"
              spellCheck={false}
              placeholder="ví dụ: minh_anh"
            />
          </div>

          <div className="mt-3 flex min-h-5 items-start">
            {searchErrorCopy ? (
              <p className="text-nq-xs leading-snug text-nq-danger">
                {searchErrorCopy.title}
                {searchErrorCopy.description ? ` — ${searchErrorCopy.description}` : ''}
              </p>
            ) : (
              <p className="text-nq-xs text-nq-text-tertiary">
                {trimmedQuery.length === 0
                  ? 'Chưa có ai trong danh sách tìm kiếm.'
                  : searchLoading
                    ? 'Đang tìm người chơi…'
                    : searchResults
                      ? `Tìm thấy ${searchResults.length} người chơi`
                      : 'Nhập ít nhất 1 ký tự để tìm.'}
              </p>
            )}
          </div>

          {searchResults && searchResults.length > 0 ? (
            <ul className="mt-2 flex flex-col divide-y divide-nq-border-subtle border-t border-nq-border-subtle">
              {searchResults.map((user) => {
                const availability = availabilityOf(user)
                const isMe = me?.id === user.userId
                const alreadyFriend = friendIds.has(user.userId)
                const requested = sentSet.has(user.userId)
                const blocked = isMe || alreadyFriend || requested
                return (
                  <li key={user.userId} className="flex items-center gap-3 py-2.5">
                    <Avatar name={user.username} size="sm" status={user.online ? (user.busy ? 'busy' : 'online') : 'offline'} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-nq-sm text-nq-text">{user.username}</span>
                      <Badge tone={AVAILABILITY_TONE[availability.tone] ?? 'neutral'} appearance="outline" dot>
                        {availability.label}
                      </Badge>
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void sendFriendRequest(user.userId)}
                      disabled={blocked}
                      title={
                        isMe
                          ? 'Đây là tài khoản của bạn'
                          : alreadyFriend
                            ? 'Hai người đã là bạn bè'
                            : requested
                              ? 'Đã gửi lời mời kết bạn'
                              : undefined
                      }
                    >
                      {alreadyFriend ? 'Đã là bạn' : requested ? 'Đã gửi' : 'Kết bạn'}
                    </Button>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </Card>

        <Card padding="lg">
          <CardHeader
            icon={<Users size={18} aria-hidden="true" />}
            title="Lời mời kết bạn"
            description="Chấp nhận để thêm vào danh sách bạn bè; từ chối thì lời mời biến mất."
          />
          {requestsLoading && requests === null ? (
            <div className="mt-4">
              <Skeleton lines={2} height="1.4rem" rounded="sm" />
            </div>
          ) : requests && requests.length > 0 ? (
            <ul className="mt-4 flex flex-col divide-y divide-nq-border-subtle border-t border-nq-border-subtle">
              {requests.map((request) => (
                <li key={request.userId} className="flex items-center gap-3 py-2.5">
                  <Avatar name={request.username} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-nq-sm text-nq-text">
                    {request.username}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <Button
                      size="sm"
                      loading={responding.includes(request.userId)}
                      onClick={() => void respondRequest(request.userId, true)}
                    >
                      Chấp nhận
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void respondRequest(request.userId, false)}
                      disabled={responding.includes(request.userId)}
                    >
                      Từ chối
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          ) : friendsErrorCopy ? (
            <ErrorBanner
              className="mt-4"
              tone="danger"
              title={friendsErrorCopy.title}
              description={friendsErrorCopy.description}
              onRetry={requestLists}
              retryLabel="Tải lại"
            />
          ) : (
            <EmptyState
              className="mt-4"
              size="sm"
              icon={<Users size={20} aria-hidden="true" />}
              title="Không có lời mời nào"
              description="Khi ai đó gửi lời mời kết bạn, nó sẽ xuất hiện ở đây."
            />
          )}
        </Card>
      </div>

      <Card className="mt-4" padding="none">
        <div className="p-5 pb-0">
          <CardHeader
            icon={<Users size={18} aria-hidden="true" />}
            title="Bạn bè"
            description="Mời bạn vào trận Ranked hoặc vào phòng Quiz bạn đang là host."
            action={
              <Select
                id="invite-duration"
                aria-label="Thời lượng lời mời Ranked"
                selectSize="sm"
                value={duration}
                onChange={(event) => setDuration(event.target.value === '300' ? '300' : '180')}
                options={DURATION_OPTIONS}
                className="w-40"
              />
            }
          />
        </div>

        {outgoingInvite ? (
          <p className="mx-5 mt-3 rounded-nq-md border border-nq-border-subtle bg-nq-surface-sunken px-3 py-2 text-nq-xs text-nq-text-secondary">
            {outgoingInviteCopy(outgoingInvite.status, outgoingInvite.targetUsername)}
          </p>
        ) : null}

        {friendsLoading && friends === null ? (
          <div className="px-5 py-4">
            <Skeleton lines={3} height="1.6rem" rounded="sm" />
          </div>
        ) : friends && friends.length > 0 ? (
          <ul className="mt-3 flex flex-col border-t border-nq-border-subtle">
            {friends.map((friend) => {
              const availability = availabilityOf(friend)
              const blockedReason = inviteBlockReason(friend)
              const quizBlocked = hostPin === null ? 'Bạn cần là host của một lobby đang chờ.' : blockedReason
              return (
                <li
                  key={friend.userId}
                  className="flex flex-wrap items-center gap-3 border-b border-nq-border-subtle px-5 py-3 last:border-b-0"
                >
                  <Avatar
                    name={friend.username}
                    size="sm"
                    status={friend.online ? (friend.busy ? 'busy' : 'online') : 'offline'}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-nq-sm font-semibold text-nq-text">
                      {friend.username}
                    </span>
                    <Badge tone={AVAILABILITY_TONE[availability.tone] ?? 'neutral'} appearance="outline" dot>
                      {availability.label}
                    </Badge>
                  </span>
                  <span className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void inviteRanked(friend.userId, duration === '300' ? 300 : 180)}
                      disabled={invitePending || blockedReason !== null}
                      title={blockedReason ?? 'Gửi lời mời đấu hạng'}
                    >
                      Mời Ranked
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void handleInviteQuiz(friend)}
                      disabled={invitePending || quizBlocked !== null}
                      title={quizBlocked ?? `Mời vào phòng PIN ${hostPin}`}
                    >
                      Mời Quiz
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPendingRemove(friend)}
                    >
                      Xoá
                    </Button>
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="px-5 py-4">
            <EmptyState
              size="sm"
              icon={<Users size={20} aria-hidden="true" />}
              title="Chưa có bạn bè"
              description="Tìm một người chơi ở trên rồi gửi lời mời kết bạn."
            />
          </div>
        )}
      </Card>

      <p className="mt-3 text-nq-xs text-nq-text-tertiary">
        Lời mời chơi có hiệu lực 60 giây. Trạng thái online/bận do máy chủ đẩy xuống; khi ai đó
        đang bận, nút mời bị khoá để tránh lỗi `TARGET_BUSY`.
      </p>

      <Dialog
        open={pendingRemove !== null}
        onClose={() => setPendingRemove(null)}
        closeOnScrimClick={false}
        title="Xoá bạn bè?"
        description={
          pendingRemove
            ? `"${pendingRemove.username}" sẽ bị xoá khỏi danh sách bạn bè của cả hai người.`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingRemove(null)}>
              <X aria-hidden="true" size={15} />
              Giữ lại
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const target = pendingRemove
                setPendingRemove(null)
                if (target) void removeFriend(target.userId)
              }}
            >
              Xoá bạn
            </Button>
          </>
        }
      />
    </>
  )
}
