/**
 * Trạng thái camera phía renderer.
 *
 * Bộ trạng thái lấy đúng union `cameraStatus` của protocol (`docs/protocol.md` §7):
 * `INITIALIZING|READY|DENIED|NOT_FOUND|FAILED|LOST|BLOCKED|STOPPED`.
 *
 * Chính sách: **camera lỗi không bao giờ chặn quiz**. Mọi trạng thái ở đây chỉ tạo cảnh báo +
 * badge; không disable nút Join/Start, không điều hướng, không chặn vòng đời phòng.
 */

import type { CameraStatus as ProtocolCameraStatus } from '@shared/protocol'

/**
 * Dùng đúng union của protocol (10 giá trị) để một trạng thái chỉ có một kiểu trong toàn bộ
 * feature. `NOT_REQUIRED`/`NOT_APPLICABLE` không bao giờ do camera sinh ra, nhưng vẫn phải
 * render được (lobby của người khác, host không chơi).
 */
export type CameraStatus = ProtocolCameraStatus

/** Nhãn tiếng Việt hiển thị trên badge. */
export const CAMERA_STATUS_LABEL: Record<CameraStatus, string> = {
  INITIALIZING: 'Đang mở camera',
  READY: 'Camera sẵn sàng',
  DENIED: 'Chưa được cấp quyền camera',
  NOT_FOUND: 'Không tìm thấy camera',
  FAILED: 'Camera gặp sự cố',
  LOST: 'Mất kết nối camera',
  BLOCKED: 'Camera bị chặn',
  STOPPED: 'Camera đã tắt',
  NOT_REQUIRED: 'Không yêu cầu camera',
  NOT_APPLICABLE: 'Không áp dụng'
}

export type CameraStatusTone = 'neutral' | 'success' | 'warning' | 'danger'

/** Màu badge; dùng token `--nq-*` ở component, không hardcode màu ở đây. */
export function cameraStatusTone(status: CameraStatus): CameraStatusTone {
  switch (status) {
    case 'READY':
      return 'success'
    case 'INITIALIZING':
      return 'neutral'
    case 'DENIED':
    case 'NOT_FOUND':
      return 'warning'
    case 'FAILED':
    case 'LOST':
    case 'BLOCKED':
      return 'danger'
    case 'STOPPED':
    case 'NOT_REQUIRED':
    case 'NOT_APPLICABLE':
      return 'neutral'
  }
}

/** Trạng thái có nên tự thử lại hay không (từ chối quyền là quyết định của người dùng). */
export function isRetryableCameraStatus(status: CameraStatus): boolean {
  return status === 'NOT_FOUND' || status === 'FAILED' || status === 'LOST'
}

export interface CameraErrorInfo {
  /** Tên `DOMException` gốc (`NotAllowedError`…) để log/chẩn đoán. */
  name: string
  /** Thông điệp ngắn, an toàn để hiển thị. */
  message: string
}

/** Nguyên nhân chi tiết cho người dùng, không bao giờ là stack trace. */
const ERROR_MESSAGE: Record<string, string> = {
  NotAllowedError:
    'Bạn đã từ chối quyền camera. Bạn vẫn có thể vào phòng thi; hãy cấp quyền trong cài đặt hệ thống rồi thử lại.',
  SecurityError: 'Trình duyệt chặn quyền camera trong ngữ cảnh này.',
  NotFoundError: 'Không tìm thấy camera nào trên máy. Bạn vẫn có thể tiếp tục làm bài.',
  DevicesNotFoundError: 'Không tìm thấy camera nào trên máy. Bạn vẫn có thể tiếp tục làm bài.',
  NotReadableError:
    'Camera đang bị ứng dụng khác chiếm dụng. Đóng ứng dụng đó rồi thử lại; bạn vẫn có thể tiếp tục làm bài.',
  TrackStartError: 'Không khởi động được camera. Bạn vẫn có thể tiếp tục làm bài.',
  OverconstrainedError: 'Camera không hỗ trợ cấu hình 640×480. Bạn vẫn có thể tiếp tục làm bài.',
  AbortError: 'Camera bị ngắt khi đang khởi động. Bạn vẫn có thể tiếp tục làm bài.',
  NotSupportedError: 'Thiết bị không hỗ trợ camera trong ứng dụng này.'
}

/** Ánh xạ lỗi `getUserMedia` → trạng thái + câu tiếng Việt. */
export function describeCameraError(error: unknown): {
  status: CameraStatus
  info: CameraErrorInfo
} {
  const name =
    typeof error === 'object' && error !== null && 'name' in error
      ? String((error as { name?: unknown }).name)
      : 'Error'

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return {
      status: 'DENIED',
      info: {
        name,
        message: ERROR_MESSAGE[name] ?? ERROR_MESSAGE['NotAllowedError']
      }
    }
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return {
      status: 'NOT_FOUND',
      info: { name, message: ERROR_MESSAGE[name] }
    }
  }
  if (name === 'OverconstrainedError') {
    return { status: 'NOT_FOUND', info: { name, message: ERROR_MESSAGE[name] } }
  }
  return {
    status: 'FAILED',
    info: {
      name,
      message: ERROR_MESSAGE[name] ?? 'Không mở được camera. Bạn vẫn có thể tiếp tục làm bài.'
    }
  }
}
