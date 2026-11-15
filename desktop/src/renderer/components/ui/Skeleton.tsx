import type { ReactNode } from 'react'
import { cn } from './cn'

export interface SkeletonProps {
  /** CSS width, e.g. `100%` or `12rem`. Defaults to `100%`. */
  width?: string
  /** CSS height. Defaults to a text-line height. */
  height?: string
  rounded?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Render N stacked lines with the last one at 60% width. */
  lines?: number
  /** Multi-line block gap. */
  gap?: string
  className?: string
}

const ROUNDED = {
  xs: 'rounded-nq-xs',
  sm: 'rounded-nq-sm',
  md: 'rounded-nq-md',
  lg: 'rounded-nq-lg',
  xl: 'rounded-nq-xl',
  full: 'rounded-nq-full',
} as const

/**
 * Loading placeholder. Preserves the final layout (no shift when data lands)
 * and collapses to a static block under `prefers-reduced-motion`.
 */
export function Skeleton({
  width = '100%',
  height = '0.875rem',
  rounded = 'sm',
  lines,
  gap = '0.5rem',
  className,
}: SkeletonProps): ReactNode {
  if (lines && lines > 1) {
    return (
      <div className={cn('flex w-full flex-col', className)} style={{ gap }} aria-hidden="true">
        {Array.from({ length: lines }, (_, index) => (
          <span
            key={index}
            className={cn('nq-skeleton block', ROUNDED[rounded])}
            style={{
              width: index === lines - 1 ? '60%' : width,
              height,
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <span
      aria-hidden="true"
      className={cn('nq-skeleton block', ROUNDED[rounded], className)}
      style={{ width, height }}
    />
  )
}
