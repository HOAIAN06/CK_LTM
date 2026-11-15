// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { NqBridge } from '@shared/ipc'
import { createIdleConnectionStatus } from '@shared/ipc'
import type { MatchHistoryEntry, PlayerStats } from '@shared/protocol'
import { setBridgeOverride } from '../../lib/bridge'
import { resetConnectionStore, useConnectionStore } from '../../lib/connection-store'
import { resetSessionStore, useSessionStore } from '../../lib/session-store'
import { RESPONSE_TIMEOUT_MS } from '../../lib/watchdog'
import { HomeRoute } from '../home-route'

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

const MATCHES: MatchHistoryEntry[] = [
  {
    matchId: 1,
    opponentUsername: 'binh_tran',
    myScore: 5,
    opponentScore: 2,
    result: 'WIN',
    durationSeconds: 180,
    endReason: 'NORMAL',
    playedAt: '2026-11-15T10:00:00Z'
  }
]

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

function renderHome(): void {
  render(
    <MemoryRouter initialEntries={['/']}>
      <HomeRoute />
    </MemoryRouter>
  )
}

beforeEach(() => {
  resetConnectionStore()
  resetSessionStore()
  setBridgeOverride(createFakeBridge())
  useSessionStore.setState({ player: PLAYER })
})

afterEach(() => {
  cleanup()
  setBridgeOverride(null)
  vi.useRealTimers()
})

describe('HomeRoute', () => {
  it('renders real stats and the five-card band', () => {
    renderHome()

    expect(screen.getByText(/Chào mừng trở lại, minh_anh/)).toBeTruthy()
    expect(screen.getByText('Thắng')).toBeTruthy()
    expect(screen.getByText('Độ chính xác')).toBeTruthy()
    expect(screen.getByText('Tổng điểm')).toBeTruthy()
  })

  it('fills the recent-form band when the server answers', async () => {
    renderHome()

    await act(async () => {
      useConnectionStore.getState().handleEvent({
        kind: 'message',
        message: { type: 'MATCH_HISTORY_DATA', payload: { matches: MATCHES } }
      })
    })

    expect(screen.getByText('vs binh_tran')).toBeTruthy()
  })

  it('stops the skeleton after the response watchdog fires (F-02)', async () => {
    vi.useFakeTimers()
    renderHome()

    // Cho hai frame gửi đi xong (promise resolve) trước khi tua đồng hồ.
    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      vi.advanceTimersByTime(RESPONSE_TIMEOUT_MS)
    })

    expect(screen.getByText('Máy chủ chưa trả lời')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Tải lại dữ liệu' })).toBeTruthy()
  })

  it('clears the watchdog when the history arrives late but in time', async () => {
    vi.useFakeTimers()
    renderHome()

    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      useConnectionStore.getState().handleEvent({
        kind: 'message',
        message: { type: 'MATCH_HISTORY_DATA', payload: { matches: MATCHES } }
      })
      vi.advanceTimersByTime(RESPONSE_TIMEOUT_MS)
    })

    expect(screen.queryByText('Máy chủ chưa trả lời')).toBeNull()
    expect(screen.getByText('vs binh_tran')).toBeTruthy()
  })
})
