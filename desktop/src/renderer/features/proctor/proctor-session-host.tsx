/**
 * Cầu nối giữa Quiz Room (gameplay) và proctoring store.
 *
 * Component này **không render gì** và được mount một lần trong router (`app/App.tsx`), đúng vai
 * của `ProctoringCoordinator` (app-scoped) bên JavaFX. Nhờ vậy kênh media sống qua mọi lần đổi
 * route: `lobby → battle` xảy ra đúng lúc phòng bắt đầu, nếu kênh sống theo route thì ticket
 * dùng một lần sẽ bị đốt ngay và phải chờ server cấp lại.
 *
 * Nó chỉ đọc state của gameplay, không ghi: quyền quyết định vẫn ở Java server.
 */
import { useEffect, useMemo } from 'react'
import { useQuizStore } from '../../lib/quiz'
import type { ProctorPhase, ProctorRoomContext } from './proctor-protocol'
import { useProctorStore } from './proctor-store'

export function ProctorSessionHost(): null {
  const lobby = useQuizStore((state) => state.lobby)
  const started = useQuizStore((state) => state.started)
  const battlePhase = useQuizStore((state) => state.battle?.phase ?? null)

  const enterRoom = useProctorStore((state) => state.enterRoom)
  const leaveRoom = useProctorStore((state) => state.leaveRoom)
  const syncMembers = useProctorStore((state) => state.syncMembers)

  const context = useMemo<ProctorRoomContext | null>(() => {
    if (started !== null) {
      // `QUIZ_REJOINED` cũng đặt `started` khi phòng **chưa** chạy (running = false) — lúc đó
      // chưa có battle state, và phòng vẫn ở giai đoạn lobby.
      const phase: ProctorPhase =
        battlePhase === null
          ? 'lobby'
          : battlePhase === 'finished' || battlePhase === 'cancelled'
            ? 'ended'
            : 'running'
      return {
        pin: started.pin,
        proctoringEnabled: started.proctoringEnabled,
        playing: started.playing,
        host: started.host,
        phase
      }
    }
    if (lobby !== null) {
      return {
        pin: lobby.pin,
        proctoringEnabled: lobby.proctoringEnabled,
        playing: !lobby.currentUserHost,
        host: lobby.currentUserHost,
        // `QUIZ_REJOINED` có thể đưa lobby của phòng đang chạy vào state này.
        phase: lobby.started ? 'running' : 'lobby'
      }
    }
    return null
  }, [started, lobby, battlePhase])

  useEffect(() => {
    if (context === null) {
      leaveRoom()
      return
    }
    enterRoom(context)
    // KHÔNG cleanup ở đây: đổi route không được đóng kênh media. Teardown xảy ra khi bối cảnh
    // phòng biến mất (rời/huỷ/kết thúc/đăng xuất) → `leaveRoom()` ở nhánh trên.
  }, [context, enterRoom, leaveRoom])

  useEffect(() => {
    if (lobby === null) return
    // Seed tile cho host: người chơi chưa từng đổi trạng thái vẫn phải có ô trên dashboard.
    syncMembers(
      lobby.members
        .filter((member) => member.playing)
        .map((member) => ({
          userId: member.userId,
          username: member.username,
          cameraStatus: member.cameraStatus,
          calibrationStatus: member.calibrationStatus,
          connected: member.connected,
          warningCount: member.warningCount
        }))
    )
  }, [lobby, syncMembers])

  return null
}
