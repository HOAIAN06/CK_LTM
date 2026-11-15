/**
 * Khối proctoring trong màn thi Quiz Room.
 *
 * Người chơi: preview thu nhỏ + cảnh báo (không bao giờ che câu hỏi, không chặn phím 1–4).
 * Host: lối vào bảng giám sát `/proctor/:pin` — chỉ khi phòng bật proctoring và host không chơi.
 */
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { QuizRoomStarted } from '@shared/protocol'
import { Badge, Button } from '../../components/ui'
import { Camera, Monitor, ShieldCheck } from '../../components/ui/icons'
import { CAMERA_STATUS_LABEL } from './camera-status'
import { CameraPreview } from './camera-preview'
import { useProctorStore } from './proctor-store'

export interface ProctorBattlePanelProps {
  started: QuizRoomStarted
}

export function ProctorBattlePanel({ started }: ProctorBattlePanelProps): ReactNode {
  const navigate = useNavigate()
  const consent = useProctorStore((state) => state.consent)
  const cameraStatus = useProctorStore((state) => state.cameraStatus)
  const publisher = useProctorStore((state) => state.publisher)
  const decideConsent = useProctorStore((state) => state.decideConsent)
  const reportCamera = useProctorStore((state) => state.reportCamera)
  const noteTrackIssue = useProctorStore((state) => state.noteTrackIssue)
  const publishFrame = useProctorStore((state) => state.publishFrame)

  if (!started.proctoringEnabled) return null

  if (started.host) {
    if (started.playing) {
      return (
        <p className="text-nq-xs text-nq-text-tertiary">
          <ShieldCheck aria-hidden="true" size={14} className="mr-1 inline-block align-[-2px]" />
          Phòng bật giám sát; host đang chơi nên không mở bảng giám sát.
        </p>
      )
    }
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<Monitor size={15} aria-hidden="true" />}
          onClick={() => navigate(`/proctor/${started.pin}`)}
        >
          Mở bảng giám sát
        </Button>
        <span className="text-nq-xs text-nq-text-tertiary">
          Camera người chơi chỉ có sau khi phòng chạy và họ bật camera.
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-start gap-3">
      <CameraPreview
        enabled={consent === 'granted'}
        publishing={publisher.state === 'live'}
        defaultMinimized
        showWarning={false}
        onStatusChange={(status, error) => {
          reportCamera(status, error?.message ?? null)
        }}
        onTrackIssue={noteTrackIssue}
        publish={publishFrame}
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={cameraStatus === 'READY' ? 'success' : 'neutral'} appearance="soft" dot>
            <Camera aria-hidden="true" size={12} />
            <span className="ml-1">{CAMERA_STATUS_LABEL[cameraStatus]}</span>
          </Badge>
          {consent === 'declined' ? (
            <Badge tone="warning" appearance="soft">
              Đang thi không camera
            </Badge>
          ) : null}
        </div>

        {consent === 'pending' ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => decideConsent('granted')}>
              Bật camera
            </Button>
            <Button size="sm" variant="ghost" onClick={() => decideConsent('declined')}>
              Tiếp tục không camera
            </Button>
          </div>
        ) : null}

        {consent === 'declined' ? (
          <p className="mt-2 text-nq-xs leading-snug text-nq-warning">
            Host thấy bạn là “không có camera”. Đây chỉ là cảnh báo: bạn vẫn trả lời và nhận điểm
            bình thường.{' '}
            <button
              type="button"
              className="nq-focusable font-semibold underline"
              onClick={() => decideConsent('granted')}
            >
              Bật lại camera
            </button>
          </p>
        ) : null}

        {publisher.state === 'error' && publisher.message !== null ? (
          <p className="mt-2 text-nq-xs leading-snug text-nq-warning">{publisher.message}</p>
        ) : null}

        {consent === 'granted' && publisher.state === 'idle' && publisher.message !== null ? (
          <p className="mt-2 text-nq-xs leading-snug text-nq-text-tertiary">{publisher.message}</p>
        ) : null}
      </div>
    </div>
  )
}
