// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { NqBridge } from '@shared/ipc'
import { createIdleConnectionStatus } from '@shared/ipc'
import type { PlayerStats, QuizSetSummary } from '@shared/protocol'
import { setBridgeOverride } from '../../lib/bridge'
import { resetConnectionStore, useConnectionStore } from '../../lib/connection-store'
import { resetSessionStore, useSessionStore } from '../../lib/session-store'
import { resetQuizStore, useQuizStore } from '../../lib/quiz'
import { QuizRoute } from '../quiz-route'

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

const SETS: QuizSetSummary[] = [
  {
    id: 4,
    ownerId: 1,
    ownerUsername: 'giang_vien',
    title: 'Luyện N5',
    description: 'Bộ đề cơ bản',
    level: 'N5',
    published: true,
    questionCount: 12,
    ownedByMe: false
  },
  {
    id: 5,
    ownerId: 7,
    ownerUsername: 'minh_anh',
    title: 'Kanji tuần 3',
    description: '',
    level: 'N4',
    published: true,
    questionCount: 8,
    ownedByMe: true
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

function renderRoute(): void {
  render(
    <MemoryRouter initialEntries={['/quiz']}>
      <Routes>
        <Route path="/quiz" element={<QuizRoute />} />
        <Route path="/quiz/lobby" element={<p>sảnh chờ</p>} />
        <Route path="/quiz/battle" element={<p>màn thi</p>} />
      </Routes>
    </MemoryRouter>
  )
}

async function pushSets(items: QuizSetSummary[]): Promise<void> {
  await act(async () => {
    useConnectionStore.getState().handleEvent({
      kind: 'message',
      message: { type: 'QUIZ_SET_LIST_RESULT', payload: { items } }
    })
  })
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

describe('QuizRoute', () => {
  it('renders the create and join forms and asks the server for published sets', () => {
    renderRoute()

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Phòng Quiz')
    expect(screen.getByRole('button', { name: /Tạo phòng/ })).toBeTruthy()
    expect(screen.getByLabelText('Mã PIN')).toBeTruthy()

    expect(bridge.send).toHaveBeenCalledWith({
      type: 'QUIZ_SET_LIST',
      payload: { scope: 'PUBLISHED' }
    })
  })

  it('lists published sets once the server answers', async () => {
    renderRoute()
    await pushSets(SETS)

    const select = screen.getByLabelText('Bộ đề') as HTMLSelectElement
    expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
      'Luyện N5 • N5 • 12 câu',
      'Kanji tuần 3 • N4 • 8 câu'
    ])
    expect(select.value).toBe('4')
  })

  it('explains an empty published-set list instead of offering a dead button', async () => {
    renderRoute()
    await pushSets([])

    expect(screen.getByText('Chưa có bộ đề đã xuất bản')).toBeTruthy()
    const create = screen.getByRole('button', { name: /Tạo phòng/ }) as HTMLButtonElement
    expect(create.disabled).toBe(true)
  })

  it('keeps only six digits in the PIN field and enables join when complete', () => {
    renderRoute()
    const pin = screen.getByLabelText('Mã PIN') as HTMLInputElement
    const join = screen.getByRole('button', { name: /Vào phòng/ }) as HTMLButtonElement

    fireEvent.change(pin, { target: { value: '12a3-4567' } })
    expect(pin.value).toBe('123456')
    expect(join.disabled).toBe(false)
  })

  it('joins through QUIZ_ROOM_JOIN and moves to the lobby on the lobby update', async () => {
    renderRoute()

    fireEvent.change(screen.getByLabelText('Mã PIN'), { target: { value: '123456' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Vào phòng/ }))
    })
    expect(bridge.send).toHaveBeenCalledWith({ type: 'QUIZ_ROOM_JOIN', payload: { pin: '123456' } })

    await act(async () => {
      useQuizStore.setState({
        lobby: {
          pin: '123456',
          title: 'Luyện N5',
          hostUsername: 'binh_tran',
          currentUserHost: false,
          hostPlays: true,
          proctoringEnabled: false,
          started: false,
          playerCount: 2,
          members: []
        }
      })
    })

    expect(screen.getByText('sảnh chờ')).toBeTruthy()
  })

  it('prevents proctoring + hostPlays before the server has to reject it', () => {
    renderRoute()
    const hostPlays = screen.getByRole('switch', { name: /Host cũng chơi/ })
    const proctoring = screen.getByRole('switch', { name: /Giám sát camera/ })

    expect(hostPlays.getAttribute('aria-checked')).toBe('true')

    fireEvent.click(proctoring)
    expect(proctoring.getAttribute('aria-checked')).toBe('true')
    expect(hostPlays.getAttribute('aria-checked')).toBe('false')
    expect((hostPlays as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(proctoring)
    expect((hostPlays as HTMLButtonElement).disabled).toBe(false)
  })
})
