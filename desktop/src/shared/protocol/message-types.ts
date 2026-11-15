/**
 * Mirror of `com.nihongoquest.common.protocol.MessageType`.
 *
 * The Java enum is the source of truth. Values below MUST stay in the same order and keep the
 * exact same spelling, because:
 *  - the wire format carries the enum `name()` as a JSON string, and
 *  - the JavaFX client / Java server match on those strings.
 *
 * `MESSAGE_TYPES` is a runtime copy used by tests (and by the codec guard). Never reorder it:
 * the order is the Java declaration order so a diff against `MessageType.java` is trivial.
 */

export const MESSAGE_TYPES = [
  'CONNECT',
  'REGISTER',
  'REGISTER_OK',
  'REGISTER_FAIL',
  'LOGIN',
  'LOGIN_OK',
  'LOGIN_FAIL',
  'PROFILE_GET',
  'PROFILE_DATA',
  'LEADERBOARD_GET',
  'LEADERBOARD_DATA',
  'MATCH_HISTORY_GET',
  'MATCH_HISTORY_DATA',
  'QUERY_ERROR',
  'USER_SEARCH',
  'USER_SEARCH_RESULT',
  'FRIEND_REQUEST_SEND',
  'FRIEND_REQUEST_SENT',
  'FRIEND_REQUEST_LIST',
  'FRIEND_REQUEST_RESPOND',
  'FRIEND_LIST',
  'FRIEND_REMOVE',
  'FRIEND_REMOVED',
  'PRESENCE_UPDATE',
  'GAME_INVITE_SEND',
  'GAME_INVITE_RECEIVED',
  'GAME_INVITE_RESPOND',
  'GAME_INVITE_STATUS',
  'SOCIAL_ERROR',
  'FIND_MATCH',
  'CANCEL_MATCH',
  'WAITING',
  'MATCH_CANCELLED',
  'MATCH_ERROR',
  'MATCH_FOUND',
  'QUESTION',
  'ANSWER',
  'ANSWER_RESULT',
  'SCORE_UPDATE',
  'GAME_OVER',
  'QUIZ_SET_LIST',
  'QUIZ_SET_LIST_RESULT',
  'QUIZ_SET_GET',
  'QUIZ_SET_DETAIL',
  'QUIZ_SET_SAVE',
  'QUIZ_SET_SAVED',
  'QUIZ_SET_PUBLISH',
  'QUIZ_SET_PUBLISHED',
  'QUIZ_SET_DELETE',
  'QUIZ_SET_DELETED',
  'QUIZ_SET_ERROR',
  'QUIZ_ROOM_CREATE',
  'QUIZ_ROOM_CREATED',
  'QUIZ_ROOM_JOIN',
  'QUIZ_LOBBY_UPDATE',
  'QUIZ_ROOM_START',
  'QUIZ_QUESTION',
  'QUIZ_ANSWER',
  'QUIZ_ANSWER_RESULT',
  'QUIZ_LEADERBOARD',
  'QUIZ_ROOM_LEAVE',
  'QUIZ_ROOM_CANCEL',
  'QUIZ_REJOINED',
  'QUIZ_ROOM_FINISHED',
  'PROCTOR_STATUS_REPORT',
  'PROCTOR_STATUS_UPDATE',
  'PROCTOR_EVENT_REPORT',
  'PROCTOR_EVENT',
  'PROCTOR_MEDIA_SESSION',
  'QUIZ_ERROR',
  'DISCONNECT'
] as const

export type MessageType = (typeof MESSAGE_TYPES)[number]

const MESSAGE_TYPE_SET: ReadonlySet<string> = new Set(MESSAGE_TYPES)

/** Narrow an untrusted JSON value (`message.type`) to a known protocol message type. */
export function isMessageType(value: unknown): value is MessageType {
  return typeof value === 'string' && MESSAGE_TYPE_SET.has(value)
}
