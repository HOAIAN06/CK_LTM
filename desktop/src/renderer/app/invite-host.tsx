/**
 * Modal lời mời chơi — toàn app, không chỉ ở `/friends`.
 *
 * `GAME_INVITE_RECEIVED` có thể tới ở bất kỳ màn hình nào (60 giây hiệu lực), nên component
 * này được mount trong shell đã đăng nhập. Chấp nhận `RANKED` → server tạo trận trực tiếp và
 * gửi `MATCH_FOUND`; chấp nhận `QUIZ` → server join vào lobby và gửi `QUIZ_LOBBY_UPDATE`.
 * Việc điều hướng sau đó do các store tương ứng + `restoreTarget` lo, không phải modal này.
 */
import { useEffect, type ReactNode } from 'react'
import { Badge, Button, Dialog } from '../components/ui'
import { useFriendsStore } from '../lib/social/friends-store'
import { describeInvite, inviteSecondsLeft } from '../lib/social/invite'
import { useNow } from '../lib/timers'

export function InviteHost(): ReactNode {
  const invites = useFriendsStore((state) => state.incomingInvites)
  const respondInvite = useFriendsStore((state) => state.respondInvite)
  const dismissInvite = useFriendsStore((state) => state.dismissInvite)
  const pruneExpiredInvites = useFriendsStore((state) => state.pruneExpiredInvites)

  const invite = invites[0] ?? null
  const now = useNow(1_000, invite !== null)

  /* Dọn lời mời quá 60 giây; server cũng gửi EXPIRED nhưng modal phải tự đóng đúng lúc. */
  useEffect(() => {
    if (!invite) return
    pruneExpiredInvites(now)
  }, [now, invite, pruneExpiredInvites])

  if (!invite) return null

  const seconds = inviteSecondsLeft(invite.expiresAt, now)
  if (seconds <= 0) return null

  const copy = describeInvite(invite)
  const isRanked = invite.type.trim().toUpperCase() === 'RANKED'

  return (
    <Dialog
      open
      onClose={() => dismissInvite(invite.inviteId)}
      closeOnScrimClick={false}
      title={copy.title}
      description={copy.detail}
      footer={
        <>
          <Button variant="ghost" onClick={() => void respondInvite(invite.inviteId, false)}>
            Từ chối
          </Button>
          <Button onClick={() => void respondInvite(invite.inviteId, true)}>
            {isRanked ? 'Vào trận' : 'Vào phòng'}
          </Button>
        </>
      }
    >
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <Badge tone={isRanked ? 'primary' : 'info'} appearance="soft">
          {isRanked ? 'Đấu hạng 1v1' : 'Phòng Quiz'}
        </Badge>
        <Badge tone={seconds <= 10 ? 'warning' : 'neutral'} appearance="outline">
          <span className="nq-tabular">Còn {seconds} giây</span>
        </Badge>
        {invites.length > 1 ? (
          <Badge tone="neutral" appearance="outline">
            {invites.length - 1} lời mời khác đang chờ
          </Badge>
        ) : null}
      </div>
    </Dialog>
  )
}
