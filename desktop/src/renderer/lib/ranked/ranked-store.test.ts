import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NqBridge } from '@shared/ipc'
import { createIdleConnectionStatus } from '@shared/ipc'
import type { PlayerStats, QuestionData } from '@shared/protocol'
import { setBridgeOverride } from '../bridge'
import { resetConnectionStore } from '../connection-store'
import { resetSessionStore, useSessionStore } from '../session-store'
import { resetRankedStore, useRankedStore } from './ranked-store'
import type { MatchContext } from './types'

const PLAYER: PlayerStats = {
  id: 7,
  username: 'minh_anh',
  wins: 3,
  losses: 1,
  draws: 0,
  totalScore: 420,
  questionsAnswered: 40,
  correctAnswers: 31
}

const MATCH: MatchContext = {
  roomId: 'room-9',
  opponent: 'binh_tran',
  durationSeconds: 180,
  startedAt: 1_000
}

function makeQuestion(overrides: Partial<QuestionData> = {}): QuestionData {
  return {
    sessionId: 'room-9',
    attempt: 1,
    questionId: 42,
    content: 'Câu hỏi mẫu?',
    choices: [
      { choiceId: 101, content: 'A', position: 1 },
      { choiceId: 102, content: 'B', position: 2 },
      { choiceId: 103, content: 'C', position: 3 },
      { choiceId: 104, content: 'D', position: 4 }
    ],
    questionDurationSeconds: 30,
    matchRemainingSeconds: 180,
    ...overrides
  }
}

function createFakeBridge(): NqBridge {
  return {
    connect: vi.fn(() => Promise.resolve({ ok: true })),
    disconnect: vi.fn(() => Promise.resolve()),
    send: vi.fn(() => Promise.resolve({ ok: true })),
    getStatus: vi.fn(() => Promise.resolve(createIdleConnectionStatus())),
    onEvent: vi.fn(() => () => undefined),
    app: { version: 'test', platform: 'linux', packaged: false }
  }
}

let bridge: NqBridge

beforeEach(() => {
  resetConnectionStore()
  resetSessionStore()
  resetRankedStore()
  bridge = createFakeBridge()
  setBridgeOverride(bridge)
  useSessionStore.setState({ player: PLAYER })
})

afterEach(() => {
  resetRankedStore()
  resetSessionStore()
  setBridgeOverride(null)
})

describe('ranked store — match lifecycle', () => {
  it('creates the battle from MATCH_FOUND context and accepts the first question', () => {
    useRankedStore.getState().startMatch(MATCH, 1_000)

    const started = useRankedStore.getState()
    expect(started.match).toEqual(MATCH)
    expect(started.battle?.phase).toBe('waiting')
    expect(started.battle?.matchDeadlineAt).toBe(1_000 + 180_000)

    useRankedStore.getState().applyServerMessage(
      { type: 'QUESTION', payload: makeQuestion() },
      2_000
    )

    const afterQuestion = useRankedStore.getState().battle
    expect(afterQuestion?.phase).toBe('question')
    expect(afterQuestion?.question?.questionId).toBe(42)
    expect(afterQuestion?.questionDeadlineAt).toBe(2_000 + 30_000)
  })

  it('ignores gameplay messages when no match is open', () => {
    useRankedStore.getState().applyServerMessage({
      type: 'QUESTION',
      payload: makeQuestion()
    })
    expect(useRankedStore.getState().battle).toBeNull()
    expect(useRankedStore.getState().match).toBeNull()
  })

  it('stores GAME_OVER as the result and stops accepting messages', () => {
    useRankedStore.getState().startMatch(MATCH, 1_000)
    useRankedStore.getState().applyServerMessage({ type: 'QUESTION', payload: makeQuestion() }, 2_000)
    useRankedStore.getState().applyServerMessage(
      { type: 'GAME_OVER', payload: { result: 'WIN', myScore: 4, opponentScore: 2 } },
      3_000
    )

    const state = useRankedStore.getState()
    expect(state.battle?.phase).toBe('finished')
    expect(state.result).toEqual({
      result: 'WIN',
      myScore: 4,
      opponentScore: 2,
      opponent: 'binh_tran',
      durationSeconds: 180,
      finishedAt: 3_000
    })

    // Kênh của trận đã đóng: câu hỏi tới muộn không làm gì.
    useRankedStore.getState().applyServerMessage(
      { type: 'QUESTION', payload: makeQuestion({ attempt: 2 }) },
      3_100
    )
    expect(useRankedStore.getState().battle?.attempt).toBe(1)
  })

  it('treats MATCH_ERROR during a match as an abort without inventing a winner', () => {
    useRankedStore.getState().startMatch(MATCH, 1_000)
    useRankedStore.getState().applyServerMessage({ type: 'QUESTION', payload: makeQuestion() }, 2_000)
    useRankedStore.getState().applyServerMessage(
      { type: 'MATCH_ERROR', payload: 'DATABASE_ERROR' },
      3_000
    )

    const state = useRankedStore.getState()
    expect(state.battle?.phase).toBe('finished')
    expect(state.battle?.finalResult).toBeNull()
    expect(state.battle?.notice).toContain('database')
    expect(state.result).toBeNull()
  })

  it('marks the battle as forfeit without a result', () => {
    useRankedStore.getState().startMatch(MATCH, 1_000)
    useRankedStore.getState().forfeit()

    expect(useRankedStore.getState().battle?.phase).toBe('forfeit')
    expect(useRankedStore.getState().result).toBeNull()
  })

  it('drops the whole session when the player signs out', () => {
    useRankedStore.getState().startMatch(MATCH, 1_000)
    useRankedStore.getState().applyServerMessage({ type: 'QUESTION', payload: makeQuestion() }, 2_000)

    useSessionStore.getState().clear()

    const state = useRankedStore.getState()
    expect(state.match).toBeNull()
    expect(state.battle).toBeNull()
    expect(state.result).toBeNull()
  })
})

describe('ranked store — answering', () => {
  it('sends exactly one ANSWER per question and locks the choices', () => {
    useRankedStore.getState().startMatch(MATCH, 1_000)
    useRankedStore.getState().applyServerMessage({ type: 'QUESTION', payload: makeQuestion() }, 2_000)

    useRankedStore.getState().choose(103)
    useRankedStore.getState().choose(101)

    expect(bridge.send).toHaveBeenCalledTimes(1)
    expect(bridge.send).toHaveBeenCalledWith({
      type: 'ANSWER',
      payload: { sessionId: 'room-9', attempt: 1, questionId: 42, choiceId: 103 }
    })
    expect(useRankedStore.getState().battle?.phase).toBe('locked')
    expect(useRankedStore.getState().battle?.selectedChoiceId).toBe(103)
  })

  it('does not answer when no question is open', () => {
    useRankedStore.getState().startMatch(MATCH, 1_000)
    useRankedStore.getState().choose(101)
    expect(bridge.send).not.toHaveBeenCalled()
  })

  it('does not answer after the local countdown expired', () => {
    useRankedStore.getState().startMatch(MATCH, 1_000)
    useRankedStore.getState().applyServerMessage({ type: 'QUESTION', payload: makeQuestion() }, 2_000)

    useRankedStore.getState().noteTimeout(2_000 + 30_000)
    expect(useRankedStore.getState().battle?.timedOut).toBe(true)

    useRankedStore.getState().choose(101)
    expect(bridge.send).not.toHaveBeenCalled()
  })

  it('closes the battle when the ANSWER cannot be sent', async () => {
    const failing: NqBridge = { ...createFakeBridge(), send: vi.fn(() => Promise.resolve({ ok: false, error: 'SEND_FAILED' })) }
    setBridgeOverride(failing)

    useRankedStore.getState().startMatch(MATCH, 1_000)
    useRankedStore.getState().applyServerMessage({ type: 'QUESTION', payload: makeQuestion() }, 2_000)
    useRankedStore.getState().choose(101)

    await vi.waitFor(() => {
      expect(useRankedStore.getState().battle?.phase).toBe('finished')
    })
    expect(useRankedStore.getState().battle?.finalResult).toBeNull()
  })
})
