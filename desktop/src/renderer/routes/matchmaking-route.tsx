/**
 * `/ranked` — chọn thời lượng và tìm đối thủ 1v1.
 *
 * Luồng (docs/protocol.md §5, docs/ranked.md §3):
 *   FIND_MATCH {durationSeconds} → WAITING → MATCH_FOUND
 *   CANCEL_MATCH → MATCH_CANCELLED
 *   MATCH_ERROR  → về idle kèm câu giải thích
 *
 * Bất biến:
 * - Chỉ gửi `FIND_MATCH` khi máy trạng thái đang `idle` (không có yêu cầu thứ hai).
 * - `MATCH_FOUND` là nguồn duy nhất tạo bối cảnh trận; dữ liệu không hợp lệ bị từ chối.
 * - Rời màn hình khi còn đang chờ thì gửi `CANCEL_MATCH`: sidebar luôn hiển thị nên
 *   không được để người chơi bị ghép trận khi không còn màn hình nào theo dõi.
 */
import { useEffect, useReducer, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/shell'
import {
  Badge,
  Button,
  Card,
  ErrorBanner,
  SegmentedControl,
  Spinner
} from '../components/ui'
import { Clock, Swords, Trophy } from '../components/ui/icons'
import { useConnectionStore } from '../lib/connection-store'
import { useSessionStore } from '../lib/session-store'
import { describeErrorCode } from '../lib/error-codes'
import { formatNumber } from '../lib/format'
import { useServerMessage } from '../lib/hooks'
import {
  durationLabel,
  elapsedSeconds,
  formatClock,
  initialSearchState,
  isRankedDuration,
  isSearchBusy,
  matchRemainingSeconds,
  searchReducer,
  useRankedStore,
  type RankedDuration
} from '../lib/ranked'
import { useNow } from '../lib/ranked/timers'

type DurationValue = '180' | '300'

function toDuration(value: string): RankedDuration | null {
  const parsed = Number(value)
  return isRankedDuration(parsed) ? parsed : null
}

export function MatchmakingRoute(): ReactNode {
  const navigate = useNavigate()
  const player = useSessionStore((state) => state.player)
  const send = useConnectionStore((state) => state.send)

  const match = useRankedStore((state) => state.match)
  const battle = useRankedStore((state) => state.battle)
  const result = useRankedStore((state) => state.result)

  const [search, dispatch] = useReducer(searchReducer, initialSearchState(180))

  // Đồng hồ chạy khi đang chờ ghép **hoặc** khi có trận đang diễn ra (khối "quay lại trận").
  const hasLiveBattle =
    battle !== null && battle.phase !== 'finished' && battle.phase !== 'forfeit'
  const now = useNow(
    1000,
    search.phase === 'sending' || search.phase === 'waiting' || hasLiveBattle
  )

  const searchRef = useRef(search)
  useEffect(() => {
    searchRef.current = search
  }, [search])

  /** Đặt đồng bộ khi MATCH_FOUND tới, để cleanup không gửi CANCEL_MATCH sau khi đã ghép. */
  const matchedRef = useRef(false)

  /* Rời màn hình khi đang chờ: dọn hàng chờ để không bị ghép trận "vô hình". */
  useEffect(
    () => () => {
      if (matchedRef.current) return
      if (isSearchBusy(searchRef.current)) {
        void useConnectionStore.getState().send({ type: 'CANCEL_MATCH', payload: '' })
      }
    },
    []
  )

  useServerMessage((message) => {
    switch (message.type) {
      case 'WAITING':
        dispatch({ type: 'queued', now: Date.now() })
        break
      case 'MATCH_CANCELLED':
        dispatch({ type: 'cancelled' })
        break
      case 'MATCH_ERROR':
        dispatch({ type: 'failed', code: message.payload })
        break
      default:
        break
    }
  })

  /* `MATCH_FOUND` do ranked store xử lý (kênh luôn mở): trận đã sẵn sàng → vào màn thi. */
  useEffect(() => {
    if (!match || !battle) return
    if (battle.phase === 'finished' || battle.phase === 'forfeit') return
    matchedRef.current = true
    dispatch({ type: 'matched' })
    navigate('/battle')
  }, [match, battle, navigate])

  async function startSearch(): Promise<void> {
    if (isSearchBusy(searchRef.current)) return
    dispatch({ type: 'requested', now: Date.now() })
    const outcome = await send({
      type: 'FIND_MATCH',
      payload: { durationSeconds: searchRef.current.duration }
    })
    if (!outcome.ok) {
      dispatch({ type: 'failed', code: outcome.error ?? 'SEND_FAILED' })
    }
  }

  async function cancelSearch(): Promise<void> {
    if (!isSearchBusy(searchRef.current)) return
    dispatch({ type: 'cancelRequested' })
    const outcome = await send({ type: 'CANCEL_MATCH', payload: '' })
    if (!outcome.ok) {
      dispatch({ type: 'failed', code: outcome.error ?? 'SEND_FAILED' })
    }
  }

  if (!player) {
    return null
  }

  const liveBattle = hasLiveBattle ? battle : null
  const finishedMatch = battle && battle.phase === 'finished' && result ? result : null
  const busy = isSearchBusy(search)
  const waitingSeconds = elapsedSeconds(search.startedAt, now)
  const errorCopy = search.errorCode ? describeErrorCode(search.errorCode) : null

  const waitingLabel = `Đang tìm đối thủ cho trận ${durationLabel(search.duration)}.`
  const liveAnnouncement =
    search.phase === 'waiting'
      ? waitingLabel
      : search.phase === 'cancelling'
        ? 'Đang hủy tìm trận.'
        : ''

  return (
    <>
      <PageHeader
        eyebrow="Chơi"
        title="Đấu hạng 1v1"
        subtitle="Chọn thời lượng và tìm đối thủ phù hợp. Điểm, thời hạn và kết quả do máy chủ quyết định."
        meta={
          <>
            <Badge tone="neutral" appearance="outline">
              Thành tích: {formatNumber(player.wins)} thắng · {formatNumber(player.totalScore)} điểm
            </Badge>
            {liveBattle ? (
              <Badge tone="warning" appearance="soft" dot>
                Đang trong trận
              </Badge>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card padding="lg">
          {liveBattle ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="grid size-10 shrink-0 place-items-center rounded-nq-md bg-nq-primary-soft text-nq-primary-soft-text"
                >
                  <Swords size={20} />
                </span>
                <div className="min-w-0">
                  <h2 className="nq-display text-nq-xl text-nq-text">Bạn đang trong trận</h2>
                  <p className="nq-pretty mt-1 text-nq-sm leading-normal text-nq-text-secondary">
                    Trận {durationLabel(liveBattle.matchTotalSeconds)} với{' '}
                    <span className="font-semibold text-nq-text">{match?.opponent}</span>. Trận vẫn
                    tiếp tục trên máy chủ khi bạn rời màn hình này.
                  </p>
                </div>
              </div>
              <dl className="grid grid-cols-3 gap-3">
                <div className="rounded-nq-md border border-nq-border-subtle bg-nq-surface-sunken px-3 py-2">
                  <dt className="nq-caps">Câu</dt>
                  <dd className="nq-tabular mt-0.5 text-nq-lg font-semibold text-nq-text">
                    {liveBattle.attempt}
                  </dd>
                </div>
                <div className="rounded-nq-md border border-nq-border-subtle bg-nq-surface-sunken px-3 py-2">
                  <dt className="nq-caps">Tỉ số</dt>
                  <dd className="nq-tabular mt-0.5 text-nq-lg font-semibold text-nq-text">
                    {liveBattle.score.myScore}–{liveBattle.score.opponentScore}
                  </dd>
                </div>
                <div className="rounded-nq-md border border-nq-border-subtle bg-nq-surface-sunken px-3 py-2">
                  <dt className="nq-caps">Còn lại</dt>
                  <dd className="nq-tabular mt-0.5 text-nq-lg font-semibold text-nq-text">
                    {formatClock(matchRemainingSeconds(liveBattle, now))}
                  </dd>
                </div>
              </dl>
              <div>
                <Button size="lg" onClick={() => navigate('/battle')}>
                  Quay lại trận
                </Button>
              </div>
            </div>
          ) : search.phase === 'sending' ||
            search.phase === 'waiting' ||
            search.phase === 'cancelling' ? (
            <div className="flex flex-col items-center gap-5 py-4 text-center">
              <Spinner size="lg" tone="primary" />
              <div>
                <h2 className="nq-display text-nq-xl text-nq-text">Đang tìm đối thủ…</h2>
                <p className="nq-tabular mt-1 font-display text-nq-4xl font-bold text-nq-text">
                  {formatClock(waitingSeconds)}
                </p>
                <p className="mt-1 text-nq-xs text-nq-text-tertiary">
                  Trận {durationLabel(search.duration)} · hàng chờ riêng theo thời lượng
                </p>
              </div>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => void cancelSearch()}
                loading={search.phase === 'cancelling'}
                disabled={search.phase === 'cancelling'}
              >
                Hủy tìm trận
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="nq-display text-nq-xl text-nq-text">Chọn thời lượng</h2>
                <p className="nq-pretty mt-1 text-nq-sm leading-normal text-nq-text-secondary">
                  Mỗi câu có 30 giây. Bạn trả lời câu của mình, đối thủ trả lời câu của họ — ai nhiều
                  điểm hơn khi hết giờ thì thắng.
                </p>
              </div>

              <SegmentedControl<DurationValue>
                label="Thời lượng trận"
                fullWidth
                value={search.duration === 300 ? '300' : '180'}
                onChange={(value) => {
                  const duration = toDuration(value)
                  if (duration !== null) dispatch({ type: 'duration', duration })
                }}
                options={[
                  { value: '180', label: '3 phút' },
                  { value: '300', label: '5 phút' }
                ]}
              />

              <ul className="grid gap-2 text-nq-sm text-nq-text-secondary sm:grid-cols-2">
                <li className="flex items-start gap-2">
                  <Clock aria-hidden="true" size={15} className="mt-0.5 shrink-0 text-nq-text-tertiary" />
                  30 giây mỗi câu, mỗi câu đúng 1 điểm
                </li>
                <li className="flex items-start gap-2">
                  <Trophy aria-hidden="true" size={15} className="mt-0.5 shrink-0 text-nq-text-tertiary" />
                  Không cộng điểm theo tốc độ, chỉ đúng hoặc sai
                </li>
              </ul>

              <div>
                <Button
                  size="lg"
                  fullWidth
                  leftIcon={<Swords size={18} />}
                  disabled={busy}
                  onClick={() => void startSearch()}
                >
                  Tìm đối thủ
                </Button>
              </div>

              <div className="flex min-h-5 items-start">
                {errorCopy ? (
                  <ErrorBanner
                    tone={search.errorCode === 'ALREADY_MATCHED' ? 'warning' : 'danger'}
                    title={errorCopy.title}
                    description={errorCopy.description}
                    onRetry={() => void startSearch()}
                    retryLabel="Thử lại"
                    className="w-full"
                  />
                ) : (
                  <p
                    aria-live="polite"
                    className="min-h-5 text-nq-xs leading-snug text-nq-text-tertiary"
                  >
                    {search.notice ?? 'Hai người chỉ được ghép khi chọn cùng thời lượng.'}
                  </p>
                )}
              </div>
            </div>
          )}

          <p className="nq-sr-only" aria-live="polite">
            {liveAnnouncement}
          </p>
        </Card>

        <Card tone="sunken" padding="md" className="h-fit">
          <h2 className="nq-display text-nq-lg text-nq-text">Luật trận</h2>
          <ul className="mt-3 flex flex-col gap-2 text-nq-sm leading-normal text-nq-text-secondary">
            <li>· 180 hoặc 300 giây, deadline chung cho cả hai người.</li>
            <li>· Hai người tiến qua câu hỏi độc lập; câu có thể lặp lại.</li>
            <li>· Hết giờ trận: nhiều điểm hơn thắng, bằng điểm là hòa.</li>
            <li>· Ngắt kết nối giữa trận là xử thua; Ranked không có vào lại.</li>
          </ul>
          <p className="nq-pretty mt-3 text-nq-xs leading-normal text-nq-text-tertiary">
            Màn hình chỉ hiển thị số liệu máy chủ gửi. Không có điểm thưởng tốc độ và không có
            thắng/thua nào được tính trên máy bạn.
          </p>
        </Card>
      </div>

      {finishedMatch ? (
        <Card tone="default" padding="md" className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="nq-caps">Trận vừa kết thúc</p>
              <p className="mt-1 text-nq-sm text-nq-text-secondary">
                {finishedMatch.result === 'WIN'
                  ? 'Bạn thắng'
                  : finishedMatch.result === 'LOSE'
                    ? 'Bạn thua'
                    : 'Hai bên hòa'}{' '}
                trước {finishedMatch.opponent}: {finishedMatch.myScore}–{finishedMatch.opponentScore}
              </p>
            </div>
            <Button variant="secondary" onClick={() => navigate('/result')}>
              Xem kết quả
            </Button>
          </div>
        </Card>
      ) : null}
    </>
  )
}
