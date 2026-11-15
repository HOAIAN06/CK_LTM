import { useId, type ReactNode } from 'react'
import { cn } from './cn'

export interface SwitchProps {
  /** Visible label. */
  label?: ReactNode
  /** Secondary line under the label — what the switch actually turns on. */
  description?: ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  id?: string
  className?: string
  size?: 'sm' | 'md'
  /** Keeps the label visually hidden but announced. */
  hideLabel?: boolean
}

/**
 * `role="switch"` on a real button: Space/Enter toggle natively, the state is
 * exposed as `aria-checked`, and the track + knob are token-driven.
 */
export function Switch({
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
  id,
  className,
  size = 'md',
  hideLabel = false,
}: SwitchProps): ReactNode {
  const autoId = useId()
  const switchId = id ?? autoId
  const labelId = `${switchId}-label`
  const descId = `${switchId}-desc`

  const track = size === 'sm' ? 'h-[18px] w-8' : 'h-[22px] w-[38px]'
  const knob = size === 'sm' ? 'size-3.5' : 'size-[18px]'
  const travel = size === 'sm' ? 'translate-x-[14px]' : 'translate-x-[16px]'

  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      {label || description ? (
        <span className="min-w-0">
          {label ? (
            <span
              id={labelId}
              className={cn('block text-nq-sm font-medium text-nq-text', hideLabel && 'nq-sr-only')}
            >
              {label}
            </span>
          ) : null}
          {description ? (
            <span id={descId} className="mt-0.5 block text-nq-xs leading-snug text-nq-text-secondary">
              {description}
            </span>
          ) : null}
        </span>
      ) : null}
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={label ? labelId : undefined}
        aria-describedby={description ? descId : undefined}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'nq-focusable relative inline-flex shrink-0 items-center rounded-nq-full p-[2px]',
          'transition-[background-color,box-shadow] duration-[var(--nq-motion-fast)] ease-nq',
          track,
          checked ? 'bg-nq-primary' : 'bg-nq-border-strong',
          disabled && 'pointer-events-none opacity-[var(--nq-opacity-disabled)]'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'grid place-items-center rounded-nq-full bg-nq-surface-raised shadow-nq-sm',
            'transition-transform duration-[var(--nq-motion-fast)] ease-nq',
            knob,
            checked ? travel : 'translate-x-0'
          )}
        />
      </button>
    </div>
  )
}
