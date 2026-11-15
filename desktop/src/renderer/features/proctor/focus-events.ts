/**
 * Bộ đếm "người dùng rời cửa sổ làm bài" — logic thuần, không chạm DOM.
 *
 * Vì sao không mirror y hệt `FocusEventDebouncer` của JavaFX: bên JavaFX có AI và đo bằng
 * `System.nanoTime()` với hai ngưỡng (1 s → WARNING khi quay lại, 3 s → EVIDENCE khi vẫn đi
 * vắng). Electron không có AI nhưng có `document.visibilityState`, nên luật ở đây lấy đúng
 * yêu cầu sản phẩm:
 *
 * - Chỉ phát khi khoảng vắng **vượt ngưỡng** (`evidenceMs`, mặc định 5 000 ms).
 * - **Một** sự kiện cho mỗi khoảng vắng; quay lại rồi đi vắng tiếp mới tính khoảng mới.
 * - Không bao giờ phát trong lúc đang vắng nếu chưa tới ngưỡng (im lặng là mặc định).
 *
 * `warnMs` mặc định `null`: ngắn hơn `evidenceMs` thì **không** phát gì (đúng luật "chỉ khi
 * vượt ngưỡng"). Ai muốn bật WARNING cho khoảng vắng ngắn có thể truyền `warnMs`.
 */
import type { ProctorSeverity } from '@shared/protocol'

/** Loại sự kiện mất focus; dùng đúng giá trị enum của protocol. */
export type FocusAwayKind = 'APP_FOCUS_LOST' | 'APP_MINIMIZED'

export interface FocusDecision {
  type: FocusAwayKind
  severity: ProctorSeverity
  durationMs: number
}

export interface FocusWatcherPolicy {
  /** Ngưỡng EVIDENCE. Dưới ngưỡng này không phát gì. */
  evidenceMs: number
  /**
   * Ngưỡng WARNING cho khoảng vắng ngắn (chỉ khi quay lại). `null` = không phát WARNING.
   * Phải nhỏ hơn `evidenceMs`.
   */
  warnMs: number | null
  /**
   * Hai khoảng vắng liên tiếp cách nhau dưới ngưỡng này chỉ tính là một lần nhiễu
   * (alt-tab qua lại nhanh). Đây là bản rút gọn của cooldown 10 s bên JavaFX.
   */
  cooldownMs: number
}

export const DEFAULT_FOCUS_POLICY: FocusWatcherPolicy = {
  evidenceMs: 5_000,
  warnMs: null,
  cooldownMs: 10_000
}

/** Độ dài tối đa của `durationMillis` mà server chấp nhận (`QuizRoom.reportProctorEvent`). */
export const MAX_EVENT_DURATION_MS = 300_000

export interface FocusWatcher {
  /** Bắt đầu khoảng vắng. Gọi lặp lại trong cùng khoảng vắng là no-op. */
  leave: (kind: FocusAwayKind, now?: number) => void
  /** Quay lại: trả quyết định nếu khoảng vắng đủ dài và chưa báo. */
  ret: (now?: number) => FocusDecision | null
  /** Nhịp định kỳ trong lúc vắng: phát EVIDENCE ngay khi chạm ngưỡng. */
  tick: (now?: number) => FocusDecision | null
  reset: () => void
  isAway: () => boolean
  awayKind: () => FocusAwayKind | null
}

function clampDuration(durationMs: number): number {
  return Math.max(0, Math.min(MAX_EVENT_DURATION_MS, Math.round(durationMs)))
}

export function createFocusWatcher(policy: FocusWatcherPolicy = DEFAULT_FOCUS_POLICY): FocusWatcher {
  let awayStartedAt: number | null = null
  let awayKind: FocusAwayKind | null = null
  /** Đã phát trong khoảng vắng hiện tại chưa (một khoảng = một sự kiện). */
  let emittedForAway = false
  let lastEmittedAt = Number.NEGATIVE_INFINITY

  const reset = (): void => {
    awayStartedAt = null
    awayKind = null
    emittedForAway = false
  }

  const leave = (kind: FocusAwayKind, now = Date.now()): void => {
    if (awayStartedAt !== null) {
      // Đang vắng: giữ mốc thời gian, nhưng "ẩn cửa sổ" là mô tả chính xác hơn "mất focus".
      if (kind === 'APP_MINIMIZED') awayKind = 'APP_MINIMIZED'
      return
    }
    awayStartedAt = now
    awayKind = kind
    emittedForAway = false
  }

  const decide = (durationMs: number, currentAwayKind: FocusAwayKind): FocusDecision | null => {
    const duration = clampDuration(durationMs)
    if (duration >= policy.evidenceMs) {
      return { type: currentAwayKind, severity: 'EVIDENCE', durationMs: duration }
    }
    if (policy.warnMs !== null && duration >= policy.warnMs) {
      return { type: currentAwayKind, severity: 'WARNING', durationMs: duration }
    }
    return null
  }

  const ret = (now = Date.now()): FocusDecision | null => {
    if (awayStartedAt === null) return null
    const startedAt = awayStartedAt
    const kind = awayKind ?? 'APP_FOCUS_LOST'
    const duration = now - startedAt
    const alreadyEmitted = emittedForAway
    reset()
    if (alreadyEmitted) return null
    // Nhiễu alt-tab: khoảng vắng ngắn ngay sau lần báo trước đó không tạo sự kiện mới.
    if (now - lastEmittedAt < policy.cooldownMs && duration < policy.evidenceMs) return null
    const decision = decide(duration, kind)
    if (decision !== null && decision.severity === 'EVIDENCE') lastEmittedAt = now
    return decision
  }

  const tick = (now = Date.now()): FocusDecision | null => {
    if (awayStartedAt === null || emittedForAway) return null
    const duration = now - awayStartedAt
    if (duration < policy.evidenceMs) return null
    emittedForAway = true
    lastEmittedAt = now
    return {
      type: awayKind ?? 'APP_FOCUS_LOST',
      severity: 'EVIDENCE',
      durationMs: clampDuration(duration)
    }
  }

  return {
    leave,
    ret,
    tick,
    reset,
    isAway: () => awayStartedAt !== null,
    awayKind: () => awayKind
  }
}
