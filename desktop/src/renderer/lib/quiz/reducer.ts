/**
 * Reducer thuần của màn thi Quiz Room.
 *
 * Cùng kỷ luật với Ranked nhưng **không** dùng chung state machine (payload khác, luật
 * điểm khác, có lobby và lệnh hủy phòng):
 * - Client không tính điểm 500–1000, không quyết định đúng/sai, không kết luận timeout.
 * - `sessionId` của Quiz Room bằng `pin`; cả hai đều được kiểm tra.
 * - Message cũ (khác `pin`/`attempt`/`questionId`) bị bỏ qua im lặng.
 * - Countdown cục bộ chỉ khoá lựa chọn; kết quả vẫn phải do `QUIZ_ANSWER_RESULT` gửi.
 */
import type { QuizAnswerResult, QuizBattleAction, QuizBattleState, QuizQuestionData } from './types'

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function createQuizBattleState(
  pin: string,
  now: number,
  roomRemainingSeconds: number
): QuizBattleState {
  const safeRemaining = Number.isFinite(roomRemainingSeconds) ? Math.max(0, roomRemainingSeconds) : 0
  return {
    pin,
    phase: 'waiting',
    attempt: 0,
    question: null,
    answeredAttempt: null,
    selectedChoiceId: null,
    outcome: null,
    totalScore: 0,
    questionTotalSeconds: 0,
    questionDeadlineAt: null,
    roomRemainingSeconds: safeRemaining,
    roomDeadlineAt: now + safeRemaining * 1000,
    timedOut: false,
    notice: null
  }
}

function hasChoice(state: QuizBattleState, choiceId: number | null): boolean {
  if (choiceId === null) return true
  return Boolean(state.question?.choices.some((choice) => choice.choiceId === choiceId))
}

function questionIsClosed(state: QuizBattleState): boolean {
  return state.phase === 'finished' || state.phase === 'cancelled'
}

function acceptQuestion(
  state: QuizBattleState,
  question: QuizQuestionData,
  now: number
): QuizBattleState {
  return {
    ...state,
    phase: 'question',
    attempt: question.attempt,
    question,
    answeredAttempt: null,
    selectedChoiceId: null,
    outcome: null,
    questionTotalSeconds: question.questionDurationSeconds,
    questionDeadlineAt: now + question.questionDurationSeconds * 1000,
    roomRemainingSeconds: question.roomRemainingSeconds,
    roomDeadlineAt: now + question.roomRemainingSeconds * 1000,
    timedOut: false,
    notice: null
  }
}

function acceptResult(state: QuizBattleState, result: QuizAnswerResult): QuizBattleState {
  return {
    ...state,
    phase: 'revealed',
    outcome: {
      correct: result.correct === true,
      chosenChoiceId: isFiniteNumber(result.chosenChoiceId) ? result.chosenChoiceId : null,
      correctChoiceId: result.correctChoiceId,
      scoreAwarded: isFiniteNumber(result.scoreAwarded) ? result.scoreAwarded : 0
    },
    selectedChoiceId: isFiniteNumber(result.chosenChoiceId)
      ? result.chosenChoiceId
      : state.selectedChoiceId,
    totalScore: isFiniteNumber(result.totalScore) ? result.totalScore : state.totalScore
  }
}

export function quizBattleReducer(
  state: QuizBattleState,
  action: QuizBattleAction
): QuizBattleState {
  switch (action.type) {
    case 'question': {
      const question = action.question
      if (questionIsClosed(state)) return state
      if (!question) return state
      // Trong Quiz Room `sessionId` và `pin` luôn bằng nhau; cả hai phải khớp phòng này.
      if (question.sessionId !== state.pin || question.pin !== state.pin) return state
      if (!isFiniteNumber(question.attempt) || question.attempt <= state.attempt) return state
      if (
        !isFiniteNumber(question.questionId) ||
        !isFiniteNumber(question.questionDurationSeconds) ||
        question.questionDurationSeconds <= 0 ||
        !isFiniteNumber(question.roomRemainingSeconds) ||
        question.roomRemainingSeconds <= 0
      ) {
        return { ...state, notice: 'Dữ liệu câu hỏi không hợp lệ.' }
      }
      if (!Array.isArray(question.choices) || question.choices.length === 0) {
        return { ...state, notice: 'Câu hỏi không có lựa chọn nào.' }
      }
      if (question.choices.some((choice) => !isFiniteNumber(choice.choiceId))) {
        return { ...state, notice: 'Dữ liệu lựa chọn không hợp lệ.' }
      }
      return acceptQuestion(state, question, action.now)
    }

    case 'choose': {
      if (state.phase !== 'question' || !state.question) return state
      if (state.answeredAttempt !== null) return state
      if (!hasChoice(state, action.choiceId)) return state
      return {
        ...state,
        phase: 'locked',
        answeredAttempt: state.question.attempt,
        selectedChoiceId: action.choiceId
      }
    }

    case 'answerResult': {
      const result = action.result
      const question = state.question
      if (!question || questionIsClosed(state)) return state
      if (state.phase === 'revealed') return state // trùng lặp: giữ kết quả đầu tiên
      if (
        !result ||
        result.sessionId !== state.pin ||
        result.attempt !== question.attempt ||
        result.questionId !== question.questionId
      ) {
        return state
      }
      if (!hasChoice(state, result.chosenChoiceId) || !hasChoice(state, result.correctChoiceId)) {
        return { ...state, notice: 'Kết quả câu hỏi không khớp các lựa chọn đã nhận.' }
      }
      return acceptResult(state, result)
    }

    case 'timeout': {
      if (state.phase !== 'question') return state
      if (state.questionDeadlineAt === null) return state
      if (action.now < state.questionDeadlineAt) return state
      return { ...state, phase: 'locked', timedOut: true }
    }

    case 'finished': {
      if (state.phase === 'finished' || state.phase === 'cancelled') return state
      return {
        ...state,
        phase: 'finished',
        timedOut: false,
        questionDeadlineAt: null,
        roomRemainingSeconds: 0,
        roomDeadlineAt: null
      }
    }

    case 'cancelled': {
      return {
        ...state,
        phase: 'cancelled',
        timedOut: false,
        questionDeadlineAt: null,
        roomDeadlineAt: null
      }
    }

    case 'notice': {
      return { ...state, notice: action.message }
    }

    default:
      return state
  }
}
