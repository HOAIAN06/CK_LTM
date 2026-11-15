import { useId, type ChangeEvent, type ReactNode } from 'react'
import { cn } from './cn'
import { Check, Minus } from './icons'

export interface CheckboxProps {
  /** Visible label; omit only when an adjacent element already names it. */
  label?: ReactNode
  /** Secondary line under the label. */
  description?: ReactNode
  checked?: boolean
  defaultChecked?: boolean
  indeterminate?: boolean
  disabled?: boolean
  required?: boolean
  name?: string
  value?: string
  id?: string
  className?: string
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
}

/**
 * Native checkbox with a token-styled box: real input, real label, real focus.
 * The tick is an inline SVG using `currentColor` so no hardcoded colour leaks
 * into the component layer.
 */
export function Checkbox({
  label,
  description,
  indeterminate = false,
  disabled = false,
  id,
  className,
  ...rest
}: CheckboxProps): ReactNode {
  const autoId = useId()
  const fieldId = id ?? autoId

  return (
    <div className={cn('flex items-start gap-2.5', disabled && 'opacity-[var(--nq-opacity-disabled)]', className)}>
      <span className="relative mt-[1px] flex items-center">
        <input
          {...rest}
          id={fieldId}
          type="checkbox"
          disabled={disabled}
          ref={(node) => {
            if (node) node.indeterminate = indeterminate
          }}
          className="nq-checkbox-input"
        />
        <span aria-hidden="true" className="nq-checkbox-box">
          {indeterminate ? <Minus size={12} strokeWidth={3} /> : <Check size={12} strokeWidth={3} />}
        </span>
      </span>
      {label || description ? (
        <label htmlFor={fieldId} className="cursor-pointer select-none">
          {label ? <span className="block text-nq-sm font-medium text-nq-text">{label}</span> : null}
          {description ? (
            <span className="mt-0.5 block text-nq-xs leading-snug text-nq-text-secondary">{description}</span>
          ) : null}
        </label>
      ) : null}
    </div>
  )
}
