import { describe, expect, it } from 'vitest'
import {
  availabilityOf,
  describeInvite,
  inviteBlockReason,
  inviteSecondsLeft,
  outgoingInviteCopy
} from './invite'

describe('describeInvite', () => {
  it('describes a Ranked invite with its duration', () => {
    const copy = describeInvite({
      type: 'RANKED',
      fromUsername: 'binh_tran',
      durationSeconds: 300,
      roomPin: null
    })
    expect(copy.title).toContain('binh_tran')
    expect(copy.detail).toContain('5 phút')
  })

  it('describes a Quiz invite with the room PIN', () => {
    const copy = describeInvite({
      type: 'QUIZ',
      fromUsername: 'chi_le',
      durationSeconds: 0,
      roomPin: '246810'
    })
    expect(copy.title).toContain('phòng Quiz')
    expect(copy.detail).toContain('246810')
  })

  it('stays readable for an unknown invite type', () => {
    const copy = describeInvite({
      type: 'SOMETHING',
      fromUsername: 'an',
      durationSeconds: 0,
      roomPin: null
    })
    expect(copy.title).toContain('mời bạn chơi')
    expect(copy.detail).toContain('chưa được hỗ trợ')
  })
})

describe('inviteSecondsLeft', () => {
  it('rounds up and never goes below zero', () => {
    expect(inviteSecondsLeft(61_000, 1_000)).toBe(60)
    expect(inviteSecondsLeft(61_500, 1_000)).toBe(61)
    expect(inviteSecondsLeft(1_000, 2_000)).toBe(0)
    expect(inviteSecondsLeft(Number.NaN, 0)).toBe(0)
  })
})

describe('availabilityOf', () => {
  it('maps offline / busy / online to chips', () => {
    expect(availabilityOf({ online: false, busy: false })).toEqual({
      label: 'Ngoại tuyến',
      tone: 'neutral'
    })
    expect(availabilityOf({ online: true, busy: true }).tone).toBe('warning')
    expect(availabilityOf({ online: true, busy: false })).toEqual({
      label: 'Trực tuyến',
      tone: 'success'
    })
  })
})

describe('inviteBlockReason', () => {
  it('blocks invites to offline or busy friends with an explanation', () => {
    expect(inviteBlockReason({ online: false, busy: false })).toContain('ngoại tuyến')
    expect(inviteBlockReason({ online: true, busy: true })).toContain('bận')
    expect(inviteBlockReason({ online: true, busy: false })).toBeNull()
    expect(inviteBlockReason(null)).toContain('Chọn một người bạn')
  })
})

describe('outgoingInviteCopy', () => {
  it('explains every status the server can send', () => {
    expect(outgoingInviteCopy('SENT', 'binh')).toContain('60 giây')
    expect(outgoingInviteCopy('ACCEPTED', 'binh')).toContain('chấp nhận')
    expect(outgoingInviteCopy('REJECTED', 'binh')).toContain('từ chối')
    expect(outgoingInviteCopy('EXPIRED', 'binh')).toContain('hết hạn')
    expect(outgoingInviteCopy('CANCELLED', 'binh')).toContain('hủy')
    expect(outgoingInviteCopy('WHATEVER', 'binh')).toContain('thay đổi')
  })
})
