// @vitest-environment jsdom
/**
 * Bảng giám sát của host: tile theo người chơi, trạng thái "chưa có hình", feed cảnh báo, banner
 * lỗi kênh xem và Sheet chi tiết.
 *
 * Không có frame thật: `frame-hub` được nạp bằng JPEG giả, blob URL được stub — test chỉ chứng
 * minh luồng dữ liệu/UI, không chứng minh ảnh từ webcam.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createMediaStatusSnapshot, type NqMediaApi } from '@shared/media-ipc'
import { unavailableVisionMetadata } from '@shared/protocol/media'
import { clearHubFrames, publishHubFrame } from '../frame-hub'
import { ProctorDashboard } from '../proctor-dashboard'
import { initialProctorState, resetProctorStore, useProctorStore, type ProctorTile } from '../proctor-store'

const PIN = '123456'

function tile(overrides: Partial<ProctorTile> & { userId: number; username: string }): ProctorTile {
  return {
    cameraStatus: 'READY',
    calibrationStatus: 'NOT_REQUIRED',
    connected: true,
    warnings: 0,
    lastEvent: null,
    ...overrides
  }
}

function installMedia(): { subscribes: number } {
  const recorder = { subscribes: 0 }
  const api: NqMediaApi = {
    startPublish: async () => ({ ok: true }),
    stopPublish: async () => undefined,
    startSubscribe: async () => {
      recorder.subscribes += 1
      return { ok: true }
    },
    stopSubscribe: async () => undefined,
    publishFrame: async () => ({ ok: false, error: 'MEDIA_NOT_STARTED' }),
    getStatus: async () => createMediaStatusSnapshot(0),
    onFrame: () => () => undefined,
    onStatus: () => () => undefined
  }
  Object.defineProperty(window, 'nq', { configurable: true, value: { media: api } })
  return recorder
}

beforeEach(() => {
  installMedia()
  clearHubFrames()
  resetProctorStore()
  useProctorStore.setState({
    ...initialProctorState,
    context: { pin: PIN, proctoringEnabled: true, playing: false, host: true, phase: 'running' },
    subscriber: { state: 'live', message: null },
    tiles: [
      tile({ userId: 2, username: 'an', warnings: 2, lastEvent: { type: 'APP_FOCUS_LOST', severity: 'EVIDENCE', at: 1_700_000_000_100 } }),
      tile({ userId: 3, username: 'binh', cameraStatus: 'DENIED' })
    ],
    feed: [
      {
        eventId: 'evt-1',
        userId: 2,
        username: 'an',
        type: 'APP_FOCUS_LOST',
        severity: 'EVIDENCE',
        at: 1_700_000_000_100,
        durationMs: 6_000,
        frameSequence: 3
      }
    ]
  })
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:frame')
  })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
})

afterEach(() => {
  cleanup()
  resetProctorStore()
  clearHubFrames()
  Reflect.deleteProperty(window, 'nq')
  Reflect.deleteProperty(URL, 'createObjectURL')
  Reflect.deleteProperty(URL, 'revokeObjectURL')
})

describe('ProctorDashboard', () => {
  it('renders one tile per playing member with status, warnings and last event', () => {
    render(<ProctorDashboard pin={PIN} />)

    expect(screen.getByText('Bảng giám sát · PIN 123456')).toBeTruthy()

    const anTile = screen.getByRole('button', { name: 'Mở chi tiết camera của an' })
    expect(within(anTile).getByText('an')).toBeTruthy()
    expect(within(anTile).getByText('2 cảnh báo')).toBeTruthy()
    expect(within(anTile).getByText(/Rời cửa sổ làm bài lúc/)).toBeTruthy()

    const binhTile = screen.getByRole('button', { name: 'Mở chi tiết camera của binh' })
    expect(within(binhTile).getByText('Từ chối camera')).toBeTruthy()
    expect(within(binhTile).getByText('Chưa có cảnh báo')).toBeTruthy()
  })

  it('says clearly when no frame has arrived instead of showing a black box', () => {
    render(<ProctorDashboard pin={PIN} />)

    const placeholders = screen.getAllByText('Chưa nhận được hình ảnh')
    expect(placeholders).toHaveLength(2)
    expect(screen.queryByRole('img', { name: /Camera của an/ })).toBeNull()
  })

  it('shows the newest frame as an image once the hub has one', () => {
    publishHubFrame({
      userId: 2,
      sequence: 5,
      serverReceivedAt: 1_700_000_000_500,
      mimeType: 'image/jpeg',
      vision: unavailableVisionMetadata(5),
      data: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]).buffer
    })

    render(<ProctorDashboard pin={PIN} />)

    const image = screen.getByRole('img', { name: 'Camera của an' })
    expect(image.getAttribute('src')).toBe('blob:frame')
    // binh vẫn chưa có hình.
    expect(screen.getAllByText('Chưa nhận được hình ảnh')).toHaveLength(1)
  })

  it('lists the event feed with type, player and severity', () => {
    render(<ProctorDashboard pin={PIN} />)

    expect(screen.getByText('Cảnh báo (1)')).toBeTruthy()
    expect(screen.getByText('Bằng chứng')).toBeTruthy()
    // Cùng một sự kiện cũng xuất hiện trong ô của người chơi → dùng getAllByText.
    expect(screen.getAllByText('an').length).toBeGreaterThan(0)
    expect(screen.getByText(/6 giây/)).toBeTruthy()
    // Không hiển thị phần trăm tin cậy như một kết luận.
    expect(screen.queryByText(/%/)).toBeNull()
  })

  it('opens the detail sheet when a tile is clicked', () => {
    render(<ProctorDashboard pin={PIN} />)

    fireEvent.click(screen.getByRole('button', { name: 'Mở chi tiết camera của an' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Camera của an')).toBeTruthy()
    expect(within(dialog).getByText('Không chạy AI trên client')).toBeTruthy()
    expect(within(dialog).getByText('2')).toBeTruthy()
  })

  it('shows a retry banner when the subscriber failed, and retries on click', () => {
    useProctorStore.setState({
      subscriber: { state: 'error', message: 'Phiên media đã hết hạn.' }
    })
    render(<ProctorDashboard pin={PIN} />)

    expect(screen.getByText('Không mở được kênh xem camera')).toBeTruthy()
    expect(screen.getByText('Phiên media đã hết hạn.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    // Không còn ticket trong tay → store về `idle` và nói rõ đang chờ phiên mới.
    expect(useProctorStore.getState().subscriber.state).toBe('idle')
    expect(useProctorStore.getState().subscriber.message).toMatch(/chờ máy chủ cấp phiên/i)
  })

  it('marks a finished room and keeps the final tiles visible', () => {
    useProctorStore.setState({
      context: { pin: PIN, proctoringEnabled: true, playing: false, host: true, phase: 'ended' }
    })
    render(<ProctorDashboard pin={PIN} />)

    expect(screen.getByText('Phòng đã kết thúc')).toBeTruthy()
    expect(screen.getAllByText('an').length).toBeGreaterThan(0)
  })

  it('calls onBack when the host returns to the battle screen', () => {
    const onBack = vi.fn()
    render(<ProctorDashboard pin={PIN} onBack={onBack} />)

    fireEvent.click(screen.getByRole('button', { name: 'Về màn thi' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('sorts tiles by warning count then username', () => {
    useProctorStore.setState({
      tiles: [
        tile({ userId: 1, username: 'chi', warnings: 0 }),
        tile({ userId: 2, username: 'an', warnings: 3 }),
        tile({ userId: 3, username: 'binh', warnings: 0 })
      ]
    })
    render(<ProctorDashboard pin={PIN} />)

    const names = screen.getAllByRole('button', { name: /Mở chi tiết camera của/ }).map((button) =>
      button.getAttribute('aria-label')?.replace('Mở chi tiết camera của ', '')
    )
    expect(names).toEqual(['an', 'binh', 'chi'])
  })
})
