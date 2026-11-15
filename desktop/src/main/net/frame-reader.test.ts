import { describe, expect, it } from 'vitest'
import { DEFAULT_MAX_FRAME_BYTES, FrameReader } from './frame-reader'
import { isProtocolError, type ProtocolErrorCode } from '../../shared/protocol/codec'

function errorCodeOf(run: () => unknown): ProtocolErrorCode | null {
  try {
    run()
    return null
  } catch (error) {
    return isProtocolError(error) ? error.code : null
  }
}

function collect(reader: FrameReader, chunks: readonly Buffer[]): string[] {
  const frames: string[] = []
  for (const chunk of chunks) {
    frames.push(...reader.push(chunk))
  }
  return frames
}

describe('FrameReader', () => {
  it('splits LF-terminated frames and ignores empty lines', () => {
    const reader = new FrameReader()
    expect(collect(reader, [Buffer.from('one\ntwo\n\nthree\n')])).toEqual(['one', 'two', 'three'])
    expect(reader.flush()).toBeNull()
  })

  it('accepts CRLF and strips only the CR of the terminator', () => {
    const reader = new FrameReader()
    expect(collect(reader, [Buffer.from('one\r\ntwo\r\n')])).toEqual(['one', 'two'])
  })

  it('does not strip a CR that is part of the payload', () => {
    const reader = new FrameReader()
    expect(collect(reader, [Buffer.from('ab\r\r\n')])).toEqual(['ab\r'])
  })

  it('handles several frames inside one chunk', () => {
    const reader = new FrameReader()
    expect(reader.push(Buffer.from('{"a":1}\n{"b":2}\n{"c":3}\n'))).toEqual([
      '{"a":1}',
      '{"b":2}',
      '{"c":3}'
    ])
  })

  it('handles a frame split across chunks', () => {
    const reader = new FrameReader()
    expect(reader.push(Buffer.from('{"type":"WAIT'))).toEqual([])
    expect(reader.bufferedBytes).toBe(13)
    expect(reader.push(Buffer.from('ING","payload":""}'))).toEqual([])
    expect(reader.push(Buffer.from('\n{"type":"DISCONNECT","payload":""}\n'))).toEqual([
      '{"type":"WAITING","payload":""}',
      '{"type":"DISCONNECT","payload":""}'
    ])
  })

  it('handles a multi-byte UTF-8 character split across chunks', () => {
    const reader = new FrameReader()
    const bytes = Buffer.from('こんにちは世界', 'utf8')
    // Every split point below is INSIDE a 3-byte character; the newline only comes last.
    expect(reader.push(bytes.subarray(0, 1))).toEqual([])
    expect(reader.bufferedBytes).toBe(1)
    expect(reader.push(bytes.subarray(1, 7))).toEqual([])
    expect(reader.push(Buffer.concat([bytes.subarray(7), Buffer.from('\n')]))).toEqual([
      'こんにちは世界'
    ])
    expect(reader.bufferedBytes).toBe(0)
  })

  it('buffers the start of a multi-byte character without corrupting the next frame', () => {
    const reader = new FrameReader()
    const japanese = Buffer.from('日本語', 'utf8')
    expect(reader.push(japanese.subarray(0, 2))).toEqual([])
    expect(reader.push(Buffer.concat([japanese.subarray(2), Buffer.from('\nnext\n')]))).toEqual([
      '日本語',
      'next'
    ])
  })

  it('returns the trailing frame on flush, exactly like BufferedReader.readLine()', () => {
    const reader = new FrameReader()
    expect(reader.push(Buffer.from('{"type":"WAITING","payload":null}'))).toEqual([])
    expect(reader.flush()).toBe('{"type":"WAITING","payload":null}')
    expect(reader.flush()).toBeNull()
  })

  it('flushes a trailing CRLF-less frame without the CR', () => {
    const reader = new FrameReader()
    reader.push(Buffer.from('tail\r'))
    expect(reader.flush()).toBe('tail')
  })

  it('ignores empty pushes and rejects non-buffer input', () => {
    const reader = new FrameReader()
    expect(reader.push(Buffer.alloc(0))).toEqual([])
    expect(reader.bufferedBytes).toBe(0)
    expect(() => reader.push('not a buffer' as unknown as Buffer)).toThrow(TypeError)
  })

  it('supports the callback style and unsubscribe', () => {
    const seen: string[] = []
    const reader = new FrameReader({ onFrame: (frame) => seen.push(frame) })
    const unsubscribe = reader.onFrame((frame) => seen.push(`extra:${frame}`))
    expect(reader.push(Buffer.from('a\n'))).toEqual(['a'])
    expect(seen).toEqual(['a', 'extra:a'])
    unsubscribe()
    reader.push(Buffer.from('b\n'))
    expect(seen).toEqual(['a', 'extra:a', 'b'])
    reader.push(Buffer.from('tail'))
    expect(reader.flush()).toBe('tail')
    expect(seen).toEqual(['a', 'extra:a', 'b', 'tail'])
  })

  it('enforces the frame limit with a typed error instead of buffering forever', () => {
    const reader = new FrameReader({ maxFrameBytes: 8 })
    let caught: unknown
    try {
      reader.push(Buffer.from('123456789'))
    } catch (error) {
      caught = error
    }
    expect(isProtocolError(caught)).toBe(true)
    if (isProtocolError(caught)) {
      expect(caught.code).toBe('FRAME_TOO_LARGE')
      // The error must never echo frame contents (they may hold credentials).
      expect(caught.message).not.toContain('123456789')
    }
    // The oversized frame is dropped, not retained.
    expect(reader.bufferedBytes).toBe(0)
  })

  it('counts bytes across chunks when enforcing the limit', () => {
    const reader = new FrameReader({ maxFrameBytes: 10 })
    expect(reader.push(Buffer.from('123456'))).toEqual([])
    expect(reader.push(Buffer.from('7890'))).toEqual([])
    expect(reader.bufferedBytes).toBe(10)
    expect(errorCodeOf(() => reader.push(Buffer.from('1')))).toBe('FRAME_TOO_LARGE')
  })

  it('accepts a frame that is exactly the limit', () => {
    const reader = new FrameReader({ maxFrameBytes: 10 })
    expect(reader.push(Buffer.from('0123456789\n'))).toEqual(['0123456789'])
  })

  it('rejects malformed UTF-8 instead of injecting replacement characters into JSON', () => {
    const reader = new FrameReader()
    // 0xFF is never a valid UTF-8 lead byte.
    expect(errorCodeOf(() => reader.push(Buffer.from([0x7b, 0xff, 0x7d, 0x0a])))).toBe(
      'INVALID_ENCODING'
    )
    expect(reader.bufferedBytes).toBe(0)
  })

  it('recovers with reset() after a framing failure', () => {
    const reader = new FrameReader({ maxFrameBytes: 4 })
    expect(errorCodeOf(() => reader.push(Buffer.from('12345')))).toBe('FRAME_TOO_LARGE')
    reader.reset()
    expect(reader.push(Buffer.from('ok\n'))).toEqual(['ok'])
  })

  it('defaults to an 8 MiB budget and validates the option', () => {
    expect(DEFAULT_MAX_FRAME_BYTES).toBe(8 * 1024 * 1024)
    expect(new FrameReader().maxFrameBytes).toBe(DEFAULT_MAX_FRAME_BYTES)
    expect(() => new FrameReader({ maxFrameBytes: 0 })).toThrow(RangeError)
    expect(() => new FrameReader({ maxFrameBytes: -1 })).toThrow(RangeError)
    expect(() => new FrameReader({ maxFrameBytes: 1.5 })).toThrow(RangeError)
    expect(() => new FrameReader({ maxFrameBytes: Number.NaN })).toThrow(RangeError)
  })

  it('keeps multiple frames correct when chunks end mid-frame', () => {
    const reader = new FrameReader()
    const frames = collect(reader, [
      Buffer.from('{"type":"A"'),
      Buffer.from('}\r\n{"type":"B"}'),
      Buffer.from('\n{"ty'),
      Buffer.from('pe":"C"}\n')
    ])
    expect(frames).toEqual(['{"type":"A"}', '{"type":"B"}', '{"type":"C"}'])
  })
})
