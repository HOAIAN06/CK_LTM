/**
 * Bảng giám sát của host (`/proctor/:pin`).
 *
 * Server authority: mọi con số (số cảnh báo, trạng thái camera, thời điểm sự kiện) đến từ
 * `PROCTOR_STATUS_UPDATE` / `PROCTOR_EVENT` / `QuizLobbyData`. Màn hình này chỉ trình bày.
 *
 * Hiệu năng: frame JPEG đi qua `frame-hub`; mỗi ô subscribe riêng theo `userId` nên một frame
 * mới chỉ re-render đúng ô đó (main process đã chặn ~15 fps/người). Danh sách và feed chỉ
 * re-render khi trạng thái/sự kiện đổi.
 *
 * Không có model thị giác: dashboard không hiển thị phần trăm tin cậy như một kết luận, và chỉ
 * nhận được ba loại sự kiện thật (mất focus, thu nhỏ, camera bị che).
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode
} from 'react'
import type { CameraStatus, ProctorEventType, ProctorSeverity } from '@shared/protocol'
import { Badge, Button, Card, CardHeader, EmptyState, ErrorBanner, Sheet, cn } from '../../components/ui'
import { Camera, Clock, Monitor, ShieldCheck, TriangleAlert, Users } from '../../components/ui/icons'
import { getHubFrame, subscribeHubFrame } from './frame-hub'
import { PROCTOR_EVENT_LABEL } from './proctor-protocol'
import {
  onlineCameraCount,
  sortProctorTiles,
  totalWarnings,
  useProctorStore,
  type ProctorFeedEntry,
  type ProctorTile
} from './proctor-store'

const CAMERA_TONE: Record<CameraStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  READY: 'success',
  BLOCKED: 'warning',
  INITIALIZING: 'neutral',
  NOT_REQUIRED: 'neutral',
  NOT_APPLICABLE: 'neutral',
  STOPPED: 'neutral',
  DENIED: 'warning',
  NOT_FOUND: 'danger',
  FAILED: 'danger',
  LOST: 'danger'
}

const CAMERA_TEXT: Record<CameraStatus, string> = {
  READY: 'Có hình',
  BLOCKED: 'Có thể bị che',
  INITIALIZING: 'Đang mở camera',
  NOT_REQUIRED: 'Không yêu cầu',
  NOT_APPLICABLE: 'Không áp dụng',
  STOPPED: 'Đã tắt',
  DENIED: 'Từ chối camera',
  NOT_FOUND: 'Không có camera',
  FAILED: 'Camera lỗi',
  LOST: 'Mất camera'
}

const SEVERITY_TEXT: Record<ProctorSeverity, string> = {
  WARNING: 'Cảnh báo',
  EVIDENCE: 'Bằng chứng'
}

function formatTime(epochMs: number): string {
  const date = new Date(epochMs)
  if (Number.isNaN(date.getTime())) return '--:--:--'
  return date.toLocaleTimeString('vi-VN', { hour12: false })
}

/** Blob URL của frame JPEG, tự thu hồi khi frame đổi hoặc unmount (không rò rỉ bộ nhớ). */
function useFrameUrl(userId: number): string | null {
  const subscribe = useCallback((listener: () => void) => subscribeHubFrame(userId, listener), [
    userId
  ])
  const frame = useSyncExternalStore(
    subscribe,
    () => getHubFrame(userId),
    () => null
  )
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (frame === null || typeof URL.createObjectURL !== 'function') {
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(new Blob([frame.data], { type: 'image/jpeg' }))
    setUrl(objectUrl)
    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [frame])

  return url
}

/** Video của một người chơi; không có frame thì nói rõ, không hiện ô đen. */
function PlayerFrame({
  userId,
  username,
  className,
  fit = 'contain'
}: {
  userId: number
  username: string
  className?: string
  fit?: 'contain' | 'cover'
}): ReactNode {
  const url = useFrameUrl(userId)

  if (url === null) {
    return (
      <div
        className={cn(
          'flex h-full w-full flex-col items-center justify-center gap-1 bg-nq-surface-sunken px-3 text-center',
          className
        )}
      >
        <Camera aria-hidden="true" size={20} className="text-nq-text-tertiary" />
        <p className="text-nq-xs font-medium text-nq-text-secondary">Chưa nhận được hình ảnh</p>
        <p className="text-nq-2xs leading-snug text-nq-text-tertiary">
          Người chơi chưa bật camera, hoặc phiên media chưa gửi frame.
        </p>
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={`Camera của ${username}`}
      className={cn('h-full w-full bg-black', fit === 'cover' ? 'object-cover' : 'object-contain', className)}
      draggable={false}
    />
  )
}

function TileButton({ tile, onOpen }: { tile: ProctorTile; onOpen: (tile: ProctorTile) => void }): ReactNode {
  return (
    <button
      type="button"
      onClick={() => onOpen(tile)}
      aria-label={`Mở chi tiết camera của ${tile.username}`}
      className="nq-focusable group flex w-full flex-col overflow-hidden rounded-nq-lg border border-nq-border bg-nq-surface text-left transition-[border-color,box-shadow] duration-[var(--nq-motion-fast)] ease-nq hover:border-nq-border-strong"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-nq-border-subtle bg-black">
        <PlayerFrame userId={tile.userId} username={tile.username} />
        <span className="absolute left-2 top-2">
          <Badge tone={CAMERA_TONE[tile.cameraStatus]} appearance="solid" size="sm" dot>
            {CAMERA_TEXT[tile.cameraStatus]}
          </Badge>
        </span>
        {tile.warnings > 0 ? (
          <span className="absolute right-2 top-2">
            <Badge tone="warning" appearance="solid" size="sm">
              {tile.warnings} cảnh báo
            </Badge>
          </span>
        ) : null}
      </div>
      <div className="flex w-full items-center gap-2 px-3 py-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-nq-sm font-semibold text-nq-text">{tile.username}</span>
          <span className="block truncate text-nq-2xs text-nq-text-tertiary">
            {!tile.connected ? 'Mất kết nối · ' : ''}
            {tile.lastEvent !== null
              ? `${PROCTOR_EVENT_LABEL[tile.lastEvent.type]} lúc ${formatTime(tile.lastEvent.at)}`
              : 'Chưa có cảnh báo'}
          </span>
        </span>
        <span className="text-nq-2xs font-medium text-nq-text-tertiary group-hover:text-nq-text">
          Chi tiết
        </span>
      </div>
    </button>
  )
}

function FeedRow({ entry }: { entry: ProctorFeedEntry }): ReactNode {
  return (
    <li className="flex items-start gap-2 border-b border-nq-border-subtle px-4 py-2.5 last:border-b-0">
      <span className="nq-tabular w-[62px] shrink-0 text-nq-2xs text-nq-text-tertiary">
        {formatTime(entry.at)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-nq-xs font-semibold text-nq-text">
          {entry.username}
        </span>
        <span className="block text-nq-2xs text-nq-text-secondary">
          {PROCTOR_EVENT_LABEL[entry.type as ProctorEventType]}
          {entry.durationMs > 0 ? ` · ${Math.round(entry.durationMs / 1000)} giây` : ''}
        </span>
      </span>
      <Badge tone={entry.severity === 'EVIDENCE' ? 'danger' : 'warning'} appearance="soft" size="sm">
        {SEVERITY_TEXT[entry.severity]}
      </Badge>
    </li>
  )
}

export interface ProctorDashboardProps {
  pin: string
  /** Quay lại màn thi/lobby. */
  onBack?: () => void
}

export function ProctorDashboard({ pin, onBack }: ProctorDashboardProps): ReactNode {
  const tiles = useProctorStore((state) => state.tiles)
  const feed = useProctorStore((state) => state.feed)
  const subscriber = useProctorStore((state) => state.subscriber)
  const context = useProctorStore((state) => state.context)
  const retrySubscriber = useProctorStore((state) => state.retrySubscriber)
  const [expanded, setExpanded] = useState<ProctorTile | null>(null)

  const sorted = useMemo(() => sortProctorTiles(tiles), [tiles])
  const warnings = totalWarnings(tiles)
  const online = onlineCameraCount(tiles)
  const ended = context?.phase === 'ended'

  const streamBadge = ((): { tone: 'success' | 'warning' | 'danger' | 'neutral'; text: string } => {
    switch (subscriber.state) {
      case 'live':
        return { tone: 'success', text: 'Đang nhận hình' }
      case 'connecting':
        return { tone: 'neutral', text: 'Đang kết nối' }
      case 'error':
        return { tone: 'danger', text: 'Mất kênh xem' }
      case 'idle':
        return { tone: 'neutral', text: 'Chờ phiên media' }
    }
  })()

  return (
    <>
      <div className="flex flex-wrap items-start gap-4 pb-4">
        <div className="min-w-0 flex-1">
          <p className="nq-caps mb-1.5">Phòng Quiz · Giám sát camera</p>
          <h1 className="nq-display nq-balance text-nq-2xl text-nq-text">Bảng giám sát · PIN {pin}</h1>
          <p className="nq-pretty mt-2 max-w-[68ch] text-nq-base leading-normal text-nq-text-secondary">
            Hình ảnh chỉ truyền trong LAN tới máy host. Cảnh báo là tín hiệu hỗ trợ, không phải kết
            luận tự động — bản Electron không chạy model thị giác nên chỉ có sự kiện rời cửa sổ và
            camera bị che.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone={streamBadge.tone} appearance="soft" dot>
              {streamBadge.text}
            </Badge>
            <Badge tone="neutral" appearance="outline">
              <Users aria-hidden="true" size={12} />
              <span className="ml-1">{sorted.length} người chơi</span>
            </Badge>
            <Badge tone={online > 0 ? 'success' : 'neutral'} appearance="outline">
              <Camera aria-hidden="true" size={12} />
              <span className="ml-1">{online} camera có hình</span>
            </Badge>
            <Badge tone={warnings > 0 ? 'warning' : 'neutral'} appearance="outline">
              <TriangleAlert aria-hidden="true" size={12} />
              <span className="ml-1">{warnings} cảnh báo</span>
            </Badge>
            {ended ? (
              <Badge tone="neutral" appearance="soft">
                Phòng đã kết thúc
              </Badge>
            ) : null}
          </div>
        </div>
        {onBack ? (
          <Button variant="secondary" leftIcon={<Monitor size={15} aria-hidden="true" />} onClick={onBack}>
            Về màn thi
          </Button>
        ) : null}
      </div>

      {subscriber.state === 'error' ? (
        <ErrorBanner
          className="mb-4"
          tone="warning"
          title="Không mở được kênh xem camera"
          description={
            subscriber.message ??
            'Máy chủ từ chối phiên media. Phòng vẫn tiếp tục; bấm thử lại hoặc chờ máy chủ cấp phiên mới.'
          }
          onRetry={retrySubscriber}
          retryLabel="Thử lại"
        />
      ) : null}

      {subscriber.state === 'connecting' ? (
        <ErrorBanner
          className="mb-4"
          tone="info"
          title="Đang kết nối kênh xem camera"
          description="Kênh media mở song song với kênh điều khiển; phòng không bị ảnh hưởng nếu kênh này chậm."
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-label="Camera người chơi" className="min-w-0">
          {sorted.length === 0 ? (
            <EmptyState
              icon={<Camera size={22} aria-hidden="true" />}
              title="Chưa có người chơi nào"
              description="Khi người chơi vào phòng, mỗi người có một ô camera ở đây — kể cả khi họ chưa bật camera."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {sorted.map((tile) => (
                <TileButton key={tile.userId} tile={tile} onOpen={setExpanded} />
              ))}
            </div>
          )}
        </section>

        <Card padding="none" className="h-fit">
          <div className="p-4 pb-0">
            <CardHeader
              icon={<Clock size={18} aria-hidden="true" />}
              title={`Cảnh báo (${feed.length})`}
              description="Tối đa 100 sự kiện gần nhất do máy chủ chuyển tới host."
            />
          </div>
          {feed.length === 0 ? (
            <p className="px-4 py-4 text-nq-xs leading-snug text-nq-text-tertiary">
              Chưa có cảnh báo nào. Sự kiện rời cửa sổ quá 5 giây hoặc camera bị che sẽ xuất hiện ở
              đây.
            </p>
          ) : (
            <ol className="mt-3 max-h-[560px] overflow-y-auto border-t border-nq-border-subtle">
              {feed.map((entry) => (
                <FeedRow key={entry.eventId} entry={entry} />
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Sheet
        open={expanded !== null}
        onClose={() => setExpanded(null)}
        title={expanded !== null ? `Camera của ${expanded.username}` : 'Camera'}
        description="Hình ảnh mới nhất máy chủ chuyển tới; không lưu trên máy này."
        size="lg"
      >
        {expanded !== null ? (
          <div className="flex flex-col gap-3">
            <div className="aspect-[4/3] w-full overflow-hidden rounded-nq-lg border border-nq-border bg-black">
              <PlayerFrame userId={expanded.userId} username={expanded.username} />
            </div>
            <dl className="grid grid-cols-2 gap-2 text-nq-xs">
              <div>
                <dt className="text-nq-text-tertiary">Camera</dt>
                <dd className="mt-0.5">
                  <Badge tone={CAMERA_TONE[expanded.cameraStatus]} appearance="soft" size="sm">
                    {CAMERA_TEXT[expanded.cameraStatus]}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-nq-text-tertiary">Kết nối</dt>
                <dd className="mt-0.5 text-nq-text">
                  {expanded.connected ? 'Trực tuyến' : 'Mất kết nối'}
                </dd>
              </div>
              <div>
                <dt className="text-nq-text-tertiary">Số cảnh báo</dt>
                <dd className="nq-tabular mt-0.5 text-nq-text">{expanded.warnings}</dd>
              </div>
              <div>
                <dt className="text-nq-text-tertiary">Hiệu chuẩn AI</dt>
                <dd className="mt-0.5 text-nq-text-tertiary">
                  {expanded.calibrationStatus === 'NOT_REQUIRED'
                    ? 'Không chạy AI trên client'
                    : expanded.calibrationStatus}
                </dd>
              </div>
            </dl>
            <div>
              <p className="text-nq-2xs font-semibold uppercase tracking-wide text-nq-text-tertiary">
                Cảnh báo gần nhất
              </p>
              <p className="mt-1 text-nq-sm text-nq-text">
                {expanded.lastEvent !== null
                  ? `${PROCTOR_EVENT_LABEL[expanded.lastEvent.type]} · ${formatTime(expanded.lastEvent.at)}`
                  : 'Chưa có cảnh báo nào cho người chơi này.'}
              </p>
            </div>
            <p className="flex items-start gap-1.5 text-nq-2xs leading-snug text-nq-text-tertiary">
              <ShieldCheck aria-hidden="true" size={14} className="mt-px shrink-0" />
              Cảnh báo chỉ để host xem lại. Không có kết luận tự động và không có hình nào được lưu
              trên máy này.
            </p>
          </div>
        ) : null}
      </Sheet>
    </>
  )
}
