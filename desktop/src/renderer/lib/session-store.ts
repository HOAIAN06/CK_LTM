/**
 * Phiên của người dùng đang đăng nhập.
 *
 * Chỉ giữ dữ liệu **máy chủ đã gửi** (`PlayerStats`). Không có mật khẩu, không có
 * token, không có gì được suy ra từ client: điểm, thắng/thua và độ chính xác đều do
 * server quyết định (`docs/protocol.md` §2–3).
 *
 * Không persist: đóng ứng dụng là mất phiên, và người dùng phải đăng nhập lại — cùng
 * hành vi với client JavaFX.
 */
import { create } from 'zustand'
import type { PlayerStats } from '@shared/protocol'

export interface SessionState {
  /** Hồ sơ máy chủ trả về ở `LOGIN_OK` / `PROFILE_DATA`; `null` khi chưa đăng nhập. */
  player: PlayerStats | null
  setPlayer: (player: PlayerStats) => void
  clear: () => void
}

export const useSessionStore = create<SessionState>()((set) => ({
  player: null,
  setPlayer: (player) => set({ player }),
  clear: () => set({ player: null })
}))

/** Dùng cho test và cho luồng đăng xuất khi cần reset sạch. */
export function resetSessionStore(): void {
  useSessionStore.setState({ player: null })
}
