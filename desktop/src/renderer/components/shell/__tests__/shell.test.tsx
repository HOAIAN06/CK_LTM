// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AppSidebar, AppTitleBar, AppShell, CommandPalette, PageHeader, normalizeSearch } from '..'
import type { CommandItem, NavItem } from '..'

afterEach(() => {
  cleanup()
})

const NAV: ReadonlyArray<NavItem> = [
  { id: 'home', label: 'Trang chủ' },
  { id: 'ranked', label: 'Đấu hạng 1v1', group: 'Chơi' },
  { id: 'quiz', label: 'Phòng Quiz' },
  { id: 'friends', label: 'Bạn bè', group: 'Cộng đồng' },
]

describe('normalizeSearch', () => {
  it('strips Vietnamese diacritics so unaccented queries match', () => {
    expect(normalizeSearch('Bảng xếp hạng')).toBe('bang xep hang')
    expect(normalizeSearch('Đấu hạng 1v1')).toBe('dau hang 1v1')
  })
})

describe('CommandPalette', () => {
  const commands: ReadonlyArray<CommandItem> = [
    { id: 'board', label: 'Bảng xếp hạng', hint: 'Theo tổng điểm', run: vi.fn() },
    { id: 'quiz', label: 'Phòng Quiz', run: vi.fn() },
  ]

  it('filters without accents and runs the highlighted command on Enter', () => {
    const onOpenChange = vi.fn()
    const board = commands[0]!
    render(<CommandPalette open onOpenChange={onOpenChange} commands={commands} />)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'bxh' } })
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(1)
    expect(options[0]!.textContent).toContain('Bảng xếp hạng')

    fireEvent.keyDown(input, { key: 'Enter' })
    expect(board.run).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('closes on Escape', () => {
    const onOpenChange = vi.fn()
    render(<CommandPalette open onOpenChange={onOpenChange} commands={commands} />)
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

describe('AppSidebar', () => {
  it('marks the active route with aria-current and exposes a navigation landmark', () => {
    render(<AppSidebar items={NAV} activeId="quiz" onNavigate={() => undefined} />)
    const nav = screen.getByRole('navigation', { name: 'Điều hướng chính' })
    expect(nav).toBeTruthy()
    const active = screen.getByRole('button', { name: 'Phòng Quiz' })
    expect(active.getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('button', { name: 'Trang chủ' }).getAttribute('aria-current')).toBeNull()
  })

  it('collapses to an icon rail and keeps every item reachable by name', () => {
    render(<AppSidebar items={NAV} activeId="home" onNavigate={() => undefined} collapsed />)
    expect(screen.getByRole('complementary').getAttribute('data-collapsed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Bạn bè' })).toBeTruthy()
  })

  it('moves focus through the list with the arrow keys', () => {
    render(<AppSidebar items={NAV} activeId="home" onNavigate={() => undefined} />)
    const home = screen.getByRole('button', { name: 'Trang chủ' })
    home.focus()
    fireEvent.keyDown(home, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Đấu hạng 1v1' }))
  })
})

describe('PageHeader', () => {
  it('renders exactly one level-one heading with its subtitle', () => {
    render(<PageHeader eyebrow="Thư viện" title="Bảng xếp hạng" subtitle="Cập nhật mỗi 30 giây." />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.textContent).toBe('Bảng xếp hạng')
    expect(screen.getByText('Cập nhật mỗi 30 giây.')).toBeTruthy()
  })
})

describe('AppShell layout contract', () => {
  /*
   * jsdom has no layout engine, so this guards the *cause* rather than the
   * pixels: the body grid must declare an explicit `minmax(0,1fr)` row track.
   * Without it the implicit `auto` row grows to content height and pushes the
   * sidebar footer below the viewport (measured: aside 3183px in a 900px
   * window before the fix, 860px after — see docs/desktop/design-system.md).
   */
  it('bounds the body row so only the content column scrolls', () => {
    render(
      <AppShell titleBar={<div>bar</div>} sidebar={<AppSidebar items={NAV} activeId="home" onNavigate={() => undefined} />}>
        <p>content</p>
      </AppShell>
    )
    const body = document.querySelector('[data-nq-shell-body]')
    expect(body).toBeTruthy()
    expect(body!.className).toContain('grid-rows-[minmax(0,1fr)]')
    expect(body!.className).toContain('min-h-0')
    /* the scrolling region is <main>, not the document */
    const main = document.querySelector('main')
    expect(main?.className).toContain('nq-scroll')
  })

  it('keeps the user footer inside the sidebar landmark', () => {
    render(
      <AppShell
        titleBar={<div>bar</div>}
        sidebar={
          <AppSidebar
            items={NAV}
            activeId="home"
            onNavigate={() => undefined}
            user={{ name: 'Nguyễn Minh Anh', meta: '1 240 điểm' }}
            onLogout={() => undefined}
          />
        }
      >
        <p>content</p>
      </AppShell>
    )
    const sidebar = screen.getByRole('complementary')
    const logout = screen.getByRole('button', { name: 'Đăng xuất' })
    expect(sidebar.contains(logout)).toBe(true)
    /* Avatar also renders the name for screen readers → allow duplicates. */
    expect(screen.getAllByText('Nguyễn Minh Anh').length).toBeGreaterThan(0)
  })
})

describe('AppTitleBar window controls', () => {
  it('reserves the native overlay strip by default', () => {
    render(<AppTitleBar theme="dark" onThemeChange={() => undefined} />)
    const bar = document.querySelector('header')!
    expect(bar.getAttribute('data-window-controls-reserve')).toBe('true')
    expect(bar.getAttribute('style')).toContain('var(--nq-titlebar-controls-width)')
  })

  it('does not reserve when the app draws its own controls', () => {
    render(<AppTitleBar onMinimize={() => undefined} onClose={() => undefined} />)
    const bar = document.querySelector('header')!
    expect(bar.getAttribute('data-window-controls-reserve')).toBe('false')
    expect(bar.getAttribute('style') ?? '').not.toContain('--nq-titlebar-controls-width')
  })

  it('can opt out explicitly (macOS traffic lights)', () => {
    render(<AppTitleBar reserveWindowControls={false} />)
    const bar = document.querySelector('header')!
    expect(bar.getAttribute('data-window-controls-reserve')).toBe('false')
  })
})
