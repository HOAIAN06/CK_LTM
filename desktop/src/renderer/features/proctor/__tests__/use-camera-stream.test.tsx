// @vitest-environment jsdom
/**
 * `useCameraStream` với `navigator.mediaDevices` giả:
 * - nhánh cấp quyền (granted) → READY + track được gắn vào `<video>`;
 * - nhánh từ chối (denied) → DENIED, **không** tự retry, luôn có nút thử lại thủ công;
 * - nhánh không có camera (not found) → tự thử lại theo lịch;
 * - unmount → `track.stop()` cho mọi track.
 *
 * Không có webcam/display trong môi trường này: test chỉ chứng minh luồng state, không chứng
 * minh ảnh thật.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useCameraStream, type UseCameraStreamOptions } from '../use-camera-stream'

interface FakeTrack {
  stop: ReturnType<typeof vi.fn>
  kind: string
}

interface FakeStream {
  getTracks: () => FakeTrack[]
  getVideoTracks: () => FakeTrack[]
  active: boolean
}

function createFakeStream(): FakeStream {
  const track: FakeTrack = { stop: vi.fn(), kind: 'video' }
  return {
    getTracks: () => [track],
    getVideoTracks: () => [track],
    active: true
  }
}

function Harness(options: UseCameraStreamOptions = {}): React.JSX.Element {
  const camera = useCameraStream(options)
  return (
    <div>
      <video data-testid="video" ref={camera.videoRef} />
      <span data-testid="status">{camera.status}</span>
      <span data-testid="error">{camera.error?.message ?? ''}</span>
      <button type="button" onClick={camera.retry}>
        retry
      </button>
      <button type="button" onClick={camera.stop}>
        stop
      </button>
    </div>
  )
}

function installMediaDevices(
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>
): void {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia }
  })
}

beforeEach(() => {
  // jsdom không implement play(): trả promise đã resolve để hook yên tâm.
  vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  Reflect.deleteProperty(navigator, 'mediaDevices')
})

const flush = (): Promise<void> => new Promise((done) => setTimeout(done, 0))

describe('useCameraStream — granted', () => {
  it('requests video only at the 640x480@15 profile and reaches READY', async () => {
    const stream = createFakeStream()
    const getUserMedia = vi.fn(
      async (_constraints: MediaStreamConstraints) => stream as unknown as MediaStream
    )
    installMediaDevices(getUserMedia)

    render(<Harness />)
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('READY'))

    const constraints = getUserMedia.mock.calls[0][0]
    expect(constraints.audio).toBe(false)
    expect(constraints.video).toMatchObject({
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 15 },
      facingMode: 'user'
    })

    const video = screen.getByTestId('video') as HTMLVideoElement
    // Effect gắn stream chạy sau commit, nên phải chờ thay vì giả định thứ tự.
    await waitFor(() => expect(video.srcObject).toBe(stream))
    expect(screen.getByTestId('error').textContent).toBe('')
  })

  it('stops every track on unmount', async () => {
    const stream = createFakeStream()
    installMediaDevices(vi.fn(async () => stream as unknown as MediaStream))

    const view = render(<Harness />)
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('READY'))

    view.unmount()
    for (const track of stream.getTracks()) expect(track.stop).toHaveBeenCalledTimes(1)
  })

  it('stops every track when stop() is called', async () => {
    const stream = createFakeStream()
    installMediaDevices(vi.fn(async () => stream as unknown as MediaStream))

    render(<Harness />)
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('READY'))

    act(() => fireEvent.click(screen.getByText('stop')))
    expect(screen.getByTestId('status').textContent).toBe('STOPPED')
    for (const track of stream.getTracks()) expect(track.stop).toHaveBeenCalled()
  })
})

describe('useCameraStream — denied', () => {
  it('reports DENIED with an actionable message and never auto-retries', async () => {
    const getUserMedia = vi.fn(async () => {
      const error = new Error('Permission denied')
      error.name = 'NotAllowedError'
      throw error
    })
    installMediaDevices(getUserMedia)

    render(<Harness retryDelaysMs={[10, 10, 10]} />)
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('DENIED'))
    expect(screen.getByTestId('error').textContent).toMatch(/quyền camera/i)

    // Không có vòng retry: dù lịch retry rất ngắn, vẫn chỉ một lần gọi.
    await flush()
    await new Promise((done) => setTimeout(done, 40))
    expect(getUserMedia).toHaveBeenCalledTimes(1)
  })

  it('retries manually after the user fixes the permission', async () => {
    const stream = createFakeStream()
    let fail = true
    const getUserMedia = vi.fn(async () => {
      if (fail) {
        const error = new Error('Permission denied')
        error.name = 'NotAllowedError'
        throw error
      }
      return stream as unknown as MediaStream
    })
    installMediaDevices(getUserMedia)

    render(<Harness />)
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('DENIED'))

    fail = false
    act(() => fireEvent.click(screen.getByText('retry')))
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('READY'))
    expect(getUserMedia).toHaveBeenCalledTimes(2)
  })
})

describe('useCameraStream — failure paths', () => {
  it('reports NOT_FOUND and retries on the configured schedule', async () => {
    const stream = createFakeStream()
    let calls = 0
    const getUserMedia = vi.fn(async () => {
      calls += 1
      if (calls === 1) {
        const error = new Error('No device')
        error.name = 'NotFoundError'
        throw error
      }
      return stream as unknown as MediaStream
    })
    installMediaDevices(getUserMedia)

    render(<Harness retryDelaysMs={[10, 10, 10]} />)
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1))
    expect(screen.getByTestId('status').textContent).toBe('NOT_FOUND')

    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('READY'))
  })

  it('reports FAILED when the media API is missing entirely', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })
    render(<Harness retryDelaysMs={[]} />)
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('FAILED'))
    expect(screen.getByTestId('error').textContent).not.toBe('')
  })

  it('does not open the camera when disabled', async () => {
    const getUserMedia = vi.fn(async () => createFakeStream() as unknown as MediaStream)
    installMediaDevices(getUserMedia)

    render(<Harness enabled={false} />)
    await flush()
    expect(getUserMedia).not.toHaveBeenCalled()
    expect(screen.getByTestId('status').textContent).toBe('STOPPED')
  })
})
