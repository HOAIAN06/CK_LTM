/**
 * `/profile` — hồ sơ từ `PROFILE_GET` → `PROFILE_DATA` (PlayerStats).
 *
 * Không có chỉnh sửa: protocol không có message cập nhật hồ sơ, nên màn hình này không
 * dựng form giả. Đăng xuất đi qua cùng luồng với sidebar (`DISCONNECT` + xoá phiên).
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/shell'
import {
  Avatar,
  Badge,
  Button,
  Card,
  Dialog,
  ErrorBanner,
  ProgressBar,
  Skeleton
} from '../components/ui'
import { ArrowRight, RefreshCw, ShieldCheck, X } from '../components/ui/icons'
import { useConnectionStore } from '../lib/connection-store'
import { useSessionStore } from '../lib/session-store'
import { UI_ERROR, describeErrorCode } from '../lib/error-codes'
import { accuracyPercent, formatAccuracy, formatNumber } from '../lib/format'
import { useServerMessage } from '../lib/hooks'
import { RESPONSE_TIMEOUT_MS, createWatchdog } from '../lib/watchdog'

export function ProfileRoute(): ReactNode {
  const navigate = useNavigate()
  const player = useSessionStore((state) => state.player)
  const send = useConnectionStore((state) => state.send)
  const signOut = useConnectionStore((state) => state.signOut)
  const connected = useConnectionStore((state) => state.status.state === 'connected')

  const [loading, setLoading] = useState(true)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const watchdog = useMemo(createWatchdog, [])

  const requestProfile = useCallback(async () => {
    setLoading(true)
    setErrorCode(null)
    watchdog.clear()

    const result = await send({ type: 'PROFILE_GET', payload: '' })
    if (!result.ok) {
      setErrorCode(result.error ?? 'SEND_FAILED')
      setLoading(false)
      return
    }
    watchdog.arm(RESPONSE_TIMEOUT_MS, () => {
      setErrorCode(UI_ERROR.requestTimeout)
      setLoading(false)
    })
  }, [send, watchdog])

  useEffect(() => {
    void requestProfile()
  }, [requestProfile])

  useEffect(() => () => watchdog.clear(), [watchdog])

  useServerMessage((message) => {
    if (message.type === 'PROFILE_DATA') {
      watchdog.clear()
      setLoading(false)
      return
    }
    if (message.type === 'QUERY_ERROR') {
      watchdog.clear()
      setErrorCode(message.payload)
      setLoading(false)
    }
  })

  if (!player) {
    return null
  }

  const accuracy = accuracyPercent(player)
  const accuracyLabel = formatAccuracy(player.correctAnswers, player.questionsAnswered)
  const errorCopy = errorCode ? describeErrorCode(errorCode) : null

  const handleLogout = async (): Promise<void> => {
    setConfirmLogout(false)
    setLeaving(true)
    await signOut()
    navigate('/login', { replace: true })
  }

  const stats = [
    { label: 'Thắng', value: formatNumber(player.wins) },
    { label: 'Thua', value: formatNumber(player.losses) },
    { label: 'Hòa', value: formatNumber(player.draws) },
    { label: 'Tổng điểm', value: formatNumber(player.totalScore) },
    { label: 'Câu đã trả lời', value: formatNumber(player.questionsAnswered) },
    { label: 'Câu đúng', value: formatNumber(player.correctAnswers) }
  ]

  return (
    <>
      <PageHeader
        eyebrow="Tài khoản"
        title="Hồ sơ"
        subtitle="Thành tích và tiến độ học tập của bạn, do máy chủ ghi nhận."
        actions={
          <>
            <Button
              variant="secondary"
              leftIcon={<RefreshCw size={15} />}
              onClick={() => void requestProfile()}
              loading={loading}
            >
              Làm mới
            </Button>
            <Button variant="ghost" onClick={() => setConfirmLogout(true)} disabled={leaving}>
              Đăng xuất
            </Button>
          </>
        }
      />

      {errorCopy ? (
        <ErrorBanner
          className="mb-4"
          tone="danger"
          title={errorCopy.title}
          description={errorCopy.description}
          onRetry={() => void requestProfile()}
          retryLabel="Tải lại hồ sơ"
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card padding="lg" className="h-fit">
          <div className="flex items-center gap-3">
            <Avatar name={player.username} size="xl" status={connected ? 'online' : 'offline'} />
            <div className="min-w-0">
              <h2 className="nq-display truncate text-nq-xl text-nq-text">{player.username}</h2>
              <p className="nq-tabular mt-0.5 text-nq-xs text-nq-text-tertiary">
                ID {formatNumber(player.id)}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <Badge tone={connected ? 'success' : 'neutral'} appearance="outline" dot>
              {connected ? 'Đang kết nối máy chủ' : 'Chưa kết nối'}
            </Badge>
            <Badge tone="neutral" appearance="outline">
              Tổng điểm {formatNumber(player.totalScore)}
            </Badge>
          </div>

          <p className="nq-pretty mt-4 flex items-start gap-1.5 text-nq-xs leading-normal text-nq-text-tertiary">
            <ShieldCheck aria-hidden="true" size={14} className="mt-px shrink-0" />
            Hồ sơ chỉ đọc: bản desktop chưa có giao thức cập nhật tên hay mật khẩu, nên không có
            form chỉnh sửa ở đây.
          </p>

          <div className="mt-4 flex flex-col gap-2">
            <Button variant="secondary" fullWidth onClick={() => navigate('/')}>
              Về trang chủ
            </Button>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card padding="lg">
            <h2 className="nq-display text-nq-lg text-nq-text">Thành tích Ranked</h2>
            {loading ? (
              <div className="mt-4 flex flex-col gap-2">
                <Skeleton lines={3} />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-nq-md border border-nq-border-subtle bg-nq-surface-sunken px-3 py-2.5"
                  >
                    <p className="nq-caps">{stat.label}</p>
                    <p className="nq-display nq-tabular mt-1 text-nq-2xl leading-none text-nq-text">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-nq-xs font-medium text-nq-text-secondary">
                  Độ chính xác (đúng / đã trả lời)
                </p>
                <p className="nq-tabular text-nq-sm font-semibold text-nq-text">{accuracyLabel}</p>
              </div>
              {player.questionsAnswered > 0 ? (
                <ProgressBar
                  className="mt-2"
                  value={accuracy}
                  size="sm"
                  tone={accuracy >= 70 ? 'success' : accuracy >= 40 ? 'accent' : 'warning'}
                  aria-label="Độ chính xác trả lời"
                />
              ) : (
                <p className="mt-2 text-nq-xs text-nq-text-tertiary">
                  Chưa trả lời câu nào nên chưa có độ chính xác. Hãy chơi một trận 1v1 hoặc vào
                  phòng Quiz.
                </p>
              )}
            </div>
          </Card>

          <Card tone="sunken" padding="md">
            <p className="nq-caps">Tiếp tục</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                to="/ranked"
                className="nq-focusable inline-flex items-center gap-1.5 rounded-nq-md text-nq-sm font-semibold text-nq-link underline-offset-4 hover:underline"
              >
                Đấu hạng 1v1
                <ArrowRight aria-hidden="true" size={14} />
              </Link>
              <Link
                to="/history"
                className="nq-focusable inline-flex items-center gap-1.5 rounded-nq-md text-nq-sm font-semibold text-nq-link underline-offset-4 hover:underline"
              >
                Lịch sử thi đấu
                <ArrowRight aria-hidden="true" size={14} />
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <Dialog
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        closeOnScrimClick={false}
        title="Đăng xuất khỏi NihongoQuest?"
        description="Kết nối tới máy chủ sẽ được đóng và phiên hiện tại kết thúc."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmLogout(false)}>
              <X aria-hidden="true" size={15} />
              Ở lại
            </Button>
            <Button variant="danger" onClick={() => void handleLogout()} loading={leaving}>
              Đăng xuất
            </Button>
          </>
        }
      />
    </>
  )
}
