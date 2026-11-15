import type { ComponentPropsWithRef, ReactNode } from 'react'
import { cn } from './cn'

export type CardTone = 'default' | 'sunken' | 'raised' | 'plain'
export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

export interface CardProps extends ComponentPropsWithRef<'div'> {
  /**
   * Padding of the card box itself. **Default `none`**, because the composed
   * pattern (`Card` + `CardHeader/Body/Footer`) makes each section own its
   * insets — that is what keeps `<Card><CardBody className="p-4" /></Card>`
   * predictable instead of stacking the card's 20px with the body's 16px.
   *
   * Only set `padding` when the card holds **raw content** (no section
   * components). Mixing `padding` with sections doubles the inset.
   */
  padding?: CardPadding
  tone?: CardTone
  /** Adds a hover lift for cards that are themselves interactive. */
  interactive?: boolean
  /** Draws a 3px accent rule at the top edge — one focal point per card. */
  accent?: 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info'
}

const TONE: Record<CardTone, string> = {
  default: 'bg-nq-surface border border-nq-border',
  sunken: 'bg-nq-surface-sunken border border-nq-border-subtle',
  raised: 'bg-nq-surface-raised border border-nq-border shadow-nq-md',
  plain: 'bg-transparent border border-transparent',
}

const PADDING: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
}

const ACCENT: Record<NonNullable<CardProps['accent']>, string> = {
  primary: 'before:bg-nq-primary',
  accent: 'before:bg-nq-accent',
  success: 'before:bg-nq-success',
  warning: 'before:bg-nq-warning',
  danger: 'before:bg-nq-danger',
  info: 'before:bg-nq-info',
}

/**
 * Surface container. Radii are fixed at `lg` (14px) — cards never borrow the
 * dialog radius, so the hierarchy of surfaces stays readable.
 *
 * Composition contract (see docs/desktop/design-system.md §"Card"):
 *   - sections own the padding → `<Card><CardHeader/><CardBody/></Card>`
 *   - raw content owns nothing → `<Card padding="md">…</Card>`
 * Never both.
 */
export function Card({
  padding = 'none',
  tone = 'default',
  interactive = false,
  accent,
  className,
  children,
  ...rest
}: CardProps): ReactNode {
  return (
    <div
      {...rest}
      className={cn(
        'relative flex flex-col overflow-hidden rounded-nq-lg',
        TONE[tone],
        PADDING[padding],
        accent &&
          cn(
            'before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:rounded-t-nq-lg',
            ACCENT[accent]
          ),
        interactive &&
          'nq-motion-lift transition-[transform,box-shadow,border-color] duration-[var(--nq-motion-base)] ease-nq hover:-translate-y-px hover:border-nq-border-strong hover:shadow-nq-md',
        className
      )}
    >
      {children}
    </div>
  )
}

export interface CardHeaderProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  title: ReactNode
  description?: ReactNode
  /** Right-aligned slot: badge, icon button, secondary action. */
  action?: ReactNode
  /** Optional glyph rendered in a token tile before the title. */
  icon?: ReactNode
  /** Eyebrow above the title (uppercase, 11px). */
  eyebrow?: ReactNode
}

export function CardHeader({
  title,
  description,
  action,
  icon,
  eyebrow,
  className,
  children,
  ...rest
}: CardHeaderProps): ReactNode {
  return (
    <div
      {...rest}
      /* Wraps instead of crushing the title: in a narrow card (grid tile, rail)
         the action drops to its own right-aligned line rather than squeezing
         the heading into one word per line. */
      className={cn('flex flex-wrap items-start gap-x-3 gap-y-2 px-5 pt-5 last:pb-5', className)}
    >
      {icon ? (
        <span className="grid size-9 shrink-0 place-items-center rounded-nq-md bg-nq-primary-soft text-nq-primary-soft-text">
          {icon}
        </span>
      ) : null}
      <div className="min-w-[9rem] flex-1">
        {eyebrow ? <p className="nq-caps mb-1">{eyebrow}</p> : null}
        <h3 className="nq-display text-nq-lg leading-snug text-nq-text">{title}</h3>
        {description ? (
          <p className="nq-pretty mt-1 text-nq-sm leading-normal text-nq-text-secondary">{description}</p>
        ) : null}
        {children}
      </div>
      {action ? <div className="ml-auto flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  )
}

export function CardBody({ className, children, ...rest }: ComponentPropsWithRef<'div'>): ReactNode {
  return (
    <div
      {...rest}
      // Bottom padding is the minimum gap to a following footer; `last:pb-5`
      // balances a card that ends with body text.
      className={cn(
        'px-5 pt-4 pb-4 text-nq-sm leading-normal text-nq-text-secondary last:pb-5 first:pt-5',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...rest }: ComponentPropsWithRef<'div'>): ReactNode {
  return (
    <div
      {...rest}
      // `mt-auto` pins the footer to the bottom of a stretched card (grid rows)
      // so a short card does not leave dead space underneath the actions.
      className={cn(
        'mt-auto flex flex-wrap items-center gap-2 border-t border-nq-border-subtle px-5 pt-4 pb-5',
        // A footer as the only child keeps the card optically balanced.
        'first:mt-0 first:border-t-0 first:pt-0',
        className
      )}
    >
      {children}
    </div>
  )
}
