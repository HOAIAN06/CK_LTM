import type { ComponentPropsWithRef, ReactNode } from 'react'
import { cn } from '../ui/cn'

export interface AppHeaderProps extends ComponentPropsWithRef<'div'> {
  left?: ReactNode
  center?: ReactNode
  right?: ReactNode
  /** Sticks to the top of the scrolling content region. */
  sticky?: boolean
  /** Hairline at the bottom; disable when the header floats over a hero. */
  bordered?: boolean
  /** Use the glass material (only over scrolling content, never over media). */
  material?: boolean
}

/**
 * In-content application bar: filters, search, mode switches, secondary
 * actions. Sits *below* the title bar and is deliberately quieter than
 * `PageHeader` so a screen never has two competing titles.
 */
export function AppHeader({
  left,
  center,
  right,
  sticky = false,
  bordered = true,
  material = false,
  className,
  children,
  ...rest
}: AppHeaderProps): ReactNode {
  return (
    <div
      {...rest}
      className={cn(
        'flex min-h-12 flex-wrap items-center gap-3 py-2',
        bordered && 'border-b border-nq-border-subtle',
        sticky && 'sticky top-0',
        material ? 'nq-glass' : 'bg-nq-bg',
        className
      )}
      style={sticky ? { zIndex: 'var(--nq-z-sticky)' } : undefined}
    >
      {left ? <div className="flex min-w-0 items-center gap-2">{left}</div> : null}
      {center ? <div className="flex flex-1 items-center justify-center gap-2">{center}</div> : null}
      <div className="ml-auto flex items-center gap-2">{right}</div>
      {children}
    </div>
  )
}

export interface PageHeaderProps {
  /** Breadcrumb-ish context: "Phòng Quiz · Sảnh chờ". */
  eyebrow?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  /** Right-aligned primary actions. Keep to one primary + two secondary. */
  actions?: ReactNode
  /** Chips or key metrics that qualify the title. */
  meta?: ReactNode
  /** `compact` for sub-pages inside a flow (lobby, editor). */
  size?: 'default' | 'compact'
  className?: string
}

/**
 * The one heading block per screen. Title is a real `h1`; the subtitle carries
 * the "why", never a repeat of the title.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  meta,
  size = 'default',
  className,
}: PageHeaderProps): ReactNode {
  return (
    <div className={cn('flex flex-wrap items-start gap-4', size === 'default' ? 'pb-6' : 'pb-4', className)}>
      <div className="min-w-0 flex-1">
        {eyebrow ? <p className="nq-caps mb-1.5">{eyebrow}</p> : null}
        <h1
          className={cn(
            'nq-display nq-balance text-nq-text',
            size === 'default' ? 'text-nq-3xl' : 'text-nq-2xl'
          )}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="nq-pretty mt-2 max-w-[68ch] text-nq-base leading-normal text-nq-text-secondary">
            {subtitle}
          </p>
        ) : null}
        {meta ? <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
