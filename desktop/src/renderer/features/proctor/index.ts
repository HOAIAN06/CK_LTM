/**
 * Feature proctoring (camera) phía renderer.
 *
 * Luồng đầy đủ:
 * 1. `ProctorSessionHost` (mount một lần trong router) đưa bối cảnh phòng vào `proctor-store`.
 * 2. Store nhận `PROCTOR_MEDIA_SESSION` → mở publisher (player) hoặc subscriber (host) ở main
 *    process, báo status/event qua protocol, giữ tile + feed cho dashboard.
 * 3. `CameraPreview` chỉ lo `getUserMedia` + encode frame; không giữ socket.
 * 4. `ProctorDashboard` đọc tile/feed và frame từ `frame-hub`.
 */
export { CameraPreview, type CameraPreviewProps } from './camera-preview'
export {
  CAMERA_STATUS_LABEL,
  cameraStatusTone,
  describeCameraError,
  isRetryableCameraStatus,
  type CameraErrorInfo,
  type CameraStatusTone
} from './camera-status'
export type { CameraStatus } from '@shared/protocol'
export {
  createFramePump,
  useFramePump,
  DEFAULT_PUMP_FPS,
  JPEG_QUALITY_LADDER,
  type FramePump,
  type FramePumpOptions,
  type FramePumpStats
} from './frame-pump'
export {
  DEFAULT_FOCUS_POLICY,
  MAX_EVENT_DURATION_MS,
  createFocusWatcher,
  type FocusAwayKind,
  type FocusDecision,
  type FocusWatcher,
  type FocusWatcherPolicy
} from './focus-events'
export {
  MAX_HUB_USERS,
  clearHubFrames,
  getHubFrame,
  hubFrameCount,
  publishHubFrame,
  subscribeHubFrame,
  type HubFrame
} from './frame-hub'
export {
  MEDIA_BRIDGE_UNAVAILABLE,
  createUnavailableMediaApi,
  getMediaApi,
  isMediaBridgeAvailable,
  readMediaBridge
} from './media-client'
export {
  CAMERA_DETAIL,
  DETECTABLE_EVENT_TYPES,
  PROCTOR_EVENT_LABEL,
  REPORTED_CALIBRATION,
  buildEventReport,
  buildStatusReport,
  canEmitEvent,
  canReportStatus,
  createEventId,
  isReportableCameraStatus,
  isUuid,
  type DetectableEventType,
  type EventReportInput,
  type ProctorPhase,
  type ProctorRoomContext,
  type StatusReportInput
} from './proctor-protocol'
export { ProctorBattlePanel, type ProctorBattlePanelProps } from './proctor-battle-panel'
export { ProctorDashboard, type ProctorDashboardProps } from './proctor-dashboard'
export { ProctorLobbyPanel, type ProctorLobbyPanelProps } from './proctor-lobby-panel'
export { ProctorSessionHost } from './proctor-session-host'
export {
  EVENT_COOLDOWN_MS,
  PROCTOR_FEED_LIMIT,
  describeMediaError,
  ensureProctorChannel,
  initialProctorState,
  onlineCameraCount,
  resetProctorStore,
  sortProctorTiles,
  totalWarnings,
  useProctorStore,
  type ProctorConsent,
  type ProctorFeedEntry,
  type ProctorLink,
  type ProctorLinkState,
  type ProctorMemberSnapshot,
  type ProctorState,
  type ProctorTile
} from './proctor-store'
export {
  useCameraStream,
  CAMERA_CONSTRAINTS,
  DEFAULT_RETRY_DELAYS_MS,
  type CameraStreamHandle,
  type UseCameraStreamOptions
} from './use-camera-stream'
