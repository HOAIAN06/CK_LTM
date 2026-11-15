import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../ui/cn'
import { Portal } from '../ui/Portal'
import { Kbd } from '../ui/Kbd'
import { Search } from '../ui/icons'

export interface CommandItem {
  id: string
  label: string
  /** Secondary description, e.g. the screen the command opens. */
  hint?: string
  /** Section header, e.g. "Điều hướng". */
  group?: string
  icon?: ReactNode
  /** Extra searchable words (Vietnamese synonyms without diacritics work too). */
  keywords?: ReadonlyArray<string>
  shortcut?: ReadonlyArray<string>
  disabled?: boolean
  run: () => void
}

export interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  commands: ReadonlyArray<CommandItem>
  placeholder?: string
  emptyLabel?: string
  /** Shown at the bottom-right: how to open the palette. */
  triggerShortcut?: ReadonlyArray<string>
}

/** Diacritic-insensitive normalisation: "Bảng xếp hạng" ≈ "bang xep hang". */
export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

function scoreCommand(command: CommandItem, query: string): number {
  if (query.length === 0) return 1
  const haystack = normalizeSearch(
    [command.label, command.hint ?? '', ...(command.keywords ?? []), ...(command.shortcut ?? [])].join(' ')
  )

  if (haystack.startsWith(query)) return 100 - (haystack.length - query.length) * 0.01
  const direct = haystack.indexOf(query)
  if (direct >= 0) return 60 - direct * 0.1

  /* Subsequence fallback so "bxh" still finds "Bảng xếp hạng". */
  let position = 0
  let streak = 0
  let score = 0
  for (const character of query) {
    const found = haystack.indexOf(character, position)
    if (found === -1) return 0
    streak = found === position ? streak + 1 : 0
    score += 1 + streak * 0.5
    position = found + 1
  }
  return score * 0.4
}

/**
 * Cmd/Ctrl+K palette: a modal listbox with virtual focus.
 *
 * The owner supplies the command list and owns the open state — nothing here
 * knows about routes, sockets or business state. Typing filters with a
 * diacritic-insensitive fuzzy match so Vietnamese labels are findable without
 * accents, and commands are reported through `run()` only.
 */
export function CommandPalette({
  open,
  onOpenChange,
  commands,
  placeholder = 'Tìm màn hình, hành động hoặc người chơi…',
  emptyLabel = 'Không có kết quả phù hợp',
  triggerShortcut,
}: CommandPaletteProps): ReactNode {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const baseId = useId()
  const listId = `${baseId}-list`
  const optionId = (id: string): string => `${baseId}-option-${id}`

  const results = useMemo(() => {
    const normalized = normalizeSearch(query)
    return commands
      .map((command) => ({ command, score: command.disabled ? 0 : scoreCommand(command, normalized) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.command)
  }, [commands, query])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setActiveIndex(0)
      return
    }
    const previouslyFocused = document.activeElement as HTMLElement | null
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => {
      window.cancelAnimationFrame(frame)
      previouslyFocused?.focus?.()
    }
  }, [open])

  useEffect(() => {
    setActiveIndex((current) => (results.length === 0 ? 0 : Math.min(current, results.length - 1)))
  }, [results.length])

  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    active?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (!open) return null

  const runActive = (): void => {
    const command = results[activeIndex]
    if (!command || command.disabled) return
    onOpenChange(false)
    command.run()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((current) => (results.length === 0 ? 0 : (current + 1) % results.length))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((current) => (results.length === 0 ? 0 : (current - 1 + results.length) % results.length))
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(Math.max(results.length - 1, 0))
        break
      case 'Enter':
        event.preventDefault()
        runActive()
        break
      case 'Escape':
        event.preventDefault()
        onOpenChange(false)
        break
      case 'Tab':
        /* Virtual focus: the list never takes real focus, so keep the caret in
           the input instead of letting Tab escape behind the scrim. */
        event.preventDefault()
        break
      default:
        break
    }
  }

  let lastGroup: string | undefined

  return (
    <Portal>
      <div className="fixed inset-0 flex items-start justify-center px-6 pt-[12vh]" style={{ zIndex: 'var(--nq-z-dialog)' }}>
        <div
          className="nq-scrim-enter absolute inset-0 bg-nq-scrim"
          onClick={() => onOpenChange(false)}
          aria-hidden="true"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Bảng lệnh"
          className="nq-dialog-enter relative flex w-full max-w-[560px] flex-col overflow-hidden rounded-nq-xl border border-nq-border bg-nq-surface-overlay shadow-nq-xl"
        >
          <div className="flex items-center gap-2.5 border-b border-nq-border-subtle px-4">
            <Search aria-hidden="true" size={17} className="shrink-0 text-nq-text-tertiary" />
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={results[activeIndex] ? optionId(results[activeIndex]!.id) : undefined}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActiveIndex(0)
              }}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              aria-label={placeholder}
              className="h-12 w-full bg-transparent text-nq-md text-nq-text placeholder:text-nq-text-tertiary focus:outline-none"
            />
            <Kbd size="sm">Esc</Kbd>
          </div>

          <div ref={listRef} className="nq-scroll max-h-[52vh] min-h-0 overflow-y-auto p-2" id={listId} role="listbox">
            {results.length === 0 ? (
              <p className="px-3 py-8 text-center text-nq-sm text-nq-text-secondary">{emptyLabel}</p>
            ) : (
              results.map((command, index) => {
                const showGroup = command.group !== undefined && command.group !== lastGroup
                lastGroup = command.group ?? lastGroup
                const isActive = index === activeIndex
                return (
                  <div key={command.id}>
                    {showGroup ? <p className="nq-caps px-2.5 pt-3 pb-1">{command.group}</p> : null}
                    <div
                      id={optionId(command.id)}
                      role="option"
                      aria-selected={isActive}
                      aria-disabled={command.disabled || undefined}
                      data-active={isActive ? 'true' : undefined}
                      onMouseMove={() => setActiveIndex(index)}
                      onClick={() => {
                        if (command.disabled) return
                        onOpenChange(false)
                        command.run()
                      }}
                      className={cn(
                        'flex cursor-default items-center gap-2.5 rounded-nq-md px-2.5 py-2 text-nq-sm',
                        isActive ? 'bg-nq-primary-soft text-nq-primary-soft-text' : 'text-nq-text',
                        command.disabled && 'opacity-[var(--nq-opacity-disabled)]'
                      )}
                    >
                      {command.icon ? (
                        <span aria-hidden="true" className="grid size-[18px] shrink-0 place-items-center opacity-80">
                          {command.icon}
                        </span>
                      ) : null}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{command.label}</span>
                        {command.hint ? (
                          <span className="block truncate text-nq-xs text-nq-text-tertiary">{command.hint}</span>
                        ) : null}
                      </span>
                      {command.shortcut ? (
                        <span className="flex shrink-0 items-center gap-1">
                          {command.shortcut.map((key) => (
                            <Kbd key={key} size="sm">
                              {key}
                            </Kbd>
                          ))}
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-nq-border-subtle bg-nq-surface-raised px-4 py-2">
            <span className="text-nq-2xs text-nq-text-tertiary">
              <Kbd size="sm">↑</Kbd> <Kbd size="sm">↓</Kbd> để chọn · <Kbd size="sm">Enter</Kbd> để mở
            </span>
            {triggerShortcut ? (
              <span className="flex items-center gap-1 text-nq-2xs text-nq-text-tertiary">
                Mở bằng
                {triggerShortcut.map((key) => (
                  <Kbd key={key} size="sm">
                    {key}
                  </Kbd>
                ))}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Portal>
  )
}
