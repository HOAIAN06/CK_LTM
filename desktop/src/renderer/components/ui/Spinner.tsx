import type { ReactNode } from 'react'
import { cn } from './cn'

export type SpinnerSize = 'sm' | 'md' | 'lg'

export interface SpinnerProps {
  size?: SpinnerSize
  /** `current` inherits the surrounding text colour (use inside buttons). */
  tone?: 'current' | 'primary' | 'secondary'
  className?: string
}

const SIZE: Record<SpinnerSize, string> = {
  sm: 'size-3.5 border-[1.5px]',
  md: 'size-[18px] border-2',
  lg: 'size-6 border-2',
}

const TONE = {
  current: 'border-current',
  primary: 'border-nq-primary',
  secondary: 'border-nq-text-tertiary',
} as const

/**
 * Indeterminate progress. Purely decorative — the busy state must be announced
 * by the owning control (`aria-busy`) or by a live region.
 */
export function Spinner({ size = 'md', tone = 'current', className }: SpinnerProps): ReactNode {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block shrink-0 animate-spin rounded-nq-full border-t-transparent border-r-transparent align-[-0.125em]',
        SIZE[size],
        TONE[tone],
        className
      )}
    />
  )
}
