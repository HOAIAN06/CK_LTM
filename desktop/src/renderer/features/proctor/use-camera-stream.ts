/**
 * `useCameraStream` — mở webcam trong renderer (chỉ để preview + capture frame).
 *
 * Ràng buộc:
 * - **Chỉ video**: `audio: false` (proctoring không truyền âm thanh, xem `docs/proctoring.md`).
 * - 640×480 @ 15 fps ideal, `facingMode: 'user'` — cùng profile với `CameraCaptureService`
 *   bên JavaFX. Dùng `ideal` để webcam không hỗ trợ vẫn mở được thay vì ném
 *   `OverconstrainedError`.
 * - Không bao giờ chặn thao tác quiz: hook chỉ trả trạng thái; UI quyết định hiển thị cảnh báo.
 * - Mỗi lần mở là một **attempt id**; kết quả/lỗi từ attempt cũ bị bỏ qua
 *   (`docs/proctoring.md`: "frame/failure từ attempt cũ bị bỏ qua").
 * - Auto-retry tối đa 3 lần cách 5 giây (theo `docs/proctoring.md`); từ chối quyền **không**
 *   tự retry (đó là quyết định của người dùng) và luôn có nút thử lại thủ công.
 * - Unmount/stop luôn `track.stop()` cho mọi track.
 */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import {
  describeCameraError,
  isRetryableCameraStatus,
  type CameraErrorInfo,
  type CameraStatus
} from './camera-status'

/** Profile demo: 640×480 @ 15 fps (xem `docs/proctoring.md`). */
export const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 15 },
    facingMode: 'user'
  }
}

/** Tối đa 3 lần tự thử lại, cách nhau 5 giây. */
export const DEFAULT_RETRY_DELAYS_MS: readonly number[] = [5_000, 5_000, 5_000]

export interface UseCameraStreamOptions {
  /** `false` → không mở camera (ví dụ phòng không bật proctoring). */
  enabled?: boolean
  /** Thay `navigator.mediaDevices.getUserMedia` trong test. */
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>
  /** Lịch tự thử lại; `[]` để tắt hẳn auto-retry. */
  retryDelaysMs?: readonly number[]
  /** Theo dõi chuyển trạng thái (để báo `PROCTOR_STATUS_REPORT` hoặc log). */
  onStatusChange?: (status: CameraStatus, error: CameraErrorInfo | null) => void
  /**
   * Track video bị mute hoặc ended giữa phiên. Proctoring coi đó là `CAMERA_BLOCKED`:
   * hệ điều hành/app khác có thể chiếm camera hoặc người dùng rút thiết bị.
   */
  onTrackIssue?: (kind: 'mute' | 'ended') => void
}

export interface CameraStreamHandle {
  status: CameraStatus
  error: CameraErrorInfo | null
  stream: MediaStream | null
  videoRef: RefObject<HTMLVideoElement | null>
  /** Thử lại thủ công (reset bộ đếm auto-retry). */
  retry: () => void
  /** Tắt camera và giải phóng track. */
  stop: () => void
}

function stopTracks(stream: MediaStream | null): void {
  if (stream === null) return
  for (const track of stream.getTracks()) {
    try {
      track.stop()
    } catch {
      // Track đã dừng hoặc đã bị thu hồi: bỏ qua.
    }
  }
}

function defaultGetUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
  const mediaDevices = typeof navigator === 'undefined' ? undefined : navigator.mediaDevices
  if (mediaDevices === undefined || typeof mediaDevices.getUserMedia !== 'function') {
    const error = new Error('Trình duyệt không hỗ trợ getUserMedia')
    error.name = 'NotSupportedError'
    return Promise.reject(error)
  }
  return mediaDevices.getUserMedia(constraints)
}

export function useCameraStream(options: UseCameraStreamOptions = {}): CameraStreamHandle {
  const { enabled = true, retryDelaysMs = DEFAULT_RETRY_DELAYS_MS } = options
  const [status, setStatus] = useState<CameraStatus>(enabled ? 'INITIALIZING' : 'STOPPED')
  const [error, setError] = useState<CameraErrorInfo | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const attemptRef = useRef(0)
  const mountedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const retriesRef = useRef(0)
  const statusListenerRef = useRef(options.onStatusChange)
  const trackIssueRef = useRef(options.onTrackIssue)
  const getUserMediaRef = useRef(options.getUserMedia)
  const retryDelaysRef = useRef(retryDelaysMs)

  statusListenerRef.current = options.onStatusChange
  trackIssueRef.current = options.onTrackIssue
  getUserMediaRef.current = options.getUserMedia
  retryDelaysRef.current = retryDelaysMs

  const clearTimer = useCallback((): void => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const publish = useCallback((next: CameraStatus, info: CameraErrorInfo | null): void => {
    if (!mountedRef.current) return
    setStatus(next)
    setError(info)
    statusListenerRef.current?.(next, info)
  }, [])

  const releaseStream = useCallback((): void => {
    const current = streamRef.current
    streamRef.current = null
    stopTracks(current)
    if (mountedRef.current) setStream(null)
  }, [])

  const start = useCallback((): void => {
    attemptRef.current += 1
    const attempt = attemptRef.current
    clearTimer()
    releaseStream()
    if (!mountedRef.current) return
    publish('INITIALIZING', null)

    const getUserMedia = getUserMediaRef.current ?? defaultGetUserMedia
    let pending: Promise<MediaStream>
    try {
      pending = getUserMedia(CAMERA_CONSTRAINTS)
    } catch (error) {
      pending = Promise.reject(error)
    }

    void pending
      .then((next) => {
        // Attempt cũ (do retry/stop) không được ghi đè trạng thái hiện tại.
        if (!mountedRef.current || attempt !== attemptRef.current) {
          stopTracks(next)
          return
        }
        streamRef.current = next
        setStream(next)
        retriesRef.current = 0
        publish('READY', null)
      })
      .catch((reason: unknown) => {
        if (!mountedRef.current || attempt !== attemptRef.current) return
        const described = describeCameraError(reason)
        publish(described.status, described.info)

        const delays = retryDelaysRef.current
        if (
          isRetryableCameraStatus(described.status) &&
          retriesRef.current < delays.length &&
          delays.length > 0
        ) {
          const delay = delays[retriesRef.current] ?? delays[delays.length - 1]
          retriesRef.current += 1
          timerRef.current = setTimeout(() => {
            timerRef.current = null
            start()
          }, delay)
        }
      })
  }, [clearTimer, publish, releaseStream])

  const retry = useCallback((): void => {
    retriesRef.current = 0
    start()
  }, [start])

  const stop = useCallback((): void => {
    attemptRef.current += 1
    clearTimer()
    releaseStream()
    publish('STOPPED', null)
  }, [clearTimer, publish, releaseStream])

  // Vòng đời: mở khi `enabled`, dọn sạch khi unmount hoặc khi tắt.
  useEffect(() => {
    mountedRef.current = true
    if (enabled) {
      start()
    } else {
      publish('STOPPED', null)
    }
    return () => {
      mountedRef.current = false
      attemptRef.current += 1
      clearTimer()
      const current = streamRef.current
      streamRef.current = null
      stopTracks(current)
    }
    // `start`/`publish` là callback ổn định; chỉ `enabled` được phép khởi động lại camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  /* Track bị mute/ended: báo cho proctoring để phát `CAMERA_BLOCKED` đúng một lần. */
  useEffect(() => {
    if (stream === null) return
    const offHandlers: Array<() => void> = []
    for (const track of stream.getVideoTracks()) {
      // Một số môi trường (jsdom, polyfill cũ) không có MediaStreamTrack.addEventListener.
      if (typeof track.addEventListener !== 'function') continue
      const onMute = (): void => trackIssueRef.current?.('mute')
      const onEnded = (): void => trackIssueRef.current?.('ended')
      track.addEventListener('mute', onMute)
      track.addEventListener('ended', onEnded)
      offHandlers.push(() => {
        track.removeEventListener('mute', onMute)
        track.removeEventListener('ended', onEnded)
      })
    }
    return () => {
      for (const off of offHandlers) off()
    }
  }, [stream])

  // Gắn stream vào <video>; phát lại nếu trình duyệt cho phép (muted + autoplay).
  useEffect(() => {
    const video = videoRef.current
    if (video === null) return
    video.srcObject = stream
    if (stream === null) return
    try {
      const playback = video.play()
      if (playback !== undefined && typeof playback.catch === 'function') {
        void playback.catch(() => undefined)
      }
    } catch {
      // jsdom/autoplay policy: preview có thể chưa chạy, không phải lỗi proctoring.
    }
    return () => {
      if (video.srcObject === stream) video.srcObject = null
    }
  }, [stream])

  return { status, error, stream, videoRef, retry, stop }
}
