/**
 * Theme provider "Sumi".
 *
 * Hợp đồng (docs/desktop/contracts.md §6):
 * - `light` / `dark` ghi `data-theme` lên `<html>`; `system` **xoá** attribute để
 *   `prefers-color-scheme` trong `tokens.css` tự quyết định.
 * - Lựa chọn được nhớ trong `localStorage('nq.theme')`.
 * - Đổi theme hệ điều hành khi đang ở chế độ `system` được phản chiếu vào
 *   `resolvedTheme` (dùng cho nhãn/aria chứ không tự ghi `data-theme`).
 *
 * App shell là **nơi duy nhất** ghi `data-theme` khi chạy app thật. Route
 * `/design-preview` (chỉ dev) render thư viện thành phần tự quản lý theme của nó.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import type { ThemeChoice } from '../components/shell'
import { readStoredString, STORAGE_KEYS, writeStoredString } from '../lib/storage'

export type ResolvedTheme = 'light' | 'dark'

const THEME_CHOICES: ReadonlyArray<ThemeChoice> = ['light', 'dark', 'system']

function isThemeChoice(value: unknown): value is ThemeChoice {
  return typeof value === 'string' && (THEME_CHOICES as ReadonlyArray<string>).includes(value)
}

function readStoredTheme(): ThemeChoice {
  const stored = readStoredString(STORAGE_KEYS.theme)
  return isThemeChoice(stored) ? stored : 'system'
}

function prefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** Áp lên `<html>`; đây là chỗ duy nhất trong app được chạm vào `data-theme`. */
export function applyTheme(theme: ThemeChoice): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'system') {
    root.removeAttribute('data-theme')
    return
  }
  root.dataset.theme = theme
}

export interface ThemeContextValue {
  theme: ThemeChoice
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemeChoice) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }): ReactNode {
  const [theme, setThemeState] = useState<ThemeChoice>(readStoredTheme)
  const [systemDark, setSystemDark] = useState<boolean>(prefersDark)

  useEffect(() => {
    applyTheme(theme)
    writeStoredString(STORAGE_KEYS.theme, theme)
  }, [theme])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent): void => {
      setSystemDark(event.matches)
    }
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    }
    // Skeleton cho engine cũ (jsdom/Chromium cũ): MediaQueryList chỉ có addListener.
    query.addListener(onChange)
    return () => query.removeListener(onChange)
  }, [])

  const setTheme = useCallback((next: ThemeChoice) => {
    setThemeState(next)
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme: theme === 'system' ? (systemDark ? 'dark' : 'light') : theme,
      setTheme
    }),
    [theme, systemDark, setTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme phải nằm trong <ThemeProvider>')
  }
  return context
}
