import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from './cn'

export interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
  /** Optional glyph; keep it 16px so the control keeps one optical height. */
  icon?: ReactNode
  disabled?: boolean
}

export interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>
  value: T
  onChange: (value: T) => void
  /** Accessible name for the group — required, there is no visible label slot. */
  label: string
  size?: 'sm' | 'md'
  fullWidth?: boolean
  disabled?: boolean
  className?: string
}

/**
 * Two-to-four mutually exclusive options (match length, leaderboard range,
 * theme mode). Exposed as a radiogroup with roving tabindex: Tab enters the
 * group once, arrows move the selection.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  fullWidth = false,
  disabled = false,
  className,
}: SegmentedControlProps<T>): ReactNode {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const move = (direction: 1 | -1): void => {
    const enabled = options.filter((option) => !option.disabled)
    if (enabled.length === 0) return
    const currentIndex = enabled.findIndex((option) => option.value === value)
    const next = enabled[(currentIndex + direction + enabled.length) % enabled.length]!
    onChange(next.value)
    const node = containerRef.current?.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)
    node?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        move(1)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        move(-1)
        break
      case 'Home':
        event.preventDefault()
        onChange(options.find((option) => !option.disabled)?.value ?? value)
        break
      case 'End': {
        event.preventDefault()
        const last = [...options].reverse().find((option) => !option.disabled)
        if (last) onChange(last.value)
        break
      }
      default:
        break
    }
  }

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      onKeyDown={disabled ? undefined : onKeyDown}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-nq-md border border-nq-border bg-nq-surface-sunken p-0.5',
        fullWidth && 'w-full',
        disabled && 'opacity-[var(--nq-opacity-disabled)]',
        className
      )}
    >
      {options.map((option) => {
        const selected = option.value === value
        const isDisabled = disabled || option.disabled
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            data-value={option.value}
            disabled={isDisabled}
            tabIndex={selected ? 0 : -1}
            onClick={() => !isDisabled && onChange(option.value)}
            className={cn(
              'nq-focusable inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-nq-sm',
              'font-semibold text-nq-text-secondary',
              'transition-[background-color,color,box-shadow] duration-[var(--nq-motion-fast)] ease-nq',
              'disabled:pointer-events-none disabled:opacity-[var(--nq-opacity-disabled)]',
              size === 'sm' ? 'h-[26px] px-2.5 text-nq-xs' : 'h-[34px] px-3.5 text-nq-sm',
              selected
                ? 'bg-nq-surface-raised text-nq-text shadow-nq-sm'
                : 'hover:bg-nq-surface-hover hover:text-nq-text'
            )}
          >
            {option.icon ? (
              <span aria-hidden="true" className="flex items-center">
                {option.icon}
              </span>
            ) : null}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
