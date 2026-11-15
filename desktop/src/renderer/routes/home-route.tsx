/**
 * `/` — trang chủ dùng dữ liệu thật.
 *
 * Nguồn dữ liệu:
 * - `PlayerStats` từ `LOGIN_OK` / `PROFILE_DATA` (push của máy chủ qua store).
 * - `MATCH_HISTORY_DATA` cho khu vực "Phong độ gần đây".
 *
 * Không có số liệu tự nghĩ ra: nếu máy chủ chưa trả dữ liệu thì khu vực đó hiển thị
 * trạng thái trống hoặc lỗi, không hiển thị số mẫu.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { MatchHistoryEntry } from '@shared/protocol'
import { PageHeader } from '../components/shell'
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  ErrorBanner,
  ProgressBar,
  Skeleton,
  type BadgeTone
} from '../components/ui'
import {
  ArrowRight,
  DoorOpen,
  History,
  Library,
  RefreshCw,
  Swords
} from '../components/ui/icons'
import { useConnectionStore } from '../lib/connection-store'
import { useSessionStore } from '../lib/session-store'
import { UI_ERROR, describeErrorCode } from '../lib/error-codes'
import {
  accuracyPercent,
  formatDuration,
  formatMatchResult,
  formatNumber,
  formatPlayedAt
} from '../lib/format'
import { useServerMessage } from '../lib/hooks'
import { RESPONSE_TIMEOUT_MS, createWatchdog } from '../lib/watchdog'

const RECENT_MATCH_LIMIT = 5

const MODE_CARDS = [
  {
    id: 'ranked',
    path: '/ranked',
    icon: Swords,
    title: 'Đấu hạng 1v1',
    description: 'Đối đầu trực tiếp từng câu hỏi 30 giây. Kết quả do máy chủ chốt sau mỗi câu.',
    action: 'Vào đấu hạng'
  },
  {
    id: 'quiz',
    path: '/quiz',
    icon: DoorOpen,
    title: 'Phòng Quiz',
    description: 'Tạo phòng bằng PIN hoặc vào phòng của lớp để thi cùng bạn bè.',
    action: 'Mở phòng Quiz'
  },
  {
    id: 'sets',
    path: '/sets',
    icon: Library,
    title: 'Bộ đề',
    description: 'Xem bộ đề của bạn và bộ đề đã xuất bản, sẵn sàng cho buổi luyện tiếp theo.',
    action: 'Xem bộ đề'
  }
] as const

function StatCard({
  label,
  value,
  unit,
  children
}: {
  label: string
  value: string
  unit?: string
  children?: ReactNode
}): ReactNode {
  return (
    <Card padding="md" className="flex flex-col justify-between">
      <p className="nq-caps">{label}</p>
      <p className="nq-display nq-tabular mt-1 text-nq-3xl leading-none text-nq-text">
        {value}
        {unit ? <span className="ml-1 text-nq-lg text-nq-text-tertiary">{unit}</span> : null}
      </p>
      {children ? <div className="mt-3">{children}</div> : null}
    </Card>
  )
}

function ResultBadge({ result }: { result: string }): ReactNode {
  const copy = formatMatchResult(result)
  const tone: BadgeTone = copy.tone === 'success' ? 'success' : copy.tone === 'danger' ? 'danger' : 'neutral'
  return (
    <Badge tone={tone} appearance="soft" className="w-14 justify-center">
      {copy.label}
    </Badge>
  )
}

export function HomeRoute(): ReactNode {
  const player = useSessionStore((state) => state.player)
  const send = useConnectionStore((state) => state.send)

  const [matches, setMatches] = useState<MatchHistoryEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const requestRef = useRef(0)
  const watchdog = useMemo(createWatchdog, [])

  const requestData = useCallback(async () => {
    const requestId = requestRef.current + 1
    requestRef.current = requestId
    setLoading(true)
    setErrorCode(null)
    watchdog.clear()

    const [profile, history] = await Promise.all([
      send({ type: 'PROFILE_GET', payload: '' }),
      send({ type: 'MATCH_HISTORY_GET', payload: '' })
    ])
    if (requestRef.current !== requestId) return

    const failure = !profile.ok ? profile.error : !history.ok ? history.error : null
    if (failure) {
      watchdog.clear()
      setErrorCode(failure)
      setLoading(false)
      return
    }

    // Máy chủ đã nhận frame: đặt hạn phản hồi cho phần dữ liệu còn thiếu.
    watchdog.arm(RESPONSE_TIMEOUT_MS, () => {
      if (requestRef.current !== requestId) return
      setErrorCode(UI_ERROR.requestTimeout)
      setLoading(false)
    })
  }, [send, watchdog])

  useEffect(() => {
    void requestData()
  }, [requestData])

  useEffect(() => () => watchdog.clear(), [watchdog])

  useServerMessage((message) => {
    switch (message.type) {
      case 'MATCH_HISTORY_DATA':
        watchdog.clear()
        setMatches(message.payload.matches)
        setLoading(false)
        break
      case 'PROFILE_DATA':
        // Store đã cập nhật hồ sơ; không cần trạng thái riêng cho phần thống kê.
        break
      case 'QUERY_ERROR':
        watchdog.clear()
        setErrorCode(message.payload)
        setLoading(false)
        break
      default:
        break
    }
  })

  if (!player) {
    return null
  }

  const accuracy = accuracyPercent(player)
  const answered = player.questionsAnswered
  const recent = matches ? matches.slice(0, RECENT_MATCH_LIMIT) : []
  const errorCopy = errorCode ? describeErrorCode(errorCode) : null

  return (
    <>
      <PageHeader
        eyebrow="Trang chủ"
        title={`Chào mừng trở lại, ${player.username}`}
        subtitle="Đây là tiến độ máy chủ đã ghi nhận cho tài khoản của bạn. Không có số liệu ước lượng."
        meta={
          <>
            <Badge tone="neutral" appearance="outline">
              ID {formatNumber(player.id)}
            </Badge>
            <Badge tone="primary" appearance="soft">
              Tổng điểm {formatNumber(player.totalScore)}
            </Badge>
          </>
        }
        actions={
          <Link
            to="/ranked"
            className="nq-focusable inline-flex h-[var(--nq-control-md)] items-center gap-2 rounded-nq-md bg-nq-primary px-4 text-nq-md font-semibold text-nq-primary-contrast shadow-nq-sm transition-colors duration-[var(--nq-motion-fast)] hover:bg-nq-primary-hover"
          >
            <Swords aria-hidden="true" size={16} />
            Tìm trận đấu hạng
          </Link>
        }
      />

      <section aria-labelledby="home-stats-heading" className="flex flex-col gap-3">
        <h2 id="home-stats-heading" className="nq-caps">
          Tiến độ của bạn
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <StatCard label="Thắng" value={formatNumber(player.wins)} />
          <StatCard label="Thua" value={formatNumber(player.losses)} />
          <StatCard label="Hòa" value={formatNumber(player.draws)} />
          <StatCard label="Độ chính xác" value={String(accuracy)} unit="%">
            <ProgressBar
              value={accuracy}
              size="xs"
              tone={accuracy >= 70 ? 'success' : accuracy >= 40 ? 'accent' : 'warning'}
              aria-label="Độ chính xác trả lời"
            />
          </StatCard>
          <StatCard label="Tổng điểm" value={formatNumber(player.totalScore)} />
        </div>
        <p className="nq-pretty text-nq-sm leading-normal text-nq-text-secondary">
          {answered === 0
            ? 'Chưa có câu trả lời nào. Hãy bắt đầu bằng một trận 1v1!'
            : `Bạn đã trả lời ${formatNumber(answered)} câu và đúng ${formatNumber(
                player.correctAnswers
              )} câu. Giữ nhịp nhé!`}
        </p>
      </section>

      <section aria-labelledby="home-modes-heading" className="mt-8 flex flex-col gap-3">
        <h2 id="home-modes-heading" className="nq-caps">
          Tiếp tục luyện tập
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {MODE_CARDS.map((mode) => {
            const Icon = mode.icon
            return (
              <Link
                key={mode.id}
                to={mode.path}
                className="nq-focusable block rounded-nq-lg"
                aria-label={`${mode.title} — ${mode.action}`}
              >
                <Card interactive padding="none" className="h-full">
                  <div className="flex h-full flex-col p-5">
                    <span
                      aria-hidden="true"
                      className="grid size-10 place-items-center rounded-nq-md bg-nq-primary-soft text-nq-primary-soft-text"
                    >
                      <Icon size={20} />
                    </span>
                    <h3 className="nq-display mt-4 text-nq-lg leading-snug text-nq-text">
                      {mode.title}
                    </h3>
                    <p className="nq-pretty mt-1 flex-1 text-nq-sm leading-normal text-nq-text-secondary">
                      {mode.description}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-nq-sm font-semibold text-nq-link">
                      {mode.action}
                      <ArrowRight aria-hidden="true" size={15} />
                    </span>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="home-form-heading" className="mt-8">
        <Card padding="none">
          <div className="p-5 pb-4">
            <CardHeader
              icon={<History size={18} aria-hidden="true" />}
              title="Phong độ gần đây"
              description={`Tối đa ${RECENT_MATCH_LIMIT} trận Ranked mới nhất do máy chủ trả về.`}
              action={
                <button
                  type="button"
                  onClick={() => void requestData()}
                  disabled={loading}
                  className="nq-focusable inline-flex h-[var(--nq-control-sm)] items-center gap-1.5 rounded-nq-md border border-nq-border-strong bg-nq-surface-raised px-3 text-nq-sm font-semibold text-nq-text shadow-nq-sm transition-colors duration-[var(--nq-motion-fast)] hover:bg-nq-surface-hover disabled:pointer-events-none disabled:opacity-[var(--nq-opacity-disabled)]"
                >
                  <RefreshCw aria-hidden="true" size={14} />
                  Làm mới
                </button>
              }
            />
          </div>

          <div className="mt-0 border-t border-nq-border-subtle">
            {loading ? (
              <div className="px-5 py-4">
                <Skeleton lines={3} />
              </div>
            ) : errorCopy ? (
              <div className="px-5 py-4">
                <ErrorBanner
                  tone="danger"
                  title={errorCopy.title}
                  description={errorCopy.description}
                  onRetry={() => void requestData()}
                  retryLabel="Tải lại dữ liệu"
                />
              </div>
            ) : recent.length === 0 ? (
              <div className="px-5 py-5">
                <EmptyState
                  size="sm"
                  icon={<Swords size={20} aria-hidden="true" />}
                  title="Chưa có trận Ranked nào"
                  description="Trận đầu tiên của bạn sẽ xuất hiện ở đây ngay sau khi máy chủ chốt kết quả."
                  action={
                    <Link
                      to="/ranked"
                      className="nq-focusable inline-flex items-center gap-1.5 rounded-nq-md text-nq-sm font-semibold text-nq-link underline-offset-4 hover:underline"
                    >
                      Tìm trận đấu hạng
                      <ArrowRight aria-hidden="true" size={15} />
                    </Link>
                  }
                />
              </div>
            ) : (
              <ul className="flex flex-col">
                {recent.map((match) => (
                  <li
                    key={match.matchId}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-nq-border-subtle px-5 py-3 last:border-b-0"
                  >
                    <ResultBadge result={match.result} />
                    <span className="min-w-0 flex-1 truncate text-nq-sm text-nq-text">
                      vs {match.opponentUsername}
                      {match.endReason === 'DISCONNECT' ? (
                        <span className="ml-2 text-nq-xs text-nq-text-tertiary">(đối thủ mất kết nối)</span>
                      ) : null}
                    </span>
                    <span className="nq-tabular text-nq-sm font-semibold text-nq-text">
                      {formatNumber(match.myScore)}–{formatNumber(match.opponentScore)}
                    </span>
                    <span className="nq-tabular w-24 text-right text-nq-xs text-nq-text-tertiary">
                      {formatDuration(match.durationSeconds)}
                    </span>
                    <span className="nq-tabular w-28 text-right text-nq-xs text-nq-text-tertiary">
                      {formatPlayedAt(match.playedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </section>
    </>
  )
}
