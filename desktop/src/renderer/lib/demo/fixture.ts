/**
 * Fixture xem thử — CHỈ tồn tại trong dev build.
 *
 * Mục đích duy nhất: dựng **màn hình thật** khi không có server Java để chụp ảnh/review
 * giao diện. Bốn hàng rào:
 *  1. `import.meta.env.DEV` — Vite thay bằng `false` trong production, nhánh chết bị loại
 *     bỏ nên bản đóng gói không chứa cả một chunk fixture (kiểm chứng bằng grep asset).
 *  2. URL phải có `?demo=1`.
 *  3. UI luôn hiện badge "Chế độ xem thử" khi cờ được bật (`lib/demo/flag.ts`).
 *  4. Không module production nào import fixture; nó chỉ được nạp bằng `import()` động
 *     trong `main.tsx` dưới `import.meta.env.DEV`.
 *
 * Nguyên tắc nội dung: fixture chỉ trả **dữ liệu đọc** (hồ sơ, bảng xếp hạng, bộ đề, bạn
 * bè, lịch sử, lobby). Nó **không** phát `QUESTION` / `ANSWER_RESULT` / `GAME_OVER`, vì
 * một trận giả sẽ mô tả sai quyền quyết định của máy chủ. Các màn thi đấu được kiểm chứng
 * bằng unit test thay vì bằng fixture.
 *
 * Mọi payload được khai báo với đúng type của `@shared/protocol`, nên sai field là lỗi
 * TypeScript ngay khi build.
 */
import type { ConnectionStatus, NqBridge, NqEvent } from '@shared/ipc'
import type {
  FriendItem,
  FriendRequestItem,
  GameInviteStatus,
  LeaderboardData,
  MatchHistoryEntry,
  PlayerStats,
  QuizLobbyData,
  QuizLobbyPlayer,
  QuizSetEdit,
  QuizSetListData,
  QuizSetSummary,
  UserSearchData,
  UserSearchItem
} from '@shared/protocol'
import { setBridgeOverride } from '../bridge'
import { useSessionStore } from '../session-store'
import { isDemoMode, setDemoMode } from './flag'

/* -------------------------------------------------------------------------- */
/* Hồ sơ và lịch sử                                                            */
/* -------------------------------------------------------------------------- */

export const DEMO_PLAYER: PlayerStats = {
  id: 42,
  username: 'minhanh_02',
  wins: 12,
  losses: 5,
  draws: 2,
  totalScore: 2480,
  questionsAnswered: 268,
  correctAnswers: 198
}

function demoMatch(
  index: number,
  opponent: string,
  myScore: number,
  opponentScore: number,
  result: string,
  durationSeconds: number,
  hoursAgo: number
): MatchHistoryEntry {
  return {
    matchId: 9000 + index,
    opponentUsername: opponent,
    myScore,
    opponentScore,
    result,
    durationSeconds,
    endReason: 'NORMAL',
    playedAt: new Date(Date.now() - hoursAgo * 3_600_000).toISOString()
  }
}

export const DEMO_MATCHES: ReadonlyArray<MatchHistoryEntry> = [
  demoMatch(8, 'khoa_tran', 7, 5, 'WIN', 180, 3),
  demoMatch(7, 'linh_nguyen', 4, 6, 'LOSS', 180, 27),
  demoMatch(6, 'bao_pham', 6, 6, 'DRAW', 300, 51),
  demoMatch(5, 'yuki_92', 9, 3, 'WIN', 300, 74),
  demoMatch(4, 'an_nguyen', 2, 5, 'LOSS', 180, 96),
  demoMatch(3, 'chi_le', 8, 4, 'WIN', 300, 120),
  demoMatch(2, 'dung_pham', 5, 0, 'WIN', 180, 168),
  demoMatch(1, 'mai_hoang', 3, 3, 'DRAW', 300, 190)
]

/* -------------------------------------------------------------------------- */
/* Bảng xếp hạng                                                               */
/* -------------------------------------------------------------------------- */

/**
 * 10 người chơi, xếp đúng thứ tự server sẽ trả (`wins DESC, totalScore DESC`).
 * `minhanh_02` nằm trong danh sách để nhìn thấy dòng tô sáng của chính mình.
 */
export const DEMO_LEADERBOARD: LeaderboardData = {
  players: [
    { rank: 1, userId: 9, username: 'chi_le', wins: 31, losses: 6, draws: 2, totalScore: 6420 },
    { rank: 2, userId: 12, username: 'khoa_tran', wins: 27, losses: 9, draws: 1, totalScore: 5910 },
    { rank: 3, userId: 18, username: 'mai_hoang', wins: 22, losses: 7, draws: 4, totalScore: 4870 },
    { rank: 4, userId: 42, username: 'minhanh_02', wins: 12, losses: 5, draws: 2, totalScore: 2480 },
    { rank: 5, userId: 21, username: 'yuki_92', wins: 11, losses: 8, draws: 3, totalScore: 2350 },
    { rank: 6, userId: 15, username: 'bao_pham', wins: 9, losses: 11, draws: 2, totalScore: 2100 },
    { rank: 7, userId: 23, username: 'linh_nguyen', wins: 8, losses: 12, draws: 1, totalScore: 1840 },
    { rank: 8, userId: 24, username: 'an_nguyen', wins: 6, losses: 13, draws: 3, totalScore: 1520 },
    { rank: 9, userId: 25, username: 'dung_pham', wins: 4, losses: 15, draws: 0, totalScore: 980 },
    { rank: 10, userId: 26, username: 'hoa_vu', wins: 2, losses: 17, draws: 1, totalScore: 640 }
  ]
}

/* -------------------------------------------------------------------------- */
/* Bộ đề                                                                       */
/* -------------------------------------------------------------------------- */

const SET_OWN_DRAFT_1: QuizSetSummary = {
  id: 4,
  ownerId: 42,
  ownerUsername: 'minhanh_02',
  title: 'Luyện N5 · Buổi 6',
  description: 'Từ vựng bài 1–3, dùng cho buổi học thứ Sáu',
  level: 'N5',
  published: false,
  questionCount: 3,
  ownedByMe: true
}

const SET_OWN_DRAFT_2: QuizSetSummary = {
  id: 5,
  ownerId: 42,
  ownerUsername: 'minhanh_02',
  title: 'Kanji tuần 3',
  description: 'Bản nháp, mới có 1 câu',
  level: 'N4',
  published: false,
  questionCount: 1,
  ownedByMe: true
}

const SET_OWN_PUBLISHED: QuizSetSummary = {
  id: 6,
  ownerId: 42,
  ownerUsername: 'minhanh_02',
  title: 'Nghe hiểu N5 · Bài kiểm tra',
  description: 'Bộ đề đã xuất bản cho cả lớp',
  level: 'N5',
  published: true,
  questionCount: 8,
  ownedByMe: true
}

const SET_FOREIGN_PUBLISHED: QuizSetSummary = {
  id: 7,
  ownerId: 9,
  ownerUsername: 'chi_le',
  title: 'Từ vựng N4 · Chủ đề trường học',
  description: 'Bộ đề của lớp N4',
  level: 'N4',
  published: true,
  questionCount: 12,
  ownedByMe: false
}

/** `OWN` và `PUBLISHED` trả đúng tập mà server sẽ trả, không gộp hai scope làm một. */
export function demoQuizSetList(scope: string): QuizSetListData {
  if (scope.trim().toUpperCase() === 'PUBLISHED') {
    return { items: [SET_OWN_PUBLISHED, SET_FOREIGN_PUBLISHED] }
  }
  return { items: [SET_OWN_DRAFT_1, SET_OWN_DRAFT_2, SET_OWN_PUBLISHED] }
}

/** Bộ đề 3 câu cho editor: mỗi câu đúng 4 lựa chọn và đúng một đáp án. */
export const DEMO_QUIZ_SET_DETAIL: QuizSetEdit = {
  id: 4,
  title: 'Luyện N5 · Buổi 6',
  description: 'Từ vựng bài 1–3, dùng cho buổi học thứ Sáu',
  level: 'N5',
  questions: [
    {
      id: 11,
      content: '「図書館」の読み方はどれですか。',
      explanation: 'としょかん = thư viện.',
      choices: [
        { id: 41, content: 'としょかん', position: 1, correct: true },
        { id: 42, content: 'ずしょかん', position: 2, correct: false },
        { id: 43, content: 'とうしょかん', position: 3, correct: false },
        { id: 44, content: 'としょかん (a)', position: 4, correct: false }
      ]
    },
    {
      id: 12,
      content: '「食べる」の意味はどれですか。',
      explanation: '食べる = ăn.',
      choices: [
        { id: 45, content: 'ăn', position: 1, correct: true },
        { id: 46, content: 'uống', position: 2, correct: false },
        { id: 47, content: 'ngủ', position: 3, correct: false },
        { id: 48, content: 'đi', position: 4, correct: false }
      ]
    },
    {
      id: 13,
      content: '「先生」は何を指しますか。',
      explanation: '先生 = giáo viên / thầy cô.',
      choices: [
        { id: 49, content: 'giáo viên', position: 1, correct: true },
        { id: 50, content: 'học sinh', position: 2, correct: false },
        { id: 51, content: 'bác sĩ', position: 3, correct: false },
        { id: 52, content: 'nhân viên', position: 4, correct: false }
      ]
    }
  ]
}

/* -------------------------------------------------------------------------- */
/* Bạn bè, presence, tìm kiếm                                                  */
/* -------------------------------------------------------------------------- */

export const DEMO_FRIENDS: ReadonlyArray<FriendItem> = [
  { userId: 12, username: 'khoa_tran', online: true, busy: false },
  { userId: 23, username: 'linh_nguyen', online: true, busy: true },
  { userId: 15, username: 'bao_pham', online: false, busy: false },
  { userId: 21, username: 'yuki_92', online: true, busy: false }
]

export const DEMO_FRIEND_REQUESTS: ReadonlyArray<FriendRequestItem> = [
  { userId: 24, username: 'an_nguyen' },
  { userId: 25, username: 'dung_pham' }
]

/** Người chưa phải bạn — dùng cho kết quả tìm kiếm. */
export const DEMO_SEARCH_USERS: ReadonlyArray<UserSearchItem> = [
  { userId: 18, username: 'mai_hoang', online: true, busy: false },
  { userId: 26, username: 'hoa_vu', online: true, busy: true },
  { userId: 27, username: 'quang_do', online: false, busy: false },
  { userId: 28, username: 'thao_bui', online: true, busy: false }
]

/** Lọc theo substring như server; không khớp thì trả rỗng (không bịa). */
export function demoUserSearch(query: string): UserSearchData {
  const needle = query.trim().toLowerCase()
  if (needle.length === 0) return { users: [] }
  return {
    users: DEMO_SEARCH_USERS.filter((user) => user.username.toLowerCase().includes(needle))
  }
}

/* -------------------------------------------------------------------------- */
/* Lobby Quiz                                                                  */
/* -------------------------------------------------------------------------- */

function lobbyMember(overrides: Partial<QuizLobbyPlayer> & { userId: number; username: string }): QuizLobbyPlayer {
  return {
    host: false,
    playing: true,
    connected: true,
    cameraStatus: 'NOT_REQUIRED',
    calibrationStatus: 'NOT_REQUIRED',
    warningCount: 0,
    ...overrides
  }
}

export interface DemoLobbyOptions {
  viewerIsHost: boolean
  hostPlays: boolean
  proctoringEnabled: boolean
  /** Lần cập nhật thứ hai: camera đang mở chuyển sang READY (DENIED vẫn còn). */
  camerasReady?: boolean
}

/**
 * Lobby 3 thành viên. Khi bật giám sát, `linh_nguyen` ở trạng thái `DENIED` để chứng minh
 * trạng thái camera **không** chặn nút bắt đầu (D-002/D-005): host vẫn bấm được vì có 2
 * người chơi đang kết nối.
 */
export function demoLobby(options: DemoLobbyOptions): QuizLobbyData {
  const { viewerIsHost, hostPlays, proctoringEnabled, camerasReady = false } = options
  const proctorCamera = (ready: boolean) => (proctoringEnabled ? (ready ? 'READY' : 'INITIALIZING') : 'NOT_REQUIRED')

  const host = viewerIsHost
    ? lobbyMember({
        userId: DEMO_PLAYER.id,
        username: DEMO_PLAYER.username,
        host: true,
        playing: hostPlays,
        cameraStatus: proctoringEnabled ? 'NOT_APPLICABLE' : 'NOT_REQUIRED'
      })
    : lobbyMember({ userId: 12, username: 'khoa_tran', host: true, playing: true })

  const denied = lobbyMember({
    userId: 23,
    username: 'linh_nguyen',
    playing: true,
    cameraStatus: proctoringEnabled ? 'DENIED' : 'NOT_REQUIRED',
    calibrationStatus: proctoringEnabled ? 'FAILED' : 'NOT_REQUIRED',
    warningCount: proctoringEnabled ? 1 : 0
  })

  const third = lobbyMember({
    userId: 18,
    username: 'mai_hoang',
    playing: true,
    cameraStatus: proctorCamera(camerasReady)
  })

  const members: QuizLobbyPlayer[] = viewerIsHost
    ? [host, denied, third]
    : [
        // Người xem là người chơi thường; host là tài khoản khác.
        lobbyMember({ userId: 12, username: 'khoa_tran', host: true, playing: true }),
        lobbyMember({
          userId: DEMO_PLAYER.id,
          username: DEMO_PLAYER.username,
          playing: true,
          cameraStatus: proctorCamera(camerasReady)
        }),
        denied
      ]

  return {
    pin: '246810',
    title: 'Luyện N5 · Buổi 6',
    hostUsername: viewerIsHost ? DEMO_PLAYER.username : 'khoa_tran',
    currentUserHost: viewerIsHost,
    hostPlays,
    proctoringEnabled,
    started: false,
    playerCount: members.filter((member) => member.playing && member.connected).length,
    members
  }
}

/* -------------------------------------------------------------------------- */
/* Deep link                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * `?demo=1&screen=<name>` → mở thẳng màn hình sau khi mount. Hash được đặt **trước** khi
 * React render nên `HashRouter` đọc đúng ngay lần đầu (không nháy màn hình khác).
 */
export const DEMO_SCREEN_PATHS = {
  login: '/login',
  home: '/',
  sets: '/sets',
  editor: '/sets/editor?id=4',
  leaderboard: '/leaderboard',
  profile: '/profile',
  friends: '/friends',
  history: '/history',
  quiz: '/quiz'
} as const

export type DemoScreen = keyof typeof DEMO_SCREEN_PATHS

export function isDemoScreen(value: string | null): value is DemoScreen {
  return value !== null && Object.prototype.hasOwnProperty.call(DEMO_SCREEN_PATHS, value)
}

/* -------------------------------------------------------------------------- */
/* Bridge giả                                                                  */
/* -------------------------------------------------------------------------- */

const PRESENCE_DELAY_MS = 400
const LOBBY_REFRESH_DELAY_MS = 800

/** Bridge giả: cùng bề mặt `window.nq`, không mở socket nào. */
export function createDemoBridge(): NqBridge {
  let listener: ((event: NqEvent) => void) | null = null
  let presenceEmitted = false
  let lastCreate: { hostPlays: boolean; proctoringEnabled: boolean; durationMinutes: number } = {
    hostPlays: true,
    proctoringEnabled: false,
    durationMinutes: 3
  }

  let status: ConnectionStatus = {
    state: 'connected',
    host: 'demo.local',
    port: 5000,
    lastError: null,
    connectedAt: Date.now()
  }

  const emit = (event: NqEvent): void => {
    listener?.(event)
  }

  const reply = (message: NqEvent['message'], delayMs = 0): void => {
    if (!message) return
    window.setTimeout(() => emit({ kind: 'message', message }), delayMs)
  }

  const inviteStatus = (payload: GameInviteStatus): void => {
    reply({ type: 'GAME_INVITE_STATUS', payload })
  }

  return {
    connect(options): Promise<{ ok: boolean }> {
      status = {
        state: 'connected',
        host: options.host,
        port: options.port,
        lastError: null,
        connectedAt: Date.now()
      }
      emit({ kind: 'status', status })
      return Promise.resolve({ ok: true })
    },

    disconnect(): Promise<void> {
      status = {
        state: 'disconnected',
        host: status.host,
        port: status.port,
        lastError: null,
        connectedAt: null
      }
      emit({ kind: 'status', status })
      return Promise.resolve()
    },

    send(frame): Promise<{ ok: boolean }> {
      switch (frame.type) {
        case 'PROFILE_GET':
          reply({ type: 'PROFILE_DATA', payload: DEMO_PLAYER })
          break

        case 'LOGIN':
          reply({ type: 'LOGIN_OK', payload: DEMO_PLAYER })
          break

        case 'MATCH_HISTORY_GET':
          reply({ type: 'MATCH_HISTORY_DATA', payload: { matches: [...DEMO_MATCHES] } })
          break

        case 'LEADERBOARD_GET':
          reply({ type: 'LEADERBOARD_DATA', payload: DEMO_LEADERBOARD })
          break

        case 'QUIZ_SET_LIST':
          reply({
            type: 'QUIZ_SET_LIST_RESULT',
            payload: demoQuizSetList(frame.payload.scope)
          })
          break

        case 'QUIZ_SET_GET':
          reply({ type: 'QUIZ_SET_DETAIL', payload: DEMO_QUIZ_SET_DETAIL })
          break

        case 'QUIZ_SET_SAVE':
          reply({ type: 'QUIZ_SET_SAVED', payload: { quizSetId: frame.payload.id ?? 77 } })
          break

        case 'QUIZ_SET_PUBLISH':
          reply({ type: 'QUIZ_SET_PUBLISHED', payload: frame.payload })
          break

        case 'QUIZ_SET_DELETE':
          reply({ type: 'QUIZ_SET_DELETED', payload: frame.payload })
          break

        case 'USER_SEARCH':
          reply({ type: 'USER_SEARCH_RESULT', payload: demoUserSearch(frame.payload.query) })
          break

        case 'FRIEND_LIST':
          reply({ type: 'FRIEND_LIST', payload: { friends: [...DEMO_FRIENDS] } })
          break

        case 'FRIEND_REQUEST_LIST':
          reply({ type: 'FRIEND_REQUEST_LIST', payload: { requests: [...DEMO_FRIEND_REQUESTS] } })
          break

        case 'FRIEND_REQUEST_SEND':
          reply({ type: 'FRIEND_REQUEST_SENT', payload: frame.payload })
          break

        case 'FRIEND_REQUEST_RESPOND':
          reply({ type: 'FRIEND_REQUEST_RESPOND', payload: frame.payload })
          break

        case 'FRIEND_REMOVE':
          reply({ type: 'FRIEND_REMOVED', payload: frame.payload })
          break

        case 'GAME_INVITE_SEND':
          inviteStatus({ inviteId: 'demo-invite-1', status: 'SENT' })
          break

        case 'QUIZ_ROOM_CREATE': {
          lastCreate = {
            hostPlays: frame.payload.hostPlays,
            proctoringEnabled: frame.payload.proctoringEnabled,
            durationMinutes: frame.payload.durationMinutes
          }
          const lobby = demoLobby({
            viewerIsHost: true,
            hostPlays: lastCreate.hostPlays,
            proctoringEnabled: lastCreate.proctoringEnabled
          })
          reply({ type: 'QUIZ_ROOM_CREATED', payload: { lobby } })
          // Cập nhật lobby lần hai: camera đang mở chuyển sang READY, DENIED vẫn còn.
          reply(
            {
              type: 'QUIZ_LOBBY_UPDATE',
              payload: demoLobby({
                viewerIsHost: true,
                hostPlays: lastCreate.hostPlays,
                proctoringEnabled: lastCreate.proctoringEnabled,
                camerasReady: true
              })
            },
            LOBBY_REFRESH_DELAY_MS
          )
          break
        }

        case 'QUIZ_ROOM_JOIN':
          reply({
            type: 'QUIZ_LOBBY_UPDATE',
            payload: demoLobby({ viewerIsHost: false, hostPlays: true, proctoringEnabled: false })
          })
          break

        case 'QUIZ_ROOM_START':
          // Không gửi câu hỏi: màn thi hiển thị trạng thái "chờ câu đầu tiên" trung thực.
          reply({
            type: 'QUIZ_ROOM_START',
            payload: {
              pin: '246810',
              title: 'Luyện N5 · Buổi 6',
              durationSeconds: Math.max(60, lastCreate.durationMinutes * 60),
              playing: lastCreate.hostPlays,
              host: true,
              proctoringEnabled: lastCreate.proctoringEnabled
            }
          })
          break

        case 'QUIZ_ROOM_CANCEL':
          reply({ type: 'QUIZ_ROOM_CANCEL', payload: 'HOST_CANCELLED' })
          break

        default:
          break
      }
      return Promise.resolve({ ok: true })
    },

    getStatus(): Promise<ConnectionStatus> {
      return Promise.resolve(status)
    },

    onEvent(next): () => void {
      listener = next
      next({ kind: 'status', status })

      // Một cập nhật presence sau khi đăng ký: `khoa_tran` hết bận.
      if (!presenceEmitted) {
        presenceEmitted = true
        window.setTimeout(() => {
          emit({ kind: 'message', message: { type: 'PRESENCE_UPDATE', payload: { userId: 12, online: true, busy: false } } })
        }, PRESENCE_DELAY_MS)
      }

      return () => {
        listener = null
      }
    },

    app: { version: '0.0.0-demo', platform: 'linux', packaged: false }
  }
}

/* -------------------------------------------------------------------------- */
/* Bootstrap                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Bật fixture nếu URL yêu cầu. Trả `true` khi đã ở chế độ xem thử.
 * `?demo=1&screen=login` giữ nguyên màn hình đăng nhập (không tạo phiên giả).
 */
export function enableDemoIfRequested(): boolean {
  if (!import.meta.env.DEV) return false
  if (typeof window === 'undefined') return false

  const params = new URLSearchParams(window.location.search)
  if (params.get('demo') !== '1') return false

  setBridgeOverride(createDemoBridge())
  setDemoMode(true)

  if (params.get('screen') !== 'login') {
    useSessionStore.setState({ player: DEMO_PLAYER })
  }
  return true
}

/**
 * Đặt hash theo `screen` để mở thẳng màn hình cần review. Chỉ chạy khi fixture đã bật, và
 * chỉ nhận các tên trong `DEMO_SCREEN_PATHS` (không điều hướng theo chuỗi tuỳ ý từ URL).
 */
export function applyDemoDeepLink(): boolean {
  if (!isDemoMode()) return false
  if (typeof window === 'undefined') return false

  const screen = new URLSearchParams(window.location.search).get('screen')
  if (!isDemoScreen(screen)) return false

  const target = `#${DEMO_SCREEN_PATHS[screen]}`
  if (window.location.hash !== target) {
    window.location.hash = target
  }
  return true
}
