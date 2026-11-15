/**
 * Ranh giới lỗi của renderer.
 *
 * Một lỗi render không được biến cửa sổ thành màu trắng và cũng không được làm mất
 * kết nối TCP (kết nối do main process giữ). Vì vậy fallback chỉ đưa ra hai hành động
 * thật: tải lại giao diện hoặc quay về màn hình đăng nhập.
 *
 * Không log payload: chỉ tên + thông điệp lỗi (mật khẩu không bao giờ đi qua đây).
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button, Card } from '../components/ui'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error('Lỗi không xác định') }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    const name = error.name || 'Error'
    const message = error.message.slice(0, 200)
    console.error(`[nq] lỗi giao diện: ${name}: ${message}`, info.componentStack ?? '')
  }

  private reload = (): void => {
    window.location.reload()
  }

  private toLogin = (): void => {
    window.location.hash = '#/login'
    window.location.reload()
  }

  override render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="grid h-dvh place-items-center bg-nq-bg px-6">
        <Card tone="raised" padding="lg" className="w-full max-w-[520px]">
          <p className="nq-caps">NihongoQuest</p>
          <h1 role="alert" className="nq-display mt-2 text-nq-2xl text-nq-text">
            Đã xảy ra lỗi giao diện
          </h1>
          <p className="nq-pretty mt-2 text-nq-sm leading-normal text-nq-text-secondary">
            Màn hình vừa rồi gặp lỗi không mong muốn. Kết nối tới máy chủ vẫn do tiến trình
            chính quản lý, nên tải lại giao diện là đủ trong phần lớn trường hợp.
          </p>
          <p className="nq-tabular mt-3 rounded-nq-md border border-nq-border-subtle bg-nq-surface-sunken px-3 py-2 text-nq-xs text-nq-text-tertiary">
            {error.name}: {error.message.slice(0, 160)}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={this.reload}>
              Tải lại giao diện
            </Button>
            <Button variant="secondary" onClick={this.toLogin}>
              Về màn hình đăng nhập
            </Button>
          </div>
        </Card>
      </div>
    )
  }
}
