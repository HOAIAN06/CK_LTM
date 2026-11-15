/**
 * Frame pump: backpressure (latest-frame), trần kích thước JPEG, và dừng sạch.
 *
 * `capture` được inject nên test không cần canvas/webcam thật — đúng phạm vi: chứng minh luật
 * backpressure, không chứng minh chất lượng ảnh.
 */
import { describe, expect, it, vi } from 'vitest'
import { createFramePump } from '../frame-pump'
import { MEDIA_MAX_JPEG_BYTES } from '@shared/protocol/media'

const video = { videoWidth: 640, videoHeight: 480 } as unknown as HTMLVideoElement
const bytes = (length: number): Uint8Array => new Uint8Array(length).fill(1)

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve: () => void = () => undefined
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('createFramePump', () => {
  it('publishes the encoded bytes with meta and an increasing sequence', async () => {
    const published: Array<{ sequence: number; capturedAt: number; width: number; size: number }> =
      []
    let clock = 1_000
    const pump = createFramePump({
      video,
      now: () => clock,
      capture: async () => bytes(100),
      publish: async (frame) => {
        published.push({
          sequence: frame.meta.sequence,
          capturedAt: frame.meta.capturedAt,
          width: frame.meta.width,
          size: frame.data.byteLength
        })
        return { ok: true }
      }
    })

    await pump.tick()
    clock += 66
    await pump.tick()

    expect(published).toEqual([
      { sequence: 1, capturedAt: 1_000, width: 640, size: 100 },
      { sequence: 2, capturedAt: 1_066, width: 640, size: 100 }
    ])
    expect(pump.stats()).toMatchObject({ captured: 2, published: 2, dropped: 0, failed: 0 })
  })

  it('skips a tick while the previous encode is still in flight', async () => {
    const gate = deferred()
    let encodes = 0
    const publish = vi.fn(async () => ({ ok: true }))
    const pump = createFramePump({
      video,
      capture: async () => {
        encodes += 1
        await gate.promise
        return bytes(50)
      },
      publish
    })

    const first = pump.tick()
    // Chưa xong encode đầu: tick thứ hai phải bị bỏ, không xếp hàng.
    await pump.tick()
    await pump.tick()
    expect(encodes).toBe(1)
    expect(pump.stats().skipped).toBe(2)

    gate.resolve()
    await first
    expect(publish).toHaveBeenCalledTimes(1)
    expect(pump.stats()).toMatchObject({ captured: 1, published: 1 })
  })

  it('drops a frame larger than the protocol ceiling instead of sending it', async () => {
    const publish = vi.fn(async () => ({ ok: true }))
    const pump = createFramePump({
      video,
      capture: async () => bytes(MEDIA_MAX_JPEG_BYTES + 1),
      publish
    })

    await pump.tick()
    expect(publish).not.toHaveBeenCalled()
    expect(pump.stats().dropped).toBe(1)
  })

  it('does not capture while the tab is hidden', async () => {
    const capture = vi.fn(async () => bytes(10))
    const publish = vi.fn(async () => ({ ok: true }))
    const pump = createFramePump({ video, capture, publish, isVisible: () => false })

    await pump.tick()
    expect(capture).not.toHaveBeenCalled()
    expect(pump.stats().skipped).toBe(1)

    pump.pause()
    await pump.tick()
    expect(pump.stats().skipped).toBe(1)
  })

  it('counts a rejected publish as failed but keeps running', async () => {
    const pump = createFramePump({
      video,
      capture: async () => bytes(10),
      publish: async () => ({ ok: false, error: 'MEDIA_NOT_STARTED' })
    })

    await pump.tick()
    expect(pump.stats()).toMatchObject({ captured: 1, published: 0, failed: 1 })
  })

  it('ignores a zero-sized video element', async () => {
    const capture = vi.fn(async () => bytes(10))
    const pump = createFramePump({
      video: { videoWidth: 0, videoHeight: 0 } as unknown as HTMLVideoElement,
      capture,
      publish: async () => ({ ok: true })
    })

    await pump.tick()
    expect(capture).not.toHaveBeenCalled()
    expect(pump.stats().skipped).toBe(1)
  })

  it('starts and stops its interval cleanly', () => {
    const pump = createFramePump({
      video,
      capture: async () => bytes(10),
      publish: async () => ({ ok: true })
    })

    expect(pump.isRunning()).toBe(false)
    pump.start()
    expect(pump.isRunning()).toBe(true)
    pump.start()
    expect(pump.isRunning()).toBe(true)
    pump.stop()
    expect(pump.isRunning()).toBe(false)
  })
})
