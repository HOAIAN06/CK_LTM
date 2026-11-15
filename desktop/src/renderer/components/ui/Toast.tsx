import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from './cn'
import { Portal } from './Portal'
import { Check, Info, TriangleAlert, X } from './icons'
import { IconButton } from './IconButton'

export type ToastTone = 'info' | 'success' | 'warning' | 'danger'

export interface ToastItem {
  id: string
  title: ReactNode
  description?: ReactNode
  tone?: ToastTone
  /** Milliseconds before auto-dismiss. `0` keeps the toast until dismissed. */
  duration?: number
  action?: { label: string; onClick: () => void }
}

const TONE: Record<ToastTone, { frame: string; glyph: ReactNode }> = {
  info: { frame: 'border-nq-info-border', glyph: <Info size={16} className="text-nq-info" /> },
  success: { frame: 'border-nq-success-border', glyph: <Check size={16} className="text-nq-success" /> },
  warning: { frame: 'border-nq-warning-border', glyph: <TriangleAlert size={16} className="text-nq-warning" /> },
  danger: { frame: 'border-nq-danger-border', glyph: <TriangleAlert size={16} className="text-nq-danger" /> },
}

/**
 * Toast queue state. Deliberately local (no store): toasts are ephemeral UI,
 * and the owning screen decides which business events deserve one.
 */
export function useToasts(): {
  toasts: ToastItem[]
  push: (toast: Omit<ToastItem, 'id'>) => string
  dismiss: (id: string) => void
  clear: () => void
} {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback((toast: Omit<ToastItem, 'id'>) => {
    counter.current += 1
    const id = `toast-${counter.current}`
    setToasts((current) => [...current, { ...toast, id }])
    return id
  }, [])

  const clear = useCallback(() => setToasts([]), [])

  return useMemo(() => ({ toasts, push, dismiss, clear }), [toasts, push, dismiss, clear])
}

interface ToastProps {
  toast: ToastItem
  onDismiss: (id: string) => void
}

function Toast({ toast, onDismiss }: ToastProps): ReactNode {
  const tone = toast.tone ?? 'info'
  const duration = toast.duration ?? 5000
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (duration <= 0 || paused) return
    const timer = window.setTimeout(() => onDismiss(toast.id), duration)
    return () => window.clearTimeout(timer)
  }, [duration, onDismiss, paused, toast.id])

  return (
    <div
      role="status"
      aria-live="polite"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      data-paused={paused ? 'true' : undefined}
      className={cn(
        'nq-toast-enter pointer-events-auto flex w-[min(380px,calc(100vw-48px))] items-start gap-3 rounded-nq-lg',
        'border bg-nq-surface-overlay px-3.5 py-3 shadow-nq-lg',
        TONE[tone].frame
      )}
    >
      <span aria-hidden="true" className="mt-0.5 shrink-0">
        {TONE[tone].glyph}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-nq-sm font-semibold leading-snug text-nq-text">{toast.title}</p>
        {toast.description ? (
          <p className="nq-pretty mt-0.5 text-nq-xs leading-normal text-nq-text-secondary">{toast.description}</p>
        ) : null}
        {toast.action ? (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick()
              onDismiss(toast.id)
            }}
            className="nq-focusable mt-2 rounded-nq-xs text-nq-xs font-semibold text-nq-link hover:underline"
          >
            {toast.action.label}
          </button>
        ) : null}
      </div>
      <IconButton label="Đóng thông báo" size="sm" icon={<X size={14} />} onClick={() => onDismiss(toast.id)} />
    </div>
  )
}

export interface ToastHostProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
  /** Only the newest N are rendered. */
  max?: number
  position?: 'bottom-right' | 'bottom-left' | 'top-center'
}

/**
 * Fixed toast viewport. Toasts live in one polite live region and pause on
 * hover, so a burst of events cannot swallow the message a user is reading.
 */
export function ToastHost({ toasts, onDismiss, max = 3, position = 'bottom-right' }: ToastHostProps): ReactNode {
  if (toasts.length === 0) return null
  const visible = toasts.slice(-max)

  return (
    <Portal>
      <div
        className={cn(
          'pointer-events-none fixed flex flex-col gap-2',
          position === 'bottom-right' && 'right-5 bottom-5',
          position === 'bottom-left' && 'bottom-5 left-5',
          position === 'top-center' && 'top-[calc(var(--nq-titlebar-height)+12px)] left-1/2 -translate-x-1/2 items-center'
        )}
        style={{ zIndex: 'var(--nq-z-toast)' }}
      >
        {visible.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </div>
    </Portal>
  )
}
