/**
 * Cầu nối giữa `window.nq` và store UI.
 *
 * Đăng ký **một** listener cho toàn app (main là nguồn sự thật về kết nối) và đồng bộ
 * trạng thái ban đầu bằng `getStatus()`, vì cửa sổ có thể được reload trong khi socket
 * vẫn đang mở ở main process.
 */
import { useEffect, type ReactNode } from 'react'
import { getBridge } from '../lib/bridge'
import { useConnectionStore } from '../lib/connection-store'
import { ErrorBoundary } from './error-boundary'
import { ThemeProvider } from './theme-provider'

function BridgeRuntime({ children }: { children: ReactNode }): ReactNode {
  const handleEvent = useConnectionStore((state) => state.handleEvent)
  const syncStatus = useConnectionStore((state) => state.syncStatus)

  useEffect(() => {
    const unsubscribe = getBridge().onEvent(handleEvent)
    void syncStatus()
    return unsubscribe
  }, [handleEvent, syncStatus])

  return <>{children}</>
}

export function AppProviders({ children }: { children: ReactNode }): ReactNode {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <BridgeRuntime>{children}</BridgeRuntime>
      </ErrorBoundary>
    </ThemeProvider>
  )
}
