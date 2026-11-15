/**
 * Bề mặt công khai của lớp nghiệp vụ Quiz Room phía renderer.
 *
 * `reducer`/`lobby` là hàm thuần (test không cần React); `useQuizStore` giữ bối cảnh
 * phòng và chuyển message của máy chủ vào reducer.
 */
export * from './types'
export { createQuizBattleState, quizBattleReducer } from './reducer'
export {
  cameraIssues,
  cameraLabel,
  cameraTone,
  canHostStart,
  cancelReasonNotice,
  connectedPlayerCount,
  isCameraProblem,
  lobbyStatusText,
  parseDurationMinutes,
  proctoringHostConflict,
  sanitizePinInput,
  validateCreateRoom,
  validatePin,
  type CameraTone,
  type CreateRoomErrors,
  type CreateRoomInput
} from './lobby'
export {
  formatClock,
  isQuizInputLocked,
  myLeaderboardEntry,
  quizChoiceVisual,
  quizCountdownAnnouncement,
  quizQuestionRemainingSeconds,
  quizRoomRemainingSeconds,
  scoreAwardedLabel,
  type ChoiceVisual
} from './selectors'
export {
  REJOIN_TIMEOUT_MS,
  resetQuizStore,
  useQuizStore,
  type QuizState
} from './quiz-store'
