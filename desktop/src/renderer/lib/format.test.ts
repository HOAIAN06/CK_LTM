import { describe, expect, it } from 'vitest'
import {
  accuracyPercent,
  formatAccuracy,
  formatDuration,
  formatMatchResult,
  formatNumber,
  formatPlayedAt
} from './format'

describe('accuracyPercent', () => {
  it('guards divide-by-zero and clamps to 0–100', () => {
    expect(accuracyPercent({ questionsAnswered: 0, correctAnswers: 0 })).toBe(0)
    expect(accuracyPercent({ questionsAnswered: 3, correctAnswers: 2 })).toBe(67)
    expect(accuracyPercent({ questionsAnswered: 4, correctAnswers: 2 })).toBe(50)
    // Dữ liệu lạ từ server không được tạo ra >100%.
    expect(accuracyPercent({ questionsAnswered: 2, correctAnswers: 5 })).toBe(100)
  })
})

describe('formatAccuracy', () => {
  it('shows an em dash instead of inventing 0%', () => {
    expect(formatAccuracy(0, 0)).toBe('—')
    expect(formatAccuracy(5, 0)).toBe('—')
    expect(formatAccuracy(31, 40)).toBe('78%')
    expect(formatAccuracy(0, 10)).toBe('0%')
  })
})

describe('formatDuration', () => {
  it('reads naturally in Vietnamese', () => {
    expect(formatDuration(0)).toBe('—')
    expect(formatDuration(45)).toBe('45 giây')
    expect(formatDuration(180)).toBe('3 phút')
    expect(formatDuration(125)).toBe('2 phút 5 giây')
  })
})

describe('formatMatchResult', () => {
  it('normalises LOSS/LOSE and unknown values', () => {
    expect(formatMatchResult('WIN')).toEqual({ label: 'Thắng', tone: 'success' })
    expect(formatMatchResult('loss').label).toBe('Thua')
    expect(formatMatchResult('LOSE').tone).toBe('danger')
    expect(formatMatchResult('DRAW').label).toBe('Hòa')
    expect(formatMatchResult('???').label).toBe('Không rõ')
  })
})

describe('formatPlayedAt', () => {
  it('falls back to the raw string when the timestamp is invalid', () => {
    expect(formatPlayedAt('not-a-date')).toBe('not-a-date')
    expect(formatPlayedAt('2026-11-15T10:00:00Z')).not.toBe('2026-11-15T10:00:00Z')
  })
})

describe('formatNumber', () => {
  it('groups digits and handles invalid input', () => {
    expect(formatNumber(2480)).toMatch(/2[.,]480/)
    expect(formatNumber(Number.NaN)).toBe('0')
  })
})
