/**
 * Frame hub: giữ **một** frame mới nhất cho mỗi người chơi và cho component subscribe riêng.
 *
 * Vì sao không đưa frame vào zustand: main process đã chặn tốc độ ~15 fps/người, nhưng nếu mỗi
 * frame ghi vào store thì cả dashboard (danh sách tile, feed, tiêu đề) re-render 15×N lần/giây.
 * Hub này chỉ đánh thức đúng tile của user có frame mới, nên phần còn lại của màn hình đứng yên.
 *
 * Bộ nhớ có trần: tối đa 64 user, mỗi user một `ArrayBuffer` JPEG (≤ 512 KiB do codec main
 * chặn). Frame cũ hơn (sequence ≤ frame đang giữ) bị bỏ — cùng ngữ nghĩa latest-frame với
 * subscriber ở main process.
 */
import type { MediaInboundFrame } from '@shared/media-ipc'

/** Trần số user đang giữ frame (phòng proctoring tối đa 6, dư địa lớn hơn nhiều). */
export const MAX_HUB_USERS = 64

export interface HubFrame {
  userId: number
  sequence: number
  /** JPEG đã encode. */
  data: ArrayBuffer
  /** Epoch ms server ghi nhận frame. */
  receivedAt: number
}

const frames = new Map<number, HubFrame>()
const listeners = new Map<number, Set<() => void>>()

/** Ghi frame mới nhất. Trả `true` khi frame thực sự thay thế frame cũ. */
export function publishHubFrame(frame: MediaInboundFrame): boolean {
  const existing = frames.get(frame.userId)
  if (existing !== undefined && frame.sequence <= existing.sequence) return false
  if (existing === undefined && frames.size >= MAX_HUB_USERS) return false

  frames.set(frame.userId, {
    userId: frame.userId,
    sequence: frame.sequence,
    data: frame.data,
    receivedAt: frame.serverReceivedAt
  })
  const subscriber = listeners.get(frame.userId)
  if (subscriber !== undefined) {
    for (const listener of subscriber) listener()
  }
  return true
}

/** Frame mới nhất của user, hoặc `null` nếu chưa nhận được frame nào. */
export function getHubFrame(userId: number): HubFrame | null {
  return frames.get(userId) ?? null
}

/** Subscribe theo user; trả về hàm huỷ. */
export function subscribeHubFrame(userId: number, listener: () => void): () => void {
  const existing = listeners.get(userId)
  if (existing !== undefined) {
    existing.add(listener)
    return () => {
      existing.delete(listener)
      if (existing.size === 0) listeners.delete(userId)
    }
  }
  const set = new Set<() => void>([listener])
  listeners.set(userId, set)
  return () => {
    set.delete(listener)
    if (set.size === 0) listeners.delete(userId)
  }
}

/** Xoá toàn bộ frame (rời phòng, phòng kết thúc, unsubscribe). */
export function clearHubFrames(): void {
  frames.clear()
  for (const set of listeners.values()) {
    for (const listener of set) listener()
  }
}

/** Số user đang có frame — dùng cho test và chẩn đoán. */
export function hubFrameCount(): number {
  return frames.size
}
