/**
 * Lỗi transport dùng chung cho publisher và subscriber của kênh media.
 *
 * `code` luôn trùng một giá trị trong `MEDIA_ERROR` (`@shared/media-ipc`) để handler IPC trả
 * thẳng mã đó cho renderer, không phải ánh xạ chuỗi.
 */
import type { MediaAckCode } from '@shared/protocol/media'

export class MediaTransportError extends Error {
  readonly code: string
  /** Byte ACK của server khi `code === MEDIA_ERROR.ackRejected`. */
  readonly ack: MediaAckCode | null

  constructor(code: string, message: string, ack: MediaAckCode | null = null) {
    super(message)
    this.name = 'MediaTransportError'
    this.code = code
    this.ack = ack
  }
}
