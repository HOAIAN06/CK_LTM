import { describe, expect, it } from 'vitest'
import { elapsedSeconds, initialSearchState, isSearchBusy, searchReducer } from './matchmaking'
import type { SearchState } from './types'

const T0 = 5_000

function busy(): SearchState {
  return searchReducer(initialSearchState(180), { type: 'requested', now: T0 })
}

describe('searchReducer', () => {
  it('starts idle with a default duration', () => {
    const state = initialSearchState(180)
    expect(state.phase).toBe('idle')
    expect(state.duration).toBe(180)
    expect(state.startedAt).toBeNull()
    expect(isSearchBusy(state)).toBe(false)
  })

  it('goes idle → sending → waiting and keeps the original start time', () => {
    const sending = busy()
    expect(sending.phase).toBe('sending')
    expect(sending.startedAt).toBe(T0)
    expect(isSearchBusy(sending)).toBe(true)

    const waiting = searchReducer(sending, { type: 'queued', now: T0 + 700 })
    expect(waiting.phase).toBe('waiting')
    expect(waiting.startedAt).toBe(T0)
  })

  it('never starts a second search while one is pending', () => {
    const sending = busy()
    const again = searchReducer(sending, { type: 'requested', now: T0 + 100 })
    expect(again).toBe(sending)

    const waiting = searchReducer(sending, { type: 'queued', now: T0 })
    const third = searchReducer(waiting, { type: 'requested', now: T0 + 200 })
    expect(third).toBe(waiting)
  })

  it('returns to idle with the error code on MATCH_ERROR', () => {
    const waiting = searchReducer(busy(), { type: 'queued', now: T0 })
    const failed = searchReducer(waiting, { type: 'failed', code: 'QUESTIONS_UNAVAILABLE' })

    expect(failed.phase).toBe('idle')
    expect(failed.errorCode).toBe('QUESTIONS_UNAVAILABLE')
    expect(failed.startedAt).toBeNull()
    expect(isSearchBusy(failed)).toBe(false)
  })

  it('only cancels while a request is in flight', () => {
    const idle = initialSearchState(180)
    expect(searchReducer(idle, { type: 'cancelRequested' })).toBe(idle)
    expect(searchReducer(idle, { type: 'cancelled' })).toBe(idle)

    const cancelling = searchReducer(busy(), { type: 'cancelRequested' })
    expect(cancelling.phase).toBe('cancelling')

    const cancelled = searchReducer(cancelling, { type: 'cancelled' })
    expect(cancelled.phase).toBe('idle')
    expect(cancelled.startedAt).toBeNull()
    expect(cancelled.notice).toBe('Đã hủy tìm trận.')
    expect(isSearchBusy(cancelled)).toBe(false)
  })

  it('clears the search when a match is found', () => {
    const waiting = searchReducer(busy(), { type: 'queued', now: T0 })
    const matched = searchReducer(waiting, { type: 'matched' })
    expect(matched.phase).toBe('idle')
    expect(matched.startedAt).toBeNull()
    expect(matched.errorCode).toBeNull()
  })

  it('only changes the duration while idle', () => {
    const idle = initialSearchState(180)
    const five = searchReducer(idle, { type: 'duration', duration: 300 })
    expect(five.duration).toBe(300)

    const sending = busy()
    expect(searchReducer(sending, { type: 'duration', duration: 300 })).toBe(sending)
  })

  it('ignores a queued acknowledgement for an idle search', () => {
    const idle = initialSearchState(180)
    expect(searchReducer(idle, { type: 'queued', now: T0 })).toBe(idle)
  })
})

describe('elapsedSeconds', () => {
  it('counts whole seconds from the start of the wait', () => {
    expect(elapsedSeconds(null, T0)).toBe(0)
    expect(elapsedSeconds(T0, T0 + 999)).toBe(0)
    expect(elapsedSeconds(T0, T0 + 1_000)).toBe(1)
    expect(elapsedSeconds(T0, T0 + 12_500)).toBe(12)
    expect(elapsedSeconds(T0, T0 - 5_000)).toBe(0)
  })
})
