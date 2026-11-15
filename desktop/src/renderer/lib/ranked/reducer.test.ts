import { describe, expect, it } from 'vitest'
import type { AnswerResult, QuestionData } from '@shared/protocol'
import { battleReducer, createBattleState } from './reducer'
import {
  choiceVisual,
  countdownAnnouncement,
  formatClock,
  isInputLocked,
  matchRemainingSeconds,
  questionRemainingSeconds
} from './selectors'
import type { BattleState, MatchContext } from './types'

const MATCH: MatchContext = {
  roomId: 'room-1',
  opponent: 'binh_tran',
  durationSeconds: 180,
  startedAt: 1_000
}

const T0 = 1_000

function makeQuestion(overrides: Partial<QuestionData> = {}): QuestionData {
  return {
    sessionId: 'room-1',
    attempt: 1,
    questionId: 42,
    content: '東京 là thủ đô của nước nào?',
    choices: [
      { choiceId: 101, content: 'Nhật Bản', position: 1 },
      { choiceId: 102, content: 'Hàn Quốc', position: 2 },
      { choiceId: 103, content: 'Trung Quốc', position: 3 },
      { choiceId: 104, content: 'Thái Lan', position: 4 }
    ],
    questionDurationSeconds: 30,
    matchRemainingSeconds: 180,
    ...overrides
  }
}

function makeResult(overrides: Partial<AnswerResult> = {}): AnswerResult {
  return {
    sessionId: 'room-1',
    attempt: 1,
    questionId: 42,
    correct: true,
    chosenChoiceId: 101,
    correctChoiceId: 101,
    scoreAwarded: 1,
    ...overrides
  }
}

function questionState(question = makeQuestion()): BattleState {
  return battleReducer(createBattleState(MATCH, T0), { type: 'question', question, now: T0 })
}

describe('battleReducer — happy path', () => {
  it('moves waiting → question → locked → revealed using only server data', () => {
    const waiting = createBattleState(MATCH, T0)
    expect(waiting.phase).toBe('waiting')
    expect(waiting.score).toEqual({ myScore: 0, opponentScore: 0 })

    const withQuestion = battleReducer(waiting, { type: 'question', question: makeQuestion(), now: T0 })
    expect(withQuestion.phase).toBe('question')
    expect(withQuestion.attempt).toBe(1)
    expect(withQuestion.question?.questionId).toBe(42)
    // Countdown được suy ra từ duration của server, không phải giá trị cố định.
    expect(withQuestion.questionDeadlineAt).toBe(T0 + 30_000)
    expect(withQuestion.matchDeadlineAt).toBe(T0 + 180_000)
    expect(isInputLocked(withQuestion)).toBe(false)

    const chosen = battleReducer(withQuestion, { type: 'choose', choiceId: 102 })
    expect(chosen.phase).toBe('locked')
    expect(chosen.answeredAttempt).toBe(1)
    expect(chosen.selectedChoiceId).toBe(102)
    expect(isInputLocked(chosen)).toBe(true)

    const revealed = battleReducer(chosen, { type: 'answerResult', result: makeResult({ chosenChoiceId: 102, correct: false, scoreAwarded: 0 }) })
    expect(revealed.phase).toBe('revealed')
    expect(revealed.outcome).toEqual({
      correct: false,
      chosenChoiceId: 102,
      correctChoiceId: 101,
      scoreAwarded: 0
    })
    expect(choiceVisual(revealed, 101)).toBe('correct')
    expect(choiceVisual(revealed, 102)).toBe('wrong')
    expect(choiceVisual(revealed, 103)).toBe('muted')

    const scored = battleReducer(revealed, { type: 'score', scores: { myScore: 1, opponentScore: 0 } })
    expect(scored.score).toEqual({ myScore: 1, opponentScore: 0 })
  })

  it('trusts the server verdict instead of comparing choice ids', () => {
    // Server nói sai dù chosenChoiceId === correctChoiceId: client không được sửa lại.
    const revealed = battleReducer(questionState(), {
      type: 'answerResult',
      result: makeResult({ correct: false, chosenChoiceId: 101, correctChoiceId: 101, scoreAwarded: 0 })
    })
    expect(revealed.outcome?.correct).toBe(false)
    expect(revealed.outcome?.scoreAwarded).toBe(0)
  })

  it('accepts the next attempt after a reveal', () => {
    const revealed = battleReducer(questionState(), { type: 'answerResult', result: makeResult() })
    const next = battleReducer(revealed, {
      type: 'question',
      question: makeQuestion({ attempt: 2, questionId: 43 }),
      now: T0 + 31_000
    })
    expect(next.phase).toBe('question')
    expect(next.attempt).toBe(2)
    expect(next.outcome).toBeNull()
    expect(next.answeredAttempt).toBeNull()
    expect(next.selectedChoiceId).toBeNull()
  })
})

describe('battleReducer — duplicate answers', () => {
  it('locks on the first choice and ignores a second one', () => {
    const question = questionState()
    const first = battleReducer(question, { type: 'choose', choiceId: 101 })
    const second = battleReducer(first, { type: 'choose', choiceId: 102 })

    expect(second).toBe(first)
    expect(second.selectedChoiceId).toBe(101)
  })

  it('keeps the first ANSWER_RESULT when the server repeats it', () => {
    const locked = battleReducer(questionState(), { type: 'choose', choiceId: 103 })
    const first = battleReducer(locked, { type: 'answerResult', result: makeResult({ chosenChoiceId: 103, correct: false, scoreAwarded: 0 }) })
    const duplicate = battleReducer(first, { type: 'answerResult', result: makeResult({ chosenChoiceId: 101, correct: true, scoreAwarded: 1 }) })

    expect(duplicate).toBe(first)
    expect(duplicate.outcome?.chosenChoiceId).toBe(103)
    expect(duplicate.outcome?.correct).toBe(false)
  })
})

describe('battleReducer — stale messages', () => {
  it('ignores a question from another session', () => {
    const state = questionState()
    const stale = battleReducer(state, {
      type: 'question',
      question: makeQuestion({ sessionId: 'room-2', attempt: 2 }),
      now: T0
    })
    expect(stale).toBe(state)
  })

  it('ignores a question whose attempt does not advance', () => {
    const state = questionState()
    const repeated = battleReducer(state, { type: 'question', question: makeQuestion(), now: T0 + 5_000 })
    expect(repeated).toBe(state)

    const older = battleReducer(state, {
      type: 'question',
      question: makeQuestion({ attempt: 0 }),
      now: T0
    })
    expect(older).toBe(state)
  })

  it('ignores an answer result for another attempt or question', () => {
    const locked = battleReducer(questionState(), { type: 'choose', choiceId: 101 })

    const otherAttempt = battleReducer(locked, {
      type: 'answerResult',
      result: makeResult({ attempt: 2 })
    })
    expect(otherAttempt).toBe(locked)

    const otherQuestion = battleReducer(locked, {
      type: 'answerResult',
      result: makeResult({ questionId: 99 })
    })
    expect(otherQuestion).toBe(locked)

    const otherSession = battleReducer(locked, {
      type: 'answerResult',
      result: makeResult({ sessionId: 'room-2' })
    })
    expect(otherSession).toBe(locked)
  })

  it('rejects a result whose choice ids are not part of the question', () => {
    const locked = battleReducer(questionState(), { type: 'choose', choiceId: 101 })
    const bogus = battleReducer(locked, {
      type: 'answerResult',
      result: makeResult({ correctChoiceId: 999 })
    })
    expect(bogus.outcome).toBeNull()
    expect(bogus.notice).toContain('không khớp')
  })

  it('does not open a question with no choices', () => {
    const state = createBattleState(MATCH, T0)
    const broken = battleReducer(state, {
      type: 'question',
      question: makeQuestion({ choices: [] }),
      now: T0
    })
    expect(broken.phase).toBe('waiting')
    expect(broken.notice).toContain('không có lựa chọn')
  })

  it('does not open a question with a non-positive duration', () => {
    const state = createBattleState(MATCH, T0)
    const broken = battleReducer(state, {
      type: 'question',
      question: makeQuestion({ questionDurationSeconds: 0 }),
      now: T0
    })
    expect(broken.phase).toBe('waiting')
    expect(broken.question).toBeNull()
    expect(broken.notice).toContain('không hợp lệ')
  })
})

describe('battleReducer — timeout', () => {
  it('locks input at the deadline without inventing a result', () => {
    const state = questionState()
    const deadline = state.questionDeadlineAt ?? 0

    const tooEarly = battleReducer(state, { type: 'timeout', now: deadline - 1 })
    expect(tooEarly).toBe(state)

    const timedOut = battleReducer(state, { type: 'timeout', now: deadline })
    expect(timedOut.phase).toBe('locked')
    expect(timedOut.timedOut).toBe(true)
    expect(timedOut.outcome).toBeNull()
    expect(timedOut.selectedChoiceId).toBeNull()
    expect(isInputLocked(timedOut)).toBe(true)

    // Sau khi hết giờ, người chơi không thể gửi đáp án nữa.
    const lateChoice = battleReducer(timedOut, { type: 'choose', choiceId: 101 })
    expect(lateChoice).toBe(timedOut)

    // Server vẫn là bên chốt: ANSWER_RESULT với chosenChoiceId=null.
    const resolved = battleReducer(timedOut, {
      type: 'answerResult',
      result: makeResult({ chosenChoiceId: null, correct: false, scoreAwarded: 0 })
    })
    expect(resolved.phase).toBe('revealed')
    expect(resolved.outcome).toEqual({
      correct: false,
      chosenChoiceId: null,
      correctChoiceId: 101,
      scoreAwarded: 0
    })
    expect(choiceVisual(resolved, 101)).toBe('correct')
    expect(choiceVisual(resolved, 102)).toBe('muted')
  })

  it('never resolves a question by itself', () => {
    const timedOut = battleReducer(questionState(), {
      type: 'timeout',
      now: (questionState().questionDeadlineAt ?? 0) + 5_000
    })
    expect(timedOut.outcome).toBeNull()
    expect(timedOut.phase).toBe('locked')
  })
})

describe('battleReducer — GAME_OVER', () => {
  it.each(['WIN', 'LOSE', 'DRAW'])('stores the %s result sent by the server', (result) => {
    const inProgress = battleReducer(questionState(), { type: 'choose', choiceId: 101 })
    const finished = battleReducer(inProgress, {
      type: 'gameOver',
      gameOver: { result, myScore: 3, opponentScore: 1 }
    })

    expect(finished.phase).toBe('finished')
    expect(finished.finalResult).toEqual({ result, myScore: 3, opponentScore: 1 })
    expect(finished.score).toEqual({ myScore: 3, opponentScore: 1 })
    expect(isInputLocked(finished)).toBe(true)
  })

  it('ignores a second GAME_OVER', () => {
    const once = battleReducer(questionState(), {
      type: 'gameOver',
      gameOver: { result: 'WIN', myScore: 2, opponentScore: 0 }
    })
    const twice = battleReducer(once, {
      type: 'gameOver',
      gameOver: { result: 'LOSE', myScore: 0, opponentScore: 9 }
    })
    expect(twice).toBe(once)
    expect(twice.finalResult?.result).toBe('WIN')
  })

  it('marks the match aborted when the server stops without a result', () => {
    const aborted = battleReducer(questionState(), {
      type: 'aborted',
      message: 'Máy chủ không truy cập được database'
    })
    expect(aborted.phase).toBe('finished')
    expect(aborted.finalResult).toBeNull()
    expect(aborted.notice).toContain('database')
  })

  it('marks a lost connection as forfeit, not as a win', () => {
    const forfeited = battleReducer(questionState(), { type: 'forfeit', message: 'Mất kết nối' })
    expect(forfeited.phase).toBe('forfeit')
    expect(forfeited.finalResult).toBeNull()
    expect(forfeited.outcome).toBeNull()
  })
})

describe('selectors', () => {
  it('derives countdown seconds from server durations', () => {
    const state = questionState()
    expect(questionRemainingSeconds(state, T0)).toBe(30)
    expect(questionRemainingSeconds(state, T0 + 1_000)).toBe(29)
    expect(questionRemainingSeconds(state, T0 + 29_500)).toBe(1)
    expect(questionRemainingSeconds(state, T0 + 31_000)).toBe(0)
    expect(matchRemainingSeconds(state, T0)).toBe(180)
    expect(matchRemainingSeconds(state, T0 + 60_000)).toBe(120)
    expect(questionRemainingSeconds(null, T0)).toBe(0)
  })

  it('announces the countdown only at 10, 5 and 0 seconds', () => {
    const state = questionState()
    expect(countdownAnnouncement(state, T0)).toBe('')
    expect(countdownAnnouncement(state, T0 + 15_000)).toBe('') // 15s
    expect(countdownAnnouncement(state, T0 + 20_000)).toBe('Còn 10 giây.')
    expect(countdownAnnouncement(state, T0 + 25_000)).toBe('Còn 5 giây.')
    expect(countdownAnnouncement(state, T0 + 30_000)).toContain('Hết giờ')
    expect(countdownAnnouncement(null, T0)).toBe('')
  })

  it('formats the match clock', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(59)).toBe('0:59')
    expect(formatClock(180)).toBe('3:00')
    expect(formatClock(61.9)).toBe('1:01')
    expect(formatClock(-5)).toBe('0:00')
  })

  it('marks the chosen answer without revealing correctness before the server answers', () => {
    const locked = battleReducer(questionState(), { type: 'choose', choiceId: 103 })
    expect(choiceVisual(locked, 103)).toBe('selected')
    expect(choiceVisual(locked, 101)).toBe('muted')
  })
})
