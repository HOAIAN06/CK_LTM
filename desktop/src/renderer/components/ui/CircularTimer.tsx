import type { ReactNode } from 'react'
import { cn } from './cn'

export interface CircularTimerProps {
  /** Seconds left. Clamped to `[0, total]`. */
  remaining: number
  /** Seconds at the start of the interval. */
  total: number
  /** Outer diameter in px. Keep it on the 8pt grid (64 / 88 / 120). */
  size?: number
  label?: ReactNode
  /** Below this many seconds the ring turns amber. */
  warningAt?: number
  /** Below this many seconds the ring turns red and pulses. */
  criticalAt?: number
  /** `clock` prints mm:ss (room timer), `seconds` prints the raw count. */
  format?: 'seconds' | 'clock'
  /** Freeze the pulse (e.g. question closed by the server). */
  paused?: boolean
  className?: string
}

function formatSeconds(remaining: number, format: 'seconds' | 'clock'): string {
  if (format === 'seconds') return String(Math.ceil(remaining))
  const safe = Math.max(0, Math.ceil(remaining))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/**
 * Countdown ring. Urgency is expressed by colour **and** motion **and** a
 * changing numeral, so the state survives colour blindness and mute contexts.
 */
export function CircularTimer({
  remaining,
  total,
  size = 88,
  label,
  warningAt = 10,
  criticalAt = 5,
  format,
  paused = false,
  className,
}: CircularTimerProps): ReactNode {
  const safeTotal = total > 0 ? total : 1
  const value = Math.min(Math.max(remaining, 0), safeTotal)
  const ratio = value / safeTotal
  const resolvedFormat = format ?? (safeTotal > 60 ? 'clock' : 'seconds')

  const stroke = size <= 72 ? 4 : 6
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const isCritical = value <= criticalAt
  const isWarning = !isCritical && value <= warningAt

  return (
    <div
      className={cn('inline-flex flex-col items-center gap-1.5', className)}
      style={{ width: size }}
    >
      <div className={cn('relative inline-grid place-items-center', isCritical && !paused && 'nq-timer-critical')}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={safeTotal}
          aria-valuenow={value}
          aria-valuetext={`${Math.ceil(value)} giây còn lại`}
          aria-label={typeof label === 'string' ? label : 'Thời gian còn lại'}
          className={cn(
            'block',
            isCritical ? 'text-nq-danger' : isWarning ? 'text-nq-warning' : 'text-nq-primary'
          )}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--nq-border-subtle)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - ratio)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 250ms var(--nq-ease-standard), stroke 150ms linear' }}
          />
        </svg>
        <span
          aria-hidden="true"
          className={cn(
            'nq-tabular absolute font-display font-bold leading-none',
            isCritical ? 'text-nq-danger' : isWarning ? 'text-nq-warning' : 'text-nq-text',
            size >= 96 ? 'text-nq-2xl' : size >= 76 ? 'text-nq-xl' : 'text-nq-lg'
          )}
        >
          {formatSeconds(value, resolvedFormat)}
        </span>
      </div>
      {label ? <span className="nq-caps text-center">{label}</span> : null}
    </div>
  )
}
