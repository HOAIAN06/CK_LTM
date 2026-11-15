import { describe, expect, it } from 'vitest'
import type { QuizAnswerResult, QuizQuestionData } from '@shared/protocol'
import { createQuizBattleState, quizBattleReducer } from './reducer'
import {
  isQuizInputLocked,
  quizChoiceVisual,
  quizCountdownAnnouncement,
  quizQuestionRemainingSeconds,
  quizRoomRemainingSeconds
} from './selectors'

const PIN = '123456'
const T0 = 1_000

function makeQuestion(overrides: Partial<QuizQuestionData> = {}): QuizQuestionData {
  return {
    sessionId: PIN,
    pin: PIN,
    attempt: 1,
    questionId: 42,
    content: '「食べる」の意味はどれですか。',
    choices: [
      { choiceId: 101, content: 'ăn', position: 1 },
      { choiceId: 102, content: 'uống', position: 2 },
      { choiceId: 103, content: 'ngủ', position: 3 },
      { choiceId: 104, content: 'đi', position: 4 }
    ],
    questionDurationSeconds: 30,
    roomRemainingSeconds: 300,
    ...overrides
  }
}

function makeResult(overrides: Partial<QuizAnswerResult> = {}): QuizAnswerResult {
  return {
    sessionId: PIN,
    attempt: 1,
    questionId: 42,
    correct: true,
    chosenChoiceId: 101,
    correctChoiceId: 101,
    scoreAwarded: 750,
    totalScore: 750,
    ...overrides
  }
}

function withQuestion(question = makeQuestion()): ReturnType<typeof createQuizBattleState> {
  return quizBattleReducer(createQuizBattleState(PIN, T0, 300), {
    type: 'question',
    question,
    now: T0
  })
}

describe('quizBattleReducer — happy path', () => {
  it('opens the question, locks on choose and reveals the server verdict', () => {
    const state = withQuestion()
    expect(state.phase).toBe('question')
    expect(state.attempt).toBe(1)
    expect(state.questionDeadlineAt).toBe(T0 + 30_000)
    expect(state.roomDeadlineAt).toBe(T0 + 300_000)

    const locked = quizBattleReducer(state, { type: 'choose', choiceId: 102 })
    expect(locked.phase).toBe('locked')
    expect(locked.answeredAttempt).toBe(1)
    expect(isQuizInputLocked(locked)).toBe(true)

    const revealed = quizBattleReducer(locked, {
      type: 'answerResult',
      result: makeResult({ chosenChoiceId: 102, correct: false, scoreAwarded: 0, totalScore: 0 })
    })

    expect(revealed.phase).toBe('revealed')
    expect(revealed.outcome).toEqual({
      correct: false,
      chosenChoiceId: 102,
      correctChoiceId: 101,
      scoreAwarded: 0
    })
    // Điểm lấy nguyên từ server, không cộng dồn ở client.
    expect(revealed.totalScore).toBe(0)
    expect(quizChoiceVisual(revealed, 101)).toBe('correct')
    expect(quizChoiceVisual(revealed, 102)).toBe('wrong')
  })

  it('uses the server total score verbatim (500–1000 per correct answer)', () => {
    const revealed = quizBattleReducer(withQuestion(), {
      type: 'answerResult',
      result: makeResult({ scoreAwarded: 640, totalScore: 640 })
    })
    expect(revealed.outcome?.scoreAwarded).toBe(640)
    expect(revealed.totalScore).toBe(640)

    const next = quizBattleReducer(
      revealed,
      { type: 'question', question: makeQuestion({ attempt: 2, questionId: 43 }), now: T0 + 31_000 }
    )
    const second = quizBattleReducer(next, {
      type: 'answerResult',
      result: makeResult({ attempt: 2, questionId: 43, scoreAwarded: 1000, totalScore: 1640 })
    })
    expect(second.totalScore).toBe(1640)
  })
})

describe('quizBattleReducer — duplicate answers', () => {
  it('ignores a second choice and a repeated result', () => {
    const state = withQuestion()
    const first = quizBattleReducer(state, { type: 'choose', choiceId: 101 })
    expect(quizBattleReducer(first, { type: 'choose', choiceId: 102 })).toBe(first)

    const revealed = quizBattleReducer(first, { type: 'answerResult', result: makeResult() })
    const duplicate = quizBattleReducer(revealed, {
      type: 'answerResult',
      result: makeResult({ chosenChoiceId: 103, correct: false, scoreAwarded: 0, totalScore: 0 })
    })
    expect(duplicate).toBe(revealed)
    expect(duplicate.outcome?.chosenChoiceId).toBe(101)
  })
})

describe('quizBattleReducer — stale messages', () => {
  it('ignores a question from another pin (sessionId or pin)', () => {
    const state = withQuestion()
    expect(
      quizBattleReducer(state, {
        type: 'question',
        question: makeQuestion({ sessionId: '999999', attempt: 2 }),
        now: T0
      })
    ).toBe(state)
    expect(
      quizBattleReducer(state, {
        type: 'question',
        question: makeQuestion({ pin: '999999', attempt: 2 }),
        now: T0
      })
    ).toBe(state)
  })

  it('ignores a question whose attempt does not advance', () => {
    const state = withQuestion()
    expect(quizBattleReducer(state, { type: 'question', question: makeQuestion(), now: T0 })).toBe(
      state
    )
  })

  it('ignores a result for another attempt, question or pin', () => {
    const locked = quizBattleReducer(withQuestion(), { type: 'choose', choiceId: 101 })
    expect(
      quizBattleReducer(locked, { type: 'answerResult', result: makeResult({ attempt: 9 }) })
    ).toBe(locked)
    expect(
      quizBattleReducer(locked, { type: 'answerResult', result: makeResult({ questionId: 99 }) })
    ).toBe(locked)
    expect(
      quizBattleReducer(locked, { type: 'answerResult', result: makeResult({ sessionId: '000000' }) })
    ).toBe(locked)
  })

  it('rejects a malformed question without leaving the waiting phase', () => {
    const waiting = createQuizBattleState(PIN, T0, 300)
    const broken = quizBattleReducer(waiting, {
      type: 'question',
      question: makeQuestion({ questionDurationSeconds: 0 }),
      now: T0
    })
    expect(broken.phase).toBe('waiting')
    expect(broken.notice).toContain('không hợp lệ')
  })
})

describe('quizBattleReducer — local timeout', () => {
  it('locks without deciding the outcome, and never answers afterwards', () => {
    const state = withQuestion()
    const deadline = state.questionDeadlineAt ?? 0

    expect(quizBattleReducer(state, { type: 'timeout', now: deadline - 1 })).toBe(state)

    const timedOut = quizBattleReducer(state, { type: 'timeout', now: deadline })
    expect(timedOut.phase).toBe('locked')
    expect(timedOut.timedOut).toBe(true)
    expect(timedOut.outcome).toBeNull()
    expect(quizBattleReducer(timedOut, { type: 'choose', choiceId: 101 })).toBe(timedOut)

    // Server vẫn chốt: timeout trả chosenChoiceId=null.
    const resolved = quizBattleReducer(timedOut, {
      type: 'answerResult',
      result: makeResult({ chosenChoiceId: null, correct: false, scoreAwarded: 0, totalScore: 0 })
    })
    expect(resolved.phase).toBe('revealed')
    expect(resolved.outcome?.chosenChoiceId).toBeNull()
    expect(resolved.outcome?.scoreAwarded).toBe(0)
  })
})

describe('quizBattleReducer — room lifecycle', () => {
  it('finishes the room and stops accepting questions', () => {
    const state = withQuestion()
    const finished = quizBattleReducer(state, { type: 'finished' })
    expect(finished.phase).toBe('finished')
    expect(finished.questionDeadlineAt).toBeNull()

    expect(
      quizBattleReducer(finished, {
        type: 'question',
        question: makeQuestion({ attempt: 2 }),
        now: T0
      })
    ).toBe(finished)
  })

  it('marks the room cancelled', () => {
    const cancelled = quizBattleReducer(withQuestion(), { type: 'cancelled' })
    expect(cancelled.phase).toBe('cancelled')
    expect(cancelled.roomDeadlineAt).toBeNull()
  })

  it('exposes non-fatal protocol notices without touching the question', () => {
    const state = withQuestion()
    const withNotice = quizBattleReducer(state, {
      type: 'notice',
      message: 'Máy chủ báo lỗi dữ liệu.'
    })
    expect(withNotice.notice).toBe('Máy chủ báo lỗi dữ liệu.')
    expect(withNotice.question).toBe(state.question)
    expect(withNotice.phase).toBe('question')
  })
})

describe('quiz selectors', () => {
  it('derives countdown seconds from server durations', () => {
    const state = withQuestion()
    expect(quizQuestionRemainingSeconds(state, T0)).toBe(30)
    expect(quizQuestionRemainingSeconds(state, T0 + 25_000)).toBe(5)
    expect(quizQuestionRemainingSeconds(state, T0 + 30_000)).toBe(0)
    expect(quizRoomRemainingSeconds(state, T0)).toBe(300)
    expect(quizRoomRemainingSeconds(state, T0 + 60_000)).toBe(240)
    expect(quizQuestionRemainingSeconds(null, T0)).toBe(0)
  })

  it('announces at 10 / 5 / 0 seconds only', () => {
    const state = withQuestion()
    expect(quizCountdownAnnouncement(state, T0)).toBe('')
    expect(quizCountdownAnnouncement(state, T0 + 20_000)).toBe('Còn 10 giây.')
    expect(quizCountdownAnnouncement(state, T0 + 25_000)).toBe('Còn 5 giây.')
    expect(quizCountdownAnnouncement(state, T0 + 30_000)).toContain('Hết giờ')
  })

  it('marks the chosen answer before the server verdict', () => {
    const locked = quizBattleReducer(withQuestion(), { type: 'choose', choiceId: 104 })
    expect(quizChoiceVisual(locked, 104)).toBe('selected')
    expect(quizChoiceVisual(locked, 101)).toBe('muted')
  })
})
