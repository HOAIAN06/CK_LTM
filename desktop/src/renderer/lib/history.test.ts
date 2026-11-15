import { describe, expect, it } from 'vitest'
import type { MatchHistoryEntry } from '@shared/protocol'
import {
  HISTORY_FILTER_LABELS,
  endReasonLabel,
  filterMatches,
  normalizeResult,
  summarizeMatches
} from './history'

function match(
  overrides: Partial<MatchHistoryEntry> = {}
): MatchHistoryEntry {
  return {
    matchId: 1,
    opponentUsername: 'binh_tran',
    myScore: 5,
    opponentScore: 2,
    result: 'WIN',
    durationSeconds: 180,
    endReason: 'NORMAL',
    playedAt: '2026-11-15T10:00:00Z',
    ...overrides
  }
}

const MATCHES: MatchHistoryEntry[] = [
  match({ matchId: 3, result: 'WIN' }),
  match({ matchId: 2, result: 'LOSS', myScore: 1, opponentScore: 4 }),
  match({ matchId: 1, result: 'DRAW', myScore: 3, opponentScore: 3 }),
  match({ matchId: 0, result: 'LOSE', endReason: 'DISCONNECT' })
]

describe('normalizeResult', () => {
  it('accepts both LOSS and LOSE spellings used by the protocol', () => {
    expect(normalizeResult('WIN')).toBe('WIN')
    expect(normalizeResult('LOSS')).toBe('LOSS')
    expect(normalizeResult('LOSE')).toBe('LOSS')
    expect(normalizeResult('draw')).toBe('DRAW')
    expect(normalizeResult('')).toBe('UNKNOWN')
  })
})

describe('filterMatches', () => {
  it('returns a copy for ALL and narrows for a result', () => {
    const all = filterMatches(MATCHES, 'ALL')
    expect(all).toHaveLength(4)
    expect(all).not.toBe(MATCHES)

    expect(filterMatches(MATCHES, 'WIN').map((item) => item.matchId)).toEqual([3])
    expect(filterMatches(MATCHES, 'LOSS').map((item) => item.matchId)).toEqual([2, 0])
    expect(filterMatches(MATCHES, 'DRAW').map((item) => item.matchId)).toEqual([1])
  })

  it('keeps the server order (newest first) instead of re-sorting', () => {
    expect(filterMatches(MATCHES, 'ALL').map((item) => item.matchId)).toEqual([3, 2, 1, 0])
  })

  it('returns an empty list when the filter matches nothing', () => {
    expect(filterMatches([match({ result: 'WIN' })], 'DRAW')).toEqual([])
  })
})

describe('summarizeMatches', () => {
  it('counts result buckets without inventing games', () => {
    expect(summarizeMatches(MATCHES)).toEqual({ wins: 1, losses: 2, draws: 1, matches: 4 })
    expect(summarizeMatches([])).toEqual({ wins: 0, losses: 0, draws: 0, matches: 0 })
  })

  it('ignores unknown result strings', () => {
    expect(summarizeMatches([match({ result: 'WHATEVER' })])).toMatchObject({
      wins: 0,
      losses: 0,
      draws: 0,
      matches: 1
    })
  })
})

describe('endReasonLabel', () => {
  it('explains NORMAL and DISCONNECT', () => {
    expect(endReasonLabel('NORMAL')).toBe('Hết giờ')
    expect(endReasonLabel('DISCONNECT')).toBe('Đối thủ mất kết nối')
    expect(endReasonLabel('')).toBe('—')
    expect(endReasonLabel('OTHER')).toBe('OTHER')
  })
})

describe('history filters metadata', () => {
  it('has a Vietnamese label for each filter', () => {
    expect(HISTORY_FILTER_LABELS.ALL).toBe('Tất cả')
    expect(HISTORY_FILTER_LABELS.WIN).toBe('Thắng')
    expect(HISTORY_FILTER_LABELS.LOSS).toBe('Thua')
    expect(HISTORY_FILTER_LABELS.DRAW).toBe('Hòa')
  })
})
