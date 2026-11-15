import { cloneElement, useId, useState, type FocusEvent, type ReactElement, type ReactNode } from 'react'
import { cn } from './cn'

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

export interface TooltipProps {
  /** Tooltip body — one short sentence, never a paragraph. */
  content: ReactNode
  placement?: TooltipPlacement
  /** The trigger. Must be a single focusable element that accepts refs/props. */
  children: ReactElement<{
    'aria-describedby'?: string
    onFocus?: (event: FocusEvent) => void
    onBlur?: (event: FocusEvent) => void
  }>
  /** Hide while an overlay is open to avoid stacking two surfaces. */
  disabled?: boolean
  className?: string
}

/**
 * Tooltip that appears on hover **and** keyboard focus, dismisses on blur and
 * Escape, and is wired with `aria-describedby`.
 *
 * Positioning is CSS-only (no measuring), so it never causes a layout pass on
 * scroll. For anything longer than a sentence use a Popover/Sheet instead.
 */
export function Tooltip({ content, placement = 'top', children, disabled = false, className }: TooltipProps): ReactNode {
  const id = useId()
  const [open, setOpen] = useState(false)
  const visible = open && !disabled

  const trigger = cloneElement(children, {
    'aria-describedby': visible ? id : undefined,
    onFocus: (event: FocusEvent) => {
      children.props.onFocus?.(event)
      setOpen(true)
    },
    onBlur: (event: FocusEvent) => {
      children.props.onBlur?.(event)
      setOpen(false)
    },
  })

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false)
      }}
    >
      {trigger}
      {visible ? (
        <span role="tooltip" id={id} data-placement={placement} className="nq-tooltip">
          {content}
        </span>
      ) : null}
    </span>
  )
}
