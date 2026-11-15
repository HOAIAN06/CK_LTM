// @vitest-environment jsdom
/**
 * `CameraPreview`: badge trạng thái, cảnh báo không chặn, nút "Thu nhỏ".
 *
 * Không có webcam: chỉ chứng minh UI phản ứng đúng với trạng thái hook (granted/denied) và
 * không render lớp nào chặn thao tác quiz.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CameraPreview } from '../camera-preview'

interface FakeTrack {
  stop: ReturnType<typeof vi.fn>
  kind: string
}

function fakeStream(): { getTracks: () => FakeTrack[]; getVideoTracks: () => FakeTrack[] } {
  const track: FakeTrack = { stop: vi.fn(), kind: 'video' }
  return { getTracks: () => [track], getVideoTracks: () => [track] }
}

function installMediaDevices(getUserMedia: (c: MediaStreamConstraints) => Promise<MediaStream>): void {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia }
  })
}

beforeEach(() => {
  vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  Reflect.deleteProperty(navigator, 'mediaDevices')
})

describe('CameraPreview', () => {
  it('shows a READY badge once the camera opens', async () => {
    installMediaDevices(async () => fakeStream() as unknown as MediaStream)
    const { container } = render(<CameraPreview onStatusChange={() => undefined} />)

    await waitFor(() =>
      expect(container.querySelector('[data-camera-status]')?.getAttribute('data-camera-status')).toBe(
        'READY'
      )
    )
    expect(screen.getByRole('status').textContent).toBe('Camera sẵn sàng')
  })

  it('warns without blocking when permission is denied', async () => {
    installMediaDevices(async () => {
      const error = new Error('denied')
      error.name = 'NotAllowedError'
      throw error
    })
    const { container } = render(<CameraPreview />)

    await waitFor(() =>
      expect(container.querySelector('[data-camera-status]')?.getAttribute('data-camera-status')).toBe(
        'DENIED'
      )
    )
    // Cảnh báo hiển thị hai chỗ: badge + câu giải thích, và có nút thử lại thủ công.
    expect(screen.getAllByText(/quyền camera/i).length).toBeGreaterThan(0)
    expect(screen.getByText('Thử lại camera')).toBeTruthy()

    // Không có overlay toàn màn hình: component chỉ chiếm khung preview của nó.
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0)
  })

  it('toggles between full preview and the minimized control', async () => {
    installMediaDevices(async () => fakeStream() as unknown as MediaStream)
    render(<CameraPreview />)

    fireEvent.click(screen.getByText('Thu nhỏ'))
    expect(screen.getByText('Mở rộng')).toBeTruthy()
    fireEvent.click(screen.getByText('Mở rộng'))
    expect(screen.getByText('Thu nhỏ')).toBeTruthy()
  })

  it('reports status changes to the caller', async () => {
    installMediaDevices(async () => fakeStream() as unknown as MediaStream)
    const onStatusChange = vi.fn()
    render(<CameraPreview onStatusChange={onStatusChange} />)

    await waitFor(() => expect(onStatusChange).toHaveBeenCalledWith('READY', null))
  })
})
