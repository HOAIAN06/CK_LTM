/**
 * Incremental newline framer for the NihongoQuest TCP control channel (main process only).
 *
 * Wire rule (mirrors Java `BufferedReader.readLine()`):
 *  - every application frame is one UTF-8 JSON document terminated by `\n`;
 *  - a trailing `\r` is tolerated, so both LF and CRLF work;
 *  - an empty line is ignored;
 *  - the incomplete remainder is kept for the next chunk.
 *
 * Chunks are scanned at the byte level because Node may split a multi-byte UTF-8 sequence across
 * TCP reads. `0x0A` never appears inside a UTF-8 sequence, so splitting on the newline byte and
 * decoding each complete frame afterwards is always safe (a `TextDecoder` also handles the
 * multi-byte character split across chunks for free).
 *
 * A frame that exceeds `maxFrameBytes` is rejected instead of buffered forever: a broken or
 * hostile peer must not be able to grow main-process memory without bound. The same applies to
 * malformed UTF-8 (`fatal: true`): a frame must never reach `JSON.parse` with U+FFFD inserted.
 *
 * Two styles are supported (use one per reader):
 * ```ts
 * const reader = new FrameReader()
 * socket.on('data', (chunk) => { for (const frame of reader.push(chunk)) handle(frame) })
 * const last = reader.flush() // frame without a trailing newline at EOF, or null
 * ```
 * ```ts
 * const reader = new FrameReader({ onFrame: handle })
 * ```
 */

import { TextDecoder } from 'node:util'
import { ProtocolError } from '../../shared/protocol/codec'

/** 8 MiB is far above any current control payload (quiz sets are a few KiB). */
export const DEFAULT_MAX_FRAME_BYTES = 8 * 1024 * 1024

export interface FrameReaderOptions {
  /** Hard limit for one frame, newline excluded. Defaults to `DEFAULT_MAX_FRAME_BYTES`. */
  maxFrameBytes?: number
  /** Push-style listener; `push()` still returns the frames it produced. */
  onFrame?: (frame: string) => void
}

const NEWLINE = 0x0a
const CARRIAGE_RETURN = 0x0d

export class FrameReader {
  readonly maxFrameBytes: number

  private readonly decoder: TextDecoder = new TextDecoder('utf-8', { fatal: true })
  private readonly listeners = new Set<(frame: string) => void>()
  /** Bytes of an incomplete frame, in arrival order. */
  private chunks: Buffer[] = []
  private bufferedByteCount = 0

  constructor(options: FrameReaderOptions = {}) {
    const maxFrameBytes = options.maxFrameBytes ?? DEFAULT_MAX_FRAME_BYTES
    if (!Number.isInteger(maxFrameBytes) || maxFrameBytes <= 0) {
      throw new RangeError('maxFrameBytes must be a positive integer')
    }
    this.maxFrameBytes = maxFrameBytes
    if (options.onFrame) {
      this.listeners.add(options.onFrame)
    }
  }

  /** Number of bytes retained for the current incomplete frame. */
  get bufferedBytes(): number {
    return this.bufferedByteCount
  }

  /** Register a push-style listener. Returns an unsubscribe function. */
  onFrame(listener: (frame: string) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Feed one TCP chunk and return every complete, non-empty frame it finished.
   *
   * @throws ProtocolError `FRAME_TOO_LARGE` or `INVALID_ENCODING`; the reader resets in both
   * cases because the stream can no longer be trusted (the transport closes the socket).
   */
  push(chunk: Buffer): string[] {
    if (!Buffer.isBuffer(chunk)) {
      throw new TypeError('FrameReader.push expects a Buffer')
    }
    if (chunk.length === 0) {
      return []
    }

    const frames: string[] = []
    let offset = 0

    while (offset < chunk.length) {
      const newline = chunk.indexOf(NEWLINE, offset)

      if (newline === -1) {
        const tail = chunk.subarray(offset)
        if (tail.length > 0) {
          this.chunks.push(Buffer.from(tail))
          this.bufferedByteCount += tail.length
        }
        if (this.bufferedByteCount > this.maxFrameBytes) {
          this.reset()
          throw new ProtocolError('FRAME_TOO_LARGE')
        }
        this.emit(frames)
        return frames
      }

      const segment = chunk.subarray(offset, newline)
      let frameBytes: Buffer
      if (this.chunks.length === 0) {
        frameBytes = segment
      } else {
        this.chunks.push(segment)
        frameBytes = Buffer.concat(this.chunks)
        this.chunks = []
        this.bufferedByteCount = 0
      }

      if (frameBytes.length > this.maxFrameBytes) {
        this.reset()
        throw new ProtocolError('FRAME_TOO_LARGE')
      }

      const frame = this.decodeFrame(frameBytes)
      if (frame.length > 0) {
        frames.push(frame)
      }

      offset = newline + 1
    }

    this.emit(frames)
    return frames
  }

  /**
   * Decode a final frame that was not newline-terminated (peer closed the stream).
   * Java's `readLine()` returns the same bytes as a last line at EOF.
   */
  flush(): string | null {
    if (this.bufferedByteCount === 0) {
      return null
    }

    const frameBytes = this.chunks.length === 1 ? this.chunks[0] : Buffer.concat(this.chunks)
    this.reset()

    if (frameBytes.length > this.maxFrameBytes) {
      throw new ProtocolError('FRAME_TOO_LARGE')
    }

    const frame = this.decodeFrame(frameBytes)
    if (frame.length === 0) {
      return null
    }
    this.emit([frame])
    return frame
  }

  /** Drop any buffered partial frame. Call when a connection is replaced. */
  reset(): void {
    this.chunks = []
    this.bufferedByteCount = 0
  }

  private decodeFrame(bytes: Uint8Array): string {
    let text: string
    try {
      text = this.decoder.decode(bytes)
    } catch {
      this.reset()
      throw new ProtocolError('INVALID_ENCODING')
    }

    // Strip at most one CR: Java treats "\r\n" as the terminator, a preceding CR is data.
    if (text.length > 0 && text.charCodeAt(text.length - 1) === CARRIAGE_RETURN) {
      return text.slice(0, -1)
    }
    return text
  }

  private emit(frames: string[]): void {
    if (frames.length === 0 || this.listeners.size === 0) {
      return
    }
    for (const frame of frames) {
      for (const listener of this.listeners) {
        listener(frame)
      }
    }
  }
}
