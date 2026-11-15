/**
 * Mirror of `com.nihongoquest.common.media.MediaProtocol` + `VisionMetadata`.
 *
 * The media channel is a SEPARATE binary TCP connection (default port 5001, or whatever
 * `PROCTOR_MEDIA_SESSION.mediaPort` says). It is not JSON, not framed by newlines and it never
 * carries audio. Every integer/float below is written by `java.io.DataOutputStream`, i.e.
 * **big-endian (network order)**, floats/doubles are IEEE-754.
 *
 * Handshake (client -> server), 8 bytes of header plus the UTF-8 ticket:
 * ```text
 * offset 0  int32   MAGIC   = 0x4E514D50 ("NQMP")
 * offset 4  uint8   VERSION = 2
 * offset 5  uint8   ROLE    (1 = PUBLISHER, 2 = HOST_SUBSCRIBER)
 * offset 6  uint16  TICKET_LENGTH (1..512)
 * offset 8  byte[]  TICKET  (UTF-8, not NUL terminated)
 * ```
 * The server answers with a single uint8 ACK (0..5) and either keeps the socket open or closes it.
 *
 * Publisher frame (client -> server, `0x10`), fixed header = 21 bytes:
 * ```text
 * 0   uint8   type = 0x10
 * 1   int64   sequence
 * 9   int64   captureEpochMillis
 * 17  int32   jpegLength (1..524288)
 * 21  byte[]  jpeg
 * ..  VisionMetadata
 * ```
 *
 * Relayed frame (server -> host subscriber, `0x11`), fixed header = 29 bytes:
 * ```text
 * 0   uint8   type = 0x11
 * 1   int64   userId
 * 9   int64   sequence
 * 17  int64   serverReceivedEpochMillis
 * 25  int32   jpegLength (1..524288)
 * 29  byte[]  jpeg
 * ..  VisionMetadata
 * ```
 *
 * VisionMetadata, fixed part = 38 bytes, then 32 bytes per face box (max 6):
 * ```text
 * 0   int64   frameSequence
 * 8   int64   analysedAtEpochMillis
 * 16  uint8   attention ordinal (0 LOOKING_AT_SCREEN, 1 LOOKING_AWAY, 2 NO_FACE,
 *                                3 MULTIPLE_FACES, 4 PHONE, 5 UNKNOWN)
 * 17  double  gazeX          (normalized 0..1)
 * 25  double  gazeY          (normalized 0..1)
 * 33  float   confidence     (0..1)
 * 37  uint8   faceCount      (0..6)
 * 38  per face: 8 x float (x, y, width, height, leftEyeX, leftEyeY, rightEyeX, rightEyeY)
 * ```
 * An out-of-range attention ordinal is decoded as `UNKNOWN` by the Java server; this module keeps
 * that behaviour so both ends degrade identically.
 */

/** `MediaProtocol.MAGIC` — ASCII "NQMP". */
export const MEDIA_MAGIC = 0x4e514d50

/** `MediaProtocol.VERSION`. Version 2 adds the vision metadata block to every relayed frame. */
export const MEDIA_VERSION = 2

/** `MediaProtocol.MAX_TICKET_BYTES`. */
export const MEDIA_MAX_TICKET_BYTES = 512

/** `MediaProtocol.MAX_JPEG_BYTES` (512 KiB) — a 720p JPEG must fit in one frame. */
export const MEDIA_MAX_JPEG_BYTES = 524_288

/** `MediaProtocol.MAX_FACES` (private constant in Java). */
export const MEDIA_MAX_FACES = 6

/** `MediaProtocol.HANDSHAKE_TIMEOUT_MILLIS`. */
export const MEDIA_HANDSHAKE_TIMEOUT_MILLIS = 10_000

/**
 * Server-side media ticket lifetime (`QuizRoomManager.DEFAULT_TICKET_TTL = 60s`). Tickets are
 * single use; a reconnect must wait for a fresh `PROCTOR_MEDIA_SESSION`.
 */
export const MEDIA_TICKET_TTL_MILLIS = 60_000

/** `MediaProtocol.FRAME_PUBLISH` — publisher -> server. */
export const MEDIA_FRAME_PUBLISH = 0x10

/** `MediaProtocol.FRAME_SUBSCRIBE` — server -> host subscriber (the "relayed" frame). */
export const MEDIA_FRAME_SUBSCRIBE = 0x11

/** `MediaProtocol.ACK_OK`. */
export const MEDIA_ACK_OK = 0

/** `MediaProtocol.ACK_INVALID_MAGIC`. */
export const MEDIA_ACK_INVALID_MAGIC = 1

/** `MediaProtocol.ACK_UNSUPPORTED_VERSION`. */
export const MEDIA_ACK_UNSUPPORTED_VERSION = 2

/** `MediaProtocol.ACK_INVALID_TICKET` (bad role or bad ticket length). */
export const MEDIA_ACK_INVALID_TICKET = 3

/** `MediaProtocol.ACK_EXPIRED_TICKET`. */
export const MEDIA_ACK_EXPIRED_TICKET = 4

/** `MediaProtocol.ACK_ROOM_CLOSED`. */
export const MEDIA_ACK_ROOM_CLOSED = 5

export type MediaAckCode = 0 | 1 | 2 | 3 | 4 | 5

export const MEDIA_ACK_CODES: readonly MediaAckCode[] = [
  MEDIA_ACK_OK,
  MEDIA_ACK_INVALID_MAGIC,
  MEDIA_ACK_UNSUPPORTED_VERSION,
  MEDIA_ACK_INVALID_TICKET,
  MEDIA_ACK_EXPIRED_TICKET,
  MEDIA_ACK_ROOM_CLOSED
]

export function isMediaAckCode(value: unknown): value is MediaAckCode {
  return typeof value === 'number' && (MEDIA_ACK_CODES as readonly number[]).includes(value)
}

/** Human readable reason for a rejected handshake (safe to show in the proctor UI). */
export function mediaAckMessage(ack: MediaAckCode): string {
  switch (ack) {
    case MEDIA_ACK_OK:
      return 'Media handshake accepted'
    case MEDIA_ACK_INVALID_MAGIC:
      return 'Media handshake rejected: bad magic'
    case MEDIA_ACK_UNSUPPORTED_VERSION:
      return 'Media handshake rejected: unsupported version'
    case MEDIA_ACK_INVALID_TICKET:
      return 'Media handshake rejected: invalid ticket'
    case MEDIA_ACK_EXPIRED_TICKET:
      return 'Media handshake rejected: ticket expired'
    case MEDIA_ACK_ROOM_CLOSED:
      return 'Media handshake rejected: room closed'
  }
}

/** `MediaProtocol.Role` byte codes. */
export const MEDIA_ROLE_CODES = {
  PUBLISHER: 1,
  HOST_SUBSCRIBER: 2
} as const

export type MediaRoleCode = (typeof MEDIA_ROLE_CODES)[keyof typeof MEDIA_ROLE_CODES]

export function isMediaRoleCode(value: unknown): value is MediaRoleCode {
  return value === MEDIA_ROLE_CODES.PUBLISHER || value === MEDIA_ROLE_CODES.HOST_SUBSCRIBER
}

// ---------------------------------------------------------------------------------------------
// Frame sizes (useful for chunk buffering and for asserting a frame is complete)
// ---------------------------------------------------------------------------------------------

/** int32 magic + uint8 version + uint8 role + uint16 ticket length. */
export const MEDIA_HANDSHAKE_HEADER_BYTES = 8

/** uint8 type + int64 sequence + int64 captureEpochMillis + int32 jpegLength. */
export const MEDIA_PUBLISH_HEADER_BYTES = 21

/** uint8 type + int64 userId + int64 sequence + int64 serverReceived + int32 jpegLength. */
export const MEDIA_RELAY_HEADER_BYTES = 29

/** VisionMetadata bytes before the per-face list. */
export const VISION_METADATA_FIXED_BYTES = 38

/** 8 float32 values per face box. */
export const VISION_FACE_BOX_BYTES = 32

/** Smallest possible publisher frame: header + 1 byte JPEG + vision block + zero faces. */
export const MEDIA_MIN_PUBLISH_FRAME_BYTES =
  MEDIA_PUBLISH_HEADER_BYTES + 1 + VISION_METADATA_FIXED_BYTES

// ---------------------------------------------------------------------------------------------
// Vision metadata (mirror of `com.nihongoquest.common.media.VisionMetadata`)
// ---------------------------------------------------------------------------------------------

/**
 * `VisionMetadata.Attention` in declaration order — the ordinal is what travels on the wire.
 * Do not reorder: a reorder silently changes the meaning of every frame.
 */
export const VISION_ATTENTION_ORDER = [
  'LOOKING_AT_SCREEN',
  'LOOKING_AWAY',
  'NO_FACE',
  'MULTIPLE_FACES',
  'PHONE',
  'UNKNOWN'
] as const

export type VisionAttention = (typeof VISION_ATTENTION_ORDER)[number]

/** Wire ordinal -> enum name. Unknown ordinals degrade to `UNKNOWN`, matching the Java server. */
export function attentionFromOrdinal(ordinal: number): VisionAttention {
  return VISION_ATTENTION_ORDER[ordinal] ?? 'UNKNOWN'
}

/** Enum name -> wire ordinal (0..5). */
export function attentionOrdinal(attention: VisionAttention): number {
  return VISION_ATTENTION_ORDER.indexOf(attention)
}

/** Normalized 0..1 rectangle plus eye landmarks, so overlays scale with any canvas size. */
export interface FaceBox {
  x: number
  y: number
  width: number
  height: number
  leftEyeX: number
  leftEyeY: number
  rightEyeX: number
  rightEyeY: number
}

export interface VisionMetadata {
  /** Publisher frame sequence; `<= 0` is replaced by the frame sequence when decoding. */
  frameSequence: number
  /** 0 when the detector did not run. */
  analysedAtEpochMillis: number
  /** At most `MEDIA_MAX_FACES` entries. */
  faces: FaceBox[]
  gazeX: number
  gazeY: number
  attention: VisionAttention
  /** Clamped to 0..1 by the Java constructor; this side must clamp too. */
  confidence: number
}

/** `VisionMetadata.unavailable(sequence)` equivalent. */
export function unavailableVisionMetadata(frameSequence: number): VisionMetadata {
  return {
    frameSequence,
    analysedAtEpochMillis: 0,
    faces: [],
    gazeX: 0,
    gazeY: 0,
    attention: 'UNKNOWN',
    confidence: 0
  }
}

export function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.max(0, Math.min(1, value))
}
