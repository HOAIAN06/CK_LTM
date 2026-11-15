/**
 * Payload + cổng gửi của proctoring.
 *
 * Những luật này bảo vệ server khỏi dữ liệu client sai (`BAD_PROCTOR_STATUS`,
 * `BAD_PROCTOR_EVENT`, `ROOM_NOT_RUNNING`) nên phải khoá bằng test.
 */
import { describe, expect, it } from 'vitest'
import {
  DETECTABLE_EVENT_TYPES,
  buildEventReport,
  buildStatusReport,
  canEmitEvent,
  canReportStatus,
  createEventId,
  isReportableCameraStatus,
  isUuid,
  REPORTED_CALIBRATION,
  type ProctorRoomContext
} from '../proctor-protocol'
import { CAMERA_STATUSES } from '@shared/protocol'

const PLAYER: ProctorRoomContext = {
  pin: '123456',
  proctoringEnabled: true,
  playing: true,
  host: false,
  phase: 'running'
}

describe('canReportStatus / canEmitEvent', () => {
  it('allows a proctored player only', () => {
    expect(canReportStatus(PLAYER)).toBe(true)
    expect(canReportStatus({ ...PLAYER, host: true })).toBe(false)
    expect(canReportStatus({ ...PLAYER, playing: false })).toBe(false)
    expect(canReportStatus({ ...PLAYER, proctoringEnabled: false })).toBe(false)
    expect(canReportStatus({ ...PLAYER, phase: 'ended' })).toBe(false)
    expect(canReportStatus(null)).toBe(false)
  })

  it('requires a running room for events', () => {
    expect(canEmitEvent(PLAYER)).toBe(true)
    expect(canEmitEvent({ ...PLAYER, phase: 'lobby' })).toBe(false)
    expect(canEmitEvent({ ...PLAYER, phase: 'ended' })).toBe(false)
  })
})

describe('isReportableCameraStatus', () => {
  it('rejects the two values the Java server refuses from a player', () => {
    expect(isReportableCameraStatus('NOT_REQUIRED')).toBe(false)
    expect(isReportableCameraStatus('NOT_APPLICABLE')).toBe(false)
  })

  it('accepts every real camera state', () => {
    for (const status of CAMERA_STATUSES) {
      if (status === 'NOT_REQUIRED' || status === 'NOT_APPLICABLE') continue
      expect(isReportableCameraStatus(status)).toBe(true)
    }
  })
})

describe('buildStatusReport', () => {
  it('always reports NOT_REQUIRED calibration (no vision model in Electron)', () => {
    const report = buildStatusReport({
      pin: '123456',
      status: 'READY',
      observedAtEpochMillis: 1_700_000_000_000
    })
    expect(report).toEqual({
      pin: '123456',
      cameraStatus: 'READY',
      calibrationStatus: REPORTED_CALIBRATION,
      detail: 'Camera sẵn sàng',
      observedAtEpochMillis: 1_700_000_000_000
    })
    expect(REPORTED_CALIBRATION).toBe('NOT_REQUIRED')
  })

  it('returns null for NOT_REQUIRED / NOT_APPLICABLE', () => {
    expect(
      buildStatusReport({ pin: '123456', status: 'NOT_REQUIRED', observedAtEpochMillis: 1 })
    ).toBeNull()
    expect(
      buildStatusReport({ pin: '123456', status: 'NOT_APPLICABLE', observedAtEpochMillis: 1 })
    ).toBeNull()
  })

  it('keeps an explicit detail string and defaults it otherwise', () => {
    expect(
      buildStatusReport({
        pin: '1',
        status: 'DENIED',
        detail: 'Người chơi từ chối',
        observedAtEpochMillis: 1
      })?.detail
    ).toBe('Người chơi từ chối')
    expect(
      buildStatusReport({ pin: '1', status: 'DENIED', observedAtEpochMillis: 1 })?.detail
    ).toBe('Người chơi không cấp quyền camera')
  })
})

describe('buildEventReport', () => {
  it('clamps duration, sequence and confidence into the server-accepted range', () => {
    const report = buildEventReport({
      pin: '123456',
      eventId: 'abc',
      type: 'APP_FOCUS_LOST',
      severity: 'EVIDENCE',
      frameSequence: -5,
      occurredAtEpochMillis: 1_700_000_000_000,
      durationMillis: 999_999,
      confidence: 4
    })
    expect(report.frameSequence).toBe(0)
    expect(report.durationMillis).toBe(300_000)
    expect(report.confidence).toBe(1)
  })

  it('uses confidence 0 by default: no model measured anything', () => {
    const report = buildEventReport({
      pin: '1',
      eventId: 'abc',
      type: 'CAMERA_BLOCKED',
      severity: 'EVIDENCE',
      frameSequence: 7,
      occurredAtEpochMillis: 1,
      durationMillis: 0
    })
    expect(report.confidence).toBe(0)
    expect(report.frameSequence).toBe(7)
  })
})

describe('detectable event types', () => {
  it('only lists the three events Electron can actually observe', () => {
    expect([...DETECTABLE_EVENT_TYPES]).toEqual([
      'APP_FOCUS_LOST',
      'APP_MINIMIZED',
      'CAMERA_BLOCKED'
    ])
  })
})

describe('createEventId', () => {
  it('returns a UUID the Java server accepts', () => {
    const id = createEventId()
    expect(isUuid(id)).toBe(true)
    expect(id.length).toBeLessThanOrEqual(64)
  })

  it('is unique per call', () => {
    const ids = new Set(Array.from({ length: 50 }, () => createEventId()))
    expect(ids.size).toBe(50)
  })
})
