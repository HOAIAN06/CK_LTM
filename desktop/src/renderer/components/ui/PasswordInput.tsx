import { useId, useState, type ChangeEvent, type FocusEvent, type ReactNode } from 'react'
import { cn } from './cn'
import { Field, fieldAria } from './Field'
import { IconButton } from './IconButton'
import { Eye, EyeOff } from './icons'

export interface PasswordInputProps {
  id?: string
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  value?: string
  defaultValue?: string
  placeholder?: string
  autoComplete?: string
  required?: boolean
  disabled?: boolean
  name?: string
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void
  className?: string
  inputClassName?: string
}

/**
 * Password field with an explicit reveal control.
 * Paste and password-manager autofill are never blocked (WCAG 1.3.5 / 3.3.8).
 */
export function PasswordInput({
  id,
  label,
  hint,
  error,
  className,
  inputClassName,
  ...rest
}: PasswordInputProps): ReactNode {
  const autoId = useId()
  const fieldId = id ?? autoId
  const [revealed, setRevealed] = useState(false)

  return (
    <Field id={fieldId} label={label} hint={hint} error={error} required={rest.required} className={className}>
      <div className="relative flex items-center">
        <input
          {...rest}
          id={fieldId}
          type={revealed ? 'text' : 'password'}
          {...fieldAria(fieldId, { hint, error })}
          className={cn(
            'h-[var(--nq-control-md)] w-full rounded-nq-md border bg-nq-surface px-3 pr-11 text-nq-md text-nq-text',
            'transition-[border-color,box-shadow] duration-[var(--nq-motion-fast)] ease-nq',
            'placeholder:text-nq-text-tertiary hover:border-nq-border-strong',
            'focus-visible:border-nq-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--nq-focus-ring-soft)]',
            'disabled:cursor-not-allowed disabled:bg-nq-surface-sunken',
            error ? 'border-nq-danger' : 'border-nq-border',
            inputClassName
          )}
        />
        <IconButton
          label={revealed ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          icon={revealed ? <Eye size={16} /> : <EyeOff size={16} />}
          pressed={revealed}
          size="sm"
          className="absolute right-1.5"
          onClick={() => setRevealed((value) => !value)}
        />
      </div>
    </Field>
  )
}
