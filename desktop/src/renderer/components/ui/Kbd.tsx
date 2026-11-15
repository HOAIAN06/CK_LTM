import type { ReactNode } from 'react'
import { cn } from './cn'

export interface KbdProps {
  children: ReactNode
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Keycap. Always paired with a readable label — the glyph alone is never the
 * only way to learn a shortcut.
 */
export function Kbd({ children, size = 'md', className }: KbdProps): ReactNode {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center rounded-nq-xs border border-nq-border bg-nq-surface-raised',
        'font-mono font-medium text-nq-text-secondary shadow-[var(--nq-ring-inset)]',
        size === 'sm' ? 'h-4 min-w-4 px-1 text-[10px]' : 'h-5 min-w-5 px-1.5 text-nq-2xs',
        className
      )}
    >
      {children}
    </kbd>
  )
}

export interface KbdComboProps {
  /** e.g. `['Ctrl', 'K']` — the platform separator is chosen by the caller. */
  keys: string[]
  className?: string
}

/** Renders a chord as adjacent keycaps ("Ctrl" + "K"). */
export function KbdCombo({ keys, className }: KbdComboProps): ReactNode {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {keys.map((key, index) => (
        <span key={`${key}-${index}`} className="inline-flex items-center gap-1">
          {index > 0 ? (
            <span aria-hidden="true" className="text-[10px] text-nq-text-tertiary">
              +
            </span>
          ) : null}
          <Kbd size="sm">{key}</Kbd>
        </span>
      ))}
    </span>
  )
}
