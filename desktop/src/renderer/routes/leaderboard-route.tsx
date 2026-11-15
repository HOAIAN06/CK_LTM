/**
 * `/leaderboard` — top 10 theo dữ liệu Ranked của máy chủ.
 *
 * `LEADERBOARD_GET` → `LEADERBOARD_DATA {players[]}`. Thứ hạng do server quyết định
 * (`wins DESC, totalScore DESC, username ASC`); client không sắp xếp lại và không suy ra
 * "số trận" từ thắng/thua/hòa vì payload không có.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { LeaderboardEntry } from '@shared/protocol'
import { PageHeader } from '../components/shell'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Skeleton
} from '../components/ui'
import { RefreshCw, Trophy, Users } from '../components/ui/icons'
import { useConnectionStore } from '../lib/connection-store'
import { useSessionStore } from '../lib/session-store'
import { UI_ERROR, describeErrorCode } from '../lib/error-codes'
import { formatNumber } from '../lib/format'
import { useServerMessage } from '../lib/hooks'
import { RESPONSE_TIMEOUT_MS, createWatchdog } from '../lib/watchdog'

export function LeaderboardRoute(): ReactNode {
  const send = useConnectionStore((state) => state.send)
  const player = useSessionStore((state) => state.player)

  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const watchdog = useMemo(createWatchdog, [])

  const requestData = useCallback(async () => {
    setLoading(true)
    setErrorCode(null)
    watchdog.clear()

    const result = await send({ type: 'LEADERBOARD_GET', payload: '' })
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
    void requestData()
  }, [requestData])

  useEffect(() => () => watchdog.clear(), [watchdog])

  useServerMessage((message) => {
    if (message.type === 'LEADERBOARD_DATA') {
      watchdog.clear()
      setEntries(message.payload.players)
      setLoading(false)
      return
    }
    if (message.type === 'QUERY_ERROR') {
      watchdog.clear()
      setErrorCode(message.payload)
      setLoading(false)
    }
  })

  const errorCopy = errorCode ? describeErrorCode(errorCode) : null
  const myEntry = player ? entries?.find((entry) => entry.userId === player.id) ?? null : null

  return (
    <>
      <PageHeader
        eyebrow="Cộng đồng"
        title="Bảng xếp hạng"
        subtitle="Top 10 thành tích Ranked toàn hệ thống, xếp theo số trận thắng rồi tổng điểm."
        meta={
          myEntry ? (
            <Badge tone="primary" appearance="soft">
              Hạng của bạn: #{myEntry.rank}
            </Badge>
          ) : entries && entries.length > 0 ? (
            <Badge tone="neutral" appearance="outline">
              Bạn chưa có trong top 10
            </Badge>
          ) : null
        }
        actions={
          <Button
            variant="secondary"
            leftIcon={<RefreshCw size={15} />}
            onClick={() => void requestData()}
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
          onRetry={() => void requestData()}
          retryLabel="Tải lại bảng"
        />
      ) : null}

      {loading && entries === null ? (
        <Card padding="md">
          <div className="flex flex-col gap-2">
            <Skeleton height="0.8rem" width="30%" />
            <Skeleton lines={5} height="1.6rem" rounded="sm" />
          </div>
        </Card>
      ) : entries !== null && entries.length === 0 ? (
        <EmptyState
          icon={<Users size={22} aria-hidden="true" />}
          title="Chưa có ai trên bảng xếp hạng"
          description="Bảng sẽ có dữ liệu sau khi có trận Ranked đầu tiên được máy chủ ghi nhận."
        />
      ) : entries ? (
        <Card padding="none">
          <div className="nq-scroll-x">
            <table className="w-full border-collapse text-nq-sm">
              <caption className="nq-sr-only">Top 10 người chơi theo thành tích Ranked</caption>
              <thead>
                <tr className="border-b border-nq-border-subtle text-left">
                  <th scope="col" className="nq-caps px-4 py-3 font-semibold">
                    Hạng
                  </th>
                  <th scope="col" className="nq-caps px-4 py-3 font-semibold">
                    Người chơi
                  </th>
                  <th scope="col" className="nq-caps px-4 py-3 text-right font-semibold">
                    Thắng
                  </th>
                  <th scope="col" className="nq-caps px-4 py-3 text-right font-semibold">
                    Thua
                  </th>
                  <th scope="col" className="nq-caps px-4 py-3 text-right font-semibold">
                    Hòa
                  </th>
                  <th scope="col" className="nq-caps px-4 py-3 text-right font-semibold">
                    Tổng điểm
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const isMe = player?.id === entry.userId
                  return (
                    <tr
                      key={entry.userId}
                      data-me={isMe ? 'true' : undefined}
                      className={
                        isMe
                          ? 'border-b border-nq-border-subtle bg-nq-primary-soft last:border-b-0'
                          : 'border-b border-nq-border-subtle last:border-b-0'
                      }
                    >
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5">
                          {entry.rank <= 3 ? (
                            <Trophy
                              aria-hidden="true"
                              size={14}
                              className={
                                entry.rank === 1
                                  ? 'text-nq-warning'
                                  : 'text-nq-text-tertiary'
                              }
                            />
                          ) : null}
                          <span className="nq-tabular font-semibold text-nq-text">
                            #{entry.rank}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={
                              isMe
                                ? 'font-semibold text-nq-text'
                                : 'text-nq-text'
                            }
                          >
                            {entry.username}
                          </span>
                          {isMe ? (
                            <Badge tone="primary" appearance="soft">
                              Bạn
                            </Badge>
                          ) : null}
                        </span>
                      </td>
                      <td className="nq-tabular px-4 py-3 text-right text-nq-text">
                        {formatNumber(entry.wins)}
                      </td>
                      <td className="nq-tabular px-4 py-3 text-right text-nq-text-secondary">
                        {formatNumber(entry.losses)}
                      </td>
                      <td className="nq-tabular px-4 py-3 text-right text-nq-text-secondary">
                        {formatNumber(entry.draws)}
                      </td>
                      <td className="nq-tabular px-4 py-3 text-right font-semibold text-nq-text">
                        {formatNumber(entry.totalScore)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <p className="mt-3 text-nq-xs text-nq-text-tertiary">
        Bảng do máy chủ tính từ thống kê Ranked; ứng dụng chỉ hiển thị. Dữ liệu làm mới khi bạn
        bấm "Làm mới".
      </p>
    </>
  )
}
