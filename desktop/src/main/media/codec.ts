/**
 * Codec nhị phân của kênh media proctoring (mirror `MediaProtocol.java` bản VERSION = 2).
 *
 * Toàn bộ số nguyên/float do `java.io.DataOutputStream` ghi, tức **big-endian** (network
 * order), float/double IEEE-754. Hằng số lấy từ `@shared/protocol/media` — không khai báo
 * lại giá trị ở đây, để chỉ có một nguồn sự thật với Java.
 *
 * Layout (offset tính từ đầu frame):
 *
 * ```text
 * Handshake (client → server)                     8 byte header + ticket UTF-8
 *   0  int32   MAGIC = 0x4E514D50
 *   4  uint8   VERSION = 2
 *   5  uint8   ROLE (1 PUBLISHER, 2 HOST_SUBSCRIBER)
 *   6  uint16  TICKET_LENGTH (1..512)
 *   8  byte[]  TICKET
 *
 * Publisher frame (0x10)                          21 byte header + jpeg + vision
 *   0  uint8   type = 0x10
 *   1  int64   sequence
 *   9  int64   captureEpochMillis
 *   17 int32   jpegLength (1..524288)
 *   21 byte[]  jpeg
 *   .. VisionMetadata
 *
 * Relayed frame (0x11)                            29 byte header + jpeg + vision
 *   0  uint8   type = 0x11
 *   1  int64   userId
 *   9  int64   sequence
 *   17 int64   serverReceivedEpochMillis
 *   25 int32   jpegLength (1..524288)
 *   29 byte[]  jpeg
 *   .. VisionMetadata
 *
 * VisionMetadata                                  38 byte cố định + 32 byte/face (≤6)
 *   0  int64   frameSequence
 *   8  int64   analysedAtEpochMillis
 *   16 uint8   attention ordinal
 *   17 double  gazeX
 *   25 double  gazeY
 *   33 float   confidence
 *   37 uint8   faceCount
 *   38 per face: 8 x float
 * ```
 */
import {
  MEDIA_FRAME_PUBLISH,
  MEDIA_FRAME_SUBSCRIBE,
  MEDIA_HANDSHAKE_HEADER_BYTES,
  MEDIA_MAGIC,
  MEDIA_MAX_FACES,
  MEDIA_MAX_JPEG_BYTES,
  MEDIA_MAX_TICKET_BYTES,
  MEDIA_PUBLISH_HEADER_BYTES,
  MEDIA_RELAY_HEADER_BYTES,
  MEDIA_ROLE_CODES,
  MEDIA_VERSION,
  VISION_FACE_BOX_BYTES,
  VISION_METADATA_FIXED_BYTES,
  attentionFromOrdinal,
  attentionOrdinal,
  clampConfidence,
  isMediaAckCode,
  unavailableVisionMetadata,
  type FaceBox,
  type MediaAckCode,
  type MediaRoleCode,
  type VisionMetadata
} from '@shared/protocol/media'

/** Mã lỗi của codec. Mọi lỗi đều thoát ra dưới dạng `MediaCodecError`. */
export type MediaCodecErrorCode =
  | 'INVALID_TICKET_LENGTH'
  | 'INVALID_ROLE'
  | 'JPEG_EMPTY'
  | 'JPEG_TOO_LARGE'
  | 'UNSUPPORTED_FRAME_TYPE'
  | 'TRUNCATED_FRAME'
  | 'TOO_MANY_FACES'
  | 'INVALID_ACK'
  | 'BUFFER_OVERFLOW'
  | 'INVALID_INTEGER'

/** Lỗi codec có `code` ổn định để handler IPC ánh xạ sang mã cho UI. */
export class MediaCodecError extends Error {
  readonly code: MediaCodecErrorCode

  constructor(code: MediaCodecErrorCode, message: string) {
    super(message)
    this.name = 'MediaCodecError'
    this.code = code
  }
}

/** Kích thước tối đa của một relayed frame hoàn chỉnh (header + jpeg max + vision max). */
export const MEDIA_MAX_RELAY_FRAME_BYTES =
  MEDIA_RELAY_HEADER_BYTES +
  MEDIA_MAX_JPEG_BYTES +
  VISION_METADATA_FIXED_BYTES +
  MEDIA_MAX_FACES * VISION_FACE_BOX_BYTES

/** Kích thước tối đa của một publisher frame hoàn chỉnh. */
export const MEDIA_MAX_PUBLISH_FRAME_BYTES =
  MEDIA_PUBLISH_HEADER_BYTES +
  MEDIA_MAX_JPEG_BYTES +
  VISION_METADATA_FIXED_BYTES +
  MEDIA_MAX_FACES * VISION_FACE_BOX_BYTES

/** Ordinal của `Attention.UNKNOWN` — giá trị dùng khi metadata không xác định. */
const VISION_ATTENTION_UNKNOWN_ORDINAL = 5

/** Phần dữ liệu codec cần cho một publisher frame. */
export interface PublishedFrameInput {
  sequence: number
  captureEpochMillis: number
  jpeg: Uint8Array
  /** Có thể là metadata một phần (renderer chưa chạy detector đầy đủ). */
  vision?: Partial<VisionMetadata> | null
}

/** Dữ liệu cần để encode một relayed frame (test/giả lập server). */
export interface RelayedFrameInput {
  userId: number
  sequence: number
  serverReceivedEpochMillis: number
  jpeg: Uint8Array
  vision?: Partial<VisionMetadata> | null
}

/** Một relayed frame đã decode (server → host subscriber). */
export interface RelayedFrame {
  userId: number
  sequence: number
  serverReceivedEpochMillis: number
  /** Copy độc lập của JPEG; an toàn để giữ sau khi buffer đọc bị tái sử dụng. */
  jpeg: Uint8Array
  vision: VisionMetadata
}

// ---------------------------------------------------------------------------------------------
// Handshake
// ---------------------------------------------------------------------------------------------

/**
 * Encode handshake. Ticket là UTF-8, 1..512 byte; sai độ dài bị từ chối **trước** khi ghi để
 * không bao giờ gửi một handshake mà server chắc chắn loại.
 */
export function encodeHandshake(role: MediaRoleCode, ticket: string): Buffer {
  if (role !== MEDIA_ROLE_CODES.PUBLISHER && role !== MEDIA_ROLE_CODES.HOST_SUBSCRIBER) {
    throw new MediaCodecError('INVALID_ROLE', 'Vai trò media không hợp lệ')
  }
  const ticketBytes = Buffer.from(typeof ticket === 'string' ? ticket : '', 'utf8')
  if (ticketBytes.length < 1 || ticketBytes.length > MEDIA_MAX_TICKET_BYTES) {
    throw new MediaCodecError('INVALID_TICKET_LENGTH', 'Độ dài ticket media không hợp lệ')
  }

  const buffer = Buffer.alloc(MEDIA_HANDSHAKE_HEADER_BYTES + ticketBytes.length)
  buffer.writeInt32BE(MEDIA_MAGIC, 0)
  buffer.writeUInt8(MEDIA_VERSION, 4)
  buffer.writeUInt8(role, 5)
  buffer.writeUInt16BE(ticketBytes.length, 6)
  buffer.set(ticketBytes, MEDIA_HANDSHAKE_HEADER_BYTES)
  return buffer
}

/**
 * Decode một byte ACK của server. Giá trị ngoài 0..5 là lỗi giao thức, **không** được
 * lặng lẽ coi như `ROOM_CLOSED` — nếu không, một server lạ sẽ trông giống hệt server cũ.
 */
export function decodeAck(byte: number): MediaAckCode {
  if (!Number.isInteger(byte) || !isMediaAckCode(byte)) {
    throw new MediaCodecError('INVALID_ACK', 'ACK của media server không hợp lệ')
  }
  return byte
}

// ---------------------------------------------------------------------------------------------
// Publisher frame
// ---------------------------------------------------------------------------------------------

/** Encode publisher frame `0x10`. */
export function encodePublishedFrame(frame: PublishedFrameInput): Buffer {
  const jpeg = toJpegBuffer(frame.jpeg)
  const vision = normalizeVision(frame.vision, frame.sequence)
  const size = MEDIA_PUBLISH_HEADER_BYTES + jpeg.length + visionByteLength(vision)

  const buffer = Buffer.alloc(size)
  let offset = 0
  buffer.writeUInt8(MEDIA_FRAME_PUBLISH, offset)
  offset += 1
  offset = writeInt64(buffer, frame.sequence, offset)
  offset = writeInt64(buffer, frame.captureEpochMillis, offset)
  buffer.writeInt32BE(jpeg.length, offset)
  offset += 4
  offset += jpeg.copy(buffer, offset)
  writeVision(buffer, vision, offset)
  return buffer
}

/** Decode một publisher frame đã hoàn chỉnh (dùng cho test và công cụ chẩn đoán). */
export function decodePublishedFrame(data: Uint8Array): {
  sequence: number
  captureEpochMillis: number
  jpeg: Uint8Array
  vision: VisionMetadata
} {
  const view = Buffer.from(data.buffer, data.byteOffset, data.byteLength)
  if (view.length < MEDIA_PUBLISH_HEADER_BYTES) {
    throw new MediaCodecError('TRUNCATED_FRAME', 'Publisher frame quá ngắn')
  }
  if (view.readUInt8(0) !== MEDIA_FRAME_PUBLISH) {
    throw new MediaCodecError('UNSUPPORTED_FRAME_TYPE', 'Không phải publisher frame')
  }
  const sequence = readInt64(view, 1)
  const captureEpochMillis = readInt64(view, 9)
  const jpegLength = readJpegLength(view, 17)
  const jpegStart = MEDIA_PUBLISH_HEADER_BYTES
  const jpegEnd = jpegStart + jpegLength
  const decoded = readVision(view, jpegEnd, sequence)
  return {
    sequence,
    captureEpochMillis,
    jpeg: Uint8Array.from(view.subarray(jpegStart, jpegEnd)),
    vision: decoded
  }
}

// ---------------------------------------------------------------------------------------------
// Relayed frame
// ---------------------------------------------------------------------------------------------

/**
 * Encode relayed frame `0x11`. Chỉ dùng cho test/giả lập server — client thật chỉ decode.
 * Giữ ở đây để subscriber test và công cụ chẩn đoán dùng đúng một codec.
 */
export function encodeRelayedFrame(frame: RelayedFrameInput): Buffer {
  const jpeg = toJpegBuffer(frame.jpeg)
  const vision = normalizeVision(frame.vision, frame.sequence)
  const size = MEDIA_RELAY_HEADER_BYTES + jpeg.length + visionByteLength(vision)

  const buffer = Buffer.alloc(size)
  let offset = 0
  buffer.writeUInt8(MEDIA_FRAME_SUBSCRIBE, offset)
  offset += 1
  offset = writeInt64(buffer, frame.userId, offset)
  offset = writeInt64(buffer, frame.sequence, offset)
  offset = writeInt64(buffer, frame.serverReceivedEpochMillis, offset)
  buffer.writeInt32BE(jpeg.length, offset)
  offset += 4
  offset += jpeg.copy(buffer, offset)
  writeVision(buffer, vision, offset)
  return buffer
}

/**
 * Decoder luồng cho relayed frame. TCP không giữ ranh giới message, nên phải gom buffer và
 * chỉ cắt frame khi đã đủ byte. Bộ nhớ bị chặn trên bởi `maxBufferBytes`
 * (= `MEDIA_MAX_RELAY_FRAME_BYTES`): dữ liệu rác không thể làm main process phình vô hạn.
 */
export class RelayedFrameDecoder {
  private buffer: Buffer = Buffer.alloc(0)
  private readonly maxBufferBytes: number

  constructor(maxBufferBytes: number = MEDIA_MAX_RELAY_FRAME_BYTES) {
    this.maxBufferBytes = maxBufferBytes
  }

  /** Byte đang giữ nhưng chưa tạo thành frame (dùng cho test/chẩn đoán). */
  get bufferedBytes(): number {
    return this.buffer.length
  }

  /** Nạp thêm chunk, trả về mọi frame đã hoàn chỉnh theo thứ tự. */
  push(chunk: Uint8Array): RelayedFrame[] {
    if (chunk.length === 0) return []
    this.buffer = this.buffer.length === 0 ? Buffer.from(chunk) : Buffer.concat([this.buffer, chunk])

    const frames: RelayedFrame[] = []
    for (;;) {
      const frame = this.readFrame()
      if (frame === null) break
      frames.push(frame)
    }

    if (this.buffer.length > this.maxBufferBytes) {
      this.buffer = Buffer.alloc(0)
      throw new MediaCodecError('BUFFER_OVERFLOW', 'Dữ liệu media vượt giới hạn bộ nhớ')
    }
    return frames
  }

  private readFrame(): RelayedFrame | null {
    if (this.buffer.length < MEDIA_RELAY_HEADER_BYTES) {
      // Kiểm tra type sớm: một byte đầu sai nghĩa là luồng đã hỏng, không chờ thêm.
      if (this.buffer.length >= 1 && this.buffer.readUInt8(0) !== MEDIA_FRAME_SUBSCRIBE) {
        throw new MediaCodecError('UNSUPPORTED_FRAME_TYPE', 'Relay frame type không hỗ trợ')
      }
      return null
    }
    if (this.buffer.readUInt8(0) !== MEDIA_FRAME_SUBSCRIBE) {
      throw new MediaCodecError('UNSUPPORTED_FRAME_TYPE', 'Relay frame type không hỗ trợ')
    }

    const jpegLength = readJpegLength(this.buffer, 25)
    const jpegStart = MEDIA_RELAY_HEADER_BYTES
    const jpegEnd = jpegStart + jpegLength
    if (this.buffer.length < jpegEnd + VISION_METADATA_FIXED_BYTES) return null

    const faceCount = this.buffer.readUInt8(jpegEnd + VISION_METADATA_FIXED_BYTES - 1)
    if (faceCount > MEDIA_MAX_FACES) {
      throw new MediaCodecError('TOO_MANY_FACES', 'Vision metadata có quá nhiều face box')
    }
    const frameEnd = jpegEnd + VISION_METADATA_FIXED_BYTES + faceCount * VISION_FACE_BOX_BYTES
    if (this.buffer.length < frameEnd) return null

    const userId = readInt64(this.buffer, 1)
    const sequence = readInt64(this.buffer, 9)
    const serverReceivedEpochMillis = readInt64(this.buffer, 17)
    const jpeg = Uint8Array.from(this.buffer.subarray(jpegStart, jpegEnd))
    const vision = readVision(this.buffer, jpegEnd, sequence)
    this.buffer = this.buffer.subarray(frameEnd)
    return { userId, sequence, serverReceivedEpochMillis, jpeg, vision }
  }
}

// ---------------------------------------------------------------------------------------------
// Vision metadata
// ---------------------------------------------------------------------------------------------

/** Số byte mà `writeVision` sẽ ghi cho metadata này. */
export function visionByteLength(vision: VisionMetadata | null | undefined): number {
  const faces = Math.min(MEDIA_MAX_FACES, vision?.faces?.length ?? 0)
  return VISION_METADATA_FIXED_BYTES + faces * VISION_FACE_BOX_BYTES
}

/**
 * Chuẩn hoá metadata: thiếu mặt/khoảng giá trị lạ vẫn ghi ra đúng layout, `confidence` bị
 * clamp 0..1 giống constructor Java. Nhận `Partial<VisionMetadata>` để renderer có thể gửi
 * kèm kết quả phân tích một phần.
 */
export function normalizeVision(
  input: Partial<VisionMetadata> | null | undefined,
  fallbackSequence: number
): VisionMetadata {
  const base = unavailableVisionMetadata(fallbackSequence)
  if (input === null || input === undefined) return base

  const faces: FaceBox[] = []
  for (const face of input.faces ?? []) {
    if (faces.length >= MEDIA_MAX_FACES) break
    faces.push({
      x: finiteOrZero(face.x),
      y: finiteOrZero(face.y),
      width: finiteOrZero(face.width),
      height: finiteOrZero(face.height),
      leftEyeX: finiteOrZero(face.leftEyeX),
      leftEyeY: finiteOrZero(face.leftEyeY),
      rightEyeX: finiteOrZero(face.rightEyeX),
      rightEyeY: finiteOrZero(face.rightEyeY)
    })
  }

  const frameSequence = input.frameSequence
  const analysedAt = input.analysedAtEpochMillis

  return {
    frameSequence:
      typeof frameSequence === 'number' && Number.isInteger(frameSequence) && frameSequence > 0
        ? frameSequence
        : fallbackSequence,
    analysedAtEpochMillis:
      typeof analysedAt === 'number' && Number.isInteger(analysedAt) && analysedAt > 0
        ? analysedAt
        : 0,
    faces,
    gazeX: finiteOrZero(input.gazeX),
    gazeY: finiteOrZero(input.gazeY),
    attention: input.attention ?? 'UNKNOWN',
    confidence: clampConfidence(input.confidence ?? 0)
  }
}

function writeVision(buffer: Buffer, vision: VisionMetadata, start: number): void {
  let offset = start
  offset = writeInt64(buffer, vision.frameSequence, offset)
  offset = writeInt64(buffer, vision.analysedAtEpochMillis, offset)
  buffer.writeUInt8(attentionOrdinalOf(vision.attention), offset)
  offset += 1
  buffer.writeDoubleBE(finiteOrZero(vision.gazeX), offset)
  offset += 8
  buffer.writeDoubleBE(finiteOrZero(vision.gazeY), offset)
  offset += 8
  buffer.writeFloatBE(clampConfidence(vision.confidence), offset)
  offset += 4

  const faces = vision.faces.slice(0, MEDIA_MAX_FACES)
  buffer.writeUInt8(faces.length, offset)
  offset += 1
  for (const face of faces) {
    buffer.writeFloatBE(finiteOrZero(face.x), offset)
    buffer.writeFloatBE(finiteOrZero(face.y), offset + 4)
    buffer.writeFloatBE(finiteOrZero(face.width), offset + 8)
    buffer.writeFloatBE(finiteOrZero(face.height), offset + 12)
    buffer.writeFloatBE(finiteOrZero(face.leftEyeX), offset + 16)
    buffer.writeFloatBE(finiteOrZero(face.leftEyeY), offset + 20)
    buffer.writeFloatBE(finiteOrZero(face.rightEyeX), offset + 24)
    buffer.writeFloatBE(finiteOrZero(face.rightEyeY), offset + 28)
    offset += VISION_FACE_BOX_BYTES
  }
}

/**
 * Đọc vision metadata tại `start`. Ordinal lạ degrade thành `UNKNOWN` và
 * `frameSequence <= 0` được thay bằng sequence của frame — đúng hành vi
 * `MediaProtocol.readVision` bên Java.
 */
function readVision(buffer: Buffer, start: number, fallbackSequence: number): VisionMetadata {
  const end = start + VISION_METADATA_FIXED_BYTES
  if (buffer.length < end) {
    throw new MediaCodecError('TRUNCATED_FRAME', 'Vision metadata bị cắt')
  }
  let offset = start
  const frameSequence = readInt64(buffer, offset)
  offset += 8
  const analysedAtEpochMillis = readInt64(buffer, offset)
  offset += 8
  const ordinal = buffer.readUInt8(offset)
  offset += 1
  const gazeX = buffer.readDoubleBE(offset)
  offset += 8
  const gazeY = buffer.readDoubleBE(offset)
  offset += 8
  const confidence = buffer.readFloatBE(offset)
  offset += 4
  const faceCount = buffer.readUInt8(offset)
  offset += 1
  if (faceCount > MEDIA_MAX_FACES) {
    throw new MediaCodecError('TOO_MANY_FACES', 'Vision metadata có quá nhiều face box')
  }
  if (buffer.length < offset + faceCount * VISION_FACE_BOX_BYTES) {
    throw new MediaCodecError('TRUNCATED_FRAME', 'Face box bị cắt')
  }

  const faces: FaceBox[] = []
  for (let index = 0; index < faceCount; index += 1) {
    faces.push({
      x: buffer.readFloatBE(offset),
      y: buffer.readFloatBE(offset + 4),
      width: buffer.readFloatBE(offset + 8),
      height: buffer.readFloatBE(offset + 12),
      leftEyeX: buffer.readFloatBE(offset + 16),
      leftEyeY: buffer.readFloatBE(offset + 20),
      rightEyeX: buffer.readFloatBE(offset + 24),
      rightEyeY: buffer.readFloatBE(offset + 28)
    })
    offset += VISION_FACE_BOX_BYTES
  }

  const metadata = unavailableVisionMetadata(
    frameSequence > 0 ? frameSequence : fallbackSequence
  )
  return {
    ...metadata,
    analysedAtEpochMillis,
    faces,
    gazeX: Number.isFinite(gazeX) ? gazeX : 0,
    gazeY: Number.isFinite(gazeY) ? gazeY : 0,
    attention: attentionFromOrdinalOf(ordinal),
    confidence: clampConfidence(confidence)
  }
}

/** Ordinal theo đúng thứ tự khai báo `VisionMetadata.Attention`; lạ → `UNKNOWN` (5). */
function attentionOrdinalOf(attention: VisionMetadata['attention']): number {
  const ordinal = attentionOrdinal(attention)
  return ordinal >= 0 ? ordinal : VISION_ATTENTION_UNKNOWN_ORDINAL
}

function attentionFromOrdinalOf(ordinal: number): VisionMetadata['attention'] {
  return attentionFromOrdinal(ordinal)
}

// ---------------------------------------------------------------------------------------------
// Tiện ích số nguyên
// ---------------------------------------------------------------------------------------------

function writeInt64(buffer: Buffer, value: number, offset: number): number {
  if (!Number.isInteger(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) {
    throw new MediaCodecError('INVALID_INTEGER', 'Giá trị int64 ngoài phạm vi an toàn')
  }
  buffer.writeBigInt64BE(BigInt(value), offset)
  return offset + 8
}

function readInt64(buffer: Buffer, offset: number): number {
  if (buffer.length < offset + 8) {
    throw new MediaCodecError('TRUNCATED_FRAME', 'int64 bị cắt')
  }
  return Number(buffer.readBigInt64BE(offset))
}

function readJpegLength(buffer: Buffer, offset: number): number {
  if (buffer.length < offset + 4) {
    throw new MediaCodecError('TRUNCATED_FRAME', 'jpegLength bị cắt')
  }
  const length = buffer.readInt32BE(offset)
  if (length <= 0) {
    throw new MediaCodecError('JPEG_EMPTY', 'JPEG length phải lớn hơn 0')
  }
  if (length > MEDIA_MAX_JPEG_BYTES) {
    throw new MediaCodecError('JPEG_TOO_LARGE', 'JPEG vượt 524288 byte')
  }
  return length
}

function toJpegBuffer(jpeg: Uint8Array): Buffer {
  if (jpeg.length === 0) {
    throw new MediaCodecError('JPEG_EMPTY', 'JPEG rỗng')
  }
  if (jpeg.length > MEDIA_MAX_JPEG_BYTES) {
    throw new MediaCodecError('JPEG_TOO_LARGE', 'JPEG vượt 524288 byte')
  }
  return Buffer.isBuffer(jpeg) ? jpeg : Buffer.from(jpeg.buffer, jpeg.byteOffset, jpeg.byteLength)
}

function finiteOrZero(value: number | undefined | null): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}
