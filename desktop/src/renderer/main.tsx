/**
 * Điểm vào của renderer.
 *
 * Thứ tự có chủ đích:
 * 1. (dev) nạp fixture xem thử nếu URL yêu cầu `?demo=1` — phải chạy **trước** khi React
 *    mount để mọi màn hình thấy cùng một bridge và cùng một phiên. Ngay sau đó, nếu có
 *    `&screen=<name>` thì đặt hash để mở thẳng màn hình cần review (deep link chỉ nhận các
 *    tên trong `DEMO_SCREEN_PATHS`).
 * 2. Mount app trong `StrictMode` + provider (theme → error boundary → bridge runtime).
 *
 * Fixture được nạp bằng `import()` động trong nhánh `import.meta.env.DEV`, nên bản
 * production không chứa nó (kiểm chứng bằng grep asset sau `npm run build`).
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { AppProviders } from './app/providers'
import './styles/index.css'

async function bootstrap(): Promise<void> {
  if (import.meta.env.DEV) {
    const demo = await import('./lib/demo/fixture')
    if (demo.enableDemoIfRequested()) {
      demo.applyDemoDeepLink()
    }
  }

  const container = document.getElementById('root')
  if (!container) {
    throw new Error('Không tìm thấy phần tử gốc #root')
  }

  createRoot(container).render(
    <StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </StrictMode>
  )
}

void bootstrap()
