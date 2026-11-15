import { useEffect, useId, useRef, type ReactNode } from 'react'
import { cn } from './cn'
import { Portal } from './Portal'
import { IconButton } from './IconButton'
import { X } from './icons'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  /** Supporting copy under the title; also the dialog's accessible description. */
  description?: ReactNode
  children?: ReactNode
  /** Footer actions — one primary, at most one secondary, Cancel on the left. */
  footer?: ReactNode
  /** `sm` 380px · `md` 480px · `lg` 620px · `xl` 780px. */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Hide when the footer already provides an explicit cancel action. */
  hideCloseButton?: boolean
  /** Set false for destructive confirmations where a stray click must not cancel. */
  closeOnScrimClick?: boolean
  className?: string
}

const SIZE = {
  sm: 'max-w-[380px]',
  md: 'max-w-[480px]',
  lg: 'max-w-[620px]',
  xl: 'max-w-[780px]',
} as const

/**
 * Modal dialog with the semantics a real dialog needs: `role="dialog"`,
 * `aria-modal`, labelled + described, focus moved in on open and restored on
 * close, Tab/Shift+Tab cycling inside, Escape to dismiss, background scroll
 * locked, and the scrim as a separate click target from the panel.
 *
 * Exit is intentionally instant: a 250 ms fade-out would delay the next action
 * in a quiz flow.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  hideCloseButton = false,
  closeOnScrimClick = true,
  className,
}: DialogProps): ReactNode {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const baseId = useId()
  const titleId = `${baseId}-title`
  const descriptionId = `${baseId}-desc`

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? panel)?.focus()

    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panel) return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) {
        event.preventDefault()
        return
      }
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
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <Portal>
      <div className="fixed inset-0 flex items-center justify-center p-6" style={{ zIndex: 'var(--nq-z-dialog)' }}>
        <div
          className="nq-scrim-enter absolute inset-0 bg-nq-scrim"
          onClick={closeOnScrimClick ? onClose : undefined}
          aria-hidden="true"
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          tabIndex={-1}
          className={cn(
            'nq-dialog-enter relative flex max-h-[calc(100dvh-48px)] w-full flex-col overflow-hidden rounded-nq-xl',
            'border border-nq-border bg-nq-surface-overlay shadow-nq-xl',
            SIZE[size],
            className
          )}
        >
          <header className="flex items-start gap-3 px-6 pt-5 pb-1">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="nq-display nq-balance text-nq-xl leading-tight text-nq-text">
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="nq-pretty mt-1.5 text-nq-sm leading-normal text-nq-text-secondary">
                  {description}
                </p>
              ) : null}
            </div>
            {hideCloseButton ? null : (
              <IconButton label="Đóng" size="sm" icon={<X size={16} />} onClick={onClose} className="-mt-1 -mr-1.5" />
            )}
          </header>

          {children ? (
            <div className="nq-scroll min-h-0 flex-1 px-6 py-4 text-nq-sm text-nq-text-secondary">{children}</div>
          ) : null}

          {footer ? (
            <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-nq-border-subtle bg-nq-surface-raised px-6 py-4">
              {footer}
            </footer>
          ) : null}
        </div>
      </div>
    </Portal>
  )
}
