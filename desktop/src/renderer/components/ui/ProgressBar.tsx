import type { ReactNode } from 'react'
import { cn } from './cn'

export type ProgressTone = 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info'

export interface ProgressBarProps {
  /** 0–100. Ignored when `indeterminate`. */
  value: number
  max?: number
  tone?: ProgressTone
  size?: 'xs' | 'sm' | 'md'
  /** Visible caption above the track. */
  label?: ReactNode
  /** Renders the percentage at the right of the caption row. */
  showValue?: boolean
  indeterminate?: boolean
  className?: string
  /** Accessible name when no visible label exists. */
  'aria-label'?: string
}

const TONE: Record<ProgressTone, string> = {
  primary: 'bg-nq-primary',
  accent: 'bg-nq-accent-strong',
  success: 'bg-nq-success',
  warning: 'bg-nq-warning',
  danger: 'bg-nq-danger',
  info: 'bg-nq-info',
}

const HEIGHT = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2.5',
} as const

/**
 * Determinate progress with a real `progressbar` role. The value is also
 * printed as text so the state never depends on the bar's colour or length.
 */
export function ProgressBar({
  value,
  max = 100,
  tone = 'primary',
  size = 'sm',
  label,
  showValue = false,
  indeterminate = false,
  className,
  'aria-label': ariaLabel,
}: ProgressBarProps): ReactNode {
  const safeMax = max > 0 ? max : 100
  const clamped = Math.min(Math.max(value, 0), safeMax)
  const percent = Math.round((clamped / safeMax) * 100)

  return (
    <div className={cn('w-full', className)}>
      {label || showValue ? (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          {label ? <span className="text-nq-xs font-medium text-nq-text-secondary">{label}</span> : <span />}
          {showValue ? (
            <span className="nq-tabular text-nq-xs font-semibold text-nq-text">{percent}%</span>
          ) : null}
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={indeterminate ? undefined : clamped}
        aria-valuetext={indeterminate ? 'Đang xử lý' : `${percent}%`}
        className={cn('w-full overflow-hidden rounded-nq-full bg-nq-surface-sunken', HEIGHT[size])}
      >
        <div
          className={cn(
            'h-full rounded-nq-full transition-[width] duration-[var(--nq-motion-slow)] ease-nq',
            TONE[tone],
            indeterminate ? 'w-1/3 animate-pulse' : ''
          )}
          style={indeterminate ? undefined : { width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
