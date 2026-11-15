import { useId, type ReactNode, type SelectHTMLAttributes } from 'react'
import { cn } from './cn'
import { Field, fieldAria } from './Field'
import { ChevronDown } from './icons'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  options?: SelectOption[]
  /** Wrapper class (the field stack). */
  className?: string
  selectClassName?: string
  selectSize?: 'sm' | 'md' | 'lg'
}

const SIZE = {
  sm: 'h-[var(--nq-control-sm)] text-nq-sm',
  md: 'h-[var(--nq-control-md)] text-nq-md',
  lg: 'h-[var(--nq-control-lg)] text-nq-base',
} as const

/**
 * Native `<select>` by design: the OS popup gives us correct keyboard
 * navigation, type-ahead and screen-reader behaviour for free, which a
 * hand-rolled listbox usually gets wrong. The chevron and field chrome are
 * themed; the popup itself is rendered by the platform.
 */
export function Select({
  label,
  hint,
  error,
  options,
  className,
  selectClassName,
  selectSize = 'md',
  id,
  children,
  ...rest
}: SelectProps): ReactNode {
  const autoId = useId()
  const fieldId = id ?? autoId

  return (
    <Field id={fieldId} label={label} hint={hint} error={error} required={rest.required} className={className}>
      <div className="relative flex items-center">
        <select
          {...rest}
          id={fieldId}
          {...fieldAria(fieldId, { hint, error })}
          className={cn(
            'nq-select',
            SIZE[selectSize],
            error && 'border-nq-danger',
            rest.disabled && 'bg-nq-surface-sunken',
            selectClassName
          )}
        >
          {options
            ? options.map((option) => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </option>
              ))
            : children}
        </select>
        <ChevronDown
          aria-hidden="true"
          size={16}
          className="pointer-events-none absolute right-3 text-nq-text-tertiary"
        />
      </div>
    </Field>
  )
}
