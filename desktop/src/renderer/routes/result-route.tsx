/**
 * `/result` — tổng kết trận Ranked.
 *
 * Kết quả chỉ đến từ `GAME_OVER` (máy chủ chỉ gửi message này khi đã lưu trận thành công),
 * nên màn hình không thể hiển thị điểm hay thắng/thua do client tự tính.
 *
 * Kết quả được giữ trong `useRankedStore`; tải lại trang (hoặc mở `/result` khi chưa có
 * trận) sẽ về `/` thay vì hiện một màn kết quả trống.
 */
import type { ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Badge, Button, Card } from '../components/ui'
import { ArrowRight, Swords, Trophy } from '../components/ui/icons'
import { useSessionStore } from '../lib/session-store'
import { durationLabel, resultCopy, useRankedStore, type MatchResult } from '../lib/ranked'

const ACCENT: Record<string, 'success' | 'danger' | 'primary'> = {
  success: 'success',
  danger: 'danger',
  neutral: 'primary'
}

const TONE_TEXT: Record<string, string> = {
  success: 'text-nq-success',
  danger: 'text-nq-danger',
  neutral: 'text-nq-text'
}

function ScoreColumn({
  label,
  value,
  emphasis
}: {
  label: string
  value: number
  emphasis: boolean
}): ReactNode {
  return (
    <div className="min-w-0 text-center">
      <p className="nq-caps truncate">{label}</p>
      <p
        className={
          emphasis
            ? 'nq-display nq-tabular mt-1 text-nq-5xl leading-none text-nq-text'
            : 'nq-display nq-tabular mt-1 text-nq-4xl leading-none text-nq-text-secondary'
        }
      >
        {value}
      </p>
    </div>
  )
}

export function ResultRoute(): ReactNode {
  const navigate = useNavigate()
  const player = useSessionStore((state) => state.player)
  const result: MatchResult | null = useRankedStore((state) => state.result)
  const clearResult = useRankedStore((state) => state.clearResult)

  if (!result) {
    return <Navigate to="/" replace />
  }

  const copy = resultCopy(result.result)
  const accent = ACCENT[copy.tone] ?? 'primary'
  const won = copy.tone === 'success'

  const playAgain = (): void => {
    clearResult()
    navigate('/ranked')
  }

  const goHome = (): void => {
    clearResult()
    navigate('/')
  }

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
      <Card tone="default" padding="lg" accent={accent}>
        <div className="flex flex-col items-center gap-2 text-center">
          <span
            aria-hidden="true"
            className={
              won
                ? 'grid size-12 place-items-center rounded-nq-full bg-nq-success-soft text-nq-success'
                : copy.tone === 'danger'
                  ? 'grid size-12 place-items-center rounded-nq-full bg-nq-danger-soft text-nq-danger'
                  : 'grid size-12 place-items-center rounded-nq-full bg-nq-primary-soft text-nq-primary-soft-text'
            }
          >
            {won ? <Trophy size={24} /> : <Swords size={24} />}
          </span>
          <p className="nq-caps">Kết quả trận</p>
          <h1 className={`nq-display nq-balance text-nq-4xl ${TONE_TEXT[copy.tone] ?? 'text-nq-text'}`}>
            {copy.label}
          </h1>
          <p className="nq-pretty max-w-[46ch] text-nq-sm leading-normal text-nq-text-secondary">
            {copy.detail}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-3 rounded-nq-lg border border-nq-border-subtle bg-nq-surface-sunken px-4 py-5">
          <ScoreColumn label={player?.username ?? 'Bạn'} value={result.myScore} emphasis={won} />
          <span aria-hidden="true" className="nq-display pb-1 text-nq-2xl text-nq-text-tertiary">
            :
          </span>
          <ScoreColumn
            label={result.opponent}
            value={result.opponentScore}
            emphasis={copy.tone === 'danger'}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button size="lg" onClick={playAgain} leftIcon={<Swords size={18} />}>
            Chơi lại
          </Button>
          <Button size="lg" variant="secondary" onClick={goHome}>
            Về trang chủ
          </Button>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Badge tone="neutral" appearance="outline">
            Trận {durationLabel(result.durationSeconds)}
          </Badge>
          <Badge tone="neutral" appearance="outline">
            Đối thủ: {result.opponent}
          </Badge>
          <Badge tone="neutral" appearance="outline">
            Điểm và kết quả do máy chủ gửi
          </Badge>
        </div>

        <p className="nq-pretty mt-4 text-center text-nq-xs leading-normal text-nq-text-tertiary">
          Trận này đã được máy chủ ghi nhận, nên thắng/thua/hòa và tổng điểm trong hồ sơ của bạn
          đã được cập nhật.
        </p>
      </Card>

      <p className="text-center text-nq-xs text-nq-text-tertiary">
        <Link
          to="/history"
          className="nq-focusable inline-flex items-center gap-1 rounded-nq-sm text-nq-link underline-offset-4 hover:underline"
        >
          Xem lịch sử thi đấu
          <ArrowRight aria-hidden="true" size={13} />
        </Link>
      </p>
    </div>
  )
}
