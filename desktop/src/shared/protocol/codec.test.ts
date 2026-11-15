import { describe, expect, it } from 'vitest'
import {
  ProtocolError,
  decodeMessage,
  encodeMessage,
  isProtocolError,
  type ProtocolErrorCode
} from './codec'
import type { OutboundMessage } from './payloads'

function errorCodeOf(run: () => unknown): ProtocolErrorCode | null {
  try {
    run()
    return null
  } catch (error) {
    return isProtocolError(error) ? error.code : null
  }
}

describe('encodeMessage', () => {
  it('produces one newline-free JSON envelope', () => {
    const encoded = encodeMessage({
      type: 'LOGIN',
      payload: { username: 'an', password: 'secret' }
    })

    expect(encoded).toBe('{"type":"LOGIN","payload":{"username":"an","password":"secret"}}')
    expect(encoded).not.toContain('\n')
  })

  it('escapes newlines inside string payloads instead of creating extra frames', () => {
    const encoded = encodeMessage({
      type: 'QUIZ_SET_SAVE',
      payload: {
        id: null,
        title: 'line 1\nline 2',
        description: '',
        level: 'N5',
        questions: []
      }
    })

    expect(encoded).not.toContain('\n')
    expect(JSON.parse(encoded).payload.title).toBe('line 1\nline 2')
  })

  it('keeps an empty payload as "" (Java TextNode) rather than omitting it', () => {
    expect(encodeMessage({ type: 'CANCEL_MATCH', payload: '' })).toBe(
      '{"type":"CANCEL_MATCH","payload":""}'
    )
    expect(encodeMessage({ type: 'CONNECT', payload: '' })).toBe('{"type":"CONNECT","payload":""}')
  })

  it('rejects an unknown runtime type without echoing it', () => {
    const frame = { type: 'login', payload: '' } as unknown as OutboundMessage
    const code = errorCodeOf(() => encodeMessage(frame))

    expect(code).toBe('UNKNOWN_TYPE')
    try {
      encodeMessage(frame)
    } catch (error) {
      expect((error as Error).message).not.toContain('login')
    }
  })

  it('rejects non-JSON payloads with a payload-free error', () => {
    const circular: Record<string, unknown> = { password: 'super-secret' }
    circular['self'] = circular

    const code = errorCodeOf(() =>
      encodeMessage({ type: 'ANSWER', payload: circular } as unknown as OutboundMessage)
    )

    expect(code).toBe('INVALID_PAYLOAD')
    try {
      encodeMessage({ type: 'ANSWER', payload: circular } as unknown as OutboundMessage)
    } catch (error) {
      expect((error as Error).message).not.toContain('super-secret')
    }
  })

  it('rejects non-finite numbers instead of silently writing null', () => {
    const frame = {
      type: 'ANSWER',
      payload: { sessionId: 'room-1', attempt: 1, questionId: Number.NaN, choiceId: 101 }
    } as unknown as OutboundMessage

    expect(errorCodeOf(() => encodeMessage(frame))).toBe('INVALID_PAYLOAD')
  })

  it('rejects non-object frames from an untyped IPC boundary', () => {
    expect(errorCodeOf(() => encodeMessage(null as unknown as OutboundMessage))).toBe(
      'INVALID_PAYLOAD'
    )
  })
})

describe('decodeMessage', () => {
  it('round-trips every supported payload shape', () => {
    const frames = [
      '{"type":"WAITING","payload":null}',
      '{"type":"QUIZ_ERROR","payload":"INVALID_PIN"}',
      '{"type":"SCORE_UPDATE","payload":{"myScore":3,"opponentScore":2}}',
      '{"type":"QUIZ_SET_SAVED","payload":{"quizSetId":7}}'
    ]

    for (const frame of frames) {
      const decoded = decodeMessage(frame)
      expect(JSON.parse(encodeMessage(decoded as unknown as OutboundMessage))).toEqual(
        JSON.parse(frame)
      )
    }
  })

  it('accepts CRLF and surrounding whitespace', () => {
    expect(decodeMessage('  {"type":"WAITING","payload":null}\r\n')).toEqual({
      type: 'WAITING',
      payload: null
    })
  })

  it('treats a missing payload key like Jackson NullNode', () => {
    expect(decodeMessage('{"type":"WAITING"}')).toEqual({ type: 'WAITING', payload: null })
  })

  it('ignores unknown envelope fields', () => {
    expect(decodeMessage('{"type":"WAITING","payload":null,"extra":1}')).toEqual({
      type: 'WAITING',
      payload: null
    })
  })

  it('rejects empty and whitespace-only frames', () => {
    expect(errorCodeOf(() => decodeMessage(''))).toBe('EMPTY_LINE')
    expect(errorCodeOf(() => decodeMessage('   \r\n'))).toBe('EMPTY_LINE')
  })

  it('rejects malformed JSON without echoing the input', () => {
    expect(errorCodeOf(() => decodeMessage('{"type":"LOGIN"'))).toBe('INVALID_JSON')

    try {
      decodeMessage('{"type":"LOGIN","payload":{"password":"super-secret"')
    } catch (error) {
      expect((error as Error).message).not.toContain('super-secret')
    }
  })

  it('rejects non-object roots', () => {
    expect(errorCodeOf(() => decodeMessage('[]'))).toBe('INVALID_JSON')
    expect(errorCodeOf(() => decodeMessage('"LOGIN"'))).toBe('INVALID_JSON')
    expect(errorCodeOf(() => decodeMessage('null'))).toBe('INVALID_JSON')
    expect(errorCodeOf(() => decodeMessage('42'))).toBe('INVALID_JSON')
  })

  it('requires a known type', () => {
    expect(errorCodeOf(() => decodeMessage('{"payload":null}'))).toBe('MISSING_TYPE')
    expect(errorCodeOf(() => decodeMessage('{"type":null,"payload":null}'))).toBe('MISSING_TYPE')
    expect(errorCodeOf(() => decodeMessage('{"type":"DATABASE_ERROR","payload":null}'))).toBe(
      'UNKNOWN_TYPE'
    )
    expect(errorCodeOf(() => decodeMessage('{"type":"login","payload":null}'))).toBe('UNKNOWN_TYPE')
  })

  it('restricts payloads to object, string or null (current Java output)', () => {
    expect(errorCodeOf(() => decodeMessage('{"type":"WAITING","payload":[]}'))).toBe(
      'INVALID_PAYLOAD'
    )
    expect(errorCodeOf(() => decodeMessage('{"type":"WAITING","payload":0}'))).toBe(
      'INVALID_PAYLOAD'
    )
    expect(errorCodeOf(() => decodeMessage('{"type":"WAITING","payload":true}'))).toBe(
      'INVALID_PAYLOAD'
    )
  })

  it('returns a ProtocolError instance with a stable code', () => {
    try {
      decodeMessage('')
      throw new Error('expected decodeMessage to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(ProtocolError)
      expect(isProtocolError(error)).toBe(true)
      expect((error as ProtocolError).name).toBe('ProtocolError')
      expect((error as ProtocolError).code).toBe('EMPTY_LINE')
    }
  })
})
