/**
 * Bề mặt công khai của lớp nghiệp vụ Đấu hạng 1v1 phía renderer.
 *
 * `reducer`/`matchmaking` là hàm thuần (test được không cần React);
 * `useRankedStore` chỉ giữ bối cảnh trận và chuyển message của máy chủ vào reducer.
 */
export * from './types'
export { battleReducer, createBattleState } from './reducer'
export {
  elapsedSeconds,
  initialSearchState,
  isSearchBusy,
  searchReducer
} from './matchmaking'
export {
  choiceVisual,
  countdownAnnouncement,
  durationLabel,
  formatClock,
  isInputLocked,
  matchRemainingSeconds,
  questionRemainingSeconds,
  resultCopy,
  type ChoiceVisual
} from './selectors'
export { resetRankedStore, useRankedStore, type RankedState } from './ranked-store'
