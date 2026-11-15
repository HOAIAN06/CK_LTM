// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { NqBridge } from '@shared/ipc'
import { createIdleConnectionStatus } from '@shared/ipc'
import { ThemeProvider } from '../../app/theme-provider'
import { setBridgeOverride } from '../../lib/bridge'
import { resetConnectionStore, useConnectionStore } from '../../lib/connection-store'
import { resetSessionStore } from '../../lib/session-store'
import { LoginRoute } from '../login-route'

function createFakeBridge(): NqBridge {
  return {
    connect: vi.fn(() => Promise.resolve({ ok: true })),
    disconnect: vi.fn(() => Promise.resolve()),
    send: vi.fn(() => Promise.resolve({ ok: true })),
    getStatus: vi.fn(() => Promise.resolve(createIdleConnectionStatus())),
    onEvent: vi.fn(() => () => undefined),
    app: { version: 'test', platform: 'linux', packaged: false }
  }
}

function renderLogin(): void {
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/login']}>
        <LoginRoute />
      </MemoryRouter>
    </ThemeProvider>
  )
}

/**
 * Đẩy trạng thái kết nối từ "main process" xuống store như sự kiện IPC thật.
 * `connectedAt` cho phép mô phỏng socket có từ trước lần mount (phiên cũ).
 */
async function pushStatus(
  state: 'connected' | 'disconnected',
  connectedAt: number = Date.now()
): Promise<void> {
  await act(async () => {
    useConnectionStore.getState().handleEvent({
      kind: 'status',
      status: {
        state,
        host: state === 'connected' ? 'localhost' : null,
        port: state === 'connected' ? 5000 : null,
        lastError: null,
        connectedAt: state === 'connected' ? connectedAt : null
      }
    })
  })
}

beforeEach(() => {
  resetConnectionStore()
  resetSessionStore()
  setBridgeOverride(null)
})

afterEach(() => {
  cleanup()
  setBridgeOverride(null)
})

describe('LoginRoute', () => {
  it('renders the auth card and a readable offline-bridge state', () => {
    renderLogin()

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Đăng nhập')
    expect(screen.getByText('Desktop bridge không khả dụng')).toBeTruthy()
    expect(screen.getByLabelText('Username')).toBeTruthy()
    expect(screen.getByLabelText('Mật khẩu')).toBeTruthy()
    // Ví dụ: tab đăng nhập đang được chọn.
    expect(screen.getByRole('tab', { name: 'Đăng nhập' }).getAttribute('aria-selected')).toBe('true')
  })

  it('shows field-level errors on an empty submit and focuses the first one', async () => {
    renderLogin()

    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    expect(screen.getByText('Nhập username của bạn')).toBeTruthy()
    expect(screen.getByText('Nhập mật khẩu')).toBeTruthy()
    expect(screen.getByLabelText('Username').getAttribute('aria-invalid')).toBe('true')

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText('Username'))
    })
  })

  it('asks for a confirmation password in register mode and reports a mismatch', () => {
    renderLogin()

    fireEvent.click(screen.getByRole('tab', { name: 'Đăng ký' }))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Tạo tài khoản')

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'minh_anh' } })
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: '1234' } })
    fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu'), { target: { value: '12345' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))

    expect(screen.getByText('Mật khẩu xác nhận không khớp')).toBeTruthy()
  })

  it('explains that no frame can be sent when the desktop bridge is missing', () => {
    renderLogin()

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'minh_anh' } })
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: '1234' } })
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    expect(screen.getByText('Không có cầu nối tới tiến trình desktop')).toBeTruthy()
    // Không bị khoá ở trạng thái chờ: người dùng sửa được rồi thử lại.
    expect(screen.getByRole('button', { name: 'Đăng nhập' }).hasAttribute('disabled')).toBe(false)
  })

  it('keeps the server configuration behind a disclosure with validated fields', () => {
    renderLogin()

    const toggle = screen.getByRole('button', { name: /Cấu hình server/ })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')

    const host = screen.getByLabelText('Địa chỉ máy chủ')
    const port = screen.getByLabelText('Cổng')
    expect((host as HTMLInputElement).value).toBe('localhost')
    expect((port as HTMLInputElement).value).toBe('5000')

    fireEvent.change(port, { target: { value: '70000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kết nối' }))
    expect(screen.getByText('Cổng phải là số từ 1 đến 65535')).toBeTruthy()
  })

  it('shows no stale-session warning after a fresh connect (F-07)', async () => {
    setBridgeOverride(createFakeBridge())
    renderLogin()

    // Kết nối vừa mở: `connectedAt` sát thời điểm mount.
    await pushStatus('connected')

    expect(screen.queryByText('Máy chủ vẫn đang giữ phiên đăng nhập cũ')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Ngắt kết nối' })).toBeNull()
    expect(screen.getByText(/Đang kết nối tới máy chủ/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Đăng nhập' }).hasAttribute('disabled')).toBe(false)
  })

  it('offers an explicit way out when the socket predates this renderer load (F-01)', async () => {
    const bridge = createFakeBridge()
    setBridgeOverride(bridge)
    renderLogin()

    // Socket đã mở từ trước khi cửa sổ tải lại → đúng là phiên cũ.
    await pushStatus('connected', Date.now() - 60_000)

    expect(screen.getByText('Máy chủ vẫn đang giữ phiên đăng nhập cũ')).toBeTruthy()
    expect(screen.queryByText(/Đang kết nối tới máy chủ/)).toBeNull()
    const disconnectButton = screen.getByRole('button', { name: 'Ngắt kết nối' })
    expect(disconnectButton.hasAttribute('disabled')).toBe(false)

    fireEvent.click(disconnectButton)
    expect(bridge.disconnect).toHaveBeenCalledTimes(1)

    expect(await screen.findByText('Đã ngắt kết nối. Bấm Đăng nhập để tạo phiên mới.')).toBeTruthy()
    await pushStatus('disconnected')
    expect(screen.queryByText('Máy chủ vẫn đang giữ phiên đăng nhập cũ')).toBeNull()
  })

  it('flags the session as stale and recovers on ALREADY_AUTHENTICATED (F-07)', async () => {
    let releaseDisconnect: () => void = () => undefined
    const bridge: NqBridge = {
      ...createFakeBridge(),
      disconnect: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            releaseDisconnect = resolve
          })
      )
    }
    setBridgeOverride(bridge)
    renderLogin()

    // Bắt đầu bằng một kết nối mới: chưa có cảnh báo nào.
    await pushStatus('connected')
    expect(screen.queryByText('Máy chủ vẫn đang giữ phiên đăng nhập cũ')).toBeNull()

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'minh_anh' } })
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: '1234' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    })

    await act(async () => {
      useConnectionStore.getState().handleEvent({
        kind: 'message',
        message: { type: 'LOGIN_FAIL', payload: 'ALREADY_AUTHENTICATED' }
      })
    })

    // Server vừa chứng minh có phiên cũ → cờ bật, nút ngắt kết nối xuất hiện ngay.
    expect(bridge.disconnect).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Máy chủ vẫn đang giữ phiên đăng nhập cũ')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ngắt kết nối' })).toBeTruthy()

    await act(async () => {
      releaseDisconnect()
    })
    await pushStatus('disconnected')

    expect(screen.queryByText('Máy chủ vẫn đang giữ phiên đăng nhập cũ')).toBeNull()
    expect(await screen.findByText('Đã ngắt phiên cũ. Bấm Đăng nhập để tạo phiên mới.')).toBeTruthy()
  })
})
