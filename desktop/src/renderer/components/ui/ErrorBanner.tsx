import type { ReactNode } from 'react'
import { cn } from './cn'
import { Info, TriangleAlert, X } from './icons'
import { Button } from './Button'
import { IconButton } from './IconButton'

export type BannerTone = 'danger' | 'warning' | 'info' | 'success'

export interface ErrorBannerProps {
  tone?: BannerTone
  title: ReactNode
  /** Explanation + the next step. Never a bare code. */
  description?: ReactNode
  /** Retry / reconnect affordance. */
  onRetry?: () => void
  retryLabel?: string
  onDismiss?: () => void
  className?: string
}

const TONE: Record<BannerTone, { frame: string; glyph: string }> = {
  danger: { frame: 'bg-nq-danger-soft border-nq-danger-border text-nq-danger', glyph: 'text-nq-danger' },
  warning: { frame: 'bg-nq-warning-soft border-nq-warning-border text-nq-warning', glyph: 'text-nq-warning' },
  info: { frame: 'bg-nq-info-soft border-nq-info-border text-nq-info', glyph: 'text-nq-info' },
  success: { frame: 'bg-nq-success-soft border-nq-success-border text-nq-success', glyph: 'text-nq-success' },
}

/**
 * Inline problem banner. Rendered with `role="alert"` for errors (assertive on
 * purpose: a failed connection must interrupt) and `role="status"` otherwise.
 * Colours are always paired with an icon and text.
 */
export function ErrorBanner({
  tone = 'danger',
  title,
  description,
  onRetry,
  retryLabel = 'Thử lại',
  onDismiss,
  className,
}: ErrorBannerProps): ReactNode {
  const isAlert = tone === 'danger'
  const glyph = tone === 'info' || tone === 'success' ? <Info size={18} /> : <TriangleAlert size={18} />

  return (
    <div
      role={isAlert ? 'alert' : 'status'}
      aria-live={isAlert ? 'assertive' : 'polite'}
      className={cn('flex items-start gap-3 rounded-nq-md border px-3.5 py-3', TONE[tone].frame, className)}
    >
      <span aria-hidden="true" className={cn('mt-px shrink-0', TONE[tone].glyph)}>
        {glyph}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-nq-sm font-semibold leading-snug">{title}</p>
        {description ? (
          <p className="mt-1 text-nq-xs leading-normal opacity-90 nq-pretty">{description}</p>
        ) : null}
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry} className="shrink-0">
          {retryLabel}
        </Button>
      ) : null}
      {onDismiss ? (
        <IconButton label="Đóng thông báo" size="sm" icon={<X size={14} />} onClick={onDismiss} className="shrink-0" />
      ) : null}
    </div>
  )
}
