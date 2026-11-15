import type { ReactNode } from 'react'
import { cn } from '../ui/cn'
import { IconButton } from '../ui/IconButton'
import { Tooltip } from '../ui/Tooltip'
import { Minus, Moon, Square, Sun, X } from '../ui/icons'

/** Mirrors `ConnectionState` from the IPC contract (main is the source of truth). */
export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

export type ThemeChoice = 'light' | 'dark' | 'system'

export interface AppTitleBarProps {
  /** App name shown at the left, next to the sidebar toggle. */
  appName?: string
  /** Current screen context, e.g. "Đấu hạng 1v1". Hidden under 1100px. */
  context?: ReactNode
  connection?: { state: ConnectionState; detail?: string }
  theme?: ThemeChoice
  onThemeChange?: (theme: ThemeChoice) => void
  /** Slot for a custom control group between the context and the status area. */
  centerSlot?: ReactNode
  leftSlot?: ReactNode
  rightSlot?: ReactNode
  onMinimize?: () => void
  onMaximize?: () => void
  onClose?: () => void
  /**
   * Reserve the strip that the OS draws native window controls into
   * (Electron `titleBarOverlay`, ≈ `--nq-titlebar-controls-width`).
   *
   * Default: **true when the app does not draw its own controls** (i.e. no
   * `onMinimize/onMaximize/onClose`). Pass `false` on macOS, where traffic
   * lights sit on the left and no overlay is used.
   */
  reserveWindowControls?: boolean
  className?: string
}

const CONNECTION: Record<ConnectionState, { label: string; dot: string; text: string }> = {
  idle: { label: 'Chưa kết nối', dot: 'bg-nq-text-tertiary', text: 'text-nq-text-tertiary' },
  connecting: { label: 'Đang kết nối', dot: 'bg-nq-warning animate-pulse', text: 'text-nq-warning' },
  connected: { label: 'Đã kết nối', dot: 'bg-nq-success', text: 'text-nq-success' },
  disconnected: { label: 'Mất kết nối', dot: 'bg-nq-danger', text: 'text-nq-danger' },
  error: { label: 'Lỗi kết nối', dot: 'bg-nq-danger', text: 'text-nq-danger' },
}

/**
 * Frameless window title bar.
 *
 * The whole strip is a drag region; every interactive child is `no-drag` via
 * the base layer, so buttons keep receiving clicks. Window chrome actions are
 * optional callbacks — the shell stays free of IPC knowledge.
 */
export function AppTitleBar({
  appName = 'NihongoQuest',
  context,
  connection,
  theme = 'system',
  onThemeChange,
  centerSlot,
  leftSlot,
  rightSlot,
  onMinimize,
  onMaximize,
  onClose,
  reserveWindowControls,
  className,
}: AppTitleBarProps): ReactNode {
  const hasWindowControls = Boolean(onMinimize || onMaximize || onClose)
  const reserveControls = reserveWindowControls ?? !hasWindowControls
  const status = connection ? CONNECTION[connection.state] : null
  const nextTheme: ThemeChoice = theme === 'dark' ? 'light' : 'dark'
  const themeLabel = theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'

  return (
    <header
      className={cn(
        'nq-drag nq-glass relative flex h-[var(--nq-titlebar-height)] shrink-0 items-center gap-3 border-b border-nq-border-subtle px-3',
        className
      )}
      data-window-controls-reserve={reserveControls ? 'true' : 'false'}
      style={{
        zIndex: 'var(--nq-z-sticky)',
        /* Never hardcode the inset: the token documents where 138px comes from
           (Windows/Linux native overlay). Reset to 0 on macOS via the prop. */
        paddingInlineEnd: reserveControls ? 'var(--nq-titlebar-controls-width)' : undefined
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {leftSlot}
        <span className="truncate text-nq-xs font-semibold tracking-[0.02em] text-nq-text-secondary">
          {appName}
        </span>
        {context ? (
          <>
            <span aria-hidden="true" className="text-nq-text-tertiary">
              /
            </span>
            <span className="max-[1100px]:hidden truncate text-nq-xs text-nq-text-tertiary">{context}</span>
          </>
        ) : null}
      </div>

      <div className="flex items-center gap-1">{centerSlot}</div>

      <div className="flex flex-1 items-center justify-end gap-1.5">
        {status ? (
          <Tooltip
            placement="bottom"
            content={
              connection?.detail
                ? connection.detail
                : connection?.state === 'connected'
                  ? 'Kết nối tới máy chủ đang ổn định.'
                  : 'Máy chủ chưa sẵn sàng. Thử kết nối lại từ màn hình đăng nhập.'
            }
          >
            <span
              className={cn(
                'inline-flex h-6 items-center gap-1.5 rounded-nq-full border border-nq-border-subtle bg-nq-surface px-2 text-nq-2xs font-medium',
                status.text
              )}
            >
              <span aria-hidden="true" className={cn('size-1.5 rounded-nq-full', status.dot)} />
              <span className="max-[900px]:hidden">{status.label}</span>
              <span className="nq-sr-only">{status.label}</span>
            </span>
          </Tooltip>
        ) : null}

        {onThemeChange ? (
          <Tooltip content={themeLabel} placement="bottom">
            <IconButton
              label={themeLabel}
              size="sm"
              icon={theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              onClick={() => onThemeChange(nextTheme)}
            />
          </Tooltip>
        ) : null}

        {rightSlot}

        {hasWindowControls ? (
          <div className="ml-1 flex items-center">
            {onMinimize ? (
              <button
                type="button"
                onClick={onMinimize}
                aria-label="Thu nhỏ cửa sổ"
                className="nq-focusable grid h-7 w-9 place-items-center rounded-nq-xs text-nq-text-secondary transition-colors duration-[var(--nq-motion-fast)] hover:bg-nq-surface-hover hover:text-nq-text"
              >
                <Minus aria-hidden="true" size={14} />
              </button>
            ) : null}
            {onMaximize ? (
              <button
                type="button"
                onClick={onMaximize}
                aria-label="Phóng to hoặc thu hồi cửa sổ"
                className="nq-focusable grid h-7 w-9 place-items-center rounded-nq-xs text-nq-text-secondary transition-colors duration-[var(--nq-motion-fast)] hover:bg-nq-surface-hover hover:text-nq-text"
              >
                <Square aria-hidden="true" size={12} />
              </button>
            ) : null}
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng cửa sổ"
                className="nq-focusable grid h-7 w-9 place-items-center rounded-nq-xs text-nq-text-secondary transition-colors duration-[var(--nq-motion-fast)] hover:bg-nq-danger-soft hover:text-nq-danger"
              >
                <X aria-hidden="true" size={14} />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  )
}
