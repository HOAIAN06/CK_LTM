/**
 * TypeScript mirror of `com.nihongoquest.common.protocol.Payloads`.
 *
 * Rules (see `docs/protocol.md` and `docs/desktop/contracts.md`):
 *  - Field names are copied verbatim from the Java records (they are already camelCase).
 *  - Java `int`/`long`/`double`/`float`/`boolean` -> `number`/`number`/`number`/`number`/`boolean`.
 *  - Boxed `Long` (nullable on the wire) -> `number | null`.
 *  - Java enums are modelled as string unions, because Jackson serializes `name()`.
 *  - No extra fields may be invented: the Java server ignores unknown fields but the JavaFX
 *    client would not understand them, so the contract is one-way compatible.
 */

import type { MessageType } from './message-types'

// ---------------------------------------------------------------------------------------------
// Enums (Payloads.java)
// ---------------------------------------------------------------------------------------------

export const CAMERA_STATUSES = [
  'NOT_REQUIRED',
  'NOT_APPLICABLE',
  'INITIALIZING',
  'READY',
  'DENIED',
  'NOT_FOUND',
  'FAILED',
  'LOST',
  'BLOCKED',
  'STOPPED'
] as const

export type CameraStatus = (typeof CAMERA_STATUSES)[number]

export const CALIBRATION_STATUSES = ['NOT_REQUIRED', 'PENDING', 'READY', 'FAILED'] as const

export type CalibrationStatus = (typeof CALIBRATION_STATUSES)[number]

export const PROCTOR_EVENT_TYPES = [
  'NO_FACE',
  'MULTIPLE_FACES',
  'LOOKING_AWAY',
  'PHONE_DETECTED',
  'CAMERA_BLOCKED',
  'APP_FOCUS_LOST',
  'APP_MINIMIZED'
] as const

export type ProctorEventType = (typeof PROCTOR_EVENT_TYPES)[number]

export const PROCTOR_SEVERITIES = ['WARNING', 'EVIDENCE'] as const

export type ProctorSeverity = (typeof PROCTOR_SEVERITIES)[number]

/** `Payloads.MediaRole` (JSON enum). Distinct from `MediaProtocol.Role` byte codes. */
export const MEDIA_ROLES = ['PUBLISHER', 'HOST_SUBSCRIBER'] as const

export type MediaRole = (typeof MEDIA_ROLES)[number]

// ---------------------------------------------------------------------------------------------
// Auth, profile, leaderboard, history
// ---------------------------------------------------------------------------------------------

export interface Credentials {
  username: string
  /** Secret: never log, never persist, never forward to the renderer in plain text. */
  password: string
}

export interface PlayerStats {
  id: number
  username: string
  wins: number
  losses: number
  draws: number
  totalScore: number
  questionsAnswered: number
  correctAnswers: number
}

export interface LeaderboardEntry {
  rank: number
  userId: number
  username: string
  wins: number
  losses: number
  draws: number
  totalScore: number
}

export interface LeaderboardData {
  players: LeaderboardEntry[]
}

export interface MatchHistoryEntry {
  matchId: number
  opponentUsername: string
  myScore: number
  opponentScore: number
  /** `WIN | LOSS | DRAW` from the viewer's point of view. */
  result: string
  durationSeconds: number
  /** `NORMAL | DISCONNECT`. */
  endReason: string
  /** ISO-8601 UTC. */
  playedAt: string
}

export interface MatchHistoryData {
  matches: MatchHistoryEntry[]
}

// ---------------------------------------------------------------------------------------------
// Social
// ---------------------------------------------------------------------------------------------

export interface UserSearchRequest {
  query: string
}

export interface UserSearchItem {
  userId: number
  username: string
  online: boolean
  busy: boolean
}

export interface UserSearchData {
  users: UserSearchItem[]
}

export interface FriendTarget {
  userId: number
}

export interface FriendRequestReply {
  userId: number
  accept: boolean
}

export interface FriendRequestItem {
  userId: number
  username: string
}

export interface FriendRequestListData {
  requests: FriendRequestItem[]
}

export interface FriendItem {
  userId: number
  username: string
  online: boolean
  busy: boolean
}

export interface FriendListData {
  friends: FriendItem[]
}

export interface PresenceData {
  userId: number
  online: boolean
  busy: boolean
}

export interface GameInviteSend {
  targetUserId: number
  /** `RANKED` or `QUIZ`. */
  type: string
  durationSeconds: number
  /** PIN for `QUIZ`, `null`/empty for `RANKED`. */
  roomPin: string | null
}

export interface GameInviteReceived {
  inviteId: string
  fromUserId: number
  fromUsername: string
  /** `RANKED` or `QUIZ`. */
  type: string
  durationSeconds: number
  /** PIN for `QUIZ`, `null` for `RANKED`. */
  roomPin: string | null
  expiresAtEpochMillis: number
}

export interface GameInviteRespond {
  inviteId: string
  accept: boolean
}

export interface GameInviteStatus {
  inviteId: string
  /** `SENT | ACCEPTED | REJECTED | EXPIRED | CANCELLED`. */
  status: string
}

// ---------------------------------------------------------------------------------------------
// Ranked match
// ---------------------------------------------------------------------------------------------

export interface FindMatchRequest {
  durationSeconds: number
}

export interface MatchFound {
  roomId: string
  opponent: string
  durationSeconds: number
}

export interface ChoiceData {
  choiceId: number
  content: string
  position: number
}

export interface QuestionData {
  sessionId: string
  attempt: number
  questionId: number
  content: string
  choices: ChoiceData[]
  questionDurationSeconds: number
  matchRemainingSeconds: number
}

export interface AnswerData {
  sessionId: string
  attempt: number
  questionId: number
  choiceId: number
}

export interface AnswerResult {
  sessionId: string
  attempt: number
  questionId: number
  correct: boolean
  /** Null on timeout (no choice was registered). */
  chosenChoiceId: number | null
  correctChoiceId: number
  scoreAwarded: number
}

export interface Scores {
  myScore: number
  opponentScore: number
}

export interface GameOver {
  /** `WIN | LOSE | DRAW`. */
  result: string
  myScore: number
  opponentScore: number
}

// ---------------------------------------------------------------------------------------------
// Quiz sets
// ---------------------------------------------------------------------------------------------

export interface QuizSetListRequest {
  /** `OWN` or `PUBLISHED`. */
  scope: string
}

export interface QuizSetId {
  quizSetId: number
}

export interface QuizSetPublishRequest {
  quizSetId: number
  published: boolean
}

export interface QuizSetSaved {
  quizSetId: number
}

export interface QuizSetSummary {
  id: number
  ownerId: number
  ownerUsername: string
  title: string
  description: string
  level: string
  published: boolean
  questionCount: number
  ownedByMe: boolean
}

export interface QuizChoiceEdit {
  /** `null` for a new choice (server assigns the id). */
  id: number | null
  content: string
  position: number
  correct: boolean
}

export interface QuizQuestionEdit {
  /** `null` for a new question. */
  id: number | null
  content: string
  explanation: string
  choices: QuizChoiceEdit[]
}

export interface QuizSetEdit {
  /** `null` for a new set. */
  id: number | null
  title: string
  description: string
  level: string
  questions: QuizQuestionEdit[]
}

export interface QuizSetListData {
  items: QuizSetSummary[]
}

// ---------------------------------------------------------------------------------------------
// Quiz room
// ---------------------------------------------------------------------------------------------

export interface QuizRoomCreateRequest {
  quizSetId: number
  durationMinutes: number
  hostPlays: boolean
  proctoringEnabled: boolean
}

export interface QuizRoomJoinRequest {
  pin: string
}

export interface QuizRoomPinRequest {
  pin: string
}

export interface QuizLobbyPlayer {
  userId: number
  username: string
  host: boolean
  playing: boolean
  connected: boolean
  cameraStatus: CameraStatus
  calibrationStatus: CalibrationStatus
  warningCount: number
}

export interface QuizLobbyData {
  pin: string
  title: string
  hostUsername: string
  currentUserHost: boolean
  hostPlays: boolean
  proctoringEnabled: boolean
  started: boolean
  playerCount: number
  members: QuizLobbyPlayer[]
}

/** `QUIZ_ROOM_CREATED` wraps the lobby in this record. */
export interface QuizRoomCreated {
  lobby: QuizLobbyData
}

export interface QuizRoomStarted {
  pin: string
  title: string
  durationSeconds: number
  playing: boolean
  host: boolean
  proctoringEnabled: boolean
}

export interface QuizQuestionData {
  sessionId: string
  pin: string
  attempt: number
  questionId: number
  content: string
  choices: ChoiceData[]
  questionDurationSeconds: number
  roomRemainingSeconds: number
}

export interface QuizAnswerData {
  sessionId: string
  attempt: number
  questionId: number
  choiceId: number
}

export interface QuizAnswerResult {
  sessionId: string
  attempt: number
  questionId: number
  correct: boolean
  chosenChoiceId: number | null
  correctChoiceId: number
  scoreAwarded: number
  totalScore: number
}

export interface QuizLeaderboardEntry {
  rank: number
  userId: number
  username: string
  score: number
  correctAnswers: number
  connected: boolean
}

export interface QuizLeaderboardData {
  pin: string
  /** `true` for `QUIZ_ROOM_FINISHED`, `false` while the room is running. */
  finished: boolean
  entries: QuizLeaderboardEntry[]
}

export interface QuizRejoinData {
  lobby: QuizLobbyData
  running: boolean
  playing: boolean
  proctoringEnabled: boolean
  remainingSeconds: number
}

// ---------------------------------------------------------------------------------------------
// Proctoring
// ---------------------------------------------------------------------------------------------

export interface ProctorStatusReport {
  pin: string
  cameraStatus: CameraStatus
  calibrationStatus: CalibrationStatus
  /** Free-form, client supplied; may be empty. */
  detail: string | null
  observedAtEpochMillis: number
}

export interface ProctorStatusUpdate {
  pin: string
  userId: number
  username: string
  cameraStatus: CameraStatus
  calibrationStatus: CalibrationStatus
  connected: boolean
  warningCount: number
  serverTimeEpochMillis: number
}

export interface ProctorEventReport {
  pin: string
  eventId: string
  type: ProctorEventType
  severity: ProctorSeverity
  frameSequence: number
  occurredAtEpochMillis: number
  durationMillis: number
  confidence: number
}

export interface ProctorEventData {
  pin: string
  eventId: string
  userId: number
  username: string
  type: ProctorEventType
  severity: ProctorSeverity
  frameSequence: number
  clientOccurredAtEpochMillis: number
  serverReceivedAtEpochMillis: number
  durationMillis: number
  confidence: number
  warningCount: number
}

export interface ProctorMediaSession {
  pin: string
  role: MediaRole
  /** Media TCP port decided by the server (control port + 1, or ephemeral in tests). */
  mediaPort: number
  /** One-shot secret: never log, never persist, never forward to the renderer. */
  ticket: string
  expiresAtEpochMillis: number
}

// ---------------------------------------------------------------------------------------------
// Directional payload maps
// ---------------------------------------------------------------------------------------------

/**
 * Payloads the desktop client sends. Empty payloads are the empty string on the wire
 * (the Java server accepts `""` and `null` alike: `TextNode` / `NullNode`).
 */
export interface ClientToServerPayloadMap {
  CONNECT: ''
  REGISTER: Credentials
  LOGIN: Credentials
  PROFILE_GET: ''
  LEADERBOARD_GET: ''
  MATCH_HISTORY_GET: ''
  DISCONNECT: ''
  USER_SEARCH: UserSearchRequest
  FRIEND_REQUEST_SEND: FriendTarget
  FRIEND_REQUEST_LIST: ''
  FRIEND_REQUEST_RESPOND: FriendRequestReply
  FRIEND_LIST: ''
  FRIEND_REMOVE: FriendTarget
  GAME_INVITE_SEND: GameInviteSend
  GAME_INVITE_RESPOND: GameInviteRespond
  FIND_MATCH: FindMatchRequest
  CANCEL_MATCH: ''
  ANSWER: AnswerData
  QUIZ_SET_LIST: QuizSetListRequest
  QUIZ_SET_GET: QuizSetId
  QUIZ_SET_SAVE: QuizSetEdit
  QUIZ_SET_PUBLISH: QuizSetPublishRequest
  QUIZ_SET_DELETE: QuizSetId
  QUIZ_ROOM_CREATE: QuizRoomCreateRequest
  QUIZ_ROOM_JOIN: QuizRoomJoinRequest
  QUIZ_ROOM_START: ''
  QUIZ_ANSWER: QuizAnswerData
  QUIZ_ROOM_LEAVE: ''
  QUIZ_ROOM_CANCEL: ''
  PROCTOR_STATUS_REPORT: ProctorStatusReport
  PROCTOR_EVENT_REPORT: ProctorEventReport
}

/**
 * Payloads the desktop client receives.
 *
 * Business failures are plain error-code strings (not objects), e.g. `QUIZ_ERROR: 'INVALID_PIN'`.
 * `WAITING` / `MATCH_CANCELLED` carry no data: `new Message(type, "")` becomes a `NullNode`
 * in Java, so the JSON payload is `null` (never `{}`).
 */
export interface ServerToClientPayloadMap {
  REGISTER_OK: PlayerStats
  REGISTER_FAIL: string
  LOGIN_OK: PlayerStats
  LOGIN_FAIL: string
  PROFILE_DATA: PlayerStats
  LEADERBOARD_DATA: LeaderboardData
  MATCH_HISTORY_DATA: MatchHistoryData
  QUERY_ERROR: string
  USER_SEARCH_RESULT: UserSearchData
  FRIEND_REQUEST_SENT: FriendTarget
  FRIEND_REQUEST_LIST: FriendRequestListData
  FRIEND_REQUEST_RESPOND: FriendRequestReply
  FRIEND_LIST: FriendListData
  FRIEND_REMOVED: FriendTarget
  PRESENCE_UPDATE: PresenceData
  GAME_INVITE_RECEIVED: GameInviteReceived
  GAME_INVITE_STATUS: GameInviteStatus
  SOCIAL_ERROR: string
  WAITING: null
  MATCH_CANCELLED: null
  MATCH_ERROR: string
  MATCH_FOUND: MatchFound
  QUESTION: QuestionData
  ANSWER_RESULT: AnswerResult
  SCORE_UPDATE: Scores
  GAME_OVER: GameOver
  QUIZ_SET_LIST_RESULT: QuizSetListData
  QUIZ_SET_DETAIL: QuizSetEdit
  QUIZ_SET_SAVED: QuizSetSaved
  /** Reuses the request record, so the echo contains the new `published` flag. */
  QUIZ_SET_PUBLISHED: QuizSetPublishRequest
  QUIZ_SET_DELETED: QuizSetId
  QUIZ_SET_ERROR: string
  QUIZ_ROOM_CREATED: QuizRoomCreated
  QUIZ_LOBBY_UPDATE: QuizLobbyData
  QUIZ_ROOM_START: QuizRoomStarted
  QUIZ_QUESTION: QuizQuestionData
  QUIZ_ANSWER_RESULT: QuizAnswerResult
  QUIZ_LEADERBOARD: QuizLeaderboardData
  /** Always `finished: true`. */
  QUIZ_ROOM_FINISHED: QuizLeaderboardData
  QUIZ_REJOINED: QuizRejoinData
  /** Reason string, not an error code: `HOST_CANCELLED` or `SERVER_STOPPED`. */
  QUIZ_ROOM_CANCEL: string
  PROCTOR_STATUS_UPDATE: ProctorStatusUpdate
  PROCTOR_EVENT: ProctorEventData
  PROCTOR_MEDIA_SESSION: ProctorMediaSession
  QUIZ_ERROR: string
}

/** Message types the client may send (see `handle` switch in `ServerRequestRouter`). */
export const CLIENT_TO_SERVER_TYPES = [
  'CONNECT',
  'REGISTER',
  'LOGIN',
  'PROFILE_GET',
  'LEADERBOARD_GET',
  'MATCH_HISTORY_GET',
  'DISCONNECT',
  'USER_SEARCH',
  'FRIEND_REQUEST_SEND',
  'FRIEND_REQUEST_LIST',
  'FRIEND_REQUEST_RESPOND',
  'FRIEND_LIST',
  'FRIEND_REMOVE',
  'GAME_INVITE_SEND',
  'GAME_INVITE_RESPOND',
  'FIND_MATCH',
  'CANCEL_MATCH',
  'ANSWER',
  'QUIZ_SET_LIST',
  'QUIZ_SET_GET',
  'QUIZ_SET_SAVE',
  'QUIZ_SET_PUBLISH',
  'QUIZ_SET_DELETE',
  'QUIZ_ROOM_CREATE',
  'QUIZ_ROOM_JOIN',
  'QUIZ_ROOM_START',
  'QUIZ_ANSWER',
  'QUIZ_ROOM_LEAVE',
  'QUIZ_ROOM_CANCEL',
  'PROCTOR_STATUS_REPORT',
  'PROCTOR_EVENT_REPORT'
] as const satisfies readonly MessageType[]

export type ClientToServerType = (typeof CLIENT_TO_SERVER_TYPES)[number]

/** Message types the server may push to the client. */
export const SERVER_TO_CLIENT_TYPES = [
  'REGISTER_OK',
  'REGISTER_FAIL',
  'LOGIN_OK',
  'LOGIN_FAIL',
  'PROFILE_DATA',
  'LEADERBOARD_DATA',
  'MATCH_HISTORY_DATA',
  'QUERY_ERROR',
  'USER_SEARCH_RESULT',
  'FRIEND_REQUEST_SENT',
  'FRIEND_REQUEST_LIST',
  'FRIEND_REQUEST_RESPOND',
  'FRIEND_LIST',
  'FRIEND_REMOVED',
  'PRESENCE_UPDATE',
  'GAME_INVITE_RECEIVED',
  'GAME_INVITE_STATUS',
  'SOCIAL_ERROR',
  'WAITING',
  'MATCH_CANCELLED',
  'MATCH_ERROR',
  'MATCH_FOUND',
  'QUESTION',
  'ANSWER_RESULT',
  'SCORE_UPDATE',
  'GAME_OVER',
  'QUIZ_SET_LIST_RESULT',
  'QUIZ_SET_DETAIL',
  'QUIZ_SET_SAVED',
  'QUIZ_SET_PUBLISHED',
  'QUIZ_SET_DELETED',
  'QUIZ_SET_ERROR',
  'QUIZ_ROOM_CREATED',
  'QUIZ_LOBBY_UPDATE',
  'QUIZ_ROOM_START',
  'QUIZ_QUESTION',
  'QUIZ_ANSWER_RESULT',
  'QUIZ_LEADERBOARD',
  'QUIZ_ROOM_FINISHED',
  'QUIZ_REJOINED',
  'QUIZ_ROOM_CANCEL',
  'PROCTOR_STATUS_UPDATE',
  'PROCTOR_EVENT',
  'PROCTOR_MEDIA_SESSION',
  'QUIZ_ERROR'
] as const satisfies readonly MessageType[]

export type ServerToClientType = (typeof SERVER_TO_CLIENT_TYPES)[number]

const CLIENT_TO_SERVER_TYPE_SET: ReadonlySet<string> = new Set(CLIENT_TO_SERVER_TYPES)
const SERVER_TO_CLIENT_TYPE_SET: ReadonlySet<string> = new Set(SERVER_TO_CLIENT_TYPES)

export function isClientToServerType(value: unknown): value is ClientToServerType {
  return typeof value === 'string' && CLIENT_TO_SERVER_TYPE_SET.has(value)
}

export function isServerToClientType(value: unknown): value is ServerToClientType {
  return typeof value === 'string' && SERVER_TO_CLIENT_TYPE_SET.has(value)
}

/**
 * Union view of every message type on the wire (both directions).
 *
 * `FRIEND_REQUEST_LIST`, `FRIEND_REQUEST_RESPOND`, `FRIEND_LIST`, `QUIZ_ROOM_START` and
 * `QUIZ_ROOM_CANCEL` exist in both directions with different payload shapes, hence the union.
 * Direction-specific code should use `OutboundMessage` / `ServerMessage` instead.
 */
export type MessagePayloadMap = {
  [K in ClientToServerType | ServerToClientType]:
    | (K extends ClientToServerType ? ClientToServerPayloadMap[K] : never)
    | (K extends ServerToClientType ? ServerToClientPayloadMap[K] : never)
}

/** `{ type: K, payload: MessagePayloadMap[K] }` for a single message type. */
export type MessageOf<K extends MessageType> = {
  type: K
  payload: MessagePayloadMap[K]
}

type Envelope<M, K extends keyof M> = {
  [P in K]: { type: P; payload: M[P] }
}[K]

/** Discriminated union of everything the desktop client is allowed to send. */
export type OutboundMessage = Envelope<ClientToServerPayloadMap, ClientToServerType>

/** Discriminated union of everything the server can push. */
export type ServerMessage = Envelope<ServerToClientPayloadMap, ServerToClientType>
