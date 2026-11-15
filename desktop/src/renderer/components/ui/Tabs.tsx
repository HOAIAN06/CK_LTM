import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from './cn'

export interface TabItem<T extends string> {
  value: T
  label: ReactNode
  icon?: ReactNode
  badge?: ReactNode
  disabled?: boolean
}

export interface TabsProps<T extends string> {
  items: ReadonlyArray<TabItem<T>>
  value: T
  onChange: (value: T) => void
  /** Accessible name for the tab list. */
  label: string
  /** Share this with `TabPanel` so `aria-controls` / `aria-labelledby` match. */
  idPrefix?: string
  variant?: 'underline' | 'pill'
  className?: string
}

const tabId = (prefix: string, value: string): string => `${prefix}-tab-${value}`
const panelId = (prefix: string, value: string): string => `${prefix}-panel-${value}`

/**
 * Tabs with roving tabindex and automatic activation (arrows change selection,
 * as recommended by the ARIA APG for cheap panels).
 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  idPrefix,
  variant = 'underline',
  className,
}: TabsProps<T>): ReactNode {
  const autoId = useId()
  const prefix = idPrefix ?? autoId
  const listRef = useRef<HTMLDivElement | null>(null)

  const select = (next: T): void => {
    onChange(next)
    listRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${next}"]`)?.focus()
  }

  const move = (direction: 1 | -1): void => {
    const enabled = items.filter((item) => !item.disabled)
    if (enabled.length === 0) return
    const index = enabled.findIndex((item) => item.value === value)
    const next = enabled[(index + direction + enabled.length) % enabled.length]!
    select(next.value)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault()
        move(1)
        break
      case 'ArrowLeft':
        event.preventDefault()
        move(-1)
        break
      case 'Home': {
        event.preventDefault()
        const first = items.find((item) => !item.disabled)
        if (first) select(first.value)
        break
      }
      case 'End': {
        event.preventDefault()
        const last = [...items].reverse().find((item) => !item.disabled)
        if (last) select(last.value)
        break
      }
      default:
        break
    }
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
      className={cn(
        'flex items-center gap-1',
        variant === 'underline'
          ? 'border-b border-nq-border'
          : 'w-fit rounded-nq-md border border-nq-border bg-nq-surface-sunken p-0.5',
        className
      )}
    >
      {items.map((item) => {
        const selected = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            id={tabId(prefix, item.value)}
            aria-selected={selected}
            aria-controls={panelId(prefix, item.value)}
            data-tab={item.value}
            disabled={item.disabled}
            tabIndex={selected ? 0 : -1}
            onClick={() => select(item.value)}
            className={cn(
              'nq-focusable relative inline-flex items-center gap-1.5 whitespace-nowrap font-semibold',
              'transition-[color,background-color,box-shadow] duration-[var(--nq-motion-fast)] ease-nq',
              'disabled:pointer-events-none disabled:opacity-[var(--nq-opacity-disabled)]',
              variant === 'underline'
                ? cn(
                    '-mb-px h-9 rounded-none border-b-2 px-2.5 text-nq-sm',
                    selected
                      ? 'border-nq-primary text-nq-text'
                      : 'border-transparent text-nq-text-secondary hover:border-nq-border-strong hover:text-nq-text'
                  )
                : cn(
                    'h-[26px] rounded-nq-sm px-3 text-nq-xs',
                    selected
                      ? 'bg-nq-surface-raised text-nq-text shadow-nq-sm'
                      : 'text-nq-text-secondary hover:text-nq-text'
                  )
            )}
          >
            {item.icon ? (
              <span aria-hidden="true" className="flex items-center">
                {item.icon}
              </span>
            ) : null}
            {item.label}
            {item.badge ? <span className="ml-0.5">{item.badge}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

export interface TabPanelProps {
  /** Same prefix given to `Tabs`. */
  idPrefix: string
  /** This panel's tab value. */
  value: string
  activeValue: string
  className?: string
  children: ReactNode
}

export function TabPanel({ idPrefix, value, activeValue, className, children }: TabPanelProps): ReactNode {
  if (value !== activeValue) return null
  return (
    <div
      role="tabpanel"
      id={panelId(idPrefix, value)}
      aria-labelledby={tabId(idPrefix, value)}
      tabIndex={0}
      className={cn('nq-focusable rounded-nq-md outline-none', className)}
    >
      {children}
    </div>
  )
}
