/**
 * JSON-line codec for the NihongoQuest TCP control channel.
 *
 * Wire format (mirrors `com.nihongoquest.common.protocol.Message`):
 *   {"type":"<MessageType>","payload":<object|string|null>}
 *
 * `encodeMessage` returns ONE line without a trailing newline; the transport appends `\n`.
 * `decodeMessage` validates only the envelope — never gameplay semantics — and never includes
 * payload contents in an error (payloads can contain passwords, PINs and media tickets).
 */

import { isMessageType } from './message-types'
import type { OutboundMessage, ServerMessage } from './payloads'

export type ProtocolErrorCode =
  | 'EMPTY_LINE'
  | 'INVALID_JSON'
  | 'MISSING_TYPE'
  | 'UNKNOWN_TYPE'
  | 'INVALID_PAYLOAD'
  | 'INVALID_ENCODING'
  | 'FRAME_TOO_LARGE'

/**
 * Stable, payload-free error strings. They are safe to forward to the renderer and to logs.
 * Do not interpolate wire data into these messages.
 */
export const PROTOCOL_ERROR_MESSAGES: Readonly<Record<ProtocolErrorCode, string>> = {
  EMPTY_LINE: 'Message frame is empty',
  INVALID_JSON: 'Message frame is not a JSON object',
  MISSING_TYPE: 'Message frame has no type',
  UNKNOWN_TYPE: 'Message type is not part of the protocol',
  INVALID_PAYLOAD: 'Message payload must be an object, a string or null',
  INVALID_ENCODING: 'Message frame is not valid UTF-8',
  FRAME_TOO_LARGE: 'Message frame exceeds the maximum size'
}

export class ProtocolError extends Error {
  readonly code: ProtocolErrorCode

  constructor(code: ProtocolErrorCode) {
    super(PROTOCOL_ERROR_MESSAGES[code])
    this.name = 'ProtocolError'
    this.code = code
    // Keep `instanceof` working when the class is compiled down to ES5-style functions.
    Object.setPrototypeOf(this, ProtocolError.prototype)
  }
}

export function isProtocolError(value: unknown): value is ProtocolError {
  return value instanceof ProtocolError
}

/**
 * Serialize one frame. The result contains no newline (JSON escapes any newline inside string
 * payloads), so the transport owns framing: `socket.write(encodeMessage(frame) + '\n')`.
 *
 * `frame.type` is validated at runtime because the value crosses an IPC boundary. Native
 * `JSON.stringify` errors are intentionally discarded: their messages can quote payload keys and
 * this layer must never leak credentials, PINs or media tickets.
 *
 * @throws ProtocolError with a stable, payload-free `code`.
 */
export function encodeMessage(frame: OutboundMessage): string {
  if (typeof frame !== 'object' || frame === null) {
    throw new ProtocolError('INVALID_PAYLOAD')
  }
  if (!isMessageType(frame.type)) {
    throw new ProtocolError('UNKNOWN_TYPE')
  }

  try {
    return JSON.stringify({ type: frame.type, payload: frame.payload }, (_key, value: unknown) => {
      // `JSON.stringify(NaN)` silently becomes `null`, which would reach Java as NullNode.
      if (typeof value === 'number' && !Number.isFinite(value)) {
        throw new ProtocolError('INVALID_PAYLOAD')
      }
      return value
    })
  } catch {
    throw new ProtocolError('INVALID_PAYLOAD')
  }
}

/**
 * Parse one newline-delimited frame.
 *
 * Tolerates the three shapes the Java side produces:
 *  - `payload: null`   (e.g. `new Message(WAITING, "")` -> `NullNode`)
 *  - `payload: ""`     (`TextNode` with an empty string)
 *  - `payload: "CODE"` (business error codes)
 * and also accepts a missing `payload` key, which Jackson maps to `NullNode`.
 *
 * @throws ProtocolError with a stable `code`; the message never contains wire data.
 */
export function decodeMessage(line: string): ServerMessage {
  if (typeof line !== 'string' || line.trim().length === 0) {
    throw new ProtocolError('EMPTY_LINE')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(line.trim())
  } catch {
    throw new ProtocolError('INVALID_JSON')
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new ProtocolError('INVALID_JSON')
  }

  const envelope: Record<string, unknown> = parsed as Record<string, unknown>
  const type: unknown = envelope.type

  if (type === undefined || type === null) {
    throw new ProtocolError('MISSING_TYPE')
  }
  if (!isMessageType(type)) {
    throw new ProtocolError('UNKNOWN_TYPE')
  }

  const payload: unknown = Object.prototype.hasOwnProperty.call(envelope, 'payload')
    ? envelope.payload
    : null

  if (!isEnvelopePayload(payload)) {
    throw new ProtocolError('INVALID_PAYLOAD')
  }

  // Trusted boundary: the envelope is validated, payload typing stays compile-time only.
  return { type, payload } as unknown as ServerMessage
}

function isEnvelopePayload(value: unknown): value is Record<string, unknown> | string | null {
  if (value === null || typeof value === 'string') {
    return true
  }
  return typeof value === 'object' && !Array.isArray(value)
}

/** Compile-time helper: a `MessageType` known to be a client -> server type. */
export type OutboundType = OutboundMessage['type']

/** Compile-time helper: a `MessageType` known to be a server -> client type. */
export type InboundType = ServerMessage['type']
