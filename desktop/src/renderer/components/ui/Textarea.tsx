import { useId, type ComponentPropsWithRef, type ReactNode } from 'react'
import { cn } from './cn'
import { Field, fieldAria } from './Field'

export interface TextareaProps extends ComponentPropsWithRef<'textarea'> {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  /** Grows with content between these row counts. */
  minRows?: number
  className?: string
  textareaClassName?: string
}

export function Textarea({
  label,
  hint,
  error,
  minRows = 3,
  className,
  textareaClassName,
  id,
  ...rest
}: TextareaProps): ReactNode {
  const autoId = useId()
  const fieldId = id ?? autoId

  return (
    <Field id={fieldId} label={label} hint={hint} error={error} required={rest.required} className={className}>
      <textarea
        {...rest}
        id={fieldId}
        rows={rest.rows ?? minRows}
        {...fieldAria(fieldId, { hint, error })}
        className={cn(
          'w-full resize-y rounded-nq-md border bg-nq-surface px-3 py-2 text-nq-md leading-normal text-nq-text',
          'transition-[border-color,box-shadow] duration-[var(--nq-motion-fast)] ease-nq',
          'placeholder:text-nq-text-tertiary hover:border-nq-border-strong',
          'focus-visible:border-nq-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--nq-focus-ring-soft)]',
          'disabled:cursor-not-allowed disabled:bg-nq-surface-sunken',
          error ? 'border-nq-danger' : 'border-nq-border',
          textareaClassName
        )}
      />
    </Field>
  )
}
