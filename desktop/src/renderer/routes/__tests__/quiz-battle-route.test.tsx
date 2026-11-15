// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { NqBridge } from '@shared/ipc'
import { createIdleConnectionStatus } from '@shared/ipc'
import type {
  PlayerStats,
  QuizAnswerResult,
  QuizLeaderboardData,
  QuizQuestionData
} from '@shared/protocol'
import { setBridgeOverride } from '../../lib/bridge'
import { resetConnectionStore, useConnectionStore } from '../../lib/connection-store'
import { resetSessionStore, useSessionStore } from '../../lib/session-store'
import {
  createQuizBattleState,
  resetQuizStore,
  useQuizStore,
  type QuizRoomContext
} from '../../lib/quiz'
import { QuizBattleRoute } from '../quiz-battle-route'

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

const PIN = '123456'
const ROOM: QuizRoomContext = {
  pin: PIN,
  title: 'Luyện N5',
  durationSeconds: 300,
  playing: true,
  host: false,
  proctoringEnabled: false
}

const QUESTION: QuizQuestionData = {
  sessionId: PIN,
  pin: PIN,
  attempt: 1,
  questionId: 42,
  content: '「食べる」の意味はどれですか。',
  choices: [
    { choiceId: 101, content: 'ăn', position: 1 },
    { choiceId: 102, content: 'uống', position: 2 },
    { choiceId: 103, content: 'ngủ', position: 3 },
    { choiceId: 104, content: 'đi', position: 4 }
  ],
  questionDurationSeconds: 30,
  roomRemainingSeconds: 240
}

const RESULT: QuizAnswerResult = {
  sessionId: PIN,
  attempt: 1,
  questionId: 42,
  correct: false,
  chosenChoiceId: 102,
  correctChoiceId: 101,
  scoreAwarded: 0,
  totalScore: 0
}

const BOARD: QuizLeaderboardData = {
  pin: PIN,
  finished: false,
  entries: [
    { rank: 1, userId: 8, username: 'binh_tran', score: 900, correctAnswers: 1, connected: true },
    { rank: 2, userId: 7, username: 'minh_anh', score: 0, correctAnswers: 0, connected: true }
  ]
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

function seedRoom(room: QuizRoomContext = ROOM, withQuestion = true): void {
  const now = Date.now()
  useQuizStore.setState({
    started: room,
    battle: createQuizBattleState(room.pin, now, room.durationSeconds)
  })
  if (withQuestion) {
    useQuizStore.getState().applyServerMessage({ type: 'QUIZ_QUESTION', payload: QUESTION }, now)
  }
}

function renderRoute(): void {
  render(
    <MemoryRouter initialEntries={['/quiz/battle']}>
      <Routes>
        <Route path="/quiz" element={<p>menu phòng</p>} />
        <Route path="/" element={<p>trang chủ</p>} />
        <Route path="/quiz/battle" element={<QuizBattleRoute />} />
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

describe('QuizBattleRoute', () => {
  it('renders the question, its four choices and the live leaderboard', () => {
    seedRoom()
    renderRoute()

    expect(screen.getByText(QUESTION.content)).toBeTruthy()
    for (const choice of QUESTION.choices) {
      expect(screen.getByRole('button', { name: new RegExp(choice.content) })).toBeTruthy()
    }
    expect(screen.getByRole('progressbar', { name: 'Câu này' })).toBeTruthy()
    expect(screen.getByText('Bảng xếp hạng')).toBeTruthy()
  })

  it('sends exactly one QUIZ_ANSWER and locks the choices', () => {
    seedRoom()
    renderRoute()

    fireEvent.click(screen.getByRole('button', { name: /uống/ }))
    fireEvent.click(screen.getByRole('button', { name: /ăn/ }))

    expect(bridge.send).toHaveBeenCalledTimes(1)
    expect(bridge.send).toHaveBeenCalledWith({
      type: 'QUIZ_ANSWER',
      payload: { sessionId: PIN, attempt: 1, questionId: 42, choiceId: 102 }
    })
  })

  it('answers with the 1–4 keys', () => {
    seedRoom()
    renderRoute()

    fireEvent.keyDown(document, { key: '3' })

    expect(bridge.send).toHaveBeenCalledWith({
      type: 'QUIZ_ANSWER',
      payload: { sessionId: PIN, attempt: 1, questionId: 42, choiceId: 103 }
    })
  })

  it('shows the server verdict and marks the correct answer', async () => {
    seedRoom()
    renderRoute()

    fireEvent.click(screen.getByRole('button', { name: /uống/ }))
    await act(async () => {
      useConnectionStore.getState().handleEvent({
        kind: 'message',
        message: { type: 'QUIZ_ANSWER_RESULT', payload: RESULT }
      })
    })

    expect(screen.getByText('Chưa đúng')).toBeTruthy()
    expect(screen.getByText('Đáp án đúng')).toBeTruthy()
  })

  it('shows the final ranking and a way home when the room finishes', async () => {
    seedRoom()
    renderRoute()

    await act(async () => {
      useConnectionStore.getState().handleEvent({
        kind: 'message',
        message: { type: 'QUIZ_ROOM_FINISHED', payload: { ...BOARD, finished: true } }
      })
    })

    expect(screen.getByText('Phòng đã kết thúc')).toBeTruthy()
    expect(screen.getByText(/Bạn đứng hạng 2/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Về trang chủ' }))
    await waitFor(() => {
      expect(screen.getByText('trang chủ')).toBeTruthy()
    })
  })

  it('tells the host that they are only controlling the room', () => {
    seedRoom({ ...ROOM, playing: false, host: true }, false)
    renderRoute()

    expect(screen.getByText('Bạn đang điều khiển phòng')).toBeTruthy()
  })

  it('returns to the menu when there is no room', () => {
    renderRoute()
    expect(screen.getByText('menu phòng')).toBeTruthy()
  })
})
