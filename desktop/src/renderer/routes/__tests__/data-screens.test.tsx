// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { NqBridge, NqEvent } from '@shared/ipc'
import { createIdleConnectionStatus } from '@shared/ipc'
import type { MatchHistoryEntry, PlayerStats } from '@shared/protocol'
import { setBridgeOverride } from '../../lib/bridge'
import { resetConnectionStore, useConnectionStore } from '../../lib/connection-store'
import { resetSessionStore, useSessionStore } from '../../lib/session-store'
import { LeaderboardRoute } from '../leaderboard-route'
import { HistoryRoute } from '../history-route'
import { ProfileRoute } from '../profile-route'

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
    matchId: 3,
    opponentUsername: 'khoa_tran',
    myScore: 5,
    opponentScore: 2,
    result: 'WIN',
    durationSeconds: 180,
    endReason: 'NORMAL',
    playedAt: '2026-11-15T10:00:00Z'
  },
  {
    matchId: 2,
    opponentUsername: 'chi_le',
    myScore: 1,
    opponentScore: 4,
    result: 'LOSS',
    durationSeconds: 300,
    endReason: 'DISCONNECT',
    playedAt: '2026-11-14T09:00:00Z'
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

function renderAt(path: string, element: ReactNode): void {
  render(<MemoryRouter initialEntries={[path]}>{element}</MemoryRouter>)
}

async function push(event: NqEvent): Promise<void> {
  await act(async () => {
    useConnectionStore.getState().handleEvent(event)
  })
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
})

describe('LeaderboardRoute', () => {
  it('renders the table from LEADERBOARD_DATA and highlights my row', async () => {
    renderAt(
      '/leaderboard',
      <LeaderboardRoute />
    )

    await push({
      kind: 'message',
      message: {
        type: 'LEADERBOARD_DATA',
        payload: {
          players: [
            { rank: 1, userId: 9, username: 'chi_le', wins: 9, losses: 2, draws: 1, totalScore: 1200 },
            { rank: 2, userId: 7, username: 'minh_anh', wins: 3, losses: 1, draws: 0, totalScore: 420 }
          ]
        }
      }
    })

    expect(screen.getByRole('table')).toBeTruthy()
    expect(screen.getByText('chi_le')).toBeTruthy()
    expect(screen.getByText('Bạn')).toBeTruthy()
    expect(screen.getByText('Hạng của bạn: #2')).toBeTruthy()
  })

  it('explains an empty leaderboard instead of rendering an empty table', async () => {
    renderAt('/leaderboard', <LeaderboardRoute />)
    await push({
      kind: 'message',
      message: { type: 'LEADERBOARD_DATA', payload: { players: [] } }
    })

    expect(screen.getByText('Chưa có ai trên bảng xếp hạng')).toBeTruthy()
  })
})

describe('HistoryRoute', () => {
  it('lists matches and filters by result without re-sorting', async () => {
    renderAt('/history', <HistoryRoute />)
    await push({
      kind: 'message',
      message: { type: 'MATCH_HISTORY_DATA', payload: { matches: MATCHES } }
    })

    expect(screen.getByText('vs khoa_tran')).toBeTruthy()
    expect(screen.getByText('vs chi_le')).toBeTruthy()

    fireEvent.click(screen.getByRole('radio', { name: 'Thua' }))

    expect(screen.queryByText('vs khoa_tran')).toBeNull()
    expect(screen.getByText('vs chi_le')).toBeTruthy()
    expect(screen.getByText(/Đối thủ mất kết nối/)).toBeTruthy()
  })

  it('shows an empty state when there is no match at all', async () => {
    renderAt('/history', <HistoryRoute />)
    await push({
      kind: 'message',
      message: { type: 'MATCH_HISTORY_DATA', payload: { matches: [] } }
    })

    expect(screen.getByText('Chưa có trận nào')).toBeTruthy()
  })
})

describe('ProfileRoute', () => {
  it('shows identity, stats and "—" accuracy when nothing was answered', async () => {
    useSessionStore.setState({
      player: { ...PLAYER, questionsAnswered: 0, correctAnswers: 0, totalScore: 0 }
    })
    renderAt('/profile', <ProfileRoute />)

    await push({
      kind: 'message',
      message: {
        type: 'PROFILE_DATA',
        payload: { ...PLAYER, questionsAnswered: 0, correctAnswers: 0, totalScore: 0 }
      }
    })

    expect(screen.getByRole('heading', { level: 2, name: 'minh_anh' })).toBeTruthy()
    expect(screen.getByText('Câu đã trả lời')).toBeTruthy()
    expect(screen.getByText('—')).toBeTruthy()
    expect(screen.getByText(/Chưa trả lời câu nào/)).toBeTruthy()
  })

  it('asks for confirmation before signing out', () => {
    renderAt('/profile', <ProfileRoute />)

    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain('Đăng xuất khỏi NihongoQuest?')
  })
})
