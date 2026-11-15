import type { ReactNode } from 'react'
import { cn } from './cn'

export interface FieldAria {
  'aria-describedby'?: string
  'aria-invalid'?: true
}

/** Builds the `aria-describedby` / `aria-invalid` wiring for a field. */
export function fieldAria(id: string, options: { hint?: ReactNode; error?: ReactNode }): FieldAria {
  const describedBy = options.error ? `${id}-error` : options.hint ? `${id}-hint` : undefined
  return {
    'aria-describedby': describedBy,
    'aria-invalid': options.error ? true : undefined,
  }
}

export interface FieldProps {
  /** Must match the control's `id` (`useId()` based). */
  id: string
  label?: ReactNode
  /** Helper copy, always visible. Hidden while an error is shown. */
  hint?: ReactNode
  /** Error copy; replaces the hint and is announced assertively. */
  error?: ReactNode
  required?: boolean
  /** Right-aligned label affordance, e.g. a character counter. */
  labelAction?: ReactNode
  className?: string
  children: ReactNode
}

/**
 * Label + control + message stack. Keeps every form row on the same 8pt rhythm
 * so a form reads as a single column rather than a pile of boxes.
 */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  labelAction,
  className,
  children,
}: FieldProps): ReactNode {
  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      {label || labelAction ? (
        <div className="flex items-baseline justify-between gap-2">
          {label ? (
            <label htmlFor={id} className="text-nq-sm font-medium text-nq-text">
              {label}
              {required ? (
                <span aria-hidden="true" className="ml-0.5 text-nq-danger">
                  *
                </span>
              ) : null}
            </label>
          ) : (
            <span />
          )}
          {labelAction ? <span className="text-nq-xs text-nq-text-tertiary">{labelAction}</span> : null}
        </div>
      ) : null}
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-start gap-1 text-nq-xs leading-snug text-nq-danger"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="nq-pretty text-nq-xs leading-snug text-nq-text-tertiary">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
