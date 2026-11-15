/**
 * `/quiz` — tạo phòng hoặc vào phòng bằng PIN.
 *
 * Hợp đồng (docs/protocol.md §6–7):
 *   QUIZ_SET_LIST {scope:'PUBLISHED'} → QUIZ_SET_LIST_RESULT | QUIZ_SET_ERROR
 *   QUIZ_ROOM_CREATE {quizSetId, durationMinutes 1–15, hostPlays, proctoringEnabled}
 *   QUIZ_ROOM_JOIN {pin} — đúng 6 chữ số
 *   QUIZ_ERROR → câu tiếng Việt từ mapper dùng chung
 *
 * Ràng buộc server sẽ từ chối nếu vi phạm, nên UI chặn trước và giải thích:
 * - `proctoringEnabled=true` không đi cùng `hostPlays=true`.
 * - PIN phải đúng 6 chữ số; thời lượng 1–15 phút.
 *
 * Nếu người chơi đang ở trong phòng (lobby hoặc đang thi), màn hình này chuyển tiếp
 * ngay tới đúng màn hình đó thay vì hiển thị form — không có trạng thái "nửa trong phòng".
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { QuizSetSummary } from '@shared/protocol'
import { PageHeader } from '../components/shell'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorBanner,
  Input,
  Select,
  Skeleton,
  Switch
} from '../components/ui'
import { DoorOpen, Library, Plus, RefreshCw, Users } from '../components/ui/icons'
import { useConnectionStore } from '../lib/connection-store'
import { useSessionStore } from '../lib/session-store'
import { UI_ERROR, describeErrorCode } from '../lib/error-codes'
import { useServerMessage } from '../lib/hooks'
import { RESPONSE_TIMEOUT_MS, createWatchdog } from '../lib/watchdog'
import {
  QUIZ_MAX_DURATION_MINUTES,
  QUIZ_MAX_PLAYERS,
  QUIZ_MAX_PROCTORED_PLAYERS,
  QUIZ_MIN_DURATION_MINUTES,
  parseDurationMinutes,
  proctoringHostConflict,
  sanitizePinInput,
  useQuizStore,
  validateCreateRoom,
  validatePin,
  type CreateRoomErrors,
  type QuizNoticeTone
} from '../lib/quiz'

const DURATION_OPTIONS = Array.from(
  { length: QUIZ_MAX_DURATION_MINUTES - QUIZ_MIN_DURATION_MINUTES + 1 },
  (_, index) => {
    const minutes = QUIZ_MIN_DURATION_MINUTES + index
    return { value: String(minutes), label: `${minutes} phút` }
  }
)

const BANNER_TONE: Record<QuizNoticeTone, 'info' | 'success' | 'warning' | 'danger'> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'danger'
}

export function QuizRoute(): ReactNode {
  const navigate = useNavigate()
  const player = useSessionStore((state) => state.player)
  const send = useConnectionStore((state) => state.send)

  const lobby = useQuizStore((state) => state.lobby)
  const started = useQuizStore((state) => state.started)
  const battle = useQuizStore((state) => state.battle)
  const finalBoard = useQuizStore((state) => state.finalBoard)
  const notice = useQuizStore((state) => state.notice)
  const clearNotice = useQuizStore((state) => state.clearNotice)
  const rejoinPending = useQuizStore((state) => state.rejoinPending)
  const createPending = useQuizStore((state) => state.createPending)
  const joinPending = useQuizStore((state) => state.joinPending)
  const createRoom = useQuizStore((state) => state.createRoom)
  const joinRoom = useQuizStore((state) => state.joinRoom)

  const [sets, setSets] = useState<QuizSetSummary[] | null>(null)
  const [setsError, setSetsError] = useState<string | null>(null)
  const [setsLoading, setSetsLoading] = useState(true)
  const watchdog = useMemo(createWatchdog, [])

  const [quizSetId, setQuizSetId] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('3')
  const [hostPlays, setHostPlays] = useState(true)
  const [proctoringEnabled, setProctoringEnabled] = useState(false)
  const [pin, setPin] = useState('')
  const [formErrors, setFormErrors] = useState<CreateRoomErrors & { pin?: string }>({})
  const [pinError, setPinError] = useState<string | null>(null)

  const requestSets = useCallback(async () => {
    setSetsLoading(true)
    setSetsError(null)
    watchdog.clear()

    const result = await send({ type: 'QUIZ_SET_LIST', payload: { scope: 'PUBLISHED' } })
    if (!result.ok) {
      setSetsError(result.error ?? 'SEND_FAILED')
      setSetsLoading(false)
      return
    }

    // Không có timeout ở protocol: nếu máy chủ không trả lời, mở lại UI để thử lại.
    watchdog.arm(RESPONSE_TIMEOUT_MS, () => {
      setSetsError(UI_ERROR.requestTimeout)
      setSetsLoading(false)
    })
  }, [send, watchdog])

  useEffect(() => {
    void requestSets()
  }, [requestSets])

  useEffect(() => () => watchdog.clear(), [watchdog])

  useServerMessage((message) => {
    if (message.type === 'QUIZ_SET_LIST_RESULT') {
      watchdog.clear()
      const items = message.payload.items
      setSets(items)
      setSetsLoading(false)
      setQuizSetId((current) => (current === '' && items[0] ? String(items[0].id) : current))
      return
    }
    if (message.type === 'QUIZ_SET_ERROR') {
      watchdog.clear()
      setSetsError(message.payload)
      setSetsLoading(false)
    }
  })

  /* Đang ở trong phòng thì không có form nào để điền: chuyển thẳng tới đúng màn hình. */
  useEffect(() => {
    if (started && battle && battle.phase !== 'finished' && battle.phase !== 'cancelled') {
      navigate('/quiz/battle', { replace: true })
      return
    }
    if (lobby && !started) navigate('/quiz/lobby', { replace: true })
  }, [started, battle, lobby, navigate])

  if (!player) {
    return null
  }

  const selectedSet = sets?.find((item) => String(item.id) === quizSetId) ?? null
  const conflict = proctoringHostConflict(hostPlays, proctoringEnabled)
  const noPublishedSets = sets !== null && sets.length === 0
  const setsOptionList =
    sets?.map((item) => ({
      value: String(item.id),
      label: `${item.title} • ${item.level} • ${item.questionCount} câu`
    })) ?? []

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (createPending) return

    const id = quizSetId === '' ? null : Number(quizSetId)
    const errors = validateCreateRoom({
      quizSetId: Number.isFinite(id) ? id : null,
      durationMinutes,
      hostPlays,
      proctoringEnabled
    })
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return
    if (id === null) return

    const minutes = parseDurationMinutes(durationMinutes)
    if (minutes === null) return

    await createRoom({
      quizSetId: id,
      durationMinutes: minutes,
      hostPlays,
      proctoringEnabled
    })
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (joinPending) return

    const pinErrorFromValidation = validatePin(pin)
    setPinError(pinErrorFromValidation)
    if (pinErrorFromValidation) return

    await joinRoom(pin.trim())
  }

  return (
    <>
      <PageHeader
        eyebrow="Chơi"
        title="Phòng Quiz"
        subtitle="Tạo phòng mới hoặc tham gia bằng mã PIN. Điểm và thứ hạng do máy chủ tính."
        meta={
          <>
            <Badge tone="neutral" appearance="outline">
              Tối đa {QUIZ_MAX_PLAYERS} người chơi
            </Badge>
            <Badge tone="neutral" appearance="outline">
              {QUIZ_MAX_PROCTORED_PLAYERS} người khi bật giám sát camera
            </Badge>
          </>
        }
      />

      {rejoinPending ? (
        <ErrorBanner
          className="mb-4"
          tone="info"
          title="Đang khôi phục phòng Quiz"
          description="Máy chủ đang kiểm tra phòng còn hiệu lực cho tài khoản này. Nếu phòng đã kết thúc, bạn sẽ thấy thông báo ở đây."
        />
      ) : null}

      {notice ? (
        <ErrorBanner
          className="mb-4"
          tone={BANNER_TONE[notice.tone]}
          title={notice.title}
          description={notice.description}
          onDismiss={clearNotice}
        />
      ) : null}

      {finalBoard ? (
        <Card tone="default" padding="md" className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="nq-caps">Phòng vừa kết thúc</p>
              <p className="mt-1 text-nq-sm text-nq-text-secondary">
                {finalBoard.entries.length} người chơi có điểm trong bảng xếp hạng cuối cùng.
              </p>
            </div>
            <Button variant="secondary" onClick={() => navigate('/quiz/battle')}>
              Xem kết quả
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="lg">
          <CardHeader
            icon={<Plus size={18} aria-hidden="true" />}
            title="Tạo phòng"
            description="Chọn một bộ đề đã xuất bản, đặt thời lượng rồi lấy mã PIN cho lớp."
          />

          <form className="mt-5 flex flex-col gap-4" onSubmit={handleCreate} noValidate>
            {setsLoading ? (
              <div className="flex flex-col gap-2">
                <Skeleton height="0.75rem" width="40%" />
                <Skeleton height="2.4rem" rounded="md" />
              </div>
            ) : setsError ? (
              <ErrorBanner
                tone="danger"
                title={describeErrorCode(setsError).title}
                description={describeErrorCode(setsError).description}
                onRetry={() => void requestSets()}
                retryLabel="Tải lại bộ đề"
              />
            ) : sets && sets.length === 0 ? (
              <EmptyState
                size="sm"
                icon={<Library size={20} aria-hidden="true" />}
                title="Chưa có bộ đề đã xuất bản"
                description="Bộ đề do giảng viên hoặc bạn xuất bản sẽ xuất hiện ở đây để tạo phòng."
              />
            ) : (
              <Select
                id="quiz-set"
                label="Bộ đề"
                hint={
                  selectedSet
                    ? `${selectedSet.questionCount} câu • ${selectedSet.level} • ${selectedSet.ownerUsername}`
                    : 'Chỉ bộ đề đã xuất bản mới dùng được'
                }
                error={formErrors.quizSet}
                value={quizSetId}
                onChange={(event) => setQuizSetId(event.target.value)}
                options={setsOptionList}
              />
            )}

            <Select
              id="quiz-duration"
              label="Thời lượng"
              hint={`${QUIZ_MIN_DURATION_MINUTES}–${QUIZ_MAX_DURATION_MINUTES} phút; máy chủ lưu bằng giây`}
              error={formErrors.durationMinutes}
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(event.target.value)}
              options={DURATION_OPTIONS}
            />

            <div className="flex flex-col gap-3 rounded-nq-md border border-nq-border-subtle bg-nq-surface-sunken px-3.5 py-3">
              <Switch
                id="quiz-host-plays"
                label="Host cũng chơi"
                description="Tắt để host chỉ điều khiển phòng và theo dõi bảng điểm."
                checked={hostPlays}
                onCheckedChange={setHostPlays}
                disabled={proctoringEnabled}
              />
              <Switch
                id="quiz-proctoring"
                label="Giám sát camera"
                description="Phòng giám sát chỉ cho host điều khiển, không chơi. Camera lỗi không chặn việc bắt đầu."
                checked={proctoringEnabled}
                onCheckedChange={(next) => {
                  setProctoringEnabled(next)
                  if (next) setHostPlays(false)
                }}
              />
            </div>

            {conflict ? (
              <p role="alert" className="text-nq-xs leading-snug text-nq-danger">
                {conflict}
              </p>
            ) : null}

            <Button
              type="submit"
              size="lg"
              fullWidth
              leftIcon={<DoorOpen size={18} />}
              loading={createPending}
              disabled={
                createPending ||
                setsLoading ||
                Boolean(setsError) ||
                Boolean(conflict) ||
                noPublishedSets
              }
            >
              Tạo phòng
            </Button>
          </form>
        </Card>

        <Card padding="lg">
          <CardHeader
            icon={<DoorOpen size={18} aria-hidden="true" />}
            title="Vào bằng PIN"
            description="Nhập mã 6 chữ số chủ phòng chia sẻ."
          />

          <form className="mt-5 flex flex-col gap-4" onSubmit={handleJoin} noValidate>
            <Input
              id="quiz-pin"
              name="pin"
              label="Mã PIN"
              hint="6 chữ số, chỉ nhận ký tự số"
              error={pinError}
              value={pin}
              onChange={(event) => {
                setPin(sanitizePinInput(event.target.value))
                if (pinError) setPinError(null)
              }}
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              mono
              placeholder="••••••"
            />

            <Button
              type="submit"
              size="lg"
              fullWidth
              leftIcon={<Users size={18} />}
              loading={joinPending}
              disabled={joinPending || pin.trim().length !== 6}
            >
              Vào phòng
            </Button>

            <p className="nq-pretty text-nq-xs leading-normal text-nq-text-tertiary">
              Phòng đã bắt đầu thì không nhận người vào mới; nếu hết giờ hoặc bị hủy, PIN sẽ
              không còn hiệu lực.
            </p>
          </form>

          <div className="mt-5 border-t border-nq-border-subtle pt-4">
            <div className="flex items-center justify-between gap-2">
              <p className="nq-caps">Bộ đề công khai</p>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<RefreshCw size={14} />}
                onClick={() => void requestSets()}
                disabled={setsLoading}
              >
                Làm mới
              </Button>
            </div>
            <p className="mt-1 text-nq-xs text-nq-text-tertiary">
              {setsLoading
                ? 'Đang tải danh sách…'
                : sets
                  ? `${sets.length} bộ đề đã xuất bản`
                  : 'Chưa tải được danh sách'}
            </p>
          </div>
        </Card>
      </div>
    </>
  )
}
