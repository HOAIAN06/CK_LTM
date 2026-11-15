/**
 * Định dạng số liệu để hiển thị. Không có phép tính nghiệp vụ nào ở đây:
 * mọi con số đều do server gửi, file này chỉ đổi cách trình bày.
 *
 * Ngoại lệ duy nhất là độ chính xác (%) — một tỉ lệ suy ra từ hai số đếm của server,
 * cùng công thức với `HomeController` của client JavaFX, không phải điểm số.
 */
import type { MatchHistoryEntry, PlayerStats } from '@shared/protocol'

const NUMBER_FORMAT = new Intl.NumberFormat('vi-VN')
const DATE_TIME_FORMAT = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short'
})

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return NUMBER_FORMAT.format(value)
}

/** 0–100, làm tròn; 0 câu trả lời → 0 (không chia cho 0). */
export function accuracyPercent(
  stats: Pick<PlayerStats, 'questionsAnswered' | 'correctAnswers'>
): number {
  const answered = stats.questionsAnswered
  const correct = stats.correctAnswers
  if (!Number.isFinite(answered) || !Number.isFinite(correct) || answered <= 0) return 0
  const percent = Math.round((correct * 100) / answered)
  return Math.min(100, Math.max(0, percent))
}

/**
 * Độ chính xác để hiển thị: `—` khi chưa trả lời câu nào (không bịa `0%`).
 * Dùng cho hồ sơ; trang chủ dùng `accuracyPercent` để vẽ thanh tiến độ.
 */
export function formatAccuracy(correctAnswers: number, questionsAnswered: number): string {
  if (!Number.isFinite(questionsAnswered) || questionsAnswered <= 0) return '—'
  return `${accuracyPercent({ questionsAnswered, correctAnswers })}%`
}

export type ResultTone = 'success' | 'danger' | 'neutral'

export interface ResultCopy {
  label: string
  tone: ResultTone
}

/**
 * `MATCH_HISTORY_DATA.result` là `WIN|LOSS|DRAW`, còn `GAME_OVER.result` dùng
 * `WIN|LOSE|DRAW`. Nhận cả hai để không hiển thị sai khi server đổi cách viết.
 */
export function formatMatchResult(result: string): ResultCopy {
  switch (result.trim().toUpperCase()) {
    case 'WIN':
      return { label: 'Thắng', tone: 'success' }
    case 'LOSS':
    case 'LOSE':
      return { label: 'Thua', tone: 'danger' }
    case 'DRAW':
      return { label: 'Hòa', tone: 'neutral' }
    default:
      return { label: 'Không rõ', tone: 'neutral' }
  }
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—'
  const total = Math.round(seconds)
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  if (minutes === 0) return `${rest} giây`
  if (rest === 0) return `${minutes} phút`
  return `${minutes} phút ${rest} giây`
}

/** ISO-8601 UTC từ server → giờ địa phương; chuỗi hỏng thì trả nguyên văn. */
export function formatPlayedAt(playedAt: string): string {
  const date = new Date(playedAt)
  if (Number.isNaN(date.getTime())) return playedAt
  return DATE_TIME_FORMAT.format(date)
}

/** Dòng mô tả một trận, dùng cho khu vực "Phong độ gần đây". */
export function describeMatch(entry: MatchHistoryEntry): string {
  const result = formatMatchResult(entry.result)
  return `${result.label} trước ${entry.opponentUsername} · ${formatNumber(entry.myScore)}–${formatNumber(
    entry.opponentScore
  )}`
}
