import { clsx, type ClassValue } from 'clsx'

/**
 * Class name joiner. The only shared helper the UI layer needs: every component
 * exposes a `className` passthrough and merges it last so callers win.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}
