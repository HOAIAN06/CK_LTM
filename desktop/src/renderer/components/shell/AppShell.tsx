import type { ReactNode } from 'react'
import { cn } from '../ui/cn'

export interface AppShellProps {
  /** Rendered in the fixed top row (custom title bar). */
  titleBar: ReactNode
  /** Left navigation; its own width comes from layout tokens. */
  sidebar: ReactNode
  /** Optional in-content bar under the title bar (`AppHeader`). */
  header?: ReactNode
  /** Optional right rail (live scores, camera, hints). Hidden under 1280px. */
  rightRail?: ReactNode
  children: ReactNode
  /** Max width of the content column: 1120px default, `full` for data views. */
  contentWidth?: 'default' | 'wide' | 'full'
  /** Removes the content padding for screens that draw edge-to-edge. */
  bleed?: boolean
  className?: string
}

const WIDTH = {
  default: 'max-w-[var(--nq-content-max)]',
  wide: 'max-w-[1440px]',
  full: 'max-w-none',
} as const

/**
 * Application frame for the frameless Electron window.
 *
 * ```
 * ┌───────────── title bar (drag region) ─────────────┐
 * │ sidebar │ header                                  │
 * │         │ ┌──────── content column ──────┐ rail   │
 * ```
 *
 * The document itself never scrolls; only the content column does, which keeps
 * the title bar, sidebar and rail visually anchored. Breakpoints:
 * 1024px — tighter gutters, rail hidden; 1280px — rail appears, 32px gutters;
 * 1600px+ — 40px gutters and a wider column.
 */
export function AppShell({
  titleBar,
  sidebar,
  header,
  rightRail,
  children,
  contentWidth = 'default',
  bleed = false,
  className,
}: AppShellProps): ReactNode {
  return (
    <div
      className={cn('grid h-dvh min-h-0 grid-rows-[auto_minmax(0,1fr)] bg-nq-bg', className)}
      data-nq-shell=""
    >
      <a href="#nq-main" className="nq-skip-link">
        Bỏ qua điều hướng
      </a>
      {titleBar}
      {/*
        The body grid MUST declare its row track. With only `grid-cols-*`, the
        single implicit row is `auto`, so it grows to the content height and the
        sidebar (and its footer) is pushed far below the viewport even though the
        outer row is `minmax(0,1fr)`. `minmax(0,1fr)` bounds the row to the
        remaining height, which is what keeps the sidebar footer pinned and makes
        `<main>` the only scrolling region.
      */}
      <div
        data-nq-shell-body=""
        className="grid h-full min-h-0 grid-cols-[auto_minmax(0,1fr)] grid-rows-[minmax(0,1fr)]"
      >
        {sidebar}
        <div className="flex min-h-0 min-w-0 flex-col">
          {header ? <div className="flex min-h-0 shrink-0 px-5 lg:px-7 xl:px-8">{header}</div> : null}
          <div className="flex min-h-0 flex-1">
            <main
              id="nq-main"
              tabIndex={-1}
              className={cn(
                'nq-scroll min-h-0 flex-1 focus-visible:outline-none',
                bleed ? '' : 'px-5 lg:px-7 xl:px-8 2xl:px-10'
              )}
            >
              <div
                className={cn('nq-page-enter w-full', WIDTH[contentWidth], !bleed && 'mx-auto py-6 xl:py-7')}
              >
                {children}
              </div>
            </main>
            {rightRail ? (
              <aside
                aria-label="Bảng phụ"
                className="hidden w-[var(--nq-rail-width)] shrink-0 border-l border-nq-border bg-nq-surface xl:flex xl:flex-col"
              >
                <div className="nq-scroll min-h-0 flex-1 px-4 py-5">{rightRail}</div>
              </aside>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
