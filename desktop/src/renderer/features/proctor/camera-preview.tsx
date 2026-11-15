/**
 * Preview camera proctoring + frame pump.
 *
 * - Chỉ hiển thị + encode frame; mọi quyết định gửi gì lên server nằm ở `proctor-store`.
 * - Badge trạng thái theo union `cameraStatus` của protocol.
 * - **Không bao giờ chặn quiz**: không disable nút nào của gameplay, không phủ overlay; lỗi chỉ
 *   hiện cảnh báo + nút thử lại.
 * - Tôn trọng `prefers-reduced-motion`.
 * - "Thu nhỏ" giữ preview nhỏ ở góc để không chiếm chỗ câu hỏi.
 */
import { useCallback, useEffect, useState, type JSX } from 'react'
import type { MediaCommandResult, MediaPublishFrameRequest } from '@shared/media-ipc'
import {
  CAMERA_STATUS_LABEL,
  cameraStatusTone,
  type CameraErrorInfo,
  type CameraStatus,
  type CameraStatusTone
} from './camera-status'
import { useCameraStream } from './use-camera-stream'
import { useFramePump } from './frame-pump'

export interface CameraPreviewProps {
  /** Tắt/mở camera (consent chưa cấp thì không mở). */
  enabled?: boolean
  /** Chỉ pump frame khi publisher đã thật sự mở (`publisher.state === 'live'`). */
  publishing?: boolean
  onStatusChange?: (status: CameraStatus, error: CameraErrorInfo | null) => void
  onTrackIssue?: (kind: 'mute' | 'ended') => void
  /** Đẩy frame đã encode lên main process. */
  publish?: (frame: MediaPublishFrameRequest) => Promise<MediaCommandResult>
  /** Bắt đầu ở dạng thu nhỏ (mặc định trong màn thi). */
  defaultMinimized?: boolean
  /** Hiện câu cảnh báo bên dưới preview (mặc định true). */
  showWarning?: boolean
}

const TONE_COLOR: Record<CameraStatusTone, string> = {
  neutral: 'var(--nq-text-secondary, #6b7280)',
  success: 'var(--nq-success, #16a34a)',
  warning: 'var(--nq-warning, #d97706)',
  danger: 'var(--nq-danger, #dc2626)'
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(query.matches)
    const listener = (event: MediaQueryListEvent): void => setReduced(event.matches)
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', listener)
      return () => query.removeEventListener('change', listener)
    }
    return undefined
  }, [])

  return reduced
}

export function CameraPreview({
  enabled = true,
  publishing = false,
  onStatusChange,
  onTrackIssue,
  publish,
  defaultMinimized = false,
  showWarning = true
}: CameraPreviewProps): JSX.Element {
  const camera = useCameraStream({ enabled, onStatusChange, onTrackIssue })
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  const [minimized, setMinimized] = useState(defaultMinimized)
  const reduceMotion = usePrefersReducedMotion()

  const setVideoNode = useCallback(
    (node: HTMLVideoElement | null): void => {
      camera.videoRef.current = node
      setVideo(node)
    },
    // `camera.videoRef` là ref ổn định; không cần phụ thuộc object camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // Pump chỉ chạy khi: camera bật + stream đã có + publisher thật sự mở.
  const pumping = enabled && publishing && camera.stream !== null && publish !== undefined
  useFramePump({
    enabled: pumping,
    video,
    publish: publish ?? (() => Promise.resolve({ ok: false, error: 'MEDIA_NOT_STARTED' }))
  })

  const tone = cameraStatusTone(camera.status)
  // Nút thử lại hiện cho **mọi** trạng thái lỗi: người dùng có thể vừa cấp quyền xong.
  const showRetry = camera.error !== null
  const badgeText = CAMERA_STATUS_LABEL[camera.status]
  const width = minimized ? 168 : 320
  const height = minimized ? 126 : 240
  const transition = reduceMotion ? 'none' : 'width 180ms ease, height 180ms ease'

  return (
    <section
      aria-label="Camera proctoring"
      data-camera-status={camera.status}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--nq-space-2, 8px)',
        width: `${width}px`,
        maxWidth: '100%',
        transition,
        fontFamily: 'var(--nq-font-sans, system-ui, sans-serif)'
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: `${height}px`,
          borderRadius: 'var(--nq-radius-md, 12px)',
          overflow: 'hidden',
          background: 'var(--nq-surface-subtle, #111827)',
          border: '1px solid var(--nq-border, rgba(0,0,0,.12))',
          transition
        }}
      >
        <video
          ref={setVideoNode}
          muted
          autoPlay
          playsInline
          aria-label={badgeText}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: camera.status === 'READY' ? 'block' : 'none'
          }}
        />

        {camera.status !== 'READY' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--nq-space-2, 8px)',
              textAlign: 'center',
              color: 'var(--nq-text-secondary, #e5e7eb)',
              fontSize: '12px',
              lineHeight: 1.4
            }}
          >
            {camera.error?.message ?? CAMERA_STATUS_LABEL[camera.status]}
          </div>
        )}

        <span
          role="status"
          aria-live="polite"
          style={{
            position: 'absolute',
            top: '6px',
            left: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: 'var(--nq-radius-full, 999px)',
            fontSize: '11px',
            fontWeight: 600,
            color: '#fff',
            background: TONE_COLOR[tone],
            transition: reduceMotion ? 'none' : 'background 160ms ease'
          }}
        >
          {badgeText}
        </span>

        <button
          type="button"
          onClick={() => setMinimized((value) => !value)}
          style={{
            position: 'absolute',
            bottom: '6px',
            right: '6px',
            padding: '2px 8px',
            borderRadius: 'var(--nq-radius-full, 999px)',
            border: '1px solid var(--nq-border-strong, rgba(255,255,255,.4))',
            background: 'var(--nq-surface-overlay, rgba(17,24,39,.72))',
            color: '#fff',
            fontSize: '11px',
            cursor: 'pointer',
            transition: reduceMotion ? 'none' : 'opacity 120ms ease'
          }}
        >
          {minimized ? 'Mở rộng' : 'Thu nhỏ'}
        </button>
      </div>

      {showWarning && camera.error !== null && (
        <p
          role="status"
          style={{
            margin: 0,
            fontSize: '12px',
            color: TONE_COLOR[tone],
            lineHeight: 1.45
          }}
        >
          {camera.error.message}
        </p>
      )}

      {showRetry && (
        <button
          type="button"
          onClick={camera.retry}
          style={{
            alignSelf: 'flex-start',
            padding: '4px 12px',
            borderRadius: 'var(--nq-radius-full, 999px)',
            border: '1px solid var(--nq-border-strong, rgba(0,0,0,.2))',
            background: 'var(--nq-surface, #fff)',
            color: 'var(--nq-text, #111827)',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Thử lại camera
        </button>
      )}
    </section>
  )
}
