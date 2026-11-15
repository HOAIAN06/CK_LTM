/**
 * Điều hướng duy nhất của app (8 mục, đúng danh sách sản phẩm).
 *
 * Nhãn/mô tả tiếng Việt lấy từ `ClientApp` của bản JavaFX để hai client nói cùng một
 * ngôn ngữ. Mỗi mục là một nguồn dữ liệu cho sidebar, title bar và page header, nên
 * không màn hình nào phải tự khai báo lại tiêu đề của mình.
 */
import type { LucideIcon } from '../components/ui/icons'
import {
  DoorOpen,
  History,
  Home,
  Library,
  Swords,
  Trophy,
  User,
  Users
} from '../components/ui/icons'

export interface NavDefinition {
  id: string
  path: string
  label: string
  group?: string
  icon: LucideIcon
  /** Dòng phụ của page header — nói màn hình này để làm gì. */
  subtitle: string
}

export const NAV_ITEMS: ReadonlyArray<NavDefinition> = [
  {
    id: 'home',
    path: '/',
    label: 'Trang chủ',
    icon: Home,
    subtitle: 'Tiến độ thật của bạn và ba cách để tiếp tục luyện tập.'
  },
  {
    id: 'ranked',
    path: '/ranked',
    label: 'Đấu hạng 1v1',
    group: 'Chơi',
    icon: Swords,
    subtitle: 'Chọn thời lượng và tìm đối thủ phù hợp.'
  },
  {
    id: 'quiz',
    path: '/quiz',
    label: 'Phòng Quiz',
    group: 'Chơi',
    icon: DoorOpen,
    subtitle: 'Tạo phòng mới hoặc tham gia bằng mã PIN.'
  },
  {
    id: 'sets',
    path: '/sets',
    label: 'Bộ đề',
    group: 'Chơi',
    icon: Library,
    subtitle: 'Tạo, chỉnh sửa và xuất bản bộ câu hỏi.'
  },
  {
    id: 'leaderboard',
    path: '/leaderboard',
    label: 'Bảng xếp hạng',
    group: 'Cộng đồng',
    icon: Trophy,
    subtitle: 'Top 10 thành tích Ranked toàn hệ thống.'
  },
  {
    id: 'friends',
    path: '/friends',
    label: 'Bạn bè',
    group: 'Cộng đồng',
    icon: Users,
    subtitle: 'Tìm người chơi, theo dõi trạng thái và gửi lời mời.'
  },
  {
    id: 'history',
    path: '/history',
    label: 'Lịch sử',
    group: 'Cộng đồng',
    icon: History,
    subtitle: 'Tối đa 100 trận Ranked mới nhất.'
  },
  {
    id: 'profile',
    path: '/profile',
    label: 'Hồ sơ',
    group: 'Tài khoản',
    icon: User,
    subtitle: 'Thành tích và tiến độ học tập của bạn.'
  }
]

export type NavId = 'home' | 'ranked' | 'quiz' | 'sets' | 'leaderboard' | 'friends' | 'history' | 'profile'

const NAV_BY_PATH = new Map(NAV_ITEMS.map((item) => [item.path, item.id]))

/**
 * Các route thuộc một mục điều hướng nhưng không phải mục đó (trận đang diễn ra, màn kết
 * quả, lobby và màn thi Quiz vẫn thuộc mục gốc của chúng, để sidebar sáng đúng chỗ và
 * title bar có ngữ cảnh).
 */
const PATH_ALIASES: ReadonlyMap<string, NavId> = new Map([
  ['/battle', 'ranked'],
  ['/result', 'ranked'],
  ['/quiz/lobby', 'quiz'],
  ['/quiz/battle', 'quiz'],
  ['/sets/editor', 'sets']
])

/** Route có tham số: tiền tố → mục điều hướng (bảng giám sát thuộc mục Phòng Quiz). */
const PATH_PREFIX_ALIASES: ReadonlyArray<readonly [string, NavId]> = [['/proctor/', 'quiz']]

/** `/ranked` → `ranked`; đường dẫn lạ rơi về `home` (không có mục nào sáng sai). */
export function navIdForPath(pathname: string): NavId {
  const normalized = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  const alias = PATH_ALIASES.get(normalized)
  if (alias) return alias
  for (const [prefix, id] of PATH_PREFIX_ALIASES) {
    if (normalized.startsWith(prefix)) return id
  }
  const id = NAV_BY_PATH.get(normalized)
  return (id as NavId | undefined) ?? 'home'
}

export function navItem(id: NavId): NavDefinition {
  const item = NAV_ITEMS.find((candidate) => candidate.id === id)
  if (!item) throw new Error(`Không có mục điều hướng "${id}"`)
  return item
}
