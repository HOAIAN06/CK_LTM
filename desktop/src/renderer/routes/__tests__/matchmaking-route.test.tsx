// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { NqBridge } from '@shared/ipc'
import { createIdleConnectionStatus } from '@shared/ipc'
import type { PlayerStats } from '@shared/protocol'
import { setBridgeOverride } from '../../lib/bridge'
import { resetConnectionStore, useConnectionStore } from '../../lib/connection-store'
import { resetSessionStore, useSessionStore } from '../../lib/session-store'
import { resetRankedStore, useRankedStore } from '../../lib/ranked'
import { MatchmakingRoute } from '../matchmaking-route'

const PLAYER: PlayerStats = {
  id: 7,
  username: 'minh_anh',
  wins: 3,
  losses: 1,
  draws: 0,
  totalScore: 420,
  questionsAnswered: 40,
  correctAnswers: 31
}

function createFakeBridge(): NqBridge {
  return {
    connect: vi.fn(() => Promise.resolve({ ok: true })),
    disconnect: vi.fn(() => Promise.resolve()),
    send: vi.fn(() => Promise.resolve({ ok: true })),
    getStatus: vi.fn(() => Promise.resolve(createIdleConnectionStatus())),
    onEvent: vi.fn(() => () => undefined),
    app: { version: 'test', platform: 'linux', packaged: false }
  }
}

function renderRoute(): void {
  render(
    <MemoryRouter initialEntries={['/ranked']}>
      <Routes>
        <Route path="/ranked" element={<MatchmakingRoute />} />
        <Route path="/battle" element={<p>màn thi đấu</p>} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  resetConnectionStore()
  resetSessionStore()
  resetRankedStore()
  setBridgeOverride(null)
  useSessionStore.setState({ player: PLAYER })
})

afterEach(() => {
  cleanup()
  resetRankedStore()
  setBridgeOverride(null)
})

describe('MatchmakingRoute', () => {
  it('renders the idle state with exactly the two allowed durations', () => {
    renderRoute()

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Đấu hạng 1v1')

    const durations = screen.getAllByRole('radio')
    expect(durations).toHaveLength(2)
    expect(durations.map((node) => node.textContent)).toEqual(['3 phút', '5 phút'])
    expect(durations[0]?.getAttribute('aria-checked')).toBe('true')
    expect(durations[1]?.getAttribute('aria-checked')).toBe('false')

    const search = screen.getByRole('button', { name: /Tìm đối thủ/ })
    expect(search.hasAttribute('disabled')).toBe(false)

    // Không hiển thị số liệu bịa: chỉ luật trận và thời lượng.
    expect(screen.getByText('Luật trận')).toBeTruthy()
  })

  it('switches duration without touching the server', () => {
    renderRoute()
    fireEvent.click(screen.getByRole('radio', { name: '5 phút' }))
    expect(screen.getByRole('radio', { name: '5 phút' }).getAttribute('aria-checked')).toBe('true')
  })

  it('explains a missing desktop bridge instead of hanging on "đang tìm"', async () => {
    renderRoute()
    fireEvent.click(screen.getByRole('button', { name: /Tìm đối thủ/ }))

    expect(await screen.findByText('Không có cầu nối tới tiến trình desktop')).toBeTruthy()
    // Quay lại trạng thái nghỉ để người dùng thử lại.
    expect(screen.getByRole('button', { name: /Tìm đối thủ/ }).hasAttribute('disabled')).toBe(false)
    expect(screen.queryByRole('button', { name: 'Hủy tìm trận' })).toBeNull()
  })

  it('shows the waiting state after WAITING and cancels back to idle', async () => {
    const bridge = createFakeBridge()
    setBridgeOverride(bridge)
    renderRoute()

    fireEvent.click(screen.getByRole('button', { name: /Tìm đối thủ/ }))
    expect(bridge.send).toHaveBeenCalledWith({
      type: 'FIND_MATCH',
      payload: { durationSeconds: 180 }
    })

    await act(async () => {
      useConnectionStore.getState().handleEvent({ kind: 'message', message: { type: 'WAITING', payload: null } })
    })

    expect(screen.getByRole('heading', { level: 2, name: 'Đang tìm đối thủ…' })).toBeTruthy()
    const cancel = screen.getByRole('button', { name: 'Hủy tìm trận' })

    fireEvent.click(cancel)
    expect(bridge.send).toHaveBeenCalledWith({ type: 'CANCEL_MATCH', payload: '' })

    await act(async () => {
      useConnectionStore
        .getState()
        .handleEvent({ kind: 'message', message: { type: 'MATCH_CANCELLED', payload: null } })
    })

    expect(await screen.findByText('Đã hủy tìm trận.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Hủy tìm trận' })).toBeNull()
  })

  it('maps MATCH_ERROR to Vietnamese copy and returns to idle', async () => {
    const bridge = createFakeBridge()
    setBridgeOverride(bridge)
    renderRoute()

    fireEvent.click(screen.getByRole('button', { name: /Tìm đối thủ/ }))
    await act(async () => {
      useConnectionStore.getState().handleEvent({
        kind: 'message',
        message: { type: 'MATCH_ERROR', payload: 'QUESTIONS_UNAVAILABLE' }
      })
    })

    expect(await screen.findByText('Chưa thể tạo trận')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Tìm đối thủ/ })).toBeTruthy()
  })

  it('starts the battle from MATCH_FOUND', async () => {
    const bridge = createFakeBridge()
    setBridgeOverride(bridge)
    renderRoute()

    fireEvent.click(screen.getByRole('button', { name: /Tìm đối thủ/ }))
    await act(async () => {
      useConnectionStore.getState().handleEvent({
        kind: 'message',
        message: {
          type: 'MATCH_FOUND',
          payload: { roomId: 'room-1', opponent: 'binh_tran', durationSeconds: 180 }
        }
      })
    })

    await waitFor(() => {
      expect(screen.getByText('màn thi đấu')).toBeTruthy()
    })

    const state = useRankedStore.getState()
    expect(state.match?.roomId).toBe('room-1')
    expect(state.match?.opponent).toBe('binh_tran')
    expect(state.battle?.phase).toBe('waiting')
  })
})
