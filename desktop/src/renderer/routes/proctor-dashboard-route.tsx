/**
 * `/proctor/:pin` — bảng giám sát của host.
 *
 * Chỉ host của phòng đang mở mới vào được. Nếu người chơi gõ URL này, màn hình giải thích và
 * đưa họ về phòng — không crash, không lộ dữ liệu của người khác.
 *
 * PIN nằm trong URL là chủ ý: PIN đã được chia sẻ trong phòng, còn **ticket media thì không**
 * bao giờ xuất hiện trong URL, DOM hay log.
 */
import type { ReactNode } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button, EmptyState } from '../components/ui'
import { ShieldCheck } from '../components/ui/icons'
import { ProctorDashboard } from '../features/proctor/proctor-dashboard'
import { useProctorStore } from '../features/proctor/proctor-store'

export function ProctorDashboardRoute(): ReactNode {
  const { pin } = useParams<{ pin: string }>()
  const navigate = useNavigate()
  const context = useProctorStore((state) => state.context)

  if (pin === undefined || pin.length === 0) {
    return <Navigate to="/quiz" replace />
  }

  if (context === null) {
    return (
      <EmptyState
        icon={<ShieldCheck size={22} aria-hidden="true" />}
        title="Không có phòng nào đang mở"
        description="Bảng giám sát chỉ tồn tại trong một phòng Quiz đang chạy. Hãy vào phòng với tư cách host rồi mở lại."
        action={
          <Button onClick={() => navigate('/quiz')}>Về Phòng Quiz</Button>
        }
      />
    )
  }

  if (context.pin !== pin) {
    // Người chơi đang ở phòng khác: đưa về đúng phòng của họ thay vì hiện dữ liệu sai.
    return <Navigate to={`/proctor/${context.pin}`} replace />
  }

  if (!context.host) {
    return (
      <EmptyState
        icon={<ShieldCheck size={22} aria-hidden="true" />}
        title="Chỉ host mới mở được bảng giám sát"
        description="Bạn là người chơi trong phòng này. Host xem camera của bạn; bạn không xem được camera của người khác."
        action={<Button onClick={() => navigate(-1)}>Quay lại</Button>}
      />
    )
  }

  const back = context.phase === 'lobby' ? '/quiz/lobby' : '/quiz/battle'

  return <ProctorDashboard pin={pin} onBack={() => navigate(back)} />
}
