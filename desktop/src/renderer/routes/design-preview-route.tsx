/**
 * `/design-preview` — thư viện thành phần của design system, CHỈ dev.
 *
 * File này chỉ được nạp bằng `import()` động trong `app/App.tsx` khi
 * `import.meta.env.DEV` là true; bản production không sinh chunk nào.
 *
 * `DesignPreview` (ui-designer sở hữu) tự dựng `AppShell`. Ở đây nó được điều khiển
 * theme bởi `ThemeProvider` của app, để **chỉ một nơi** ghi `data-theme` trên `<html>`.
 */
import type { ReactNode } from 'react'
import { DesignPreview } from '../components/shell'
import { useTheme } from '../app/theme-provider'

export function DesignPreviewRoute(): ReactNode {
  const { theme, setTheme } = useTheme()
  return <DesignPreview theme={theme} onThemeChange={setTheme} />
}
