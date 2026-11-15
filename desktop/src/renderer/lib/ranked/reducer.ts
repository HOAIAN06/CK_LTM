/**
 * Reducer thuần của màn thi đấu 1v1.
 *
 * Nguyên tắc (docs/ranked.md §5, docs/protocol.md §5):
 * - Client **không** tính điểm, không quyết định đúng/sai, không tự kết luận timeout.
 * - Mọi chuyển trạng thái có ý nghĩa nghiệp vụ đều bắt nguồn từ message của máy chủ.
 * - Countdown cục bộ chỉ là hiển thị: khi về 0, client khoá lựa chọn và chờ
 *   `ANSWER_RESULT` (`timeout` → phase `locked`, **không** tạo outcome).
 * - Message cũ (khác `sessionId`/`attempt`/`questionId`) bị bỏ qua im lặng, đúng như
 *   server bỏ qua đáp án trùng định danh sai.
 */
import type { MatchContext, BattleAction, BattleState } from './types'

/** Trạng thái ban đầu: đã có phòng, chờ câu hỏi đầu tiên từ máy chủ. */
export function createBattleState(match: MatchContext, now: number): BattleState {
  return {
    roomId: match.roomId,
    phase: 'waiting',
    attempt: 0,
    question: null,
    answeredAttempt: null,
    selectedChoiceId: null,
    outcome: null,
    score: { myScore: 0, opponentScore: 0 },
    questionTotalSeconds: 0,
    questionDeadlineAt: null,
    matchDeadlineAt: now + match.durationSeconds * 1000,
    matchTotalSeconds: match.durationSeconds,
    timedOut: false,
    finalResult: null,
    notice: null
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function choicesAreValid(state: BattleState): boolean {
  const question = state.question
  if (!question || !Array.isArray(question.choices) || question.choices.length === 0) return false
  return question.choices.every((choice) => isFiniteNumber(choice.choiceId))
}

function hasChoice(state: BattleState, choiceId: number | null): boolean {
  if (choiceId === null) return true
  return Boolean(state.question?.choices.some((choice) => choice.choiceId === choiceId))
}

export function battleReducer(state: BattleState, action: BattleAction): BattleState {
  switch (action.type) {
    case 'question': {
      const question = action.question

      // Trận đã kết thúc: câu tới muộn không được mở lại màn thi đấu.
      if (state.phase === 'finished' || state.phase === 'forfeit') return state
      // Câu của phòng khác (hoặc của trận trước) — bỏ qua.
      if (!question || question.sessionId !== state.roomId) return state
      // `attempt` phải tiến lên; message lặp lại không được mở lại câu đã xử lý.
      if (!isFiniteNumber(question.attempt) || question.attempt <= state.attempt) return state
      if (
        !isFiniteNumber(question.questionDurationSeconds) ||
        question.questionDurationSeconds <= 0 ||
        !isFiniteNumber(question.matchRemainingSeconds) ||
        question.matchRemainingSeconds <= 0 ||
        !isFiniteNumber(question.questionId)
      ) {
        return { ...state, notice: 'Dữ liệu câu hỏi không hợp lệ.' }
      }
      if (!Array.isArray(question.choices) || question.choices.length === 0) {
        return { ...state, notice: 'Câu hỏi không có lựa chọn nào.' }
      }
      if (question.choices.some((choice) => !isFiniteNumber(choice.choiceId))) {
        return { ...state, notice: 'Dữ liệu lựa chọn không hợp lệ.' }
      }

      return {
        ...state,
        phase: 'question',
        attempt: question.attempt,
        question,
        answeredAttempt: null,
        selectedChoiceId: null,
        outcome: null,
        questionTotalSeconds: question.questionDurationSeconds,
        questionDeadlineAt: action.now + question.questionDurationSeconds * 1000,
        matchDeadlineAt: action.now + question.matchRemainingSeconds * 1000,
        timedOut: false,
        notice: null
      }
    }

    case 'choose': {
      // Chỉ khoá khi câu đang mở và chưa gửi đáp án: chặn gửi trùng tuyệt đối.
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
      if (!question) return state
      if (state.phase === 'finished' || state.phase === 'forfeit') return state
      if (state.phase === 'revealed') return state // trùng lặp: giữ kết quả đầu tiên
      if (
        !result ||
        result.sessionId !== state.roomId ||
        result.attempt !== question.attempt ||
        result.questionId !== question.questionId
      ) {
        return state
      }
      if (!hasChoice(state, result.chosenChoiceId) || !hasChoice(state, result.correctChoiceId)) {
        return { ...state, notice: 'Kết quả câu hỏi không khớp các lựa chọn đã nhận.' }
      }
      if (!choicesAreValid(state)) {
        return { ...state, notice: 'Dữ liệu lựa chọn không hợp lệ.' }
      }

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
          : state.selectedChoiceId
      }
    }

    case 'score': {
      const scores = action.scores
      if (!scores || !isFiniteNumber(scores.myScore) || !isFiniteNumber(scores.opponentScore)) {
        return state
      }
      if (scores.myScore === state.score.myScore && scores.opponentScore === state.score.opponentScore) {
        return state
      }
      return { ...state, score: { myScore: scores.myScore, opponentScore: scores.opponentScore } }
    }

    case 'timeout': {
      // Countdown cục bộ chỉ khoá UI; kết quả vẫn phải do server gửi.
      if (state.phase !== 'question') return state
      if (state.questionDeadlineAt === null) return state
      if (action.now < state.questionDeadlineAt) return state
      return { ...state, phase: 'locked', timedOut: true }
    }

    case 'gameOver': {
      const gameOver = action.gameOver
      // GAME_OVER chỉ có hiệu lực một lần; message lặp không được ghi đè kết quả.
      if (state.phase === 'finished') return state
      if (
        !gameOver ||
        typeof gameOver.result !== 'string' ||
        !isFiniteNumber(gameOver.myScore) ||
        !isFiniteNumber(gameOver.opponentScore)
      ) {
        return state
      }
      return {
        ...state,
        phase: 'finished',
        timedOut: false,
        finalResult: {
          result: gameOver.result,
          myScore: gameOver.myScore,
          opponentScore: gameOver.opponentScore
        },
        score: { myScore: gameOver.myScore, opponentScore: gameOver.opponentScore }
      }
    }

    case 'aborted': {
      if (state.phase === 'finished') return state
      return { ...state, phase: 'finished', finalResult: null, notice: action.message }
    }

    case 'forfeit': {
      if (state.phase === 'finished') return state
      return { ...state, phase: 'forfeit', notice: action.message }
    }

    default:
      return state
  }
}
