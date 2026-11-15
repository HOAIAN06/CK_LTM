/**
 * Router của ứng dụng.
 *
 * `HashRouter` là bắt buộc: bản production được nạp qua `nq-app://nihongoquest/index.html`
 * và cũng chạy được từ `file://`, nơi history API không có server để fallback
 * (docs/desktop/architecture.md §4.1).
 *
 * Guard:
 * - Chưa đăng nhập → `/login`.
 * - Đã đăng nhập mà vào `/login` → `/`.
 * - Đường dẫn lạ → `/` (hoặc `/login` nếu chưa có phiên).
 */
import { Suspense, lazy, type ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Spinner } from '../components/ui'
import { AuthenticatedLayout } from './authenticated-layout'
import { HomeRoute } from '../routes/home-route'
import { LoginRoute } from '../routes/login-route'
import { MatchmakingRoute } from '../routes/matchmaking-route'
import { BattleRoute } from '../routes/battle-route'
import { ResultRoute } from '../routes/result-route'
import { QuizRoute } from '../routes/quiz-route'
import { QuizLobbyRoute } from '../routes/quiz-lobby-route'
import { QuizBattleRoute } from '../routes/quiz-battle-route'
import { ProctorDashboardRoute } from '../routes/proctor-dashboard-route'
import { ProctorSessionHost } from '../features/proctor'
import { SetsRoute } from '../routes/sets-route'
import { SetEditorRoute } from '../routes/set-editor-route'
import { LeaderboardRoute } from '../routes/leaderboard-route'
import { ProfileRoute } from '../routes/profile-route'
import { FriendsRoute } from '../routes/friends-route'
import { HistoryRoute } from '../routes/history-route'

/**
 * Thư viện thành phần chỉ tồn tại ở dev. `import.meta.env.DEV` là hằng số lúc build,
 * nên nhánh này bị loại bỏ hoàn toàn khỏi bản production (không có chunk nào được sinh).
 */
const DesignPreviewRoute = import.meta.env.DEV
  ? lazy(async () => {
      const module = await import('../routes/design-preview-route')
      return { default: module.DesignPreviewRoute }
    })
  : null

function RouteFallback(): ReactNode {
  return (
    <div className="grid h-dvh place-items-center bg-nq-bg text-nq-text-tertiary">
      <Spinner size="lg" tone="primary" />
      <span className="nq-sr-only">Đang tải giao diện</span>
    </div>
  )
}

export function App(): ReactNode {
  return (
    <HashRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />

          {/* `ProctorSessionHost` không render gì: nó giữ kênh media proctoring sống qua mọi
              lần đổi route (ticket media dùng một lần, xem features/proctor/proctor-store.ts). */}
          <Route
            element={
              <>
                <AuthenticatedLayout />
                <ProctorSessionHost />
              </>
            }
          >
            <Route path="/" element={<HomeRoute />} />
            <Route path="/ranked" element={<MatchmakingRoute />} />
            <Route path="/battle" element={<BattleRoute />} />
            <Route path="/result" element={<ResultRoute />} />
            <Route path="/quiz" element={<QuizRoute />} />
            <Route path="/quiz/lobby" element={<QuizLobbyRoute />} />
            <Route path="/quiz/battle" element={<QuizBattleRoute />} />
            <Route path="/proctor/:pin" element={<ProctorDashboardRoute />} />
            <Route path="/sets" element={<SetsRoute />} />
            <Route path="/sets/editor" element={<SetEditorRoute />} />
            <Route path="/leaderboard" element={<LeaderboardRoute />} />
            <Route path="/profile" element={<ProfileRoute />} />
            <Route path="/friends" element={<FriendsRoute />} />
            <Route path="/history" element={<HistoryRoute />} />
          </Route>

          {DesignPreviewRoute ? (
            <Route path="/design-preview" element={<DesignPreviewRoute />} />
          ) : null}

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
