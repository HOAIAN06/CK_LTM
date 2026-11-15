// @vitest-environment jsdom
/**
 * `ProctorSessionHost` — điểm nối duy nhất giữa Quiz Room (gameplay) và proctoring store.
 *
 * Test khoá ba thứ dễ vỡ khi refactor:
 * 1. Giai đoạn phòng được suy ra đúng (`lobby` / `running` / `ended`).
 * 2. Rời phòng → `leaveRoom()` dọn sạch (không còn context, không còn tile).
 * 3. Lobby của host seed tile cho mọi người chơi đang chơi.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import type { QuizLobbyData } from '@shared/protocol'
import { createQuizBattleState, resetQuizStore, useQuizStore } from '../../../lib/quiz'
import { ProctorSessionHost } from '../proctor-session-host'
import { resetProctorStore, useProctorStore } from '../proctor-store'

const PIN = '123456'

function lobby(overrides: Partial<QuizLobbyData> = {}): QuizLobbyData {
  return {
    pin: PIN,
    title: 'Phòng thử',
    hostUsername: 'host',
    currentUserHost: true,
    hostPlays: false,
    proctoringEnabled: true,
    started: false,
    playerCount: 2,
    members: [
      {
        userId: 1,
        username: 'host',
        host: true,
        playing: false,
        connected: true,
        cameraStatus: 'NOT_REQUIRED',
        calibrationStatus: 'NOT_REQUIRED',
        warningCount: 0
      },
      {
        userId: 2,
        username: 'an',
        host: false,
        playing: true,
        connected: true,
        cameraStatus: 'READY',
        calibrationStatus: 'NOT_REQUIRED',
        warningCount: 1
      }
    ],
    ...overrides
  }
}

beforeEach(() => {
  resetQuizStore()
  resetProctorStore()
})

afterEach(() => {
  cleanup()
  resetQuizStore()
  resetProctorStore()
})

describe('ProctorSessionHost', () => {
  it('maps the lobby to a lobby-phase context and seeds host tiles', () => {
    render(<ProctorSessionHost />)

    act(() => {
      useQuizStore.setState({ lobby: lobby(), started: null, battle: null })
    })

    const state = useProctorStore.getState()
    expect(state.context).toMatchObject({ pin: PIN, host: true, phase: 'lobby' })
    expect(state.tiles).toHaveLength(1)
    expect(state.tiles[0]).toMatchObject({ userId: 2, username: 'an', warnings: 1 })
  })

  it('moves to the running phase when the battle state appears', () => {
    render(<ProctorSessionHost />)

    act(() => {
      useQuizStore.setState({
        lobby: lobby(),
        started: {
          pin: PIN,
          title: 'Phòng thử',
          durationSeconds: 300,
          playing: true,
          host: false,
          proctoringEnabled: true
        },
        battle: createQuizBattleState(PIN, Date.now(), 300)
      })
    })

    expect(useProctorStore.getState().context).toMatchObject({
      pin: PIN,
      host: false,
      playing: true,
      phase: 'running'
    })
  })

  it('treats a finished battle as ended and a rejoin without battle as lobby', () => {
    render(<ProctorSessionHost />)

    act(() => {
      useQuizStore.setState({
        lobby: lobby(),
        started: {
          pin: PIN,
          title: 'Phòng thử',
          durationSeconds: 0,
          playing: true,
          host: false,
          proctoringEnabled: true
        },
        battle: { ...createQuizBattleState(PIN, Date.now(), 300), phase: 'finished' }
      })
    })
    expect(useProctorStore.getState().context?.phase).toBe('ended')

    act(() => {
      useQuizStore.setState({
        started: {
          pin: PIN,
          title: 'Phòng thử',
          durationSeconds: 0,
          playing: true,
          host: false,
          proctoringEnabled: true
        },
        battle: null
      })
    })
    expect(useProctorStore.getState().context?.phase).toBe('lobby')
  })

  it('tears the proctoring context down when the room disappears', () => {
    render(<ProctorSessionHost />)

    act(() => {
      useQuizStore.setState({ lobby: lobby(), started: null, battle: null })
    })
    expect(useProctorStore.getState().context).not.toBeNull()

    act(() => {
      useQuizStore.setState({ lobby: null, started: null, battle: null })
    })
    expect(useProctorStore.getState().context).toBeNull()
    expect(useProctorStore.getState().tiles).toHaveLength(0)
    expect(useProctorStore.getState().consent).toBe('pending')
  })
})
