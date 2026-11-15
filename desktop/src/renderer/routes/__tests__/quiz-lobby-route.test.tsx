// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { NqBridge } from '@shared/ipc'
import { createIdleConnectionStatus } from '@shared/ipc'
import type { PlayerStats, QuizLobbyData } from '@shared/protocol'
import { setBridgeOverride } from '../../lib/bridge'
import { resetConnectionStore } from '../../lib/connection-store'
import { resetSessionStore, useSessionStore } from '../../lib/session-store'
import { resetQuizStore, useQuizStore } from '../../lib/quiz'
import { QuizLobbyRoute } from '../quiz-lobby-route'

const PLAYER: PlayerStats = {
  id: 7,
  username: 'minh_anh',
  wins: 0,
  losses: 0,
  draws: 0,
  totalScore: 0,
  questionsAnswered: 0,
  correctAnswers: 0
}

function member(overrides: Partial<QuizLobbyData['members'][number]>) {
  return {
    userId: 1,
    username: 'an',
    host: false,
    playing: true,
    connected: true,
    cameraStatus: 'NOT_REQUIRED' as const,
    calibrationStatus: 'NOT_REQUIRED' as const,
    warningCount: 0,
    ...overrides
  }
}

function makeLobby(overrides: Partial<QuizLobbyData> = {}): QuizLobbyData {
  return {
    pin: '123456',
    title: 'Luyện N5',
    hostUsername: 'minh_anh',
    currentUserHost: true,
    hostPlays: true,
    proctoringEnabled: false,
    started: false,
    playerCount: 2,
    members: [
      member({ userId: 7, username: 'minh_anh', host: true }),
      member({ userId: 8, username: 'binh_tran' })
    ],
    ...overrides
  }
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
    <MemoryRouter initialEntries={['/quiz/lobby']}>
      <Routes>
        <Route path="/quiz" element={<p>menu phòng</p>} />
        <Route path="/quiz/lobby" element={<QuizLobbyRoute />} />
        <Route path="/quiz/battle" element={<p>màn thi</p>} />
      </Routes>
    </MemoryRouter>
  )
}

let bridge: NqBridge

beforeEach(() => {
  resetConnectionStore()
  resetSessionStore()
  resetQuizStore()
  bridge = createFakeBridge()
  setBridgeOverride(bridge)
  useSessionStore.setState({ player: PLAYER })
})

afterEach(() => {
  cleanup()
  resetQuizStore()
  setBridgeOverride(null)
})

describe('QuizLobbyRoute', () => {
  it('shows the PIN and the member list', () => {
    useQuizStore.setState({ lobby: makeLobby() })
    renderRoute()

    expect(screen.getByText('123456')).toBeTruthy()
    expect(screen.getAllByText('minh_anh').length).toBeGreaterThan(0)
    expect(screen.getAllByText('binh_tran').length).toBeGreaterThan(0)
    expect(screen.getByText('HOST')).toBeTruthy()
  })

  it('disables start until two players are connected and explains why', () => {
    useQuizStore.setState({
      lobby: makeLobby({
        playerCount: 1,
        members: [member({ userId: 7, username: 'minh_anh', host: true })]
      })
    })
    renderRoute()

    const start = screen.getByRole('button', { name: /Bắt đầu phòng/ }) as HTMLButtonElement
    expect(start.disabled).toBe(true)
    expect(screen.getAllByText(/ít nhất 2 người chơi/).length).toBeGreaterThan(0)
  })

  it('starts the room when the host has two connected players', async () => {
    useQuizStore.setState({ lobby: makeLobby() })
    renderRoute()

    const start = screen.getByRole('button', { name: /Bắt đầu phòng/ }) as HTMLButtonElement
    expect(start.disabled).toBe(false)

    fireEvent.click(start)
    expect(bridge.send).toHaveBeenCalledWith({ type: 'QUIZ_ROOM_START', payload: '' })
  })

  it('never blocks start because of a failing camera, and says so', () => {
    useQuizStore.setState({
      lobby: makeLobby({
        proctoringEnabled: true,
        hostPlays: false,
        members: [
          member({ userId: 7, username: 'minh_anh', host: true, playing: false, cameraStatus: 'NOT_APPLICABLE' }),
          member({ userId: 8, username: 'binh_tran', cameraStatus: 'DENIED' }),
          member({ userId: 9, username: 'chi_le', cameraStatus: 'READY' })
        ]
      })
    })
    renderRoute()

    const start = screen.getByRole('button', { name: /Bắt đầu phòng/ }) as HTMLButtonElement
    expect(start.disabled).toBe(false)
    expect(screen.getByText(/vẫn có thể bắt đầu/)).toBeTruthy()
    expect(screen.getAllByText(/Từ chối camera/).length).toBeGreaterThan(0)
    // Slot cho tính năng camera, không chặn gì.
    expect(document.querySelector('[data-nq-proctor-slot="lobby"]')).toBeTruthy()
  })

  it('hides the start action from non-hosts', () => {
    useQuizStore.setState({ lobby: makeLobby({ currentUserHost: false }) })
    renderRoute()

    expect(screen.queryByRole('button', { name: /Bắt đầu phòng/ })).toBeNull()
    expect(screen.getByText('Đang chờ host bắt đầu...')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Rời phòng/ })).toBeTruthy()
  })

  it('falls back to manual copying when the clipboard is unavailable', () => {
    useQuizStore.setState({ lobby: makeLobby() })
    renderRoute()

    fireEvent.click(screen.getByRole('button', { name: /Sao chép PIN/ }))
    expect(screen.getByText(/sao chép thủ công/)).toBeTruthy()
  })

  it('asks the host to confirm before cancelling the room', async () => {
    useQuizStore.setState({ lobby: makeLobby() })
    renderRoute()

    fireEvent.click(screen.getByRole('button', { name: /Hủy phòng/ }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Hủy phòng Quiz?')).toBeTruthy()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Hủy phòng' }))
    expect(bridge.send).toHaveBeenCalledWith({ type: 'QUIZ_ROOM_CANCEL', payload: '' })
  })

  it('returns to the menu when the room is gone', () => {
    useQuizStore.setState({ lobby: null })
    renderRoute()
    expect(screen.getByText('menu phòng')).toBeTruthy()
  })
})
