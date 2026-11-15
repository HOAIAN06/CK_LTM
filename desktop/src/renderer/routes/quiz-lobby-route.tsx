/**
 * `/quiz/lobby` — sảnh chờ của Quiz Room.
 *
 * Nguồn dữ liệu: `QUIZ_ROOM_CREATED` / `QUIZ_LOBBY_UPDATE` / `QUIZ_REJOINED` → `lobby`
 * trong store; `QUIZ_ROOM_START` → `/quiz/battle`.
 *
 * Bất biến (D-002/D-005): host chỉ cần ≥ 2 người chơi **đang kết nối**; trạng thái camera
 * không bao giờ chặn nút bắt đầu, và UI nói rõ điều đó khi có camera lỗi.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/shell'
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  Dialog,
  ErrorBanner
} from '../components/ui'
import { Check, Copy, DoorOpen, Play, ShieldCheck, Users, X } from '../components/ui/icons'
import { useSessionStore } from '../lib/session-store'
import {
  cameraIssues,
  cameraLabel,
  cameraTone,
  canHostStart,
  connectedPlayerCount,
  lobbyStatusText,
  useQuizStore,
  type CameraTone,
  type QuizNoticeTone
} from '../lib/quiz'
import { useServerMessage } from '../lib/hooks'
import { ProctorLobbyPanel } from '../features/proctor'

const BANNER_TONE: Record<QuizNoticeTone, 'info' | 'success' | 'warning' | 'danger'> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'danger'
}

const CHIP_TONE: Record<CameraTone, 'success' | 'warning' | 'danger' | 'neutral'> = {
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  neutral: 'neutral'
}

export function QuizLobbyRoute(): ReactNode {
  const navigate = useNavigate()
  const player = useSessionStore((state) => state.player)

  const lobby = useQuizStore((state) => state.lobby)
  const started = useQuizStore((state) => state.started)
  const startPending = useQuizStore((state) => state.startPending)
  const notice = useQuizStore((state) => state.notice)
  const startRoom = useQuizStore((state) => state.startRoom)
  const leaveRoom = useQuizStore((state) => state.leaveRoom)
  const cancelRoom = useQuizStore((state) => state.cancelRoom)
  const clearNotice = useQuizStore((state) => state.clearNotice)

  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  /* Host bấm bắt đầu (hoặc reconnect vào phòng đang chạy) → vào màn thi. */
  useEffect(() => {
    if (started) navigate('/quiz/battle')
  }, [started, navigate])

  /* `QUIZ_ROOM_CANCEL` xoá lobby; thông báo nằm trong store và hiện ở `/quiz`. */
  useServerMessage(() => undefined)

  if (!lobby) {
    return <Navigate to="/quiz" replace />
  }

  const isHost = lobby.currentUserHost
  const capacityLabel = lobby.proctoringEnabled ? '/6' : '/20'
  const startEnabled = canHostStart(lobby, startPending)
  const connected = connectedPlayerCount(lobby.members)
  const issues = cameraIssues(lobby)

  async function handleCopyPin(): Promise<void> {
    if (!lobby) return
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(lobby.pin)
        setCopied(true)
        setCopyFailed(false)
        window.setTimeout(() => setCopied(false), 1_500)
        return
      }
    } catch {
      // Rơi xuống hướng dẫn sao chép thủ công (quyền clipboard có thể bị từ chối).
    }
    setCopyFailed(true)
  }

  async function handleLeave(): Promise<void> {
    if (isHost) {
      await cancelRoom()
    } else {
      await leaveRoom()
    }
    navigate('/quiz', { replace: true })
  }

  return (
    <>
      <PageHeader
        eyebrow="Phòng Quiz · Sảnh chờ"
        title={lobby.title}
        subtitle={`PIN ${lobby.pin} · ${lobby.playerCount}${capacityLabel} người chơi · ${
          lobby.proctoringEnabled ? 'có giám sát camera' : 'không giám sát camera'
        }`}
        meta={
          <>
            <Badge tone="neutral" appearance="outline">
              Host: {lobby.hostUsername}
            </Badge>
            <Badge tone={isHost ? 'primary' : 'neutral'} appearance="soft">
              {isHost ? 'Bạn là host' : 'Bạn là người chơi'}
            </Badge>
            {lobby.started ? (
              <Badge tone="warning" appearance="soft" dot>
                Phòng đã bắt đầu
              </Badge>
            ) : null}
          </>
        }
        actions={
          <>
            {isHost ? (
              <Button
                leftIcon={<Play size={16} />}
                onClick={() => void startRoom()}
                disabled={!startEnabled}
                loading={startPending}
              >
                Bắt đầu phòng
              </Button>
            ) : null}
            <Button
              variant="secondary"
              onClick={() => {
                if (isHost) setConfirmCancel(true)
                else void handleLeave()
              }}
            >
              {isHost ? 'Hủy phòng' : 'Rời phòng'}
            </Button>
          </>
        }
      />

      {notice ? (
        <ErrorBanner
          className="mb-4"
          tone={BANNER_TONE[notice.tone]}
          title={notice.title}
          description={notice.description}
          onDismiss={clearNotice}
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Card tone="sunken" padding="md">
            <p className="nq-caps">Mã PIN phòng</p>
            <p className="nq-tabular nq-selectable mt-1 font-mono text-nq-4xl font-semibold tracking-[0.24em] text-nq-text">
              {lobby.pin}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={copied ? <Check size={14} /> : <Copy size={14} />}
                onClick={() => void handleCopyPin()}
              >
                {copied ? 'Đã sao chép' : 'Sao chép PIN'}
              </Button>
              <span className="text-nq-xs text-nq-text-tertiary" aria-live="polite">
                {connected}/{lobby.playerCount} người chơi đang kết nối
              </span>
            </div>
            {copyFailed ? (
              <p className="mt-2 text-nq-xs leading-snug text-nq-warning">
                Không sao chép được vào clipboard. Hãy bôi đen mã PIN ở trên và sao chép thủ công.
              </p>
            ) : null}
          </Card>

          <Card padding="md">
            <h2 className="nq-display text-nq-lg text-nq-text">Bắt đầu phòng</h2>
            <p className="nq-pretty mt-1.5 text-nq-sm leading-normal text-nq-text-secondary">
              {lobbyStatusText(lobby, startPending)}
            </p>
            <ul className="mt-3 flex flex-col gap-1.5 text-nq-xs text-nq-text-tertiary">
              <li>· Cần ít nhất 2 người chơi đang kết nối.</li>
              <li>· Camera không phải điều kiện bắt đầu.</li>
              <li>· Host không chơi vẫn tính là người điều khiển phòng.</li>
            </ul>
            {!isHost ? (
              <p className="mt-3 text-nq-xs text-nq-text-tertiary">
                Chỉ host mới bắt đầu được; bạn sẽ vào màn thi ngay khi host bấm bắt đầu.
              </p>
            ) : null}
          </Card>

          {lobby.proctoringEnabled ? (
            <Card padding="md">
              <CardHeader
                icon={<ShieldCheck size={18} aria-hidden="true" />}
                title="Giám sát camera"
                description="Phòng này bật giám sát camera. Không thu microphone; cảnh báo có thể được lưu trên máy host."
              />
              {issues.length > 0 ? (
                <div className="mt-3 rounded-nq-md border border-nq-warning-border bg-nq-warning-soft px-3 py-2">
                  <p className="text-nq-xs font-semibold text-nq-warning">
                    Camera chưa sẵn sàng ở {issues.length} người chơi
                  </p>
                  <ul className="mt-1 flex flex-col gap-0.5 text-nq-xs text-nq-text-secondary">
                    {issues.map((issue) => (
                      <li key={issue.username}>
                        {issue.username}: {issue.label}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1.5 text-nq-xs font-medium text-nq-text-secondary">
                    Đây chỉ là cảnh báo — host vẫn bắt đầu phòng được (D-002).
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-nq-xs text-nq-text-tertiary">
                  Chưa có cảnh báo camera nào. Trạng thái camera chỉ để tham khảo.
                </p>
              )}
              {/* Camera/proctoring: consent của người chơi, hoặc lối vào bảng giám sát của host. */}
              <div data-nq-proctor-slot="lobby" aria-label="Khu vực camera giám sát" className="mt-3">
                <ProctorLobbyPanel lobby={lobby} />
              </div>
            </Card>
          ) : null}
        </div>

        <Card padding="none">
          <div className="p-5 pb-0">
            <CardHeader
              icon={<Users size={18} aria-hidden="true" />}
              title={`Thành viên (${lobby.members.length})`}
              description="Trạng thái camera của người khác chỉ hiển thị với host hoặc chính người đó."
            />
          </div>

          <ul className="mt-4 flex flex-col border-t border-nq-border-subtle">
            {lobby.members.map((member) => {
              const label = cameraLabel(member.cameraStatus)
              const isMe = player?.id === member.userId
              return (
                <li
                  key={member.userId}
                  className="flex flex-wrap items-center gap-3 border-b border-nq-border-subtle px-5 py-3 last:border-b-0"
                >
                  <Avatar
                    name={member.username}
                    size="sm"
                    status={member.connected ? 'online' : 'offline'}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-nq-sm font-semibold text-nq-text">
                        {member.username}
                      </span>
                      {isMe ? (
                        <span className="text-nq-2xs text-nq-text-tertiary">(bạn)</span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      {member.host ? (
                        <Badge tone="primary" appearance="soft">
                          HOST
                        </Badge>
                      ) : null}
                      <Badge tone="neutral" appearance="soft">
                        {member.playing ? 'Người chơi' : 'Điều khiển'}
                      </Badge>
                      <Badge
                        tone={member.connected ? 'success' : 'danger'}
                        appearance="outline"
                        dot
                      >
                        {member.connected ? 'Trực tuyến' : 'Mất kết nối'}
                      </Badge>
                      {lobby.proctoringEnabled && label ? (
                        <Badge tone={CHIP_TONE[cameraTone(member.cameraStatus)]} appearance="soft">
                          {label}
                        </Badge>
                      ) : null}
                      {member.warningCount > 0 ? (
                        <Badge tone="warning" appearance="soft">
                          {member.warningCount} cảnh báo
                        </Badge>
                      ) : null}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>

          {lobby.members.length <= 1 ? (
            <p className="px-5 py-4 text-nq-xs text-nq-text-tertiary">
              Đang chờ người chơi khác tham gia bằng mã PIN {lobby.pin}.
            </p>
          ) : null}

          <div className="mx-5 mt-4 mb-5 border-t border-nq-border-subtle pt-4">
            <p className="flex items-start gap-1.5 text-nq-xs leading-snug text-nq-text-tertiary">
              <DoorOpen aria-hidden="true" size={14} className="mt-px shrink-0" />
              Host rời phòng sẽ hủy phòng với tất cả thành viên; người chơi thường rời phòng chỉ
              bị đánh dấu là đã rời.
            </p>
          </div>
        </Card>
      </div>

      <Dialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        closeOnScrimClick={false}
        title="Hủy phòng Quiz?"
        description="Toàn bộ thành viên sẽ nhận thông báo phòng đã đóng và không thể quay lại phòng này."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
              <X aria-hidden="true" size={15} />
              Ở lại
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmCancel(false)
                void handleLeave()
              }}
            >
              Hủy phòng
            </Button>
          </>
        }
      />
    </>
  )
}
