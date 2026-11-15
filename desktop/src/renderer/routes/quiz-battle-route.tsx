/**
 * `/quiz/battle` — màn thi của Quiz Room.
 *
 * Message được xử lý ở `useQuizStore` (kênh luôn mở vì `QUIZ_REJOINED` có thể tới ngay
 * sau `LOGIN_OK`): `QUIZ_QUESTION`, `QUIZ_ANSWER_RESULT`, `QUIZ_LEADERBOARD`,
 * `QUIZ_ROOM_FINISHED`, `QUIZ_ROOM_CANCEL`.
 *
 * Server authority:
 * - Điểm mỗi câu (500–1000 theo thời gian còn lại), đáp án đúng và thứ hạng đều do máy
 *   chủ gửi; client không tính lại.
 * - Countdown chỉ hiển thị: về 0 thì khoá lựa chọn và chờ `QUIZ_ANSWER_RESULT`.
 */
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/shell'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CircularTimer,
  ErrorBanner,
  Kbd,
  Spinner,
  cn
} from '../components/ui'
import { Check, Clock, LogOut, ShieldCheck, Trophy, Users, X } from '../components/ui/icons'
import { useSessionStore } from '../lib/session-store'
import { useNow } from '../lib/timers'
import { ProctorBattlePanel } from '../features/proctor'
import {
  formatClock,
  isQuizInputLocked,
  myLeaderboardEntry,
  quizChoiceVisual,
  quizCountdownAnnouncement,
  quizQuestionRemainingSeconds,
  quizRoomRemainingSeconds,
  useQuizStore,
  type ChoiceVisual,
  type QuizBattleState,
  type QuizLeaderboardData
} from '../lib/quiz'

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

function feedbackFor(battle: QuizBattleState): {
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
      detail: 'Máy chủ xử lý như không trả lời (0 điểm). Đáp án đúng đã được đánh dấu.'
    }
  }
  if (outcome.correct) {
    return {
      tone: 'success',
      title: 'Chính xác',
      detail: `Máy chủ cộng ${outcome.scoreAwarded} điểm cho câu này (500–1000 theo thời gian còn lại).`
    }
  }
  return {
    tone: 'danger',
    title: 'Chưa đúng',
    detail: 'Máy chủ không cộng điểm cho câu này. Đáp án đúng đã được đánh dấu.'
  }
}

function LeaderboardPanel({
  board,
  myUserId
}: {
  board: QuizLeaderboardData | null
  myUserId: number | null
}): ReactNode {
  return (
    <Card padding="none" className="h-fit">
      <div className="p-4 pb-0">
        <CardHeader
          icon={<Trophy size={18} aria-hidden="true" />}
          title="Bảng xếp hạng"
          description="Máy chủ xếp theo điểm, rồi số câu đúng, rồi tên."
        />
      </div>
      {board && board.entries.length > 0 ? (
        <ol className="mt-3 flex flex-col border-t border-nq-border-subtle">
          {board.entries.map((entry) => {
            const isMe = myUserId !== null && entry.userId === myUserId
            return (
              <li
                key={entry.userId}
                className={cn(
                  'flex items-center gap-2.5 border-b border-nq-border-subtle px-4 py-2.5 last:border-b-0',
                  isMe && 'bg-nq-primary-soft'
                )}
              >
                <span className="nq-tabular w-7 shrink-0 text-nq-xs font-semibold text-nq-text-tertiary">
                  #{entry.rank}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'truncate text-nq-sm',
                        isMe ? 'font-semibold text-nq-text' : 'text-nq-text-secondary'
                      )}
                    >
                      {entry.username}
                    </span>
                    {!entry.connected ? (
                      <span className="text-nq-2xs text-nq-danger">mất kết nối</span>
                    ) : null}
                  </span>
                  <span className="nq-tabular block text-nq-2xs text-nq-text-tertiary">
                    {entry.correctAnswers} câu đúng
                  </span>
                </span>
                <span className="nq-tabular shrink-0 text-nq-sm font-semibold text-nq-text">
                  {entry.score}
                </span>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="px-4 py-4 text-nq-xs text-nq-text-tertiary">
          Chưa có điểm nào — bảng sẽ cập nhật sau mỗi câu trả lời.
        </p>
      )}
    </Card>
  )
}

export function QuizBattleRoute(): ReactNode {
  const navigate = useNavigate()
  const player = useSessionStore((state) => state.player)

  const started = useQuizStore((state) => state.started)
  const battle = useQuizStore((state) => state.battle)
  const leaderboard = useQuizStore((state) => state.leaderboard)
  const finalBoard = useQuizStore((state) => state.finalBoard)
  const notice = useQuizStore((state) => state.notice)
  const choose = useQuizStore((state) => state.choose)
  const noteTimeout = useQuizStore((state) => state.noteTimeout)
  const leaveRoom = useQuizStore((state) => state.leaveRoom)
  const cancelRoom = useQuizStore((state) => state.cancelRoom)
  const resetQuiz = useQuizStore((state) => state.resetQuiz)
  const clearNotice = useQuizStore((state) => state.clearNotice)

  const playing = started?.playing ?? false
  const live = battle !== null && battle.phase !== 'finished' && battle.phase !== 'cancelled'
  const now = useNow(250, live && playing)
  const attempt = battle?.attempt ?? 0
  const firstChoiceRef = useRef<HTMLButtonElement | null>(null)
  /** Đang chủ động rời màn hình: guard không được kéo người dùng về `/quiz`. */
  const leavingRef = useRef(false)

  /** Câu mới → focus lựa chọn đầu tiên để phím 1–4 / Enter dùng được ngay. */
  useEffect(() => {
    if (!playing || attempt === 0) return
    firstChoiceRef.current?.focus()
  }, [attempt, playing])

  /* Countdown cục bộ về 0 → khoá lựa chọn; kết quả vẫn do server gửi. */
  useEffect(() => {
    if (!battle || battle.phase !== 'question') return
    if (quizQuestionRemainingSeconds(battle, now) > 0) return
    noteTimeout(now)
  }, [battle, now, noteTimeout])

  /* Phím 1–4 chọn đáp án; Enter/Space vẫn hoạt động vì phần tử là <button>. */
  useEffect(() => {
    if (!playing || !battle || battle.phase !== 'question') return
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
  }, [battle, choose, playing])

  const announcement = useMemo(() => quizCountdownAnnouncement(battle, now), [battle, now])

  if (!started || !battle) {
    return leavingRef.current ? null : <Navigate to="/quiz" replace />
  }

  const finished = battle.phase === 'finished'
  const me = myLeaderboardEntry(leaderboard ?? finalBoard, player?.id ?? null)
  const myScore = me?.score ?? battle.totalScore
  const question = battle.question
  const locked = isQuizInputLocked(battle)
  const remaining = quizQuestionRemainingSeconds(battle, now)
  const roomLeft = quizRoomRemainingSeconds(battle, now)
  const feedback = feedbackFor(battle)
  const board = finalBoard ?? leaderboard

  const goHome = (): void => {
    leavingRef.current = true
    resetQuiz()
    navigate('/', { replace: true })
  }

  const leave = async (): Promise<void> => {
    leavingRef.current = true
    if (started.host) await cancelRoom()
    else await leaveRoom()
    navigate('/quiz', { replace: true })
  }

  const scoreLine = `Bạn ${me ? `đang hạng ${me.rank} với ${myScore} điểm` : `có ${myScore} điểm`}.`

  return (
    <>
      <PageHeader
        size="compact"
        eyebrow={finished ? 'Phòng Quiz · Đã kết thúc' : 'Phòng Quiz · Đang thi'}
        title={started.title}
        subtitle={`PIN ${started.pin}`}
        meta={
          <>
            <Badge tone="neutral" appearance="outline">
              <Clock aria-hidden="true" size={12} />
              <span className="nq-tabular ml-1">Còn {formatClock(roomLeft)}</span>
            </Badge>
            {playing ? (
              <Badge tone="primary" appearance="soft">
                <span className="nq-tabular">{myScore} điểm</span>
              </Badge>
            ) : null}
            {me ? (
              <Badge tone="neutral" appearance="soft">
                Hạng #{me.rank}
              </Badge>
            ) : null}
            {!playing ? (
              <Badge tone="info" appearance="soft">
                Bạn đang điều khiển phòng
              </Badge>
            ) : null}
          </>
        }
        actions={
          finished ? undefined : (
            <Button variant="secondary" leftIcon={<LogOut size={15} />} onClick={() => void leave()}>
              {started.host ? 'Hủy phòng' : 'Rời phòng'}
            </Button>
          )
        }
      />

      {notice ? (
        <ErrorBanner
          className="mb-4"
          tone={notice.tone === 'danger' ? 'danger' : notice.tone === 'warning' ? 'warning' : 'info'}
          title={notice.title}
          description={notice.description}
          onDismiss={clearNotice}
        />
      ) : null}

      {started.proctoringEnabled ? (
        <Card padding="md" className="mb-4">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-nq-md bg-nq-info-soft text-nq-info"
            >
              <ShieldCheck size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-nq-sm font-semibold text-nq-text">Phòng có giám sát camera</p>
              <p className="nq-pretty mt-0.5 text-nq-xs leading-normal text-nq-text-secondary">
                Cảnh báo camera không chặn việc trả lời và không làm thay đổi điểm của bạn.
              </p>
              {/* Preview thu nhỏ của người chơi, hoặc lối vào bảng giám sát của host. */}
              <div data-nq-proctor-slot="battle" aria-label="Khu vực camera giám sát" className="mt-2">
                <ProctorBattlePanel started={started} />
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          {finished ? (
            <Card padding="lg" accent="primary">
              <div className="flex flex-col items-center gap-2 text-center">
                <span
                  aria-hidden="true"
                  className="grid size-12 place-items-center rounded-nq-full bg-nq-primary-soft text-nq-primary-soft-text"
                >
                  <Trophy size={24} />
                </span>
                <p className="nq-caps">Kết quả phòng</p>
                <h2 className="nq-display nq-balance text-nq-3xl text-nq-text">Phòng đã kết thúc</h2>
                <p className="nq-pretty max-w-[52ch] text-nq-sm leading-normal text-nq-text-secondary">
                  {!playing
                    ? 'Bạn là host của phòng này nên không có điểm cá nhân. Bảng xếp hạng cuối cùng ở bên cạnh do máy chủ chốt.'
                    : me
                      ? `Bạn đứng hạng ${me.rank} với ${myScore} điểm và ${me.correctAnswers} câu đúng. Thứ hạng cuối cùng do máy chủ chốt.`
                      : 'Máy chủ không ghi nhận điểm của bạn trong phòng này. Bảng xếp hạng cuối cùng ở bên cạnh do máy chủ chốt.'}
                </p>
              </div>
              <div className="mt-5 flex justify-center">
                <Button size="lg" onClick={goHome}>
                  Về trang chủ
                </Button>
              </div>
            </Card>
          ) : !playing ? (
            <Card padding="lg">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="grid size-10 shrink-0 place-items-center rounded-nq-md bg-nq-primary-soft text-nq-primary-soft-text"
                >
                  <Users size={20} />
                </span>
                <div className="min-w-0">
                  <h2 className="nq-display text-nq-xl text-nq-text">Chế độ điều khiển phòng</h2>
                  <p className="nq-pretty mt-1 text-nq-sm leading-normal text-nq-text-secondary">
                    Host không chơi trong phòng này. Bảng xếp hạng bên cạnh cập nhật sau mỗi câu
                    trả lời của người chơi.
                  </p>
                </div>
              </div>
            </Card>
          ) : battle.phase === 'waiting' || !question ? (
            <Card padding="lg">
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <Spinner size="lg" tone="primary" />
                <p className="text-nq-sm text-nq-text-secondary">
                  Đang chờ câu hỏi đầu tiên từ máy chủ…
                </p>
              </div>
            </Card>
          ) : (
            <Card padding="lg">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="nq-caps">Câu {battle.attempt}</p>
                  <h2
                    id="quiz-question"
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
                đúng/sai, điểm và thời hạn.
              </p>

              <div
                role="group"
                aria-labelledby="quiz-question"
                className="mt-4 grid gap-2.5 sm:grid-cols-2"
              >
                {question.choices.map((choice, index) => {
                  const visual = quizChoiceVisual(battle, choice.choiceId)
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
                      {isWrong ? (
                        <span className="nq-sr-only">Bạn đã chọn đáp án này, sai</span>
                      ) : null}
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
                    {battle.timedOut
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

        <div className="flex flex-col gap-4">
          <LeaderboardPanel board={board} myUserId={player?.id ?? null} />
          <p className="nq-sr-only" aria-live="polite" aria-atomic="true">
            {scoreLine}
          </p>
        </div>
      </div>

      {/* Chỉ đổi nội dung ở ngưỡng 10 / 5 / 0 giây. */}
      <p className="nq-sr-only" aria-live="polite">
        {announcement}
      </p>
    </>
  )
}
