/**
 * Khối proctoring trong sảnh chờ Quiz Room.
 *
 * Luật D-002/D-005: camera **không** phải điều kiện để vào phòng hay bắt đầu. Vì vậy khối này
 * chỉ là lời mời (consent) + cảnh báo; không có nút nào bị disable vì camera.
 *
 * Host: chỉ hiện lối vào bảng giám sát khi phòng bật proctoring và host không chơi
 * (`proctoringEnabled && !hostPlays` — cấu hình duy nhất server cho phép).
 */
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { QuizLobbyData } from '@shared/protocol'
import { Badge, Button, Card, CardHeader, ErrorBanner } from '../../components/ui'
import { Camera, Monitor, ShieldCheck } from '../../components/ui/icons'
import { CAMERA_STATUS_LABEL } from './camera-status'
import { CameraPreview } from './camera-preview'
import { useProctorStore } from './proctor-store'

export interface ProctorLobbyPanelProps {
  lobby: QuizLobbyData
}

export function ProctorLobbyPanel({ lobby }: ProctorLobbyPanelProps): ReactNode {
  const navigate = useNavigate()
  const consent = useProctorStore((state) => state.consent)
  const cameraStatus = useProctorStore((state) => state.cameraStatus)
  const publisher = useProctorStore((state) => state.publisher)
  const decideConsent = useProctorStore((state) => state.decideConsent)
  const reportCamera = useProctorStore((state) => state.reportCamera)
  const noteTrackIssue = useProctorStore((state) => state.noteTrackIssue)
  const publishFrame = useProctorStore((state) => state.publishFrame)

  if (!lobby.proctoringEnabled) return null

  const isHost = lobby.currentUserHost

  if (isHost) {
    if (lobby.hostPlays) {
      // Protocol không cho phép host vừa chơi vừa giám sát; nói rõ thay vì hiện nút hỏng.
      return (
        <Card padding="md">
          <CardHeader
            icon={<ShieldCheck size={18} aria-hidden="true" />}
            title="Giám sát camera"
            description="Phòng bật giám sát nhưng bạn đang chơi nên không mở được bảng giám sát."
          />
        </Card>
      )
    }
    return (
      <Card padding="md">
        <CardHeader
          icon={<Monitor size={18} aria-hidden="true" />}
          title="Bảng giám sát"
          description="Xem camera trực tiếp, trạng thái và cảnh báo của tối đa 6 người chơi."
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            leftIcon={<Monitor size={15} aria-hidden="true" />}
            onClick={() => navigate(`/proctor/${lobby.pin}`)}
          >
            Mở bảng giám sát
          </Button>
          <span className="text-nq-xs text-nq-text-tertiary">
            Bảng mở được cả trước khi phòng bắt đầu; hình ảnh chỉ có sau khi phòng chạy.
          </span>
        </div>
      </Card>
    )
  }

  if (consent === 'pending') {
    return (
      <Card padding="md" accent="primary">
        <CardHeader
          icon={<Camera size={18} aria-hidden="true" />}
          title="Bật camera để host giám sát"
          description="Hình ảnh được truyền trực tiếp trong mạng LAN tới host của phòng. Không thu microphone; cảnh báo có thể được lưu trên máy host."
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button leftIcon={<Camera size={15} aria-hidden="true" />} onClick={() => decideConsent('granted')}>
            Bật camera
          </Button>
          <Button variant="secondary" onClick={() => decideConsent('declined')}>
            Tiếp tục không camera
          </Button>
        </div>
        <p className="mt-2 text-nq-xs leading-snug text-nq-text-tertiary">
          Bạn vẫn vào phòng và thi bình thường nếu không bật camera. Host sẽ thấy bạn là “không có
          camera” và vẫn bắt đầu phòng được.
        </p>
      </Card>
    )
  }

  if (consent === 'declined') {
    return (
      <div className="flex flex-col gap-2">
        <ErrorBanner
          tone="warning"
          title="Bạn đang thi không camera"
          description="Host thấy trạng thái camera là từ chối. Đây chỉ là cảnh báo — bạn vẫn vào phòng, trả lời và nhận điểm bình thường."
          onRetry={() => decideConsent('granted')}
          retryLabel="Bật lại camera"
        />
        <p className="text-nq-xs text-nq-text-tertiary">
          Trạng thái đã gửi: {CAMERA_STATUS_LABEL[cameraStatus]}
        </p>
      </div>
    )
  }

  return (
    <Card padding="md">
      <div className="flex items-start justify-between gap-3">
        <CardHeader
          icon={<Camera size={18} aria-hidden="true" />}
          title="Camera giám sát"
          description="Preview chỉ hiển thị trên máy bạn; frame JPEG được gửi tới host trong LAN."
        />
        <Badge tone={cameraStatus === 'READY' ? 'success' : 'warning'} appearance="soft" dot>
          {CAMERA_STATUS_LABEL[cameraStatus]}
        </Badge>
      </div>
      <div className="mt-3">
        <CameraPreview
          enabled
          publishing={publisher.state === 'live'}
          onStatusChange={(status, error) => {
            reportCamera(status, error?.message ?? null)
          }}
          onTrackIssue={noteTrackIssue}
          publish={publishFrame}
        />
      </div>
      {publisher.state === 'error' && publisher.message !== null ? (
        <p className="mt-2 text-nq-xs text-nq-warning">{publisher.message}</p>
      ) : null}
      {publisher.state === 'idle' && publisher.message !== null ? (
        <p className="mt-2 text-nq-xs text-nq-text-tertiary">{publisher.message}</p>
      ) : null}
    </Card>
  )
}
