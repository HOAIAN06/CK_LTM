import type { ComponentPropsWithRef, ReactNode } from 'react'
import { cn } from './cn'
import { Spinner } from './Spinner'

export type IconButtonVariant = 'ghost' | 'secondary' | 'primary' | 'danger'
export type IconButtonSize = 'sm' | 'md' | 'lg'

export interface IconButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'children' | 'aria-label'> {
  /**
   * Accessible name. Required — an icon alone is never self-describing.
   * Rendered as `aria-label`, never as a native `title` tooltip.
   */
  label: string
  variant?: IconButtonVariant
  size?: IconButtonSize
  /** Renders the glyph; keep it at 16px (sm/md) or 18px (lg). */
  icon: ReactNode
  loading?: boolean
  /** Toggle semantics (`aria-pressed`) — e.g. mute, collapse, favourite. */
  pressed?: boolean
}

const BASE =
  'nq-focusable inline-grid shrink-0 place-items-center rounded-nq-sm ' +
  'transition-[background-color,border-color,color,box-shadow,scale] duration-[var(--nq-motion-fast)] ease-nq ' +
  'active:scale-95 disabled:pointer-events-none disabled:opacity-[var(--nq-opacity-disabled)]'

const VARIANT: Record<IconButtonVariant, string> = {
  ghost: 'text-nq-text-secondary hover:bg-nq-surface-hover hover:text-nq-text active:bg-nq-surface-sunken',
  secondary:
    'border border-nq-border bg-nq-surface-raised text-nq-text-secondary shadow-nq-sm ' +
    'hover:border-nq-border-strong hover:text-nq-text active:bg-nq-surface-hover',
  primary: 'bg-nq-primary text-nq-primary-contrast shadow-nq-sm hover:bg-nq-primary-hover',
  danger: 'text-nq-danger hover:bg-nq-danger-soft active:bg-nq-danger-soft',
}

const SIZE: Record<IconButtonSize, string> = {
  sm: 'size-7 rounded-nq-sm',
  md: 'size-[34px]',
  lg: 'size-[42px] rounded-nq-md',
}

export function IconButton({
  label,
  variant = 'ghost',
  size = 'md',
  icon,
  loading = false,
  pressed,
  className,
  disabled,
  onClick,
  type = 'button',
  ...rest
}: IconButtonProps): ReactNode {
  return (
    <button
      {...rest}
      type={type}
      aria-label={label}
      aria-pressed={pressed}
      aria-busy={loading || undefined}
      disabled={disabled}
      onClick={loading ? undefined : onClick}
      className={cn(BASE, VARIANT[variant], SIZE[size], className)}
    >
      {loading ? <Spinner size="sm" /> : icon}
    </button>
  )
}
