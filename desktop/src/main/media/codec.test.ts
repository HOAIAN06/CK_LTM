/**
 * Codec của kênh media: đây là phần **quyết định tương thích** với Java
 * (`MediaProtocol.java` VERSION 2), nên test khoá từng byte offset và từng mã ACK.
 *
 * Golden vector được tính tay theo layout trong `docs/protocol.md` §8.2 và đối chiếu với
 * `java.io.DataOutputStream` (big-endian, float/double IEEE-754).
 */
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
  MEDIA_MAX_FACES,
  MEDIA_MAX_JPEG_BYTES,
  MEDIA_MAX_TICKET_BYTES,
  MEDIA_ROLE_CODES,
  MEDIA_VERSION,
  unavailableVisionMetadata,
  type VisionMetadata
} from '@shared/protocol/media'
import {
  MEDIA_MAX_RELAY_FRAME_BYTES,
  MediaCodecError,
  RelayedFrameDecoder,
  decodeAck,
  decodePublishedFrame,
  encodeHandshake,
  encodePublishedFrame,
  encodeRelayedFrame,
  normalizeVision,
  visionByteLength
} from './codec'

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xd9])

describe('encodeHandshake', () => {
  it('uses one fixed byte layout: magic/version/role/length/ticket', () => {
    const buffer = encodeHandshake(MEDIA_ROLE_CODES.PUBLISHER, 'abc')
    // Golden vector: 8 byte header + "abc".
    expect(buffer.toString('hex').toUpperCase()).toBe('4E514D5002010003616263')

    // Từng offset, để một thay đổi layout không thể lọt qua.
    expect(buffer.readInt32BE(0)).toBe(0x4e514d50)
    expect(buffer.readUInt8(4)).toBe(MEDIA_VERSION)
    expect(buffer.readUInt8(5)).toBe(1)
    expect(buffer.readUInt16BE(6)).toBe(3)
    expect(buffer.subarray(8).toString('utf8')).toBe('abc')
    expect(buffer.length).toBe(8 + 3)
  })

  it('writes the host subscriber role as 2', () => {
    const buffer = encodeHandshake(MEDIA_ROLE_CODES.HOST_SUBSCRIBER, 't')
    expect(buffer.readUInt8(5)).toBe(2)
    expect(buffer.readUInt16BE(6)).toBe(1)
  })

  it('counts ticket bytes in UTF-8, not characters', () => {
    const buffer = encodeHandshake(MEDIA_ROLE_CODES.PUBLISHER, 'vé') // v (1) + é (2)
    expect(buffer.readUInt16BE(6)).toBe(3)
    expect(buffer.length).toBe(11)
  })

  it('accepts the 512 byte ticket limit and rejects 513 bytes', () => {
    const max = 'a'.repeat(MEDIA_MAX_TICKET_BYTES)
    expect(encodeHandshake(MEDIA_ROLE_CODES.PUBLISHER, max).length).toBe(8 + 512)

    const tooLong = 'a'.repeat(MEDIA_MAX_TICKET_BYTES + 1)
    expect(() => encodeHandshake(MEDIA_ROLE_CODES.PUBLISHER, tooLong)).toThrow(MediaCodecError)
    expect(() => encodeHandshake(MEDIA_ROLE_CODES.PUBLISHER, tooLong)).toThrowError(
      /ticket media/i
    )
  })

  it('rejects empty tickets before writing anything', () => {
    expect(() => encodeHandshake(MEDIA_ROLE_CODES.PUBLISHER, '')).toThrowError(
      expect.objectContaining({ code: 'INVALID_TICKET_LENGTH' })
    )
  })

  it('rejects an unknown role code', () => {
    expect(() => encodeHandshake(9 as never, 'abc')).toThrowError(
      expect.objectContaining({ code: 'INVALID_ROLE' })
    )
  })
})

describe('decodeAck', () => {
  it('maps every documented ACK byte 0..5', () => {
    expect(MEDIA_ACK_CODES).toEqual([0, 1, 2, 3, 4, 5])
    expect(decodeAck(0)).toBe(MEDIA_ACK_OK)
    expect(decodeAck(1)).toBe(MEDIA_ACK_INVALID_MAGIC)
    expect(decodeAck(2)).toBe(MEDIA_ACK_UNSUPPORTED_VERSION)
    expect(decodeAck(3)).toBe(MEDIA_ACK_INVALID_TICKET)
    expect(decodeAck(4)).toBe(MEDIA_ACK_EXPIRED_TICKET)
    expect(decodeAck(5)).toBe(MEDIA_ACK_ROOM_CLOSED)
  })

  it('rejects bytes outside the protocol instead of guessing', () => {
    for (const value of [6, 7, 255, -1, 1.5, Number.NaN]) {
      expect(() => decodeAck(value)).toThrowError(
        expect.objectContaining({ code: 'INVALID_ACK' })
      )
    }
  })
})

describe('encodePublishedFrame (0x10)', () => {
  const vision: VisionMetadata = {
    frameSequence: 1,
    analysedAtEpochMillis: 0,
    faces: [],
    gazeX: 0.5,
    gazeY: 0.25,
    attention: 'LOOKING_AT_SCREEN',
    confidence: 1
  }

  it('matches the golden byte vector at every offset', () => {
    const buffer = encodePublishedFrame({
      sequence: 1,
      captureEpochMillis: 1000,
      jpeg: JPEG,
      vision
    })

    expect(buffer.toString('hex').toUpperCase()).toBe(
      '10' +
        '0000000000000001' +
        '00000000000003E8' +
        '00000004' +
        'FFD8FFD9' +
        '0000000000000001' +
        '0000000000000000' +
        '00' +
        '3FE0000000000000' +
        '3FD0000000000000' +
        '3F800000' +
        '00'
    )

    expect(buffer.length).toBe(21 + 4 + 38)
    expect(buffer.readUInt8(0)).toBe(MEDIA_FRAME_PUBLISH)
    expect(buffer.readBigInt64BE(1)).toBe(1n)
    expect(buffer.readBigInt64BE(9)).toBe(1000n)
    expect(buffer.readInt32BE(17)).toBe(4)
    expect(buffer.subarray(21, 25)).toEqual(JPEG)
    // Vision bắt đầu ngay sau JPEG.
    expect(buffer.readBigInt64BE(25)).toBe(1n)
    expect(buffer.readBigInt64BE(33)).toBe(0n)
    expect(buffer.readUInt8(41)).toBe(0)
    expect(buffer.readDoubleBE(42)).toBe(0.5)
    expect(buffer.readDoubleBE(50)).toBe(0.25)
    expect(buffer.readFloatBE(58)).toBe(1)
    expect(buffer.readUInt8(62)).toBe(0)
  })

  it('round-trips through decodePublishedFrame', () => {
    const encoded = encodePublishedFrame({
      sequence: 42,
      captureEpochMillis: 1_700_000_000_000,
      jpeg: JPEG,
      vision
    })
    const decoded = decodePublishedFrame(encoded)
    expect(decoded.sequence).toBe(42)
    expect(decoded.captureEpochMillis).toBe(1_700_000_000_000)
    expect(Buffer.from(decoded.jpeg)).toEqual(JPEG)
    expect(decoded.vision.gazeX).toBe(0.5)
    expect(decoded.vision.attention).toBe('LOOKING_AT_SCREEN')
  })

  it('enforces the JPEG ceiling in both directions', () => {
    const atLimit = Buffer.alloc(MEDIA_MAX_JPEG_BYTES, 1)
    const encoded = encodePublishedFrame({ sequence: 1, captureEpochMillis: 1, jpeg: atLimit })
    expect(encoded.readInt32BE(17)).toBe(MEDIA_MAX_JPEG_BYTES)

    const tooLarge = Buffer.alloc(MEDIA_MAX_JPEG_BYTES + 1, 1)
    expect(() =>
      encodePublishedFrame({ sequence: 1, captureEpochMillis: 1, jpeg: tooLarge })
    ).toThrowError(expect.objectContaining({ code: 'JPEG_TOO_LARGE' }))
    expect(() =>
      encodePublishedFrame({ sequence: 1, captureEpochMillis: 1, jpeg: Buffer.alloc(0) })
    ).toThrowError(expect.objectContaining({ code: 'JPEG_EMPTY' }))
  })

  it('caps face boxes at six and clamps confidence', () => {
    const faces = Array.from({ length: 9 }, (_, index) => ({
      x: index,
      y: index,
      width: 1,
      height: 1,
      leftEyeX: 0,
      leftEyeY: 0,
      rightEyeX: 0,
      rightEyeY: 0
    }))
    const encoded = encodePublishedFrame({
      sequence: 5,
      captureEpochMillis: 1,
      jpeg: JPEG,
      vision: { ...vision, faces, confidence: 7 }
    })
    const decoded = decodePublishedFrame(encoded)
    expect(decoded.vision.faces).toHaveLength(MEDIA_MAX_FACES)
    expect(decoded.vision.confidence).toBe(1)
    expect(encoded.length).toBe(21 + 4 + 38 + MEDIA_MAX_FACES * 32)
  })
})

describe('encodeRelayedFrame (0x11)', () => {
  it('matches the golden byte vector at every offset', () => {
    const buffer = encodeRelayedFrame({
      userId: 7,
      sequence: 3,
      serverReceivedEpochMillis: 1_700_000_000_000,
      jpeg: Buffer.from([0x01, 0x02, 0x03, 0x04]),
      vision: {
        frameSequence: 3,
        analysedAtEpochMillis: 1_700_000_000_123,
        faces: [],
        gazeX: 0,
        gazeY: 0,
        attention: 'NO_FACE',
        confidence: 0.5
      }
    })

    expect(buffer.toString('hex').toUpperCase()).toBe(
      '11' +
        '0000000000000007' +
        '0000000000000003' +
        '0000018BCFE56800' +
        '00000004' +
        '01020304' +
        '0000000000000003' +
        '0000018BCFE5687B' +
        '02' +
        '0000000000000000' +
        '0000000000000000' +
        '3F000000' +
        '00'
    )
    expect(buffer.length).toBe(29 + 4 + 38)
    expect(buffer.readUInt8(0)).toBe(MEDIA_FRAME_SUBSCRIBE)
    expect(buffer.readBigInt64BE(1)).toBe(7n)
    expect(buffer.readBigInt64BE(9)).toBe(3n)
    expect(buffer.readBigInt64BE(17)).toBe(1_700_000_000_000n)
    expect(buffer.readInt32BE(25)).toBe(4)
    expect(buffer.subarray(29, 33)).toEqual(Buffer.from([1, 2, 3, 4]))
    expect(buffer.readBigInt64BE(33)).toBe(3n)
  })

  it('round-trips through the stream decoder', () => {
    const encoded = encodeRelayedFrame({
      userId: 11,
      sequence: 9,
      serverReceivedEpochMillis: 1_700_000_000_500,
      jpeg: JPEG,
      vision: unavailableVisionMetadata(9)
    })
    const decoder = new RelayedFrameDecoder()
    const frames = decoder.push(encoded)
    expect(frames).toHaveLength(1)
    expect(frames[0]).toMatchObject({ userId: 11, sequence: 9 })
    expect(frames[0].serverReceivedEpochMillis).toBe(1_700_000_000_500)
    expect(Buffer.from(frames[0].jpeg)).toEqual(JPEG)
    expect(frames[0].vision.attention).toBe('UNKNOWN')
  })
})

describe('RelayedFrameDecoder', () => {
  const frame = (userId: number, sequence: number): Buffer =>
    encodeRelayedFrame({
      userId,
      sequence,
      serverReceivedEpochMillis: 1_700_000_000_000 + sequence,
      jpeg: JPEG
    })

  it('waits for a complete frame and yields it byte by byte', () => {
    const encoded = frame(3, 1)
    const decoder = new RelayedFrameDecoder()

    for (let index = 0; index < encoded.length - 1; index += 1) {
      expect(decoder.push(encoded.subarray(index, index + 1))).toEqual([])
    }
    const frames = decoder.push(encoded.subarray(encoded.length - 1))
    expect(frames).toHaveLength(1)
    expect(frames[0].userId).toBe(3)
    expect(decoder.bufferedBytes).toBe(0)
  })

  it('splits multiple frames arriving in a single chunk', () => {
    const decoder = new RelayedFrameDecoder()
    const frames = decoder.push(Buffer.concat([frame(1, 1), frame(2, 1), frame(1, 2)]))
    expect(frames.map((entry) => [entry.userId, entry.sequence])).toEqual([
      [1, 1],
      [2, 1],
      [1, 2]
    ])
  })

  it('rejects an unknown frame type immediately', () => {
    const decoder = new RelayedFrameDecoder()
    expect(() => decoder.push(Buffer.from([0x99]))).toThrowError(
      expect.objectContaining({ code: 'UNSUPPORTED_FRAME_TYPE' })
    )
  })

  it('rejects a jpeg length above the protocol limit', () => {
    const encoded = frame(1, 1)
    encoded.writeInt32BE(MEDIA_MAX_JPEG_BYTES + 1, 25)
    const decoder = new RelayedFrameDecoder()
    expect(() => decoder.push(encoded)).toThrowError(
      expect.objectContaining({ code: 'JPEG_TOO_LARGE' })
    )
  })

  it('rejects a zero jpeg length', () => {
    const encoded = frame(1, 1)
    encoded.writeInt32BE(0, 25)
    const decoder = new RelayedFrameDecoder()
    expect(() => decoder.push(encoded)).toThrowError(
      expect.objectContaining({ code: 'JPEG_EMPTY' })
    )
  })

  it('rejects more than six face boxes', () => {
    const encoded = frame(1, 1)
    encoded.writeUInt8(MEDIA_MAX_FACES + 1, encoded.length - 1)
    const decoder = new RelayedFrameDecoder()
    expect(() => decoder.push(encoded)).toThrowError(
      expect.objectContaining({ code: 'TOO_MANY_FACES' })
    )
  })

  it('bounds memory when a frame never completes', () => {
    const encoded = frame(1, 1)
    // Header hợp lệ nhưng jpeg khai báo 500 000 byte và không bao giờ tới.
    encoded.writeInt32BE(500_000, 25)
    const decoder = new RelayedFrameDecoder(64)
    expect(() => decoder.push(encoded.subarray(0, 65))).toThrowError(
      expect.objectContaining({ code: 'BUFFER_OVERFLOW' })
    )
  })

  it('rejects garbage that does not describe a valid frame', () => {
    const decoder = new RelayedFrameDecoder()
    expect(() => decoder.push(Buffer.alloc(65, 0x11))).toThrowError(MediaCodecError)
  })

  it('documents the maximum relayed frame size', () => {
    expect(MEDIA_MAX_RELAY_FRAME_BYTES).toBe(29 + 524_288 + 38 + 6 * 32)
  })
})

describe('vision metadata', () => {
  it('degrades unknown ordinals to UNKNOWN and falls back to the frame sequence', () => {
    const encoded = encodeRelayedFrame({
      userId: 1,
      sequence: 12,
      serverReceivedEpochMillis: 1,
      jpeg: JPEG,
      vision: { ...unavailableVisionMetadata(0), attention: 'UNKNOWN' }
    })
    // Ordinal 9 không tồn tại: server Java cũng đọc thành UNKNOWN.
    encoded.writeUInt8(9, 29 + 4 + 16)
    const decoder = new RelayedFrameDecoder()
    const [decoded] = decoder.push(encoded)
    expect(decoded.vision.attention).toBe('UNKNOWN')
    expect(decoded.vision.frameSequence).toBe(12)
  })

  it('normalizes partial metadata and computes its wire size', () => {
    const vision = normalizeVision({ gazeX: 0.1, confidence: 2 }, 4)
    expect(vision).toMatchObject({
      frameSequence: 4,
      gazeX: 0.1,
      gazeY: 0,
      confidence: 1,
      attention: 'UNKNOWN',
      faces: []
    })
    expect(visionByteLength(vision)).toBe(38)
    expect(
      visionByteLength({
        ...vision,
        faces: [
          {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            leftEyeX: 0,
            leftEyeY: 0,
            rightEyeX: 0,
            rightEyeY: 0
          }
        ]
      })
    ).toBe(38 + 32)
  })
})
