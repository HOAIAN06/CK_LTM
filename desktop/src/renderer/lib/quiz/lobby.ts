/**
 * Luật hiển thị và kiểm tra của lobby Quiz Room — bản desktop của `QuizRoomUi.java`.
 *
 * Hai bất biến nghiệp vụ (D-002/D-005) được mã hoá ở đây:
 * 1. Bắt đầu phòng **không** phụ thuộc trạng thái camera; camera chỉ là cảnh báo.
 * 2. `proctoringEnabled=true` không đi cùng `hostPlays=true` (server trả
 *    `PROCTORING_HOST_CANNOT_PLAY`), nên UI phải chặn trước và giải thích.
 */
import type { CameraStatus, QuizLobbyData, QuizLobbyPlayer } from '@shared/protocol'
import type { QuizNotice } from './types'
import { QUIZ_MAX_DURATION_MINUTES, QUIZ_MIN_DURATION_MINUTES, QUIZ_PIN_LENGTH } from './types'

export function connectedPlayerCount(
  members: ReadonlyArray<QuizLobbyPlayer> | null | undefined
): number {
  if (!members) return 0
  return members.filter((member) => member.playing && member.connected).length
}

/** Host chỉ bắt đầu được khi có ≥ 2 người chơi đang kết nối và không có lệnh đang chờ. */
export function canHostStart(lobby: QuizLobbyData | null, startPending: boolean): boolean {
  if (!lobby) return false
  if (!lobby.currentUserHost || startPending) return false
  return connectedPlayerCount(lobby.members) >= 2
}

export function isCameraProblem(status: CameraStatus | null | undefined): boolean {
  return (
    status === 'DENIED' ||
    status === 'NOT_FOUND' ||
    status === 'FAILED' ||
    status === 'LOST' ||
    status === 'BLOCKED' ||
    status === 'STOPPED'
  )
}

/** Nhãn tiếng Việt cho chip camera; `null` khi trạng thái không cần hiển thị. */
export function cameraLabel(status: CameraStatus | null | undefined): string | null {
  switch (status) {
    case 'READY':
      return 'Camera sẵn sàng'
    case 'INITIALIZING':
      return 'Camera đang mở'
    case 'DENIED':
      return 'Từ chối camera'
    case 'NOT_FOUND':
      return 'Không tìm thấy camera'
    case 'LOST':
      return 'Mất tín hiệu camera'
    case 'BLOCKED':
      return 'Camera bị che'
    case 'FAILED':
      return 'Camera lỗi'
    case 'STOPPED':
      return 'Camera đã dừng'
    default:
      return null
  }
}

export type CameraTone = 'success' | 'warning' | 'danger' | 'neutral'

export function cameraTone(status: CameraStatus | null | undefined): CameraTone {
  if (status === 'READY') return 'success'
  if (status === 'INITIALIZING') return 'warning'
  if (isCameraProblem(status)) return 'danger'
  return 'neutral'
}

/** Thành viên đang có vấn đề camera (chỉ hiển thị cho host/người liên quan — server che). */
export function cameraIssues(
  lobby: QuizLobbyData | null
): ReadonlyArray<{ username: string; label: string }> {
  if (!lobby) return []
  return lobby.members.flatMap((member) => {
    const label = cameraLabel(member.cameraStatus)
    if (!label || !isCameraProblem(member.cameraStatus)) return []
    return [{ username: member.username, label }]
  })
}

/**
 * Câu trạng thái dưới nút bắt đầu. Khi camera có vấn đề, câu này **nói rõ** rằng phòng
 * vẫn bắt đầu được — để không ai hiểu nhầm camera là điều kiện.
 */
export function lobbyStatusText(lobby: QuizLobbyData | null, startPending: boolean): string {
  if (!lobby) return ''
  if (startPending) return 'Đang bắt đầu phòng...'
  if (lobby.currentUserHost && connectedPlayerCount(lobby.members) < 2) {
    return 'Cần ít nhất 2 người chơi đang kết nối để bắt đầu.'
  }
  if (lobby.proctoringEnabled) {
    const statuses = lobby.members
      .filter((member) => member.playing && member.connected)
      .map((member) => member.cameraStatus)
      .filter(
        (status): status is CameraStatus =>
          status !== null && status !== 'NOT_APPLICABLE' && status !== 'NOT_REQUIRED'
      )

    if (statuses.includes('DENIED')) {
      return 'Có người chơi từ chối camera; phòng vẫn có thể bắt đầu.'
    }
    if (statuses.some((status) => isCameraProblem(status))) {
      return 'Có camera không khả dụng; phòng vẫn có thể bắt đầu.'
    }
    if (statuses.includes('INITIALIZING')) {
      return 'Camera đang khởi tạo; host vẫn có thể bắt đầu.'
    }
    if (statuses.length > 0 && statuses.every((status) => status === 'READY')) {
      return 'Camera của người chơi đã sẵn sàng.'
    }
  }
  return lobby.currentUserHost ? 'Phòng đã sẵn sàng để bắt đầu.' : 'Đang chờ host bắt đầu...'
}

/* -------------------------------------------------------------------------- */
/* Kiểm tra dữ liệu form                                                       */
/* -------------------------------------------------------------------------- */

export function validatePin(rawPin: string): string | null {
  const pin = rawPin.trim()
  if (pin.length === 0) return 'Nhập mã PIN của phòng'
  if (!new RegExp(`^\\d{${QUIZ_PIN_LENGTH}}$`).test(pin)) {
    return `PIN phải gồm đúng ${QUIZ_PIN_LENGTH} chữ số.`
  }
  return null
}

/** Chỉ giữ chữ số và tối đa 6 ký tự (giống TextFormatter bên JavaFX). */
export function sanitizePinInput(value: string): string {
  return value.replace(/\D+/g, '').slice(0, QUIZ_PIN_LENGTH)
}

export function parseDurationMinutes(raw: string): number | null {
  const trimmed = raw.trim()
  if (!/^\d{1,2}$/.test(trimmed)) return null
  const minutes = Number(trimmed)
  if (!Number.isInteger(minutes)) return null
  if (minutes < QUIZ_MIN_DURATION_MINUTES || minutes > QUIZ_MAX_DURATION_MINUTES) return null
  return minutes
}

export interface CreateRoomInput {
  quizSetId: number | null
  durationMinutes: string
  hostPlays: boolean
  proctoringEnabled: boolean
}

export interface CreateRoomErrors {
  quizSet?: string
  durationMinutes?: string
  /** Lỗi ở cặp radio/checkbox, không thuộc một field cụ thể. */
  conflict?: string
}

/** `proctoringEnabled && hostPlays` — server sẽ trả `PROCTORING_HOST_CANNOT_PLAY`. */
export function proctoringHostConflict(
  hostPlays: boolean,
  proctoringEnabled: boolean
): string | null {
  if (proctoringEnabled && hostPlays) {
    return 'Phòng giám sát camera không cho host vừa điều khiển vừa chơi. Hãy bỏ "Host cũng chơi".'
  }
  return null
}

export function validateCreateRoom(input: CreateRoomInput): CreateRoomErrors {
  const errors: CreateRoomErrors = {}
  if (input.quizSetId === null) errors.quizSet = 'Hãy chọn một bộ đề đã xuất bản.'
  if (parseDurationMinutes(input.durationMinutes) === null) {
    errors.durationMinutes = `Thời lượng phải từ ${QUIZ_MIN_DURATION_MINUTES} đến ${QUIZ_MAX_DURATION_MINUTES} phút.`
  }
  const conflict = proctoringHostConflict(input.hostPlays, input.proctoringEnabled)
  if (conflict) errors.conflict = conflict
  return errors
}

/** Lý do `QUIZ_ROOM_CANCEL` từ server → thông báo cho màn hình menu. */
export function cancelReasonNotice(reason: string, selfInitiated = false): QuizNotice {
  if (selfInitiated) {
    return {
      tone: 'info',
      title: 'Bạn đã hủy phòng',
      description: 'Phòng Quiz đã đóng với tất cả thành viên.'
    }
  }
  switch (reason.trim().toUpperCase()) {
    case 'HOST_CANCELLED':
      return {
        tone: 'warning',
        title: 'Chủ phòng đã hủy phòng',
        description: 'Phòng Quiz đã kết thúc với tất cả thành viên.'
      }
    case 'SERVER_STOPPED':
      return {
        tone: 'warning',
        title: 'Máy chủ đã dừng phòng',
        description: 'Phòng Quiz bị đóng từ phía máy chủ. Bạn có thể tạo phòng mới.'
      }
    default:
      return {
        tone: 'info',
        title: 'Phòng Quiz đã đóng',
        description: reason.trim().length > 0 ? reason : undefined
      }
  }
}
