/**
 * `/history` — 100 trận Ranked mới nhất của người chơi.
 *
 * `MATCH_HISTORY_GET` → `MATCH_HISTORY_DATA {matches[]}`. Server đã sắp mới nhất trước và
 * giới hạn 100 bản ghi; client chỉ lọc theo kết quả và định dạng lại ngày giờ.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { MatchHistoryEntry } from '@shared/protocol'
import { PageHeader } from '../components/shell'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  SegmentedControl,
  Skeleton,
  type BadgeTone
} from '../components/ui'
import { History, RefreshCw, Swords } from '../components/ui/icons'
import { useConnectionStore } from '../lib/connection-store'
import { UI_ERROR, describeErrorCode } from '../lib/error-codes'
import { formatDuration, formatMatchResult, formatNumber, formatPlayedAt } from '../lib/format'
import { useServerMessage } from '../lib/hooks'
import {
  HISTORY_FILTERS,
  HISTORY_FILTER_LABELS,
  endReasonLabel,
  filterMatches,
  summarizeMatches,
  type HistoryFilter
} from '../lib/history'
import { RESPONSE_TIMEOUT_MS, createWatchdog } from '../lib/watchdog'

function ResultBadge({ result }: { result: string }): ReactNode {
  const copy = formatMatchResult(result)
  const tone: BadgeTone = copy.tone === 'success' ? 'success' : copy.tone === 'danger' ? 'danger' : 'neutral'
  return (
    <Badge tone={tone} appearance="soft" className="w-16 justify-center">
      {copy.label}
    </Badge>
  )
}

export function HistoryRoute(): ReactNode {
  const send = useConnectionStore((state) => state.send)

  const [matches, setMatches] = useState<MatchHistoryEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [filter, setFilter] = useState<HistoryFilter>('ALL')
  const watchdog = useMemo(createWatchdog, [])

  const requestHistory = useCallback(async () => {
    setLoading(true)
    setErrorCode(null)
    watchdog.clear()

    const result = await send({ type: 'MATCH_HISTORY_GET', payload: '' })
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
    void requestHistory()
  }, [requestHistory])

  useEffect(() => () => watchdog.clear(), [watchdog])

  useServerMessage((message) => {
    if (message.type === 'MATCH_HISTORY_DATA') {
      watchdog.clear()
      setMatches(message.payload.matches)
      setLoading(false)
      return
    }
    if (message.type === 'QUERY_ERROR') {
      watchdog.clear()
      setErrorCode(message.payload)
      setLoading(false)
    }
  })

  const visible = matches ? filterMatches(matches, filter) : []
  const summary = matches ? summarizeMatches(matches) : null
  const errorCopy = errorCode ? describeErrorCode(errorCode) : null

  return (
    <>
      <PageHeader
        eyebrow="Cộng đồng"
        title="Lịch sử thi đấu"
        subtitle="Tối đa 100 trận Ranked mới nhất, do máy chủ trả về theo thứ tự thời gian giảm dần."
        meta={
          summary && summary.matches > 0 ? (
            <>
              <Badge tone="neutral" appearance="outline">
                {formatNumber(summary.matches)} trận
              </Badge>
              <Badge tone="success" appearance="soft">
                {formatNumber(summary.wins)} thắng
              </Badge>
              <Badge tone="danger" appearance="soft">
                {formatNumber(summary.losses)} thua
              </Badge>
              <Badge tone="neutral" appearance="soft">
                {formatNumber(summary.draws)} hòa
              </Badge>
            </>
          ) : null
        }
        actions={
          <Button
            variant="secondary"
            leftIcon={<RefreshCw size={15} />}
            onClick={() => void requestHistory()}
            loading={loading}
          >
            Làm mới
          </Button>
        }
      />

      {errorCopy ? (
        <ErrorBanner
          className="mb-4"
          tone="danger"
          title={errorCopy.title}
          description={errorCopy.description}
          onRetry={() => void requestHistory()}
          retryLabel="Tải lại lịch sử"
        />
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl<HistoryFilter>
          label="Lọc theo kết quả"
          value={filter}
          onChange={setFilter}
          options={HISTORY_FILTERS.map((value) => ({
            value,
            label: HISTORY_FILTER_LABELS[value]
          }))}
        />
        <p className="nq-tabular text-nq-xs text-nq-text-tertiary">
          {matches ? `${formatNumber(visible.length)}/${formatNumber(matches.length)} trận` : '—'}
        </p>
      </div>

      {loading && matches === null ? (
        <Card padding="md">
          <Skeleton lines={5} height="1.6rem" rounded="sm" />
        </Card>
      ) : matches !== null && matches.length === 0 ? (
        <EmptyState
          icon={<History size={22} aria-hidden="true" />}
          title="Chưa có trận nào"
          description="Lịch sử sẽ có dữ liệu sau trận Ranked đầu tiên của bạn."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          size="sm"
          icon={<Swords size={20} aria-hidden="true" />}
          title={`Không có trận ${HISTORY_FILTER_LABELS[filter].toLowerCase()}`}
          description={'Đổi bộ lọc sang \u201cTất cả\u201d để xem toàn bộ lịch sử.'}
        />
      ) : (
        <Card padding="none">
          <ul className="flex flex-col">
            {visible.map((match) => (
              <li
                key={match.matchId}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-nq-border-subtle px-5 py-3 last:border-b-0"
              >
                <ResultBadge result={match.result} />
                <span className="min-w-0 flex-1 truncate text-nq-sm text-nq-text">
                  vs {match.opponentUsername}
                  <span className="ml-2 text-nq-xs text-nq-text-tertiary">
                    {endReasonLabel(match.endReason)}
                  </span>
                </span>
                <span className="nq-tabular text-nq-sm font-semibold text-nq-text">
                  {formatNumber(match.myScore)}–{formatNumber(match.opponentScore)}
                </span>
                <span className="nq-tabular w-24 text-right text-nq-xs text-nq-text-tertiary">
                  {formatDuration(match.durationSeconds)}
                </span>
                <span className="nq-tabular w-32 text-right text-nq-xs text-nq-text-tertiary">
                  {formatPlayedAt(match.playedAt)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="mt-3 text-nq-xs text-nq-text-tertiary">
        Kết quả (WIN/LOSS/DRAW) và tỉ số do máy chủ trả về theo góc nhìn của bạn. Bộ lọc chỉ thu
        hẹp danh sách đã tải, không sắp xếp lại.
      </p>
    </>
  )
}
