/**
 * Luật debounce mất focus — test thuần, không DOM, không timer thật.
 *
 * Yêu cầu sản phẩm: khoảng vắng **dưới** ngưỡng không tạo sự kiện; **vượt** ngưỡng tạo đúng
 * **một** EVIDENCE cho mỗi khoảng vắng; quay lại rồi đi vắng tiếp mới tính khoảng mới.
 */
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FOCUS_POLICY,
  MAX_EVENT_DURATION_MS,
  createFocusWatcher
} from '../focus-events'

describe('createFocusWatcher', () => {
  it('emits nothing for an away period below the threshold', () => {
    const watcher = createFocusWatcher()
    watcher.leave('APP_FOCUS_LOST', 1_000)

    expect(watcher.tick(4_000)).toBeNull()
    expect(watcher.ret(4_500)).toBeNull()
    expect(watcher.isAway()).toBe(false)
  })

  it('emits exactly one EVIDENCE for an away period over the threshold', () => {
    const watcher = createFocusWatcher()
    watcher.leave('APP_FOCUS_LOST', 1_000)

    // Chạm ngưỡng trong lúc vẫn đang vắng: phát ngay, không chờ quay lại.
    expect(watcher.tick(6_000)).toEqual({
      type: 'APP_FOCUS_LOST',
      severity: 'EVIDENCE',
      durationMs: 5_000
    })
    // Các tick sau trong cùng khoảng vắng: im lặng.
    expect(watcher.tick(9_000)).toBeNull()
    // Quay lại: không phát lần hai cho cùng khoảng vắng.
    expect(watcher.ret(12_000)).toBeNull()
  })

  it('emits once on return when no tick ran while away', () => {
    const watcher = createFocusWatcher()
    watcher.leave('APP_MINIMIZED', 10_000)
    expect(watcher.ret(17_500)).toEqual({
      type: 'APP_MINIMIZED',
      severity: 'EVIDENCE',
      durationMs: 7_500
    })
    expect(watcher.ret(18_000)).toBeNull()
  })

  it('resets after a focused period so the next absence counts again', () => {
    const watcher = createFocusWatcher()
    watcher.leave('APP_FOCUS_LOST', 0)
    expect(watcher.ret(1_000)).toBeNull() // vắng ngắn: không sự kiện

    watcher.leave('APP_FOCUS_LOST', 40_000) // quay lại 1 s rồi đi vắng tiếp
    expect(watcher.tick(46_000)).toEqual({
      type: 'APP_FOCUS_LOST',
      severity: 'EVIDENCE',
      durationMs: 6_000
    })
  })

  it('keeps the earliest start when blur and visibilitychange overlap', () => {
    const watcher = createFocusWatcher()
    watcher.leave('APP_FOCUS_LOST', 0)
    watcher.leave('APP_MINIMIZED', 1_500) // cùng một khoảng vắng

    expect(watcher.tick(5_500)?.durationMs).toBe(5_500)
    // Ẩn cửa sổ là mô tả chính xác hơn mất focus.
    expect(watcher.awayKind()).toBe('APP_MINIMIZED')
  })

  it('never emits WARNING by default and can be enabled explicitly', () => {
    const silent = createFocusWatcher()
    silent.leave('APP_FOCUS_LOST', 0)
    expect(silent.ret(3_000)).toBeNull()

    const warned = createFocusWatcher({ ...DEFAULT_FOCUS_POLICY, warnMs: 2_000 })
    warned.leave('APP_FOCUS_LOST', 0)
    expect(warned.ret(3_000)).toEqual({
      type: 'APP_FOCUS_LOST',
      severity: 'WARNING',
      durationMs: 3_000
    })
  })

  it('suppresses a rapid second absence inside the cooldown', () => {
    const watcher = createFocusWatcher()
    watcher.leave('APP_FOCUS_LOST', 0)
    expect(watcher.tick(6_000)).not.toBeNull()

    // 2 s sau khi quay lại, alt-tab thêm 3 s: nhiễu, không tạo sự kiện.
    watcher.leave('APP_FOCUS_LOST', 8_000)
    expect(watcher.ret(11_000)).toBeNull()
  })

  it('clamps the reported duration to the server limit', () => {
    const watcher = createFocusWatcher()
    watcher.leave('APP_FOCUS_LOST', 0)
    const decision = watcher.tick(MAX_EVENT_DURATION_MS + 50_000)
    expect(decision?.durationMs).toBe(MAX_EVENT_DURATION_MS)
  })

  it('ignores return before any absence', () => {
    const watcher = createFocusWatcher()
    expect(watcher.ret(1_000)).toBeNull()
    expect(watcher.tick(1_000)).toBeNull()
    expect(watcher.isAway()).toBe(false)
  })
})
