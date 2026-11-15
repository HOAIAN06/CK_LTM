/**
 * Frame pump: lấy ảnh từ `<video>` → JPEG → IPC, với ngữ nghĩa latest-frame.
 *
 * Vì sao không encode trên main thread của quiz: mọi bước (`drawImage`, `toBlob`) chạy trong
 * renderer nơi có canvas; main chỉ nhận byte đã encode. Nhờ vậy main không bao giờ decode ảnh.
 *
 * Backpressure:
 * - Đúng một encode "in flight". Tick đến khi encode trước chưa xong → **bỏ tick** (không xếp
 *   hàng), nên bộ nhớ bị chặn bởi một JPEG và tần suất không bao giờ vượt `fps`.
 * - Main áp dụng latest-frame lần nữa (một slot chờ), nên hai tầng đều bounded.
 *
 * Không gửi frame khi tab bị ẩn: frame đứng hình không phải bằng chứng (và `visibilitychange`
 * còn được báo riêng qua `PROCTOR_EVENT_REPORT`).
 */
import { useEffect, useRef, type RefObject } from 'react'
import { MEDIA_MAX_JPEG_BYTES } from '@shared/protocol/media'
import type { MediaCommandResult, MediaPublishFrameRequest } from '@shared/media-ipc'

/** Cùng thang chất lượng với `CameraCaptureService.encodeWithinLimit` bên JavaFX. */
export const JPEG_QUALITY_LADDER: readonly number[] = [0.88, 0.82, 0.75, 0.68]

export const DEFAULT_PUMP_FPS = 15

export interface FramePumpStats {
  captured: number
  published: number
  /** Tick bị bỏ vì encode trước chưa xong hoặc tab ẩn. */
  skipped: number
  /** Frame không encode được hoặc vượt 512 KiB ở mọi mức chất lượng. */
  dropped: number
  failed: number
}

export interface FramePumpOptions {
  /** Nguồn hình; `null` khi camera chưa sẵn sàng. */
  video: HTMLVideoElement | null
  publish: (frame: MediaPublishFrameRequest) => Promise<MediaCommandResult>
  fps?: number
  /** Kích thước đích; mặc định đọc `videoWidth/videoHeight`. */
  width?: number
  height?: number
  maxBytes?: number
  qualityLadder?: readonly number[]
  now?: () => number
  /** Tab đang hiển thị hay không (mặc định đọc `document.visibilityState`). */
  isVisible?: () => boolean
  /** Thay bước encode trong test. Trả `null` khi không encode được. */
  capture?: (video: HTMLVideoElement, width: number, height: number) => Promise<Uint8Array | null>
}

export interface FramePump {
  start: () => void
  stop: () => void
  /** Tạm dừng vì tab bị ẩn (không gửi frame đứng hình). */
  pause: () => void
  resume: () => void
  isRunning: () => boolean
  stats: () => FramePumpStats
  /** Chạy đúng một tick (dùng cho test và cho lần capture chủ động). */
  tick: () => Promise<void>
}

/** Encode `video` hiện tại thành JPEG, hạ dần chất lượng cho tới khi vừa 512 KiB. */
async function captureJpegWithCanvas(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  width: number,
  height: number,
  qualityLadder: readonly number[],
  maxBytes: number
): Promise<Uint8Array | null> {
  const context = canvas.getContext('2d')
  if (context === null) return null
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height
  context.drawImage(video, 0, 0, width, height)

  for (const quality of qualityLadder) {
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/jpeg', quality)
    })
    if (blob === null) continue
    if (blob.size <= maxBytes) {
      return new Uint8Array(await blob.arrayBuffer())
    }
  }
  return null
}

export function createFramePump(options: FramePumpOptions): FramePump {
  const fps = options.fps ?? DEFAULT_PUMP_FPS
  const maxBytes = options.maxBytes ?? MEDIA_MAX_JPEG_BYTES
  const qualityLadder = options.qualityLadder ?? JPEG_QUALITY_LADDER
  const now = options.now ?? Date.now
  const isVisible =
    options.isVisible ??
    ((): boolean => typeof document === 'undefined' || document.visibilityState !== 'hidden')

  const state: FramePumpStats = { captured: 0, published: 0, skipped: 0, dropped: 0, failed: 0 }
  let timer: ReturnType<typeof setInterval> | null = null
  let busy = false
  let sequence = 0
  let paused = false

  const canvas =
    typeof document === 'undefined' ? null : document.createElement('canvas')

  const tick = async (): Promise<void> => {
    const video = options.video
    if (video === null || paused) return
    if (!isVisible()) {
      state.skipped += 1
      return
    }
    if (busy) {
      // Encode trước chưa xong: bỏ tick này, không xếp hàng (latest-frame).
      state.skipped += 1
      return
    }
    const width = options.width ?? video.videoWidth
    const height = options.height ?? video.videoHeight
    if (width <= 0 || height <= 0) {
      state.skipped += 1
      return
    }

    busy = true
    try {
      const jpeg =
        options.capture !== undefined
          ? await options.capture(video, width, height)
          : canvas === null
            ? null
            : await captureJpegWithCanvas(canvas, video, width, height, qualityLadder, maxBytes)

      if (jpeg === null || jpeg.length === 0 || jpeg.length > maxBytes) {
        state.dropped += 1
        return
      }

      state.captured += 1
      sequence += 1
      // Copy sang ArrayBuffer độc lập: structured clone qua IPC không được giữ view.
      const data = new Uint8Array(jpeg.length)
      data.set(jpeg)
      const result = await options.publish({
        meta: {
          sequence,
          capturedAt: now(),
          width,
          height,
          mimeType: 'image/jpeg'
        },
        data: data.buffer
      })
      if (result.ok) state.published += 1
      else state.failed += 1
    } catch {
      state.failed += 1
    } finally {
      busy = false
    }
  }

  const start = (): void => {
    if (timer !== null) return
    paused = false
    const interval = Math.max(1, Math.round(1000 / Math.max(1, fps)))
    timer = setInterval(() => {
      void tick()
    }, interval)
    if (typeof (timer as { unref?: () => void }).unref === 'function') {
      ;(timer as unknown as { unref: () => void }).unref()
    }
  }

  const stop = (): void => {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
    paused = true
    busy = false
  }

  return {
    start,
    stop,
    pause: () => {
      paused = true
    },
    resume: () => {
      paused = false
    },
    isRunning: () => timer !== null,
    stats: () => ({ ...state }),
    tick
  }
}

/**
 * Hook tiện dụng: pump tự start/stop theo `enabled`, tự pause khi tab ẩn.
 *
 * `video` phải là phần tử đã gắn stream (xem `useCameraStream().videoRef`).
 */
export function useFramePump(options: FramePumpOptions & { enabled: boolean }): {
  pumpRef: RefObject<FramePump | null>
} {
  const { enabled, video, publish, fps } = options
  const pumpRef = useRef<FramePump | null>(null)
  const publishRef = useRef(publish)
  publishRef.current = publish

  useEffect(() => {
    if (!enabled || video === null) return

    const pump = createFramePump({
      ...options,
      video,
      publish: (frame) => publishRef.current(frame)
    })
    pumpRef.current = pump
    pump.start()

    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') pump.pause()
      else pump.resume()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      pump.stop()
      pumpRef.current = null
    }
    // `options` được đọc một lần cho mỗi cặp (enabled, video, fps): capture/quality do người
    // gọi inject nên không cần re-create mỗi render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, video, fps])

  return { pumpRef }
}
