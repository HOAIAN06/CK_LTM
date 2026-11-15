import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../ui/cn'
import { Avatar } from '../ui/Avatar'
import { IconButton } from '../ui/IconButton'
import { Tooltip } from '../ui/Tooltip'
import { ChevronLeft, ChevronRight, LogOut } from '../ui/icons'

export interface NavItem {
  id: string
  label: string
  icon?: ReactNode
  /** Small count/state chip at the trailing edge. Hidden in the icon rail. */
  badge?: ReactNode
  /** Section header rendered before the item when it changes. */
  group?: string
  disabled?: boolean
}

export interface SidebarUser {
  name: string
  /** Secondary line, e.g. rank or "1 240 điểm". */
  meta?: ReactNode
  avatarSrc?: string | null
  status?: 'online' | 'busy' | 'away' | 'offline'
}

export interface AppSidebarProps {
  items: ReadonlyArray<NavItem>
  activeId: string
  onNavigate: (id: string) => void
  /** Controlled collapse. Leave undefined to let the sidebar manage it. */
  collapsed?: boolean
  defaultCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  /** Hides the collapse toggle (e.g. on very narrow windows). */
  hideCollapseToggle?: boolean
  brand?: ReactNode
  user?: SidebarUser
  onLogout?: () => void
  logoutLabel?: string
  /** Accessible name of the navigation landmark. */
  navLabel?: string
  className?: string
}

/**
 * Primary navigation rail.
 *
 * - 248px expanded / 72px icon rail, both from layout tokens.
 * - One tab stop, arrow keys walk the list (roving tabindex, ARIA `nav` +
 *   `aria-current="page"`), labels become tooltips when collapsed.
 * - The active item is marked by a bar, a soft fill **and** `aria-current`.
 */
export function AppSidebar({
  items,
  activeId,
  onNavigate,
  collapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  hideCollapseToggle = false,
  brand,
  user,
  onLogout,
  logoutLabel = 'Đăng xuất',
  navLabel = 'Điều hướng chính',
  className,
}: AppSidebarProps): ReactNode {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed)
  const isControlled = collapsed !== undefined
  const isCollapsed = isControlled ? collapsed : internalCollapsed

  const navRef = useRef<HTMLElement | null>(null)
  const [focusIndex, setFocusIndex] = useState(() => {
    const index = items.findIndex((item) => item.id === activeId)
    return index >= 0 ? index : 0
  })

  const setCollapsed = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalCollapsed(next)
      onCollapsedChange?.(next)
    },
    [isControlled, onCollapsedChange]
  )

  useEffect(() => {
    const index = items.findIndex((item) => item.id === activeId)
    if (index >= 0) setFocusIndex(index)
  }, [activeId, items])

  const focusItem = (index: number): void => {
    const enabled = items.map((item, position) => ({ item, position })).filter(({ item }) => !item.disabled)
    if (enabled.length === 0) return
    const wrapped = ((index % enabled.length) + enabled.length) % enabled.length
    const target = enabled[wrapped]!
    setFocusIndex(target.position)
    const node = navRef.current?.querySelector<HTMLButtonElement>(`[data-nav="${target.item.id}"]`)
    node?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    const currentIndex = focusIndex
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusItem(currentIndex + 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        focusItem(currentIndex - 1)
        break
      case 'Home':
        event.preventDefault()
        focusItem(0)
        break
      case 'End':
        event.preventDefault()
        focusItem(items.length - 1)
        break
      case 'ArrowLeft':
        if (!isCollapsed) {
          event.preventDefault()
          setCollapsed(true)
        }
        break
      case 'ArrowRight':
        if (isCollapsed) {
          event.preventDefault()
          setCollapsed(false)
        }
        break
      default:
        break
    }
  }

  const renderBrand = (): ReactNode =>
    brand ?? (
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-nq-md bg-nq-primary font-jp text-nq-lg font-semibold text-nq-primary-contrast shadow-nq-sm"
        >
          語
        </span>
        {!isCollapsed ? (
          <span className="min-w-0">
            <span className="nq-display block truncate text-nq-md leading-tight text-nq-text">NihongoQuest</span>
            <span className="nq-caps mt-0.5 block truncate text-[9px]">Học · Thi đấu · Tiến bộ</span>
          </span>
        ) : null}
      </div>
    )

  let lastGroup: string | undefined

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-nq-border bg-nq-surface',
        'transition-[width] duration-[var(--nq-motion-base)] ease-nq',
        className
      )}
      style={{ width: isCollapsed ? 'var(--nq-sidebar-collapsed-width)' : 'var(--nq-sidebar-width)' }}
      data-collapsed={isCollapsed ? 'true' : 'false'}
    >
      <div className={cn('flex h-14 shrink-0 items-center gap-2', isCollapsed ? 'justify-center px-2' : 'px-3')}>
        {renderBrand()}
        {!hideCollapseToggle && !isCollapsed ? (
          <IconButton
            label="Thu gọn thanh điều hướng"
            size="sm"
            icon={<ChevronLeft size={16} />}
            aria-expanded={!isCollapsed}
            onClick={() => setCollapsed(true)}
            className="ml-auto"
          />
        ) : null}
      </div>

      {hideCollapseToggle ? null : isCollapsed ? (
        <div className="flex justify-center pb-1">
          <IconButton
            label="Mở rộng thanh điều hướng"
            size="sm"
            icon={<ChevronRight size={16} />}
            aria-expanded={false}
            onClick={() => setCollapsed(false)}
          />
        </div>
      ) : null}

      <nav
        ref={navRef}
        aria-label={navLabel}
        onKeyDown={onKeyDown}
        className="nq-scroll min-h-0 flex-1 px-2 pb-2"
      >
        <ul className="flex flex-col gap-0.5">
          {items.map((item, index) => {
            const showGroup = item.group !== undefined && item.group !== lastGroup
            lastGroup = item.group ?? lastGroup
            const isActive = item.id === activeId
            const collapsedButton = cn(
              'relative grid size-10 place-items-center rounded-nq-md transition-colors duration-[var(--nq-motion-fast)] ease-nq',
              isActive
                ? 'bg-nq-primary-soft text-nq-primary-soft-text'
                : 'text-nq-text-secondary hover:bg-nq-surface-hover hover:text-nq-text',
              item.disabled && 'pointer-events-none opacity-[var(--nq-opacity-disabled)]'
            )
            const expandedButton = cn(
              'relative flex h-9 w-full items-center gap-2.5 rounded-nq-md px-2.5 text-left text-nq-sm transition-colors duration-[var(--nq-motion-fast)] ease-nq',
              isActive
                ? 'bg-nq-primary-soft font-semibold text-nq-primary-soft-text'
                : 'font-medium text-nq-text-secondary hover:bg-nq-surface-hover hover:text-nq-text',
              item.disabled && 'pointer-events-none opacity-[var(--nq-opacity-disabled)]'
            )

            const button = (
              <button
                type="button"
                data-nav={item.id}
                aria-current={isActive ? 'page' : undefined}
                aria-label={isCollapsed ? item.label : undefined}
                tabIndex={index === focusIndex ? 0 : -1}
                disabled={item.disabled}
                onFocus={() => setFocusIndex(index)}
                onClick={() => onNavigate(item.id)}
                className={cn('nq-focusable', isCollapsed ? collapsedButton : expandedButton)}
              >
                {isActive ? (
                  <span
                    aria-hidden="true"
                    className="absolute top-1/2 left-0 h-4 w-[3px] -translate-y-1/2 rounded-nq-full bg-nq-primary"
                  />
                ) : null}
                {item.icon ? (
                  <span aria-hidden="true" className="grid size-[18px] shrink-0 place-items-center">
                    {item.icon}
                  </span>
                ) : null}
                {isCollapsed ? null : <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                {!isCollapsed && item.badge ? <span className="shrink-0">{item.badge}</span> : null}
                {isCollapsed ? <span className="nq-sr-only">{item.label}</span> : null}
              </button>
            )

            return (
              <li key={item.id}>
                {showGroup && !isCollapsed ? (
                  <p className="nq-caps mt-3 mb-1 px-2.5">{item.group}</p>
                ) : showGroup && isCollapsed ? (
                  <div className="mx-2 my-2 border-t border-nq-border-subtle" role="presentation" />
                ) : null}
                {isCollapsed ? (
                  <div className="flex justify-center">
                    <Tooltip content={item.label} placement="right">
                      {button}
                    </Tooltip>
                  </div>
                ) : (
                  button
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      <div className={cn('shrink-0 border-t border-nq-border-subtle py-2.5', isCollapsed ? 'px-2' : 'px-2.5')}>
        {user ? (
          <div className={cn('flex items-center gap-2', isCollapsed && 'justify-center')}>
            <Avatar name={user.name} src={user.avatarSrc} size={isCollapsed ? 'sm' : 'md'} status={user.status} />
            {!isCollapsed ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-nq-sm font-semibold text-nq-text">{user.name}</p>
                {user.meta ? (
                  <p className="nq-tabular truncate text-nq-2xs text-nq-text-tertiary">{user.meta}</p>
                ) : null}
              </div>
            ) : null}
            {onLogout ? (
              isCollapsed ? null : (
                <Tooltip content={logoutLabel}>
                  <IconButton label={logoutLabel} size="sm" icon={<LogOut size={15} />} onClick={onLogout} />
                </Tooltip>
              )
            ) : null}
          </div>
        ) : null}
        {user && isCollapsed && onLogout ? (
          <div className="mt-1 flex justify-center">
            <Tooltip content={logoutLabel} placement="right">
              <IconButton label={logoutLabel} size="sm" icon={<LogOut size={15} />} onClick={onLogout} />
            </Tooltip>
          </div>
        ) : null}
      </div>
    </aside>
  )
}
