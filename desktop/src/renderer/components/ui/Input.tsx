import { useId, type ComponentPropsWithRef, type ReactNode } from 'react'
import { cn } from './cn'
import { Field, fieldAria } from './Field'

export type InputSize = 'sm' | 'md' | 'lg'

export interface InputProps extends Omit<ComponentPropsWithRef<'input'>, 'size'> {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  /** Leading glyph slot, rendered inside the control. */
  leftIcon?: ReactNode
  /** Trailing slot: unit suffix, clear button, keycap. */
  rightSlot?: ReactNode
  inputSize?: InputSize
  /** Wrapper class (the field stack), not the `<input>` itself. */
  className?: string
  inputClassName?: string
  /** Monospace / tabular value — PINs, invite codes, ports. */
  mono?: boolean
}

const SIZE: Record<InputSize, string> = {
  sm: 'h-[var(--nq-control-sm)] text-nq-sm',
  md: 'h-[var(--nq-control-md)] text-nq-md',
  lg: 'h-[var(--nq-control-lg)] text-nq-base',
}

const CONTROL =
  'w-full rounded-nq-md border bg-nq-surface text-nq-text ' +
  'transition-[border-color,box-shadow,background-color] duration-[var(--nq-motion-fast)] ease-nq ' +
  'placeholder:text-nq-text-tertiary ' +
  'hover:border-nq-border-strong ' +
  'focus-visible:border-nq-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--nq-focus-ring-soft)] ' +
  'disabled:cursor-not-allowed disabled:bg-nq-surface-sunken disabled:text-nq-text-tertiary'

/**
 * Text input with an optional label / hint / error stack.
 * Errors are text plus a red border — never colour alone.
 */
export function Input({
  label,
  hint,
  error,
  leftIcon,
  rightSlot,
  inputSize = 'md',
  className,
  inputClassName,
  mono = false,
  id,
  disabled,
  ...rest
}: InputProps): ReactNode {
  const autoId = useId()
  const fieldId = id ?? autoId

  return (
    <Field id={fieldId} label={label} hint={hint} error={error} required={rest.required} className={className}>
      <div className="relative flex items-center">
        {leftIcon ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 flex items-center text-nq-text-tertiary"
          >
            {leftIcon}
          </span>
        ) : null}
        <input
          {...rest}
          id={fieldId}
          disabled={disabled}
          {...fieldAria(fieldId, { hint, error })}
          className={cn(
            CONTROL,
            SIZE[inputSize],
            'px-3',
            leftIcon && 'pl-9',
            rightSlot && 'pr-9',
            mono && 'nq-tabular font-mono tracking-[0.12em]',
            error
              ? 'border-nq-danger focus-visible:border-nq-danger focus-visible:ring-[var(--nq-focus-ring-soft)]'
              : 'border-nq-border',
            inputClassName
          )}
        />
        {rightSlot ? (
          <span className="absolute right-1.5 flex items-center text-nq-text-tertiary">{rightSlot}</span>
        ) : null}
      </div>
    </Field>
  )
}
