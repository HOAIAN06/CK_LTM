/**
 * Hợp đồng proctoring phía renderer: mã → câu tiếng Việt, bộ dựng payload, và **cổng gửi**.
 *
 * Bất biến lấy từ `docs/protocol.md` §8.1 và `QuizRoom` bên Java:
 *
 * 1. Chỉ **người chơi không phải host trong phòng bật proctoring** mới được report
 *    (`requireProctoredPlayer` → `NOT_PROCTORED_PLAYER`).
 * 2. Server **từ chối** `cameraStatus = NOT_REQUIRED | NOT_APPLICABLE` trong
 *    `PROCTOR_STATUS_REPORT` (`BAD_PROCTOR_STATUS`). Hai giá trị đó chỉ tồn tại trong
 *    `QuizLobbyData` cho host/người xem khác, nên client này không bao giờ gửi chúng.
 * 3. `PROCTOR_EVENT_REPORT` chỉ hợp lệ khi phòng đang chạy (`ROOM_NOT_RUNNING`).
 * 4. `eventId` phải là UUID (server gọi `UUID.fromString`), tối đa 64 ký tự.
 * 5. `durationMillis` 0..300000; `confidence` 0..1; ở đây luôn là **0** vì không có model.
 */
import type {
  CameraStatus,
  CalibrationStatus,
  ProctorEventReport,
  ProctorEventType,
  ProctorSeverity,
  ProctorStatusReport
} from '@shared/protocol'
import { MAX_EVENT_DURATION_MS } from './focus-events'

/** Trạng thái phòng theo góc nhìn của protocol. */
export type ProctorPhase = 'lobby' | 'running' | 'ended'

/** Bối cảnh phòng mà renderer cần để quyết định gửi gì. */
export interface ProctorRoomContext {
  pin: string
  proctoringEnabled: boolean
  /** Người dùng hiện tại có đang chơi (không phải host điều khiển). */
  playing: boolean
  host: boolean
  phase: ProctorPhase
}

/**
 * `calibrationStatus` gửi kèm **luôn** là `NOT_REQUIRED`: bản Electron không có model
 * thị giác nên không có gì để hiệu chuẩn. Không gửi `READY` giả.
 */
export const REPORTED_CALIBRATION: CalibrationStatus = 'NOT_REQUIRED'

/** Mô tả ngắn (tiếng Việt) gửi kèm mỗi lần đổi trạng thái camera. */
export const CAMERA_DETAIL: Record<CameraStatus, string> = {
  INITIALIZING: 'Đang mở camera',
  READY: 'Camera sẵn sàng',
  DENIED: 'Người chơi không cấp quyền camera',
  NOT_FOUND: 'Không tìm thấy camera trên máy',
  FAILED: 'Không mở được camera',
  LOST: 'Mất kết nối camera',
  BLOCKED: 'Camera có thể đang bị che',
  STOPPED: 'Camera đã tắt',
  NOT_REQUIRED: 'Phòng không yêu cầu camera',
  NOT_APPLICABLE: 'Không áp dụng cho người xem này'
}

/** Nhãn sự kiện cho host dashboard (không dùng mã enum trần trên UI). */
export const PROCTOR_EVENT_LABEL: Record<ProctorEventType, string> = {
  NO_FACE: 'Không thấy khuôn mặt',
  MULTIPLE_FACES: 'Nhiều khuôn mặt',
  LOOKING_AWAY: 'Nhìn ra ngoài màn hình',
  PHONE_DETECTED: 'Nghi có điện thoại',
  CAMERA_BLOCKED: 'Camera bị che hoặc mất hình',
  APP_FOCUS_LOST: 'Rời cửa sổ làm bài',
  APP_MINIMIZED: 'Thu nhỏ cửa sổ làm bài'
}

/**
 * Sự kiện **có thể** phát hiện mà không cần model thị giác. Bốn loại còn lại
 * (`NO_FACE`, `MULTIPLE_FACES`, `LOOKING_AWAY`, `PHONE_DETECTED`) bị loại khỏi union này
 * một cách có chủ đích: bịa chúng sẽ tạo bằng chứng sai cho host.
 */
export const DETECTABLE_EVENT_TYPES = ['APP_FOCUS_LOST', 'APP_MINIMIZED', 'CAMERA_BLOCKED'] as const

export type DetectableEventType = (typeof DETECTABLE_EVENT_TYPES)[number]

/**
 * Camera status hợp lệ để gửi lên server. `NOT_REQUIRED`/`NOT_APPLICABLE` bị loại vì server
 * từ chối chúng cho người chơi (`BAD_PROCTOR_STATUS`) — xem đầu file.
 */
export function isReportableCameraStatus(status: CameraStatus): boolean {
  return status !== 'NOT_REQUIRED' && status !== 'NOT_APPLICABLE'
}

/** Có được gửi status report lúc này không. */
export function canReportStatus(context: ProctorRoomContext | null): context is ProctorRoomContext {
  if (context === null) return false
  if (!context.proctoringEnabled) return false
  if (context.host || !context.playing) return false
  // Phòng đã kết thúc thì server đã dọn phiên; gửi thêm chỉ tạo lỗi.
  return context.phase !== 'ended'
}

/** Có được gửi event report lúc này không (server yêu cầu `state == RUNNING`). */
export function canEmitEvent(context: ProctorRoomContext | null): context is ProctorRoomContext {
  return canReportStatus(context) && context.phase === 'running'
}

export interface StatusReportInput {
  pin: string
  status: CameraStatus
  detail?: string | null
  observedAtEpochMillis: number
}

/** Dựng `PROCTOR_STATUS_REPORT`. Trả `null` nếu trạng thái không được phép gửi. */
export function buildStatusReport(input: StatusReportInput): ProctorStatusReport | null {
  if (!isReportableCameraStatus(input.status)) return null
  return {
    pin: input.pin,
    cameraStatus: input.status,
    calibrationStatus: REPORTED_CALIBRATION,
    detail: input.detail ?? CAMERA_DETAIL[input.status],
    observedAtEpochMillis: input.observedAtEpochMillis
  }
}

export interface EventReportInput {
  pin: string
  eventId: string
  type: DetectableEventType
  severity: ProctorSeverity
  frameSequence: number
  occurredAtEpochMillis: number
  durationMillis: number
  confidence?: number
}

/** Dựng `PROCTOR_EVENT_REPORT`, clamp mọi trường về miền server chấp nhận. */
export function buildEventReport(input: EventReportInput): ProctorEventReport {
  const duration = Number.isFinite(input.durationMillis)
    ? Math.max(0, Math.min(MAX_EVENT_DURATION_MS, Math.round(input.durationMillis)))
    : 0
  const confidence = Number.isFinite(input.confidence ?? 0)
    ? Math.max(0, Math.min(1, input.confidence ?? 0))
    : 0
  return {
    pin: input.pin,
    eventId: input.eventId,
    type: input.type,
    severity: input.severity,
    frameSequence: Math.max(0, Math.trunc(input.frameSequence)),
    occurredAtEpochMillis: input.occurredAtEpochMillis,
    durationMillis: duration,
    // 0 = "không có model nào đo"; host UI phải hiển thị đúng như vậy, không quy đổi ra %.
    confidence
  }
}

/**
 * UUID v4 cho `eventId`. Ưu tiên `crypto.randomUUID()`; fallback tự dựng v4 từ
 * `crypto.getRandomValues` để không phụ thuộc phiên bản Chromium/Node.
 */
export function createEventId(): string {
  const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined
  if (cryptoApi !== undefined && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID()
  }
  if (cryptoApi === undefined || typeof cryptoApi.getRandomValues !== 'function') {
    // Môi trường không có crypto: vẫn phải là UUID hợp lệ để server không trả BAD_PROCTOR_EVENT.
    const now = Date.now().toString(16).padStart(12, '0').slice(-12)
    return `00000000-0000-4000-8000-${now}`
  }
  const bytes = new Uint8Array(16)
  cryptoApi.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** `eventId` có đúng dạng UUID không (dùng trong test và để chặn dữ liệu lạ). */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
