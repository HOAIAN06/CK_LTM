/**
 * Helper thuần cho lời mời chơi và trạng thái online/bận.
 *
 * Server giới hạn 60 giây (`SocialService.INVITE_SECONDS`) và tự gửi `EXPIRED`; client
 * chỉ hiển thị đếm ngược và dọn modal cho khớp.
 */
import type { FriendItem, GameInviteReceived, UserSearchItem } from '@shared/protocol'

export interface InviteSummary {
  title: string
  detail: string
}

/** Copy cho modal lời mời; `type` lạ vẫn hiển thị an toàn. */
export function describeInvite(invite: {
  type: string
  fromUsername: string
  durationSeconds: number
  roomPin: string | null
}): InviteSummary {
  const type = invite.type.trim().toUpperCase()
  if (type === 'RANKED') {
    const minutes = invite.durationSeconds >= 60 ? Math.round(invite.durationSeconds / 60) : 3
    return {
      title: `${invite.fromUsername} mời bạn đấu hạng 1v1`,
      detail: `Trận ${minutes} phút. Chấp nhận là vào trận ngay, không qua hàng chờ.`
    }
  }
  if (type === 'QUIZ') {
    return {
      title: `${invite.fromUsername} mời bạn vào phòng Quiz`,
      detail: invite.roomPin ? `PIN ${invite.roomPin} · vài giây sau khi chấp nhận bạn sẽ vào lobby.` : 'Phòng Quiz của người bạn này.'
    }
  }
  return {
    title: `${invite.fromUsername} mời bạn chơi`,
    detail: 'Loại lời mời này chưa được hỗ trợ trên bản desktop.'
  }
}

/** Giây còn lại của lời mời (0 khi đã hết hạn). */
export function inviteSecondsLeft(expiresAt: number, now: number): number {
  if (!Number.isFinite(expiresAt)) return 0
  return Math.max(0, Math.ceil((expiresAt - now) / 1000))
}

export type AvailabilityTone = 'success' | 'warning' | 'neutral' | 'danger'

export interface Availability {
  label: string
  tone: AvailabilityTone
}

export function availabilityOf(
  user: Pick<UserSearchItem, 'online' | 'busy'>
): Availability {
  if (!user.online) return { label: 'Ngoại tuyến', tone: 'neutral' }
  if (user.busy) return { label: 'Đang bận', tone: 'warning' }
  return { label: 'Trực tuyến', tone: 'success' }
}

/**
 * Có gửi được lời mời không. Server vẫn là bên từ chối (`TARGET_OFFLINE`, `TARGET_BUSY`);
 * đây chỉ là lý do hiển thị trước để không có nút chết.
 */
export function inviteBlockReason(
  friend: Pick<FriendItem, 'online' | 'busy'> | null | undefined
): string | null {
  if (!friend) return 'Chọn một người bạn để mời.'
  if (!friend.online) return 'Người bạn này đang ngoại tuyến.'
  if (friend.busy) return 'Người bạn này đang bận trong một trận hoặc phòng khác.'
  return null
}

/** Nhãn trạng thái lời mời đã gửi (dùng cho dòng trạng thái nhỏ). */
export function outgoingInviteCopy(status: string, targetUsername?: string): string {
  const who = targetUsername ?? 'Người chơi'
  switch (status.trim().toUpperCase()) {
    case 'SENT':
      return `Đã gửi lời mời tới ${who}. Lời mời hết hạn sau 60 giây.`
    case 'ACCEPTED':
      return `${who} đã chấp nhận lời mời.`
    case 'REJECTED':
      return `${who} đã từ chối lời mời.`
    case 'EXPIRED':
      return `Lời mời tới ${who} đã hết hạn.`
    case 'CANCELLED':
      return `Lời mời tới ${who} đã bị hủy.`
    default:
      return 'Trạng thái lời mời đã thay đổi.'
  }
}

export type { GameInviteReceived }
