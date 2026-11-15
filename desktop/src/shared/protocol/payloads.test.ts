import { describe, expect, it } from 'vitest'
import { decodeMessage, encodeMessage } from './codec'
import { MESSAGE_TYPES } from './message-types'
import {
  CLIENT_TO_SERVER_TYPES,
  SERVER_TO_CLIENT_TYPES,
  type ClientToServerPayloadMap,
  type ClientToServerType,
  type OutboundMessage,
  type QuizLobbyData,
  type QuizSetEdit,
  type ServerToClientPayloadMap,
  type ServerToClientType
} from './payloads'

/**
 * Compile-time exhaustiveness: every key of a direction map must appear in the matching
 * runtime array. `false` is not assignable to `true`, so a missing type fails `tsc`, not just
 * a runtime assertion.
 */
type MissingClientType = Exclude<keyof ClientToServerPayloadMap, ClientToServerType>
type MissingServerType = Exclude<keyof ServerToClientPayloadMap, ServerToClientType>

const CLIENT_COVERAGE_COMPLETE: MissingClientType extends never ? true : false = true
const SERVER_COVERAGE_COMPLETE: MissingServerType extends never ? true : false = true

const DUAL_DIRECTION_TYPES = [
  'FRIEND_REQUEST_LIST',
  'FRIEND_REQUEST_RESPOND',
  'FRIEND_LIST',
  'QUIZ_ROOM_START',
  'QUIZ_ROOM_CANCEL'
] as const

describe('payload direction maps', () => {
  it('covers every Java payload in exactly one direction (except documented duals)', () => {
    const client = new Set<string>(CLIENT_TO_SERVER_TYPES)
    const server = new Set<string>(SERVER_TO_CLIENT_TYPES)

    expect(CLIENT_COVERAGE_COMPLETE).toBe(true)
    expect(SERVER_COVERAGE_COMPLETE).toBe(true)

    const union = new Set<string>([...client, ...server])
    expect([...union].sort()).toEqual([...MESSAGE_TYPES].sort())

    const dual = [...client].filter((type) => server.has(type))
    expect(dual.sort()).toEqual([...DUAL_DIRECTION_TYPES].sort())
  })

  it('keeps the directional arrays duplicate-free', () => {
    expect(new Set(CLIENT_TO_SERVER_TYPES).size).toBe(CLIENT_TO_SERVER_TYPES.length)
    expect(new Set(SERVER_TO_CLIENT_TYPES).size).toBe(SERVER_TO_CLIENT_TYPES.length)
  })
})

describe('payload wire compatibility', () => {
  it('serializes a client answer exactly like Payloads.answer', () => {
    const frame: OutboundMessage = {
      type: 'ANSWER',
      payload: { sessionId: 'room-1', attempt: 2, questionId: 42, choiceId: 101 }
    }

    expect(encodeMessage(frame)).toBe(
      '{"type":"ANSWER","payload":{"sessionId":"room-1","attempt":2,"questionId":42,"choiceId":101}}'
    )
  })

  it('keeps empty payloads as an empty string', () => {
    const frame: OutboundMessage = { type: 'CANCEL_MATCH', payload: '' }
    expect(JSON.parse(encodeMessage(frame))).toEqual({ type: 'CANCEL_MATCH', payload: '' })
  })

  it('decodes a quiz lobby (nested members + enums)', () => {
    const lobby: QuizLobbyData = {
      pin: '123456',
      title: 'JLPT N5 — bài 1',
      hostUsername: 'an',
      currentUserHost: true,
      hostPlays: true,
      proctoringEnabled: false,
      started: false,
      playerCount: 2,
      members: [
        {
          userId: 1,
          username: 'an',
          host: true,
          playing: true,
          connected: true,
          cameraStatus: 'NOT_REQUIRED',
          calibrationStatus: 'NOT_REQUIRED',
          warningCount: 0
        },
        {
          userId: 2,
          username: 'binh',
          host: false,
          playing: true,
          connected: true,
          cameraStatus: 'NOT_APPLICABLE',
          calibrationStatus: 'NOT_REQUIRED',
          warningCount: 0
        }
      ]
    }

    const message = decodeMessage(JSON.stringify({ type: 'QUIZ_LOBBY_UPDATE', payload: lobby }))
    if (message.type !== 'QUIZ_LOBBY_UPDATE') throw new Error('unexpected message type')
    expect(message.payload).toEqual(lobby)
  })

  it('never invents a correct answer in a live question payload', () => {
    const payload = {
      sessionId: '123456',
      pin: '123456',
      attempt: 1,
      questionId: 42,
      content: '「こんにちは」の意味は？',
      choices: [
        { choiceId: 101, content: 'Hello', position: 1 },
        { choiceId: 102, content: 'Goodbye', position: 2 },
        { choiceId: 103, content: 'Thanks', position: 3 },
        { choiceId: 104, content: 'Sorry', position: 4 }
      ],
      questionDurationSeconds: 30,
      roomRemainingSeconds: 300
    }

    const message = decodeMessage(JSON.stringify({ type: 'QUIZ_QUESTION', payload }))
    if (message.type !== 'QUIZ_QUESTION') throw new Error('unexpected message type')

    expect(message.payload.choices).toHaveLength(4)
    for (const choice of message.payload.choices) {
      expect(choice).not.toHaveProperty('correct')
    }
    expect(message.payload).not.toHaveProperty('correctChoiceId')
    expect(message.payload).not.toHaveProperty('explanation')
  })

  it('preserves nullable quiz-set ids (Java boxed Long)', () => {
    const edit: QuizSetEdit = {
      id: null,
      title: 'Bộ đề mới',
      description: '',
      level: 'N5',
      questions: [
        {
          id: null,
          content: 'Câu 1',
          explanation: '',
          choices: [{ id: null, content: 'Đáp án', position: 1, correct: true }]
        }
      ]
    }

    const message = decodeMessage(JSON.stringify({ type: 'QUIZ_SET_DETAIL', payload: edit }))
    if (message.type !== 'QUIZ_SET_DETAIL') throw new Error('unexpected message type')

    expect(message.payload).toEqual(edit)
    expect(message.payload.id).toBeNull()
    expect(message.payload.questions[0]?.choices[0]?.id).toBeNull()
  })

  it('decodes proctoring records including media role and ticket', () => {
    const payload = {
      pin: '123456',
      role: 'HOST_SUBSCRIBER',
      mediaPort: 5001,
      ticket: 'one-shot-ticket',
      expiresAtEpochMillis: 1_763_000_000_000
    }

    const message = decodeMessage(JSON.stringify({ type: 'PROCTOR_MEDIA_SESSION', payload }))
    if (message.type !== 'PROCTOR_MEDIA_SESSION') throw new Error('unexpected message type')

    expect(message.payload.role).toBe('HOST_SUBSCRIBER')
    expect(message.payload.mediaPort).toBe(5001)
  })

  it('accepts the null payloads Java emits for WAITING / MATCH_CANCELLED', () => {
    const waiting = decodeMessage('{"type":"WAITING","payload":null}')
    const cancelled = decodeMessage('{"type":"CANCEL_MATCH","payload":null}')

    expect(waiting).toEqual({ type: 'WAITING', payload: null })
    expect(cancelled).toEqual({ type: 'CANCEL_MATCH', payload: null })
  })
})
