import { describe, expect, it } from 'vitest'
import {
  MEDIA_ACK_CODES,
  MEDIA_ACK_EXPIRED_TICKET,
  MEDIA_ACK_INVALID_MAGIC,
  MEDIA_ACK_INVALID_TICKET,
  MEDIA_ACK_OK,
  MEDIA_ACK_ROOM_CLOSED,
  MEDIA_ACK_UNSUPPORTED_VERSION,
  MEDIA_FRAME_PUBLISH,
  MEDIA_FRAME_SUBSCRIBE,
  MEDIA_HANDSHAKE_HEADER_BYTES,
  MEDIA_HANDSHAKE_TIMEOUT_MILLIS,
  MEDIA_MAGIC,
  MEDIA_MAX_FACES,
  MEDIA_MAX_JPEG_BYTES,
  MEDIA_MAX_TICKET_BYTES,
  MEDIA_MIN_PUBLISH_FRAME_BYTES,
  MEDIA_PUBLISH_HEADER_BYTES,
  MEDIA_RELAY_HEADER_BYTES,
  MEDIA_ROLE_CODES,
  MEDIA_TICKET_TTL_MILLIS,
  MEDIA_VERSION,
  VISION_ATTENTION_ORDER,
  VISION_FACE_BOX_BYTES,
  VISION_METADATA_FIXED_BYTES,
  attentionFromOrdinal,
  attentionOrdinal,
  clampConfidence,
  isMediaAckCode,
  isMediaRoleCode,
  mediaAckMessage,
  unavailableVisionMetadata,
  type MediaAckCode
} from './media'

/**
 * Contract checks for the mirrored media protocol.
 *
 * The byte-for-byte comparison against `MediaProtocol.java` / `VisionMetadata.java` lives in
 * `src/main/net/protocol-compat.test.ts` (it needs `node:fs`; this folder is also compiled for
 * the renderer). Here we pin the literal values and the derived layout arithmetic.
 */
describe('media constants', () => {
  it('documents fixed protocol values', () => {
    expect(MEDIA_MAGIC).toBe(0x4e514d50)
    expect(MEDIA_VERSION).toBe(2)
    expect(MEDIA_MAX_TICKET_BYTES).toBe(512)
    expect(MEDIA_MAX_JPEG_BYTES).toBe(524_288)
    expect(MEDIA_MAX_FACES).toBe(6)
    expect(MEDIA_HANDSHAKE_TIMEOUT_MILLIS).toBe(10_000)
    expect(MEDIA_TICKET_TTL_MILLIS).toBe(60_000)
    expect(MEDIA_FRAME_PUBLISH).toBe(0x10)
    expect(MEDIA_FRAME_SUBSCRIBE).toBe(0x11)
  })

  it('keeps the ACK ladder 0..5', () => {
    expect(MEDIA_ACK_OK).toBe(0)
    expect(MEDIA_ACK_INVALID_MAGIC).toBe(1)
    expect(MEDIA_ACK_UNSUPPORTED_VERSION).toBe(2)
    expect(MEDIA_ACK_INVALID_TICKET).toBe(3)
    expect(MEDIA_ACK_EXPIRED_TICKET).toBe(4)
    expect(MEDIA_ACK_ROOM_CLOSED).toBe(5)
    expect(MEDIA_ACK_CODES).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('keeps the role byte codes from MediaProtocol.Role', () => {
    expect(MEDIA_ROLE_CODES.PUBLISHER).toBe(1)
    expect(MEDIA_ROLE_CODES.HOST_SUBSCRIBER).toBe(2)
  })

  it('computes the byte layout sizes used to buffer a frame', () => {
    expect(MEDIA_HANDSHAKE_HEADER_BYTES).toBe(4 + 1 + 1 + 2)
    expect(MEDIA_PUBLISH_HEADER_BYTES).toBe(1 + 8 + 8 + 4)
    expect(MEDIA_RELAY_HEADER_BYTES).toBe(1 + 8 + 8 + 8 + 4)
    expect(VISION_METADATA_FIXED_BYTES).toBe(8 + 8 + 1 + 8 + 8 + 4 + 1)
    expect(VISION_FACE_BOX_BYTES).toBe(8 * 4)
    expect(MEDIA_MIN_PUBLISH_FRAME_BYTES).toBe(
      MEDIA_PUBLISH_HEADER_BYTES + 1 + VISION_METADATA_FIXED_BYTES
    )
  })
})

describe('vision metadata mapping', () => {
  it('keeps the Java attention ordinal order', () => {
    expect([...VISION_ATTENTION_ORDER]).toEqual([
      'LOOKING_AT_SCREEN',
      'LOOKING_AWAY',
      'NO_FACE',
      'MULTIPLE_FACES',
      'PHONE',
      'UNKNOWN'
    ])
  })

  it('maps ordinals both ways and degrades unknown ordinals to UNKNOWN', () => {
    expect(attentionFromOrdinal(0)).toBe('LOOKING_AT_SCREEN')
    expect(attentionFromOrdinal(4)).toBe('PHONE')
    expect(attentionFromOrdinal(5)).toBe('UNKNOWN')
    expect(attentionFromOrdinal(6)).toBe('UNKNOWN')
    expect(attentionFromOrdinal(-1)).toBe('UNKNOWN')
    for (const [ordinal, attention] of VISION_ATTENTION_ORDER.entries()) {
      expect(attentionOrdinal(attention)).toBe(ordinal)
      expect(attentionFromOrdinal(ordinal)).toBe(attention)
    }
  })

  it('provides the unavailable() default used for frames without analysis', () => {
    expect(unavailableVisionMetadata(7)).toEqual({
      frameSequence: 7,
      analysedAtEpochMillis: 0,
      faces: [],
      gazeX: 0,
      gazeY: 0,
      attention: 'UNKNOWN',
      confidence: 0
    })
  })

  it('clamps confidence like the Java canonical constructor', () => {
    expect(clampConfidence(-1)).toBe(0)
    expect(clampConfidence(0.42)).toBe(0.42)
    expect(clampConfidence(3)).toBe(1)
    expect(clampConfidence(Number.NaN)).toBe(0)
  })
})

describe('media helpers', () => {
  it('guards ACK codes', () => {
    for (const ack of MEDIA_ACK_CODES) {
      expect(isMediaAckCode(ack)).toBe(true)
    }
    expect(isMediaAckCode(6)).toBe(false)
    expect(isMediaAckCode(-1)).toBe(false)
    expect(isMediaAckCode('0')).toBe(false)
    expect(isMediaAckCode(null)).toBe(false)
  })

  it('guards role codes', () => {
    expect(isMediaRoleCode(1)).toBe(true)
    expect(isMediaRoleCode(2)).toBe(true)
    expect(isMediaRoleCode(0)).toBe(false)
    expect(isMediaRoleCode(3)).toBe(false)
  })

  it('returns a distinct, non-secret message for every ACK', () => {
    const messages = MEDIA_ACK_CODES.map((ack: MediaAckCode) => mediaAckMessage(ack))
    expect(new Set(messages).size).toBe(MEDIA_ACK_CODES.length)
    for (const message of messages) {
      expect(message.length).toBeGreaterThan(0)
    }
  })
})
