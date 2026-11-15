/**
 * Bố cục của khu vực đã đăng nhập: một shell duy nhất (title bar + sidebar + outlet).
 *
 * - `AppShell`/`AppTitleBar`/`AppSidebar` là component của design system; file này chỉ
 *   cấp dữ liệu thật (tên người chơi, tổng điểm, trạng thái kết nối).
 * - Không có nút cửa sổ tự vẽ: main process không expose kênh `nq:window:*`, nên title
 *   bar để Chromium vẽ overlay native (docs/desktop/architecture.md §5.1) và không render
 *   nút chết.
 * - Đăng xuất = gửi `DISCONNECT`, xoá phiên, đóng socket, rồi về `/login` — cùng ý nghĩa
 *   với `ClientApp.confirmAndLogout`.
 */
import { useState, useEffect, type ReactNode } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AppShell,
  AppSidebar,
  AppTitleBar,
  type NavItem,
  type SidebarUser
} from '../components/shell'
import { Button, Dialog } from '../components/ui'
import { useConnectionStore } from '../lib/connection-store'
import { useSessionStore } from '../lib/session-store'
import { useQuizStore } from '../lib/quiz'
import { useRankedStore } from '../lib/ranked'
import { useNavigationGuard } from '../lib/navigation-guard'
import { InviteHost } from './invite-host'
import { formatNumber } from '../lib/format'
import { DemoBadge } from './demo-badge'
import { NAV_ITEMS, navIdForPath, navItem } from './nav'
import { useTheme } from './theme-provider'

export function AuthenticatedLayout(): ReactNode {
  const player = useSessionStore((state) => state.player)
  const status = useConnectionStore((state) => state.status)
  const transportError = useConnectionStore((state) => state.transportError)
  const signOut = useConnectionStore((state) => state.signOut)

  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [pendingPath, setPendingPath] = useState<string | null>(null)

  const activeId = navIdForPath(location.pathname)
  const active = navItem(activeId)

  const restoreTarget = useQuizStore((state) => state.restoreTarget)
  const clearRestoreTarget = useQuizStore((state) => state.clearRestoreTarget)
  const rankedRestoreTarget = useRankedStore((state) => state.restoreTarget)
  const clearRankedRestoreTarget = useRankedStore((state) => state.clearRestoreTarget)
  const guardSubject = useNavigationGuard((state) => state.subject)
  const setGuardDirty = useNavigationGuard((state) => state.setDirty)

  /**
   * Khôi phục phòng Quiz sau khi đăng nhập lại (B4): `QUIZ_REJOINED` được xử lý ở store
   * (kênh luôn mở), còn điều hướng phải do một component đang mount thực hiện. Đặt ở shell
   * để nó chạy dù người dùng đang ở route nào.
   */
  useEffect(() => {
    if (!restoreTarget) return
    clearRestoreTarget()
    navigate(restoreTarget === 'battle' ? '/quiz/battle' : '/quiz/lobby', { replace: true })
  }, [restoreTarget, clearRestoreTarget, navigate])

  /** Lời mời Ranked được chấp nhận ở bất kỳ màn hình nào → vào thẳng trận. */
  useEffect(() => {
    if (!rankedRestoreTarget) return
    clearRankedRestoreTarget()
    navigate('/battle', { replace: true })
  }, [rankedRestoreTarget, clearRankedRestoreTarget, navigate])

  /** Sidebar là đường điều hướng chính: chặn khi editor bộ đề còn thay đổi chưa lưu. */
  const goTo = (path: string): void => {
    if (path === location.pathname) return
    if (useNavigationGuard.getState().dirty) {
      setPendingPath(path)
      return
    }
    navigate(path)
  }

  if (!player) {
    // Chưa đăng nhập (hoặc vừa mất kết nối): không có màn hình nào trong shell dùng được.
    return <Navigate to="/login" replace />
  }

  const sidebarItems: ReadonlyArray<NavItem> = NAV_ITEMS.map((item) => {
    const Icon = item.icon
    return {
      id: item.id,
      label: item.label,
      group: item.group,
      icon: <Icon size={18} aria-hidden="true" />
    }
  })

  const sidebarUser: SidebarUser = {
    name: player.username,
    meta: `${formatNumber(player.totalScore)} điểm · ${formatNumber(player.wins)} thắng`,
    status: status.state === 'connected' ? 'online' : 'offline'
  }

  const handleLogout = async (): Promise<void> => {
    setConfirmLogout(false)
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <AppShell
        titleBar={
          <AppTitleBar
            context={active.label}
            connection={{
              state: status.state,
              detail: transportError?.message ?? status.lastError ?? undefined
            }}
            theme={theme}
            onThemeChange={setTheme}
            rightSlot={<DemoBadge />}
          />
        }
        sidebar={
          <AppSidebar
            items={sidebarItems}
            activeId={activeId}
            onNavigate={(id) => {
              const target = NAV_ITEMS.find((item) => item.id === id)
              if (target) goTo(target.path)
            }}
            user={sidebarUser}
            onLogout={() => setConfirmLogout(true)}
          />
        }
      >
        <Outlet />
      </AppShell>

      <Dialog
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        closeOnScrimClick={false}
        title="Đăng xuất khỏi NihongoQuest?"
        description="Kết nối tới máy chủ sẽ được đóng và phiên hiện tại kết thúc. Mọi thay đổi chưa lưu sẽ mất."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmLogout(false)}>
              Ở lại
            </Button>
            <Button variant="danger" onClick={() => void handleLogout()}>
              Đăng xuất
            </Button>
          </>
        }
      />

      <Dialog
        open={pendingPath !== null}
        onClose={() => setPendingPath(null)}
        closeOnScrimClick={false}
        title="Bỏ thay đổi chưa lưu?"
        description={`${guardSubject ?? 'Màn hình hiện tại'} đang có thay đổi chưa lưu. Rời đi bây giờ sẽ mất các thay đổi đó.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingPath(null)}>
              Ở lại
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const target = pendingPath
                setPendingPath(null)
                setGuardDirty(false)
                if (target) navigate(target)
              }}
            >
              Rời và bỏ thay đổi
            </Button>
          </>
        }
      />

      <InviteHost />
    </>
  )
}
