// @vitest-environment jsdom
/**
 * Lối vào proctoring trong lobby/battle.
 *
 * Trọng tâm:
 * - Consent card của người chơi: bật camera / tiếp tục không camera, cảnh báo cố định sau khi từ
 *   chối, và **không** có nút nào của gameplay bị disable.
 * - Host chỉ thấy "Mở bảng giám sát" khi phòng bật proctoring và host không chơi.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import type { QuizLobbyData, QuizRoomStarted } from '@shared/protocol'
import { resetProctorStore, useProctorStore } from '../proctor-store'
import { ProctorLobbyPanel } from '../proctor-lobby-panel'
import { ProctorBattlePanel } from '../proctor-battle-panel'

const PIN = '123456'

function lobby(overrides: Partial<QuizLobbyData> = {}): QuizLobbyData {
  return {
    pin: PIN,
    title: 'Phòng thử',
    hostUsername: 'host',
    currentUserHost: false,
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
        cameraStatus: 'INITIALIZING',
        calibrationStatus: 'PENDING',
        warningCount: 0
      }
    ],
    ...overrides
  }
}

function started(overrides: Partial<QuizRoomStarted> = {}): QuizRoomStarted {
  return {
    pin: PIN,
    title: 'Phòng thử',
    durationSeconds: 300,
    playing: false,
    host: true,
    proctoringEnabled: true,
    ...overrides
  }
}

function LocationProbe(): React.ReactNode {
  const location = useLocation()
  return <span data-testid="location">{location.pathname}</span>
}

function renderLobby(data: QuizLobbyData): void {
  render(
    <MemoryRouter initialEntries={['/quiz/lobby']}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <ProctorLobbyPanel lobby={data} />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

function renderBattle(data: QuizRoomStarted): void {
  render(
    <MemoryRouter initialEntries={['/quiz/battle']}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <ProctorBattlePanel started={data} />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  resetProctorStore()
})

afterEach(() => {
  cleanup()
  resetProctorStore()
})

describe('ProctorLobbyPanel — player', () => {
  it('asks for consent and lets the player decline without blocking anything', () => {
    renderLobby(lobby())

    expect(screen.getByText('Bật camera để host giám sát')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục không camera' }))

    expect(useProctorStore.getState().consent).toBe('declined')
    expect(screen.getByText('Bạn đang thi không camera')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Bật lại camera' })).toBeTruthy()
    // Không có nút nào bị disable (camera không bao giờ chặn phòng).
    for (const button of screen.getAllByRole('button')) {
      expect((button as HTMLButtonElement).disabled).toBe(false)
    }
  })

  it('re-enables the camera from the persistent warning', () => {
    renderLobby(lobby())
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục không camera' }))
    fireEvent.click(screen.getByRole('button', { name: 'Bật lại camera' }))

    expect(useProctorStore.getState().consent).toBe('granted')
    expect(screen.getByText('Camera giám sát')).toBeTruthy()
  })
})

describe('ProctorLobbyPanel — host', () => {
  it('links to the dashboard when proctoring is on and the host does not play', () => {
    renderLobby(lobby({ currentUserHost: true }))

    fireEvent.click(screen.getByRole('button', { name: 'Mở bảng giám sát' }))
    expect(screen.getByTestId('location').textContent).toBe(`/proctor/${PIN}`)
  })

  it('explains instead of offering the dashboard when the host also plays', () => {
    renderLobby(lobby({ currentUserHost: true, hostPlays: true }))

    expect(screen.queryByRole('button', { name: 'Mở bảng giám sát' })).toBeNull()
    expect(screen.getByText(/không mở được bảng giám sát/)).toBeTruthy()
  })

  it('renders nothing when the room has no proctoring', () => {
    renderLobby(lobby({ currentUserHost: true, proctoringEnabled: false }))
    expect(screen.queryByText('Bảng giám sát')).toBeNull()
  })
})

describe('ProctorBattlePanel', () => {
  it('offers the dashboard entry to a non-playing host', () => {
    renderBattle(started())

    fireEvent.click(screen.getByRole('button', { name: 'Mở bảng giám sát' }))
    expect(screen.getByTestId('location').textContent).toBe(`/proctor/${PIN}`)
  })

  it('offers the consent buttons to a player who has not decided yet', () => {
    renderBattle(started({ host: false, playing: true }))

    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục không camera' }))
    expect(useProctorStore.getState().consent).toBe('declined')
    expect(screen.getByText(/Host thấy bạn là/)).toBeTruthy()
  })
})
