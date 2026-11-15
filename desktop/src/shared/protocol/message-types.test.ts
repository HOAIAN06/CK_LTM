import { describe, expect, it } from 'vitest'
import { MESSAGE_TYPES, isMessageType } from './message-types'

/**
 * Contract checks for the mirrored `MessageType` enum.
 *
 * The Java file (`MessageType.java`) is the source of truth: **71** constants ending with
 * `DISCONNECT` (Phase-2 notes mention 78, the Java file wins — docs/desktop/protocol.md §2.1).
 * The Java-vs-TypeScript comparison itself lives in `src/main/net/protocol-compat.test.ts`,
 * because it needs `node:fs` and this folder is also compiled for the renderer (`tsconfig.web`).
 */
describe('MESSAGE_TYPES', () => {
  it('has no duplicates', () => {
    expect(new Set(MESSAGE_TYPES).size).toBe(MESSAGE_TYPES.length)
  })

  it('contains the spot-checked names from the Java enum', () => {
    expect(MESSAGE_TYPES[0]).toBe('CONNECT')
    expect(MESSAGE_TYPES).toContain('LOGIN')
    expect(MESSAGE_TYPES).toContain('QUIZ_REJOINED')
    expect(MESSAGE_TYPES).toContain('PROCTOR_MEDIA_SESSION')
    expect(MESSAGE_TYPES[MESSAGE_TYPES.length - 1]).toBe('DISCONNECT')
  })

  it('keeps the Java declaration order at fixed offsets', () => {
    expect(MESSAGE_TYPES.indexOf('LOGIN_OK')).toBe(5)
    expect(MESSAGE_TYPES.indexOf('QUIZ_SET_LIST')).toBe(40)
    expect(MESSAGE_TYPES.indexOf('QUIZ_ROOM_START')).toBe(55)
    expect(MESSAGE_TYPES.indexOf('QUIZ_REJOINED')).toBe(62)
    expect(MESSAGE_TYPES.indexOf('PROCTOR_MEDIA_SESSION')).toBe(68)
    expect(MESSAGE_TYPES.indexOf('QUIZ_ERROR')).toBe(69)
    expect(MESSAGE_TYPES.indexOf('DISCONNECT')).toBe(70)
  })

  it('is frozen at 71 values, the real size of MessageType.java', () => {
    // If this fails, MessageType.java changed: update this array AND docs/protocol.md together.
    expect(MESSAGE_TYPES).toHaveLength(71)
  })

  it('guards untrusted values with isMessageType', () => {
    expect(isMessageType('CONNECT')).toBe(true)
    expect(isMessageType('DISCONNECT')).toBe(true)
    expect(isMessageType('connect')).toBe(false)
    expect(isMessageType('DATABASE_ERROR')).toBe(false)
    expect(isMessageType('')).toBe(false)
    expect(isMessageType(null)).toBe(false)
    expect(isMessageType(undefined)).toBe(false)
    expect(isMessageType(42)).toBe(false)
    expect(isMessageType({ type: 'CONNECT' })).toBe(false)
  })
})
