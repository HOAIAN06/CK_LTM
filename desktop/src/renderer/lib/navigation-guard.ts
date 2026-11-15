/**
 * Cảnh báo thay đổi chưa lưu (mirror `NavigationGuard` của JavaFX cho editor bộ đề).
 *
 * Shell là nơi duy nhất điều hướng bằng sidebar, nên nó đọc cờ này trước khi chuyển route
 * và hỏi xác nhận. Editor bật/tắt cờ khi dữ liệu bẩn; rời màn hình luôn đi qua một trong
 * hai đường: nút "Hủy" của editor (tự hỏi) hoặc sidebar (hỏi ở shell).
 */
import { create } from 'zustand'

export interface NavigationGuardState {
  dirty: boolean
  /** Mô tả ngắn để dialog nói rõ cái gì sẽ mất. */
  subject: string | null
  setDirty: (dirty: boolean, subject?: string) => void
  reset: () => void
}

export const useNavigationGuard = create<NavigationGuardState>()((set) => ({
  dirty: false,
  subject: null,
  setDirty: (dirty, subject) => set({ dirty, subject: subject ?? null }),
  reset: () => set({ dirty: false, subject: null })
}))

/** Đọc đồng bộ (dùng trong handler điều hướng của shell). */
export function isNavigationBlocked(): boolean {
  return useNavigationGuard.getState().dirty
}
