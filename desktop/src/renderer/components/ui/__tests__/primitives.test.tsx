// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState, type ReactElement } from 'react'
import {
  Avatar,
  Badge,
  Button,
  CircularTimer,
  Dialog,
  SegmentedControl,
  Switch,
  ToastHost,
  deriveInitials,
  useToasts,
} from '..'

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('data-theme')
})

describe('deriveInitials', () => {
  it('uses the first and last word for Vietnamese names', () => {
    expect(deriveInitials('Nguyễn Văn An')).toBe('NA')
    expect(deriveInitials('Trần Bảo Long')).toBe('TL')
  })

  it('handles single words and blank input', () => {
    expect(deriveInitials('An')).toBe('AN')
    expect(deriveInitials('   ')).toBe('?')
  })
})

describe('Button', () => {
  it('keeps focus while loading, exposes aria-busy and swallows activation', () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Gửi câu trả lời
      </Button>
    )
    const button = screen.getByRole('button', { name: /gửi câu trả lời/i })
    expect(button.getAttribute('aria-busy')).toBe('true')
    expect(button.hasAttribute('disabled')).toBe(false)
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders the requested variant and honours the disabled attribute', () => {
    render(
      <Button variant="danger" disabled>
        Hủy phòng
      </Button>
    )
    const button = screen.getByRole('button', { name: /hủy phòng/i })
    expect(button.className).toContain('bg-nq-danger')
    expect(button.hasAttribute('disabled')).toBe(true)
  })
})

describe('Switch', () => {
  it('is a switch that reports its state and toggles through the callback', () => {
    function Harness(): ReactElement {
      const [checked, setChecked] = useState(false)
      return <Switch label="Giảm chuyển động" checked={checked} onCheckedChange={setChecked} />
    }
    render(<Harness />)
    const toggle = screen.getByRole('switch', { name: /giảm chuyển động/i })
    expect(toggle.getAttribute('aria-checked')).toBe('false')
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-checked')).toBe('true')
  })
})

describe('SegmentedControl', () => {
  it('exposes a radiogroup and moves selection with the arrow keys', () => {
    const onChange = vi.fn()
    render(
      <SegmentedControl
        label="Thời lượng trận"
        value="3m"
        onChange={onChange}
        options={[
          { value: '3m', label: '3 phút' },
          { value: '5m', label: '5 phút' },
        ]}
      />
    )
    const group = screen.getByRole('radiogroup', { name: 'Thời lượng trận' })
    expect(screen.getByRole('radio', { name: '3 phút' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', { name: '5 phút' }).getAttribute('aria-checked')).toBe('false')
    fireEvent.keyDown(group, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith('5m')
  })
})

describe('CircularTimer', () => {
  it('is a progressbar that spells the remaining time out for screen readers', () => {
    render(<CircularTimer remaining={3} total={30} label="Câu hỏi" />)
    const timer = screen.getByRole('progressbar', { name: 'Câu hỏi' })
    expect(timer.getAttribute('aria-valuenow')).toBe('3')
    expect(timer.getAttribute('aria-valuemax')).toBe('30')
    expect(timer.getAttribute('aria-valuetext')).toBe('3 giây còn lại')
  })

  it('clamps out-of-range values', () => {
    render(<CircularTimer remaining={-5} total={30} label="Câu hỏi" />)
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0')
  })
})

describe('Avatar & Badge', () => {
  it('renders initials and the player name for assistive tech', () => {
    render(<Avatar name="Lê Thu Hà" status="online" />)
    expect(screen.getByText('LH')).toBeTruthy()
    expect(screen.getByText('Lê Thu Hà')).toBeTruthy()
    expect(screen.getByText('Đang trực tuyến')).toBeTruthy()
  })

  it('renders badge text alongside the tone', () => {
    render(<Badge tone="danger">Mất kết nối</Badge>)
    expect(screen.getByText('Mất kết nối')).toBeTruthy()
  })
})

describe('Dialog', () => {
  it('is a labelled modal that closes on Escape and restores body scroll', () => {
    const onClose = vi.fn()
    const { unmount } = render(
      <Dialog open onClose={onClose} title="Rời phòng Quiz?" description="Bạn sẽ mất điểm câu đang trả lời.">
        <p>Nội dung</p>
      </Dialog>
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy()
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    unmount()
    expect(document.body.style.overflow).toBe('')
  })
})

function ToastHarness(): ReactElement {
  const toasts = useToasts()
  return (
    <div>
      <button type="button" onClick={() => toasts.push({ title: 'Đã lưu bộ đề', tone: 'success', duration: 0 })}>
        Hiện toast
      </button>
      <ToastHost toasts={toasts.toasts} onDismiss={toasts.dismiss} />
    </div>
  )
}

describe('ToastHost', () => {
  it('announces a toast politely and lets the user dismiss it', () => {
    render(<ToastHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Hiện toast' }))
    const toast = screen.getByRole('status')
    expect(toast.textContent).toContain('Đã lưu bộ đề')
    expect(toast.getAttribute('aria-live')).toBe('polite')

    fireEvent.click(screen.getByRole('button', { name: 'Đóng thông báo' }))
    expect(screen.queryByRole('status')).toBeNull()
  })
})
