import type { ComponentPropsWithRef, ReactNode } from 'react'
import { cn } from './cn'
import { Spinner } from './Spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Shows a spinner, blocks activation and sets `aria-busy`. Focus is kept. */
  loading?: boolean
  /** Optional leading glyph slot (16–18px icon). */
  leftIcon?: ReactNode
  /** Optional trailing glyph slot (16–18px icon). */
  rightIcon?: ReactNode
  fullWidth?: boolean
}

const BASE =
  'nq-focusable relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap ' +
  'rounded-nq-md font-semibold tracking-[-0.005em] ' +
  'transition-[background-color,border-color,color,box-shadow,scale] duration-[var(--nq-motion-fast)] ease-nq ' +
  'active:scale-[0.99] disabled:pointer-events-none disabled:opacity-[var(--nq-opacity-disabled)]'

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-nq-primary text-nq-primary-contrast shadow-nq-sm hover:bg-nq-primary-hover active:bg-nq-primary-active',
  secondary:
    'border border-nq-border-strong bg-nq-surface-raised text-nq-text shadow-nq-sm ' +
    'hover:border-nq-border-strong hover:bg-nq-surface-hover active:bg-nq-surface-sunken',
  ghost:
    'bg-transparent text-nq-text-secondary hover:bg-nq-surface-hover hover:text-nq-text active:bg-nq-surface-sunken',
  danger:
    'bg-nq-danger text-nq-danger-contrast shadow-nq-sm hover:bg-nq-danger-hover active:bg-nq-danger-hover',
}

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-[var(--nq-control-sm)] gap-1.5 px-3 text-nq-sm',
  md: 'h-[var(--nq-control-md)] px-4 text-nq-md',
  lg: 'h-[var(--nq-control-lg)] px-5 text-nq-base',
}

/**
 * The single action primitive. Four variants only:
 *   primary   — one per view (the decision the screen is asking for)
 *   secondary — supporting actions on neutral surfaces
 *   ghost     — low-emphasis / chrome actions
 *   danger    — destructive, never the default action
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  children,
  disabled,
  onClick,
  type = 'button',
  ...rest
}: ButtonProps): ReactNode {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      aria-busy={loading || undefined}
      data-loading={loading ? 'true' : undefined}
      onClick={loading ? undefined : onClick}
      className={cn(BASE, VARIANT[variant], SIZE[size], fullWidth && 'w-full', className)}
    >
      {loading ? <Spinner size={size === 'lg' ? 'md' : 'sm'} /> : leftIcon}
      {children}
      {rightIcon}
    </button>
  )
}
