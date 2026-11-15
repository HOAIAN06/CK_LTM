import type { ReactNode } from 'react'
import { cn } from './cn'
import { X } from './icons'

export type TagTone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info'

export interface TagProps {
  tone?: TagTone
  /** Renders a remove affordance; `label` names it for assistive tech. */
  onRemove?: () => void
  removeLabel?: string
  icon?: ReactNode
  className?: string
  children: ReactNode
}

const TONE: Record<TagTone, string> = {
  neutral: 'bg-nq-surface-sunken text-nq-text-secondary',
  primary: 'bg-nq-primary-soft text-nq-primary-soft-text',
  accent: 'bg-nq-accent-soft text-nq-accent-strong',
  success: 'bg-nq-success-soft text-nq-success',
  warning: 'bg-nq-warning-soft text-nq-warning',
  danger: 'bg-nq-danger-soft text-nq-danger',
  info: 'bg-nq-info-soft text-nq-info',
}

/**
 * Pill-shaped metadata / filter chip. Rounder and looser than `Badge` — use
 * Tag inside content (topics, modes, players), Badge for state.
 */
export function Tag({ tone = 'neutral', onRemove, removeLabel = 'Xóa', icon, className, children }: TagProps): ReactNode {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-nq-full px-2.5 py-1 text-nq-xs font-medium',
        TONE[tone],
        className
      )}
    >
      {icon ? (
        <span aria-hidden="true" className="flex shrink-0 items-center">
          {icon}
        </span>
      ) : null}
      <span className="truncate">{children}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="nq-focusable -mr-1 grid size-4 shrink-0 place-items-center rounded-nq-full opacity-70 transition-opacity hover:opacity-100"
        >
          <X aria-hidden="true" size={12} />
        </button>
      ) : null}
    </span>
  )
}

/** Alias kept for copy-level consistency when a Tag reads as a status pill. */
export const Pill = Tag

export type PillProps = TagProps
