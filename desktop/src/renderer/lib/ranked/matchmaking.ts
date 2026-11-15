/**
 * Máy trạng thái của bước tìm trận (thuần, không I/O).
 *
 * ```text
 * idle ──requested──► sending ──queued──► waiting ──matched──► idle
 *   ▲                    │                  │
 *   │                    └──failed──────────┘   (MATCH_ERROR)
 *   │                                        │
 *   └────────cancelled─── cancelling ◄──cancelRequested
 * ```
 *
 * Quy tắc: `requested` chỉ được nhận khi `idle` — nơi gọi không thể gửi `FIND_MATCH`
 * lần thứ hai khi đang chờ, kể cả khi người dùng bấm nhanh hai lần.
 */
import type { RankedDuration, SearchAction, SearchState } from './types'

export function initialSearchState(duration: RankedDuration = 180): SearchState {
  return { phase: 'idle', duration, startedAt: null, errorCode: null, notice: null }
}

const BUSY_PHASES = new Set<SearchState['phase']>(['sending', 'waiting', 'cancelling'])

/** Có yêu cầu nào đang trên đường tới server hay không. */
export function isSearchBusy(state: SearchState): boolean {
  return BUSY_PHASES.has(state.phase)
}

/** Số giây đã chờ, tính từ mốc `startedAt` (chỉ để hiển thị). */
export function elapsedSeconds(startedAt: number | null, now: number): number {
  if (startedAt === null) return 0
  return Math.max(0, Math.floor((now - startedAt) / 1000))
}

export function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case 'duration': {
      if (state.phase !== 'idle') return state
      if (state.duration === action.duration) return state
      return { ...state, duration: action.duration, errorCode: null, notice: null }
    }

    case 'requested': {
      if (state.phase !== 'idle') return state
      return { ...state, phase: 'sending', startedAt: action.now, errorCode: null, notice: null }
    }

    case 'queued': {
      if (state.phase !== 'sending' && state.phase !== 'waiting') return state
      return { ...state, phase: 'waiting', startedAt: state.startedAt ?? action.now }
    }

    case 'failed': {
      return { ...state, phase: 'idle', startedAt: null, errorCode: action.code, notice: null }
    }

    case 'cancelRequested': {
      if (state.phase !== 'sending' && state.phase !== 'waiting') return state
      return { ...state, phase: 'cancelling' }
    }

    case 'cancelled': {
      if (!isSearchBusy(state)) return state
      return {
        ...state,
        phase: 'idle',
        startedAt: null,
        errorCode: null,
        notice: 'Đã hủy tìm trận.'
      }
    }

    case 'matched': {
      return { ...state, phase: 'idle', startedAt: null, errorCode: null, notice: null }
    }

    case 'clear': {
      return { ...initialSearchState(state.duration) }
    }

    default:
      return state
  }
}
