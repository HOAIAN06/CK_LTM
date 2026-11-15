/**
 * Lọc và tổng hợp lịch sử đấu — thuần, dùng lại formatter của Home.
 *
 * `MATCH_HISTORY_DATA.matches` đã được server sắp mới nhất trước và giới hạn 100 bản ghi;
 * ở đây chỉ lọc theo kết quả, không sắp xếp lại.
 */
import type { MatchHistoryEntry } from '@shared/protocol'

export const HISTORY_FILTERS = ['ALL', 'WIN', 'LOSS', 'DRAW'] as const
export type HistoryFilter = (typeof HISTORY_FILTERS)[number]

export const HISTORY_FILTER_LABELS: Record<HistoryFilter, string> = {
  ALL: 'Tất cả',
  WIN: 'Thắng',
  LOSS: 'Thua',
  DRAW: 'Hòa'
}

/** `LOSS` và `LOSE` đều được chấp nhận (hai cách viết trong protocol). */
export function normalizeResult(result: string): Exclude<HistoryFilter, 'ALL'> | 'UNKNOWN' {
  switch ((result ?? '').trim().toUpperCase()) {
    case 'WIN':
      return 'WIN'
    case 'LOSS':
    case 'LOSE':
      return 'LOSS'
    case 'DRAW':
      return 'DRAW'
    default:
      return 'UNKNOWN'
  }
}

export function filterMatches(
  matches: ReadonlyArray<MatchHistoryEntry>,
  filter: HistoryFilter
): MatchHistoryEntry[] {
  if (filter === 'ALL') return [...matches]
  return matches.filter((match) => normalizeResult(match.result) === filter)
}

export interface MatchSummary {
  wins: number
  losses: number
  draws: number
  matches: number
}

export function summarizeMatches(matches: ReadonlyArray<MatchHistoryEntry>): MatchSummary {
  let wins = 0
  let losses = 0
  let draws = 0
  for (const match of matches) {
    switch (normalizeResult(match.result)) {
      case 'WIN':
        wins += 1
        break
      case 'LOSS':
        losses += 1
        break
      case 'DRAW':
        draws += 1
        break
      default:
        break
    }
  }
  return { wins, losses, draws, matches: matches.length }
}

/** Nhãn lý do kết thúc trận. */
export function endReasonLabel(reason: string): string {
  switch ((reason ?? '').trim().toUpperCase()) {
    case 'DISCONNECT':
      return 'Đối thủ mất kết nối'
    case 'NORMAL':
      return 'Hết giờ'
    default:
      return reason || '—'
  }
}
