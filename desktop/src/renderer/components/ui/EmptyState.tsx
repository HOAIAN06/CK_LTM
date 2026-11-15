import type { ReactNode } from 'react'
import { cn } from './cn'

export interface EmptyStateProps {
  /** 18–22px outline glyph, rendered inside a soft tile. */
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  /** One primary action (plus at most one ghost link). */
  action?: ReactNode
  size?: 'sm' | 'md'
  className?: string
}

/**
 * "Nothing here yet" state. Always says *why* it is empty and *what to do
 * next* — an empty screen is a teaching moment, not a void.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'md',
  className,
}: EmptyStateProps): ReactNode {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-nq-lg border border-dashed border-nq-border text-center',
        size === 'md' ? 'px-8 py-12' : 'px-5 py-8',
        className
      )}
    >
      {icon ? (
        <span
          aria-hidden="true"
          className={cn(
            'mb-4 grid place-items-center rounded-nq-full bg-nq-surface-sunken text-nq-text-tertiary',
            size === 'md' ? 'size-12' : 'size-10'
          )}
        >
          {icon}
        </span>
      ) : null}
      <h3 className="nq-display text-nq-lg leading-snug text-nq-text">{title}</h3>
      {description ? (
        <p className="nq-pretty mt-2 max-w-[46ch] text-nq-sm leading-normal text-nq-text-secondary">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  )
}
