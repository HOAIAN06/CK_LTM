import { describe, expect, it } from 'vitest'
import type { QuizLobbyData, QuizLobbyPlayer } from '@shared/protocol'
import {
  cameraIssues,
  cameraLabel,
  cameraTone,
  canHostStart,
  cancelReasonNotice,
  connectedPlayerCount,
  isCameraProblem,
  lobbyStatusText,
  parseDurationMinutes,
  proctoringHostConflict,
  sanitizePinInput,
  validateCreateRoom,
  validatePin
} from './lobby'

function member(overrides: Partial<QuizLobbyPlayer> = {}): QuizLobbyPlayer {
  return {
    userId: 1,
    username: 'an',
    host: false,
    playing: true,
    connected: true,
    cameraStatus: 'NOT_REQUIRED',
    calibrationStatus: 'NOT_REQUIRED',
    warningCount: 0,
    ...overrides
  }
}

function lobby(overrides: Partial<QuizLobbyData> = {}): QuizLobbyData {
  return {
    pin: '123456',
    title: 'Luyện N5',
    hostUsername: 'an',
    currentUserHost: true,
    hostPlays: true,
    proctoringEnabled: false,
    started: false,
    playerCount: 2,
    members: [
      member({ userId: 1, username: 'an', host: true }),
      member({ userId: 2, username: 'binh' })
    ],
    ...overrides
  }
}

describe('connectedPlayerCount', () => {
  it('counts only playing, connected members', () => {
    const members = [
      member({ userId: 1, connected: true }),
      member({ userId: 2, connected: false }),
      member({ userId: 3, connected: true, playing: false }),
      member({ userId: 4, connected: true })
    ]
    expect(connectedPlayerCount(members)).toBe(2)
    expect(connectedPlayerCount([])).toBe(0)
    expect(connectedPlayerCount(null)).toBe(0)
  })
})

describe('canHostStart', () => {
  it('needs host, two connected players and no pending request', () => {
    expect(canHostStart(lobby(), false)).toBe(true)
    expect(canHostStart(lobby(), true)).toBe(false)
    expect(canHostStart(lobby({ currentUserHost: false }), false)).toBe(false)
    expect(
      canHostStart(
        lobby({ members: [member({ userId: 1, host: true }), member({ userId: 2, connected: false })] }),
        false
      )
    ).toBe(false)
    expect(canHostStart(null, false)).toBe(false)
  })

  it('never gates start on camera state (D-002 / D-005)', () => {
    const cameraBroken = lobby({
      proctoringEnabled: true,
      hostPlays: false,
      members: [
        member({ userId: 1, username: 'an', host: true, playing: false, cameraStatus: 'NOT_APPLICABLE' }),
        member({ userId: 2, username: 'binh', cameraStatus: 'DENIED' }),
        member({ userId: 3, username: 'chi', cameraStatus: 'FAILED' })
      ]
    })
    expect(canHostStart(cameraBroken, false)).toBe(true)
    expect(lobbyStatusText(cameraBroken, false)).toContain('vẫn có thể bắt đầu')
  })
})

describe('lobbyStatusText', () => {
  it('explains the missing players, the camera warnings and the waiting state', () => {
    expect(
      lobbyStatusText(lobby({ members: [member({ userId: 1, host: true })] }), false)
    ).toContain('ít nhất 2 người chơi')

    expect(lobbyStatusText(lobby(), false)).toBe('Phòng đã sẵn sàng để bắt đầu.')
    expect(lobbyStatusText(lobby({ currentUserHost: false }), false)).toBe(
      'Đang chờ host bắt đầu...'
    )
    expect(lobbyStatusText(lobby(), true)).toBe('Đang bắt đầu phòng...')

    const allReady = lobby({
      proctoringEnabled: true,
      members: [
        member({ userId: 1, cameraStatus: 'NOT_APPLICABLE' }),
        member({ userId: 2, cameraStatus: 'READY' })
      ]
    })
    expect(lobbyStatusText(allReady, false)).toContain('đã sẵn sàng')

    const initializing = lobby({
      proctoringEnabled: true,
      members: [member({ userId: 1 }), member({ userId: 2, cameraStatus: 'INITIALIZING' })]
    })
    expect(lobbyStatusText(initializing, false)).toContain('đang khởi tạo')
  })
})

describe('camera helpers', () => {
  it('maps statuses to Vietnamese labels and tones', () => {
    expect(cameraLabel('READY')).toBe('Camera sẵn sàng')
    expect(cameraLabel('DENIED')).toBe('Từ chối camera')
    expect(cameraLabel('NOT_REQUIRED')).toBeNull()
    expect(cameraLabel('NOT_APPLICABLE')).toBeNull()

    expect(cameraTone('READY')).toBe('success')
    expect(cameraTone('INITIALIZING')).toBe('warning')
    expect(cameraTone('LOST')).toBe('danger')
    expect(cameraTone(null)).toBe('neutral')

    expect(isCameraProblem('FAILED')).toBe(true)
    expect(isCameraProblem('READY')).toBe(false)
  })

  it('lists members whose camera is failing, for the host warning', () => {
    const issues = cameraIssues(
      lobby({
        proctoringEnabled: true,
        members: [
          member({ userId: 1, username: 'an' }),
          member({ userId: 2, username: 'binh', cameraStatus: 'DENIED' }),
          member({ userId: 3, username: 'chi', cameraStatus: 'READY' })
        ]
      })
    )
    expect(issues).toEqual([{ username: 'binh', label: 'Từ chối camera' }])
  })
})

describe('form validation', () => {
  it('accepts exactly six digits for the PIN', () => {
    expect(validatePin('123456')).toBeNull()
    expect(validatePin(' 123456 ')).toBeNull()
    expect(validatePin('')).toContain('Nhập mã PIN')
    expect(validatePin('12345')).toContain('đúng 6 chữ số')
    expect(validatePin('1234567')).toContain('đúng 6 chữ số')
    expect(validatePin('12a456')).toContain('đúng 6 chữ số')
    expect(sanitizePinInput('12a4-56x')).toBe('12456')
    expect(sanitizePinInput('1234567')).toBe('123456')
  })

  it('accepts 1–15 minutes only', () => {
    expect(parseDurationMinutes('1')).toBe(1)
    expect(parseDurationMinutes('15')).toBe(15)
    expect(parseDurationMinutes('0')).toBeNull()
    expect(parseDurationMinutes('16')).toBeNull()
    expect(parseDurationMinutes('abc')).toBeNull()
    expect(parseDurationMinutes('1.5')).toBeNull()
  })

  it('blocks proctoring + hostPlays with an explanation', () => {
    expect(proctoringHostConflict(true, true)).toContain('giám sát camera')
    expect(proctoringHostConflict(true, false)).toBeNull()
    expect(proctoringHostConflict(false, true)).toBeNull()

    const errors = validateCreateRoom({
      quizSetId: null,
      durationMinutes: '20',
      hostPlays: true,
      proctoringEnabled: true
    })
    expect(errors.quizSet).toBeTruthy()
    expect(errors.durationMinutes).toContain('1 đến 15')
    expect(errors.conflict).toBeTruthy()

    expect(
      validateCreateRoom({
        quizSetId: 4,
        durationMinutes: '5',
        hostPlays: true,
        proctoringEnabled: false
      })
    ).toEqual({})
  })
})

describe('cancelReasonNotice', () => {
  it('tells the player who cancelled the room', () => {
    expect(cancelReasonNotice('HOST_CANCELLED').title).toContain('Chủ phòng')
    expect(cancelReasonNotice('SERVER_STOPPED').title).toContain('Máy chủ')
    expect(cancelReasonNotice('HOST_CANCELLED', true).title).toBe('Bạn đã hủy phòng')
    expect(cancelReasonNotice('SOMETHING').tone).toBe('info')
  })
})
