/**
 * `/battle` — màn thi đấu 1v1.
 *
 * Route này **không** tự xử lý message: `useRankedStore` đã đăng ký listener ngay từ
 * `MATCH_FOUND`, đẩy `QUESTION`/`ANSWER_RESULT`/`SCORE_UPDATE`/`GAME_OVER` qua reducer
 * thuần (`lib/ranked/reducer.ts`). Nhờ vậy câu hỏi đầu tiên không thể rơi vào khoảng
 * trống giữa hai màn hình, và người chơi rời màn hình rồi quay lại vẫn thấy trận.
 *
 * Server authority:
 * - Đúng/sai, điểm và đáp án đúng đều lấy từ `ANSWER_RESULT`; client không suy luận.
 * - Countdown chỉ để hiển thị. Khi về 0, lựa chọn bị khoá và client chờ `ANSWER_RESULT`
 *   — không tự tạo kết quả timeout.
 * - Mất kết nối: chuyển sang trạng thái `forfeit` (không có thắng/thua tự tạo), sau đó
 *   auth guard đưa người dùng về màn đăng nhập với banner mất kết nối.
 */
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/shell'
import {
  Badge,
  Button,
  Card,
  CircularTimer,
  EmptyState,
  ErrorBanner,
  Kbd,
  Spinner,
  cn
} from '../components/ui'
import { Check, Clock, Swords, X } from '../components/ui/icons'
import { useConnectionStore } from '../lib/connection-store'
import { useSessionStore } from '../lib/session-store'
import {
  choiceVisual,
  countdownAnnouncement,
  durationLabel,
  formatClock,
  isInputLocked,
  matchRemainingSeconds,
  questionRemainingSeconds,
  useRankedStore,
  type BattleState,
  type ChoiceVisual
} from '../lib/ranked'
import { useNow } from '../lib/ranked/timers'

const CHOICE_BASE =
  'nq-focusable flex w-full items-start gap-2.5 rounded-nq-md border px-3.5 py-3 text-left text-nq-sm font-medium ' +
  'transition-[background-color,border-color,color] duration-[var(--nq-motion-fast)] ease-nq'

const CHOICE_STYLE: Record<ChoiceVisual, string> = {
  idle: 'border-nq-border bg-nq-surface text-nq-text hover:border-nq-border-strong hover:bg-nq-surface-hover',
  selected: 'border-nq-primary bg-nq-primary-soft text-nq-primary-soft-text',
  correct: 'border-nq-success bg-nq-success-soft text-nq-success nq-feedback-correct',
  wrong: 'border-nq-danger bg-nq-danger-soft text-nq-danger nq-feedback-wrong',
  muted: 'border-nq-border bg-nq-surface text-nq-text opacity-[var(--nq-opacity-muted)]'
}

function feedbackFor(battle: BattleState): {
  tone: 'success' | 'danger' | 'warning'
  title: string
  detail: string
} | null {
  const outcome = battle.outcome
  if (!outcome) return null
  if (outcome.chosenChoiceId === null) {
    return {
      tone: 'warning',
      title: 'Hết giờ cho câu này',
      detail: 'Máy chủ xử lý như không trả lời. Đáp án đúng đã được đánh dấu.'
    }
  }
  if (outcome.correct) {
    return {
      tone: 'success',
      title: 'Chính xác',
      detail:
        outcome.scoreAwarded > 0
          ? `Máy chủ cộng ${outcome.scoreAwarded} điểm cho câu này.`
          : 'Máy chủ đã ghi nhận câu trả lời đúng.'
    }
  }
  return {
    tone: 'danger',
    title: 'Chưa đúng',
    detail: 'Đáp án đúng đã được đánh dấu. Máy chủ không cộng điểm cho câu này.'
  }
}

export function BattleRoute(): ReactNode {
  const navigate = useNavigate()
  const player = useSessionStore((state) => state.player)
  const match = useRankedStore((state) => state.match)
  const battle = useRankedStore((state) => state.battle)
  const choose = useRankedStore((state) => state.choose)
  const noteTimeout = useRankedStore((state) => state.noteTimeout)
  const forfeit = useRankedStore((state) => state.forfeit)
  const connectionLost = useConnectionStore((state) => state.connectionLost)

  const live = battle !== null && battle.phase !== 'finished' && battle.phase !== 'forfeit'
  const now = useNow(250, live)

  /**
   * Câu mới → đưa focus vào lựa chọn đầu tiên để bàn phím dùng được ngay
   * (`Enter` chọn, `1–4` chọn nhanh). Không có input nào khác trên màn hình nên
   * việc này không cướp focus khỏi chỗ đang gõ.
   */
  const firstChoiceRef = useRef<HTMLButtonElement | null>(null)
  const attempt = battle?.attempt ?? 0
  useEffect(() => {
    if (attempt === 0) return
    firstChoiceRef.current?.focus()
  }, [attempt])

  /* Countdown cục bộ về 0 → khoá lựa chọn, chờ server. Không tạo kết quả. */
  useEffect(() => {
    if (!battle || battle.phase !== 'question') return
    if (questionRemainingSeconds(battle, now) > 0) return
    noteTimeout(now)
  }, [battle, now, noteTimeout])

  /* Server đã gửi GAME_OVER → màn kết quả (kết quả nằm trong store). */
  useEffect(() => {
    if (!battle || battle.phase !== 'finished' || !battle.finalResult) return
    navigate('/result', { replace: true })
  }, [battle, navigate])

  /* Mất kết nối: ghi nhận forfeit, không tự tạo thắng/thua. */
  useEffect(() => {
    if (!connectionLost || !battle) return
    if (battle.phase === 'finished' || battle.phase === 'forfeit') return
    forfeit()
  }, [connectionLost, battle, forfeit])

  /* Phím 1–4 chọn đáp án nhanh; Enter/Space vẫn hoạt động vì phần tử là <button>. */
  useEffect(() => {
    if (!battle || battle.phase !== 'question') return
    const question = battle.question
    if (!question) return

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target
      if (target instanceof HTMLElement) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
          return
        }
      }
      const index = ['1', '2', '3', '4'].indexOf(event.key)
      if (index < 0) return
      const choice = question.choices[index]
      if (!choice) return
      event.preventDefault()
      choose(choice.choiceId)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [battle, choose])

  const announcement = useMemo(() => countdownAnnouncement(battle, now), [battle, now])

  if (!match || !battle) {
    return <Navigate to="/ranked" replace />
  }

  const score = battle.score
  const locked = isInputLocked(battle)
  const question = battle.question
  const remaining = questionRemainingSeconds(battle, now)
  const matchLeft = matchRemainingSeconds(battle, now)
  const feedback = feedbackFor(battle)
  const timedOut = battle.timedOut

  const scoreLine = `Tỉ số: bạn ${score.myScore}, đối thủ ${score.opponentScore}.`

  return (
    <>
      <PageHeader
        size="compact"
        eyebrow="Đấu trường 1v1"
        title={`vs ${match.opponent}`}
        subtitle={`Trận ${durationLabel(match.durationSeconds)} · mọi đáp án đều do máy chủ chốt.`}
        meta={
          <>
            <Badge tone="neutral" appearance="outline">
              <Clock aria-hidden="true" size={12} />
              <span className="nq-tabular ml-1">Còn {formatClock(matchLeft)}</span>
            </Badge>
            {battle.attempt > 0 ? (
              <Badge tone="primary" appearance="soft">
                Câu {battle.attempt}
              </Badge>
            ) : null}
          </>
        }
      />

      {/* Tỉ số hai bên: chỉ đọc số máy chủ gửi trong SCORE_UPDATE / GAME_OVER. */}
      <Card tone="sunken" padding="md">
        <div className="mx-auto grid w-full max-w-[520px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <div className="min-w-0 text-right">
            <p className="nq-caps truncate">{player?.username ?? 'Bạn'}</p>
            <p
              key={`my-${score.myScore}`}
              className="nq-display nq-tabular nq-score-updated text-nq-5xl leading-none text-nq-text"
            >
              {score.myScore}
            </p>
          </div>
          <span aria-hidden="true" className="nq-display text-nq-2xl text-nq-text-tertiary">
            :
          </span>
          <div className="min-w-0">
            <p className="nq-caps truncate">{match.opponent}</p>
            <p
              key={`opp-${score.opponentScore}`}
              className="nq-display nq-tabular nq-score-updated text-nq-5xl leading-none text-nq-text"
            >
              {score.opponentScore}
            </p>
          </div>
        </div>
        <p className="nq-sr-only" aria-live="polite" aria-atomic="true">
          {scoreLine}
        </p>
      </Card>

      <div className="mt-4">
        {battle.phase === 'forfeit' ? (
          <ErrorBanner
            tone="danger"
            title="Mất kết nối tới máy chủ"
            description="Trận Ranked kết thúc khi socket đóng và bên mất kết nối bị xử thua theo luật (docs/ranked.md §7.1). Ứng dụng sẽ đưa bạn về màn hình đăng nhập."
          />
        ) : battle.phase === 'finished' && !battle.finalResult ? (
          <Card padding="lg">
            <ErrorBanner
              tone="danger"
              title="Trận đã dừng"
              description={
                battle.notice ??
                'Máy chủ kết thúc trận mà không gửi kết quả, nên không có điểm nào được hiển thị.'
              }
            />
            <div className="mt-4">
              <Button variant="secondary" onClick={() => navigate('/ranked')}>
                Về màn tìm trận
              </Button>
            </div>
          </Card>
        ) : battle.phase === 'finished' ? (
          <Card padding="lg">
            <div className="flex items-center gap-3">
              <Spinner size="md" tone="primary" />
              <p className="text-nq-sm text-nq-text-secondary">Đang mở kết quả trận…</p>
            </div>
          </Card>
        ) : battle.phase === 'waiting' || !question ? (
          <Card padding="lg">
            <EmptyState
              icon={<Swords size={22} aria-hidden="true" />}
              title="Đã ghép trận"
              description={`Đang chờ câu hỏi đầu tiên từ máy chủ. Đối thủ: ${match.opponent}.`}
            />
          </Card>
        ) : (
          <Card padding="lg">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="nq-caps">Câu {battle.attempt}</p>
                <h2
                  id="battle-question"
                  className="nq-display nq-balance mt-2 max-w-[60ch] text-nq-2xl leading-snug text-nq-text"
                >
                  {question.content}
                </h2>
              </div>
              <CircularTimer
                remaining={remaining}
                total={battle.questionTotalSeconds}
                format="seconds"
                warningAt={10}
                criticalAt={5}
                paused={locked}
                label="Câu này"
              />
            </div>

            <p className="mt-1 text-nq-xs text-nq-text-tertiary">
              Nhấn phím 1–4 hoặc chọn một đáp án. Countdown chỉ để hiển thị; máy chủ quyết định
              đúng/sai và thời hạn.
            </p>

            <div
              role="group"
              aria-labelledby="battle-question"
              className="mt-4 grid gap-2.5 sm:grid-cols-2"
            >
              {question.choices.map((choice, index) => {
                const visual = choiceVisual(battle, choice.choiceId)
                const isCorrect = visual === 'correct'
                const isWrong = visual === 'wrong'
                return (
                  <button
                    key={choice.choiceId}
                    type="button"
                    ref={index === 0 ? firstChoiceRef : undefined}
                    aria-disabled={locked || undefined}
                    aria-keyshortcuts={String(index + 1)}
                    onClick={() => choose(choice.choiceId)}
                    className={cn(CHOICE_BASE, CHOICE_STYLE[visual])}
                  >
                    <Kbd size="sm">{index + 1}</Kbd>
                    <span className="min-w-0 flex-1">{choice.content}</span>
                    {isCorrect ? (
                      <Check aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
                    ) : isWrong ? (
                      <X aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
                    ) : null}
                    {isCorrect ? <span className="nq-sr-only">Đáp án đúng</span> : null}
                    {isWrong ? <span className="nq-sr-only">Bạn đã chọn đáp án này, sai</span> : null}
                  </button>
                )
              })}
            </div>

            <div className="mt-4 flex min-h-6 items-start">
              {feedback ? (
                <p
                  role="status"
                  aria-live="polite"
                  className={cn(
                    'flex items-start gap-2 text-nq-sm leading-snug',
                    feedback.tone === 'success'
                      ? 'text-nq-success'
                      : feedback.tone === 'danger'
                        ? 'text-nq-danger'
                        : 'text-nq-warning'
                  )}
                >
                  {feedback.tone === 'success' ? (
                    <Check aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
                  ) : (
                    <X aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
                  )}
                  <span>
                    <span className="font-semibold">{feedback.title}</span>
                    <span className="mt-0.5 block text-nq-text-secondary">{feedback.detail}</span>
                  </span>
                </p>
              ) : locked ? (
                <p className="flex items-center gap-2 text-nq-sm text-nq-text-secondary">
                  <Spinner size="sm" tone="secondary" />
                  {timedOut
                    ? 'Hết giờ cho câu này. Đang chờ máy chủ chốt kết quả…'
                    : 'Đã gửi đáp án. Đang chờ máy chủ chốt kết quả…'}
                </p>
              ) : null}
            </div>

            {battle.notice ? (
              <ErrorBanner
                className="mt-4"
                tone="warning"
                title="Máy chủ báo lỗi dữ liệu"
                description={battle.notice}
              />
            ) : null}
          </Card>
        )}
      </div>

      {/* Chỉ đổi nội dung ở ngưỡng 10 / 5 / 0 giây để không đọc số mỗi giây. */}
      <p className="nq-sr-only" aria-live="polite">
        {announcement}
      </p>
    </>
  )
}
