import { useEffect, useId, useRef, type ReactNode } from 'react'
import { cn } from './cn'
import { Portal } from './Portal'
import { IconButton } from './IconButton'
import { X } from './icons'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  /** `right` (details / inspector) or `left` (secondary navigation). */
  side?: 'right' | 'left'
  /** `sm` 320px · `md` 400px · `lg` 480px. */
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE = {
  sm: 'w-[320px]',
  md: 'w-[400px]',
  lg: 'w-[480px]',
} as const

/**
 * Slide-over panel for contextual detail (player profile, quiz question
 * preview, camera detail). Same keyboard contract as `Dialog`: focus trap,
 * Escape, restore focus. Rendered as a complementary surface, not a modal for
 * destructive decisions.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'right',
  size = 'md',
  className,
}: SheetProps): ReactNode {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const baseId = useId()
  const titleId = `${baseId}-title`
  const descriptionId = `${baseId}-desc`

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    ;(panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel)?.focus()

    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panel) return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) return
      const firstItem = items[0]!
      const lastItem = items[items.length - 1]!
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      previouslyFocused?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <Portal>
      <div className="fixed inset-0" style={{ zIndex: 'var(--nq-z-sheet)' }}>
        <div className="nq-scrim-enter absolute inset-0 bg-nq-scrim" onClick={onClose} aria-hidden="true" />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          tabIndex={-1}
          className={cn(
            'absolute inset-y-0 flex flex-col bg-nq-surface-overlay shadow-nq-xl',
            side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
            'border-nq-border',
            side === 'right' ? 'nq-sheet-enter-right' : 'nq-sheet-enter-left',
            SIZE[size],
            'max-w-[calc(100vw-64px)]',
            className
          )}
        >
          <header className="flex items-start gap-3 border-b border-nq-border-subtle px-5 py-4">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="nq-display text-nq-lg leading-tight text-nq-text">
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="mt-1 text-nq-xs leading-normal text-nq-text-secondary">
                  {description}
                </p>
              ) : null}
            </div>
            <IconButton label="Đóng" size="sm" icon={<X size={16} />} onClick={onClose} className="-mt-0.5 -mr-1" />
          </header>

          <div className="nq-scroll min-h-0 flex-1 px-5 py-4 text-nq-sm text-nq-text-secondary">{children}</div>

          {footer ? (
            <footer className="flex items-center justify-end gap-2 border-t border-nq-border-subtle px-5 py-3.5">
              {footer}
            </footer>
          ) : null}
        </div>
      </div>
    </Portal>
  )
}
