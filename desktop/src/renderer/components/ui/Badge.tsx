import type { ComponentPropsWithRef, ReactNode } from 'react'
import { cn } from './cn'

export type BadgeTone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info'
export type BadgeAppearance = 'soft' | 'solid' | 'outline'

export interface BadgeProps extends ComponentPropsWithRef<'span'> {
  tone?: BadgeTone
  appearance?: BadgeAppearance
  size?: 'sm' | 'md'
  /** Leading status dot — always paired with text, never colour alone. */
  dot?: boolean
}

const SOFT: Record<BadgeTone, string> = {
  neutral: 'bg-nq-surface-sunken text-nq-text-secondary border-nq-border-subtle',
  primary: 'bg-nq-primary-soft text-nq-primary-soft-text border-nq-primary-border',
  accent: 'bg-nq-accent-soft text-nq-accent-strong border-nq-accent-border',
  success: 'bg-nq-success-soft text-nq-success border-nq-success-border',
  warning: 'bg-nq-warning-soft text-nq-warning border-nq-warning-border',
  danger: 'bg-nq-danger-soft text-nq-danger border-nq-danger-border',
  info: 'bg-nq-info-soft text-nq-info border-nq-info-border',
}

const SOLID: Record<BadgeTone, string> = {
  neutral: 'bg-nq-text text-nq-text-inverse border-transparent',
  primary: 'bg-nq-primary text-nq-primary-contrast border-transparent',
  accent: 'bg-nq-accent-strong text-nq-text-inverse border-transparent',
  success: 'bg-nq-success text-nq-success-contrast border-transparent',
  warning: 'bg-nq-warning text-nq-warning-contrast border-transparent',
  danger: 'bg-nq-danger text-nq-danger-contrast border-transparent',
  info: 'bg-nq-info text-nq-info-contrast border-transparent',
}

const OUTLINE: Record<BadgeTone, string> = {
  neutral: 'bg-transparent text-nq-text-secondary border-nq-border-strong',
  primary: 'bg-transparent text-nq-primary border-nq-primary-border',
  accent: 'bg-transparent text-nq-accent-strong border-nq-accent-border',
  success: 'bg-transparent text-nq-success border-nq-success-border',
  warning: 'bg-transparent text-nq-warning border-nq-warning-border',
  danger: 'bg-transparent text-nq-danger border-nq-danger-border',
  info: 'bg-transparent text-nq-info border-nq-info-border',
}

const DOT: Record<BadgeTone, string> = {
  neutral: 'bg-nq-text-tertiary',
  primary: 'bg-nq-primary',
  accent: 'bg-nq-accent-strong',
  success: 'bg-nq-success',
  warning: 'bg-nq-warning',
  danger: 'bg-nq-danger',
  info: 'bg-nq-info',
}

/**
 * Compact status label. Text carries the meaning; the tone only reinforces it.
 */
export function Badge({
  tone = 'neutral',
  appearance = 'soft',
  size = 'sm',
  dot = false,
  className,
  children,
  ...rest
}: BadgeProps): ReactNode {
  return (
    <span
      {...rest}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-nq-xs border font-semibold',
        size === 'sm' ? 'px-1.5 py-0.5 text-nq-2xs' : 'px-2 py-1 text-nq-xs',
        appearance === 'soft' && SOFT[tone],
        appearance === 'solid' && SOLID[tone],
        appearance === 'outline' && OUTLINE[tone],
        className
      )}
    >
      {dot ? <span aria-hidden="true" className={cn('size-1.5 rounded-nq-full', DOT[tone])} /> : null}
      {children}
    </span>
  )
}
