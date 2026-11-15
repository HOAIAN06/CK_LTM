// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { NqBridge } from '@shared/ipc'
import { createIdleConnectionStatus } from '@shared/ipc'
import type { PlayerStats, QuestionData } from '@shared/protocol'
import { setBridgeOverride } from '../../lib/bridge'
import { resetConnectionStore, useConnectionStore } from '../../lib/connection-store'
import { resetSessionStore, useSessionStore } from '../../lib/session-store'
import { resetRankedStore, useRankedStore, type MatchContext } from '../../lib/ranked'
import { BattleRoute } from '../battle-route'

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

const MATCH: MatchContext = {
  roomId: 'room-1',
  opponent: 'binh_tran',
  durationSeconds: 180,
  startedAt: 1_000
}

/** Mốc thời gian thật: countdown của route so với `Date.now()`, không phải số giả. */
const START = Date.now()

const QUESTION: QuestionData = {
  sessionId: 'room-1',
  attempt: 1,
  questionId: 42,
  content: '東京 là thủ đô của nước nào?',
  choices: [
    { choiceId: 101, content: 'Nhật Bản', position: 1 },
    { choiceId: 102, content: 'Hàn Quốc', position: 2 },
    { choiceId: 103, content: 'Trung Quốc', position: 3 },
    { choiceId: 104, content: 'Thái Lan', position: 4 }
  ],
  questionDurationSeconds: 30,
  matchRemainingSeconds: 180
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
    <MemoryRouter initialEntries={['/battle']}>
      <Routes>
        <Route path="/battle" element={<BattleRoute />} />
        <Route path="/ranked" element={<p>màn tìm trận</p>} />
        <Route path="/result" element={<p>màn kết quả</p>} />
      </Routes>
    </MemoryRouter>
  )
}

function startBattle(withQuestion = true): void {
  useRankedStore.getState().startMatch(MATCH, START)
  if (withQuestion) {
    useRankedStore.getState().applyServerMessage({ type: 'QUESTION', payload: QUESTION }, START)
  }
}

let bridge: NqBridge

beforeEach(() => {
  resetConnectionStore()
  resetSessionStore()
  resetRankedStore()
  bridge = createFakeBridge()
  setBridgeOverride(bridge)
  useSessionStore.setState({ player: PLAYER })
})

afterEach(() => {
  cleanup()
  resetRankedStore()
  setBridgeOverride(null)
})

describe('BattleRoute', () => {
  it('renders the question, its four choices and both countdowns', () => {
    startBattle()
    renderRoute()

    expect(screen.getByText(QUESTION.content)).toBeTruthy()
    expect(screen.getByRole('group', { name: QUESTION.content })).toBeTruthy()

    for (const choice of QUESTION.choices) {
      expect(screen.getByRole('button', { name: new RegExp(choice.content) })).toBeTruthy()
    }
    // Câu này + đồng hồ trận.
    expect(screen.getByRole('progressbar', { name: 'Câu này' })).toBeTruthy()
    expect(screen.getByText(/Còn \d+:\d{2}/)).toBeTruthy()
    expect(screen.getByText('vs binh_tran')).toBeTruthy()
  })

  it('sends exactly one ANSWER and locks the choices', () => {
    startBattle()
    renderRoute()

    fireEvent.click(screen.getByRole('button', { name: /Hàn Quốc/ }))
    fireEvent.click(screen.getByRole('button', { name: /Nhật Bản/ }))

    expect(bridge.send).toHaveBeenCalledTimes(1)
    expect(bridge.send).toHaveBeenCalledWith({
      type: 'ANSWER',
      payload: { sessionId: 'room-1', attempt: 1, questionId: 42, choiceId: 102 }
    })
    expect(useRankedStore.getState().battle?.phase).toBe('locked')
  })

  it('selects a choice with the 1–4 keys', () => {
    startBattle()
    renderRoute()

    fireEvent.keyDown(document, { key: '3' })

    expect(bridge.send).toHaveBeenCalledWith({
      type: 'ANSWER',
      payload: { sessionId: 'room-1', attempt: 1, questionId: 42, choiceId: 103 }
    })
  })

  it('reveals the server verdict and marks the correct answer', async () => {
    startBattle()
    renderRoute()

    fireEvent.click(screen.getByRole('button', { name: /Hàn Quốc/ }))

    await act(async () => {
      useConnectionStore.getState().handleEvent({
        kind: 'message',
        message: {
          type: 'ANSWER_RESULT',
          payload: {
            sessionId: 'room-1',
            attempt: 1,
            questionId: 42,
            correct: false,
            chosenChoiceId: 102,
            correctChoiceId: 101,
            scoreAwarded: 0
          }
        }
      })
    })

    expect(screen.getByText('Chưa đúng')).toBeTruthy()
    expect(screen.getByText('Đáp án đúng')).toBeTruthy()
    expect(screen.getByText('Bạn đã chọn đáp án này, sai')).toBeTruthy()

    await act(async () => {
      useConnectionStore.getState().handleEvent({
        kind: 'message',
        message: { type: 'SCORE_UPDATE', payload: { myScore: 0, opponentScore: 1 } }
      })
    })
    expect(screen.getByText('Tỉ số: bạn 0, đối thủ 1.')).toBeTruthy()
  })

  it('navigates to the result screen on GAME_OVER', async () => {
    startBattle()
    renderRoute()

    await act(async () => {
      useConnectionStore.getState().handleEvent({
        kind: 'message',
        message: { type: 'GAME_OVER', payload: { result: 'WIN', myScore: 3, opponentScore: 1 } }
      })
    })

    await waitFor(() => {
      expect(screen.getByText('màn kết quả')).toBeTruthy()
    })
    expect(useRankedStore.getState().result?.result).toBe('WIN')
  })

  it('waits for the first question instead of showing an empty question', () => {
    startBattle(false)
    renderRoute()
    expect(screen.getByText('Đã ghép trận')).toBeTruthy()
    expect(screen.getByText(/Đang chờ câu hỏi đầu tiên/)).toBeTruthy()
  })

  it('returns to matchmaking when there is no match in the store', () => {
    renderRoute()
    expect(screen.getByText('màn tìm trận')).toBeTruthy()
  })
})
