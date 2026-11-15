import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { cn } from '../ui/cn'
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Checkbox,
  CircularTimer,
  Dialog,
  EmptyState,
  ErrorBanner,
  IconButton,
  Input,
  Kbd,
  PasswordInput,
  ProgressBar,
  SegmentedControl,
  Select,
  Sheet,
  Skeleton,
  Switch,
  Tabs,
  Tag,
  Textarea,
  ToastHost,
  Tooltip,
  useToasts,
} from '../ui'
import {
  Bell,
  BookOpen,
  Camera,
  Check,
  ChevronRight,
  Clock,
  Copy,
  DoorOpen,
  History,
  Home,
  Info,
  Library,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Swords,
  Trophy,
  User,
  Users,
  X,
} from '../ui/icons'
import { AppTitleBar, type ConnectionState, type ThemeChoice } from './AppTitleBar'
import { AppSidebar, type NavItem } from './AppSidebar'
import { AppHeader, PageHeader } from './AppHeader'
import { AppShell } from './AppShell'
import { CommandPalette, type CommandItem } from './CommandPalette'

/* ---------------------------------------------------------------------------
   Layout helpers — only used by this gallery
   ------------------------------------------------------------------------- */

interface SectionProps {
  title: string
  description?: string
  children: ReactNode
  id?: string
}

function Section({ title, description, children, id }: SectionProps): ReactNode {
  return (
    <section id={id} className="scroll-mt-6 border-t border-nq-border-subtle pt-8 first:border-t-0 first:pt-0">
      <div className="mb-5">
        <h2 className="nq-display text-nq-xl text-nq-text">{title}</h2>
        {description ? (
          <p className="nq-pretty mt-1 max-w-[72ch] text-nq-sm leading-normal text-nq-text-secondary">
            {description}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  )
}

function Demo({ label, hint, children }: { label: string; hint?: string; children: ReactNode }): ReactNode {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <span className="nq-caps">{label}</span>
        {hint ? <span className="text-nq-2xs text-nq-text-tertiary">{hint}</span> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">{children}</div>
    </div>
  )
}

const SURFACE_TOKENS = [
  '--nq-bg',
  '--nq-bg-subtle',
  '--nq-surface',
  '--nq-surface-raised',
  '--nq-surface-overlay',
  '--nq-surface-sunken',
  '--nq-border',
  '--nq-border-strong',
  '--nq-border-subtle',
] as const

const TEXT_TOKENS = ['--nq-text', '--nq-text-secondary', '--nq-text-tertiary', '--nq-text-link'] as const

const ACCENT_TOKENS = [
  '--nq-primary',
  '--nq-primary-hover',
  '--nq-primary-soft',
  '--nq-accent',
  '--nq-accent-strong',
  '--nq-success',
  '--nq-warning',
  '--nq-danger',
  '--nq-info',
] as const

function Swatch({ token, role }: { token: string; role: 'surface' | 'text' | 'accent' }): ReactNode {
  const style =
    role === 'text'
      ? { color: `var(${token})` }
      : { backgroundColor: `var(${token})`, borderColor: 'var(--nq-border)' }
  return (
    <div className="flex min-w-36 flex-col gap-1.5">
      <div
        className={cn(
          'flex h-14 items-center justify-center rounded-nq-md border text-nq-sm font-semibold',
          role === 'text' ? 'border-nq-border bg-nq-surface' : ''
        )}
        style={style}
      >
        {role === 'text' ? 'Aa 日本語' : null}
      </div>
      <code className="truncate font-mono text-[10px] text-nq-text-tertiary">{token}</code>
    </div>
  )
}

/* ---------------------------------------------------------------------------
   Gallery
   ------------------------------------------------------------------------- */

export interface DesignPreviewProps {
  /**
   * Controlled theme. When provided, the gallery never touches
   * `<html data-theme>` — the host owns theme application, so a harness can
   * render both themes side by side. Omit for the standalone dev preview, which
   * then applies the theme itself (only after the user changes it).
   */
  theme?: ThemeChoice
  /** Called with the requested theme; also used in uncontrolled mode. */
  onThemeChange?: (theme: ThemeChoice) => void
}

function readAppliedTheme(): ThemeChoice {
  if (typeof document === 'undefined') return 'system'
  const current = document.documentElement.dataset.theme
  return current === 'light' || current === 'dark' ? current : 'system'
}

export function DesignPreview({ theme: themeProp, onThemeChange }: DesignPreviewProps = {}): ReactNode {
  const isThemeControlled = themeProp !== undefined
  const [ownTheme, setOwnTheme] = useState<ThemeChoice>(readAppliedTheme)
  /** Uncontrolled mode only writes after a user gesture, never on mount. */
  const [themeTouched, setThemeTouched] = useState(false)
  const theme = isThemeControlled ? themeProp : ownTheme
  const [collapsed, setCollapsed] = useState(false)
  const [connection, setConnection] = useState<ConnectionState>('connected')
  const [activeNav, setActiveNav] = useState('overview')
  const [tab, setTab] = useState('all')
  const [range, setRange] = useState('3m')
  const [motion, setMotion] = useState(true)
  const [sounds, setSounds] = useState(false)
  const [agree, setAgree] = useState(true)
  const [showPassword, setShowPassword] = useState('nihongoquest')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [liveSeconds, setLiveSeconds] = useState(24)
  const toasts = useToasts()

  const changeTheme = (next: ThemeChoice): void => {
    if (!isThemeControlled) {
      setOwnTheme(next)
      setThemeTouched(true)
    }
    onThemeChange?.(next)
  }

  /* Standalone fallback: apply the theme to <html data-theme> after a change.
     Controlled mode is a no-op so the host's harness keeps ownership. */
  useEffect(() => {
    if (isThemeControlled || !themeTouched) return
    const root = document.documentElement
    if (theme === 'system') {
      delete root.dataset.theme
    } else {
      root.dataset.theme = theme
    }
  }, [isThemeControlled, theme, themeTouched])

  /* Living timer demo: proves the ring + urgency states actually animate. */
  useEffect(() => {
    const id = window.setInterval(() => {
      setLiveSeconds((current) => (current <= 0 ? 30 : current - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  const navItems: ReadonlyArray<NavItem> = useMemo(
    () => [
      { id: 'overview', label: 'Trang chủ', icon: <Home size={18} /> },
      { id: 'ranked', label: 'Đấu hạng 1v1', icon: <Swords size={18} />, group: 'Chơi' },
      { id: 'quiz', label: 'Phòng Quiz', icon: <DoorOpen size={18} /> },
      { id: 'sets', label: 'Bộ đề', icon: <Library size={18} /> },
      { id: 'leaderboard', label: 'Bảng xếp hạng', icon: <Trophy size={18} />, group: 'Cộng đồng' },
      { id: 'friends', label: 'Bạn bè', icon: <Users size={18} />, badge: <Badge tone="danger" appearance="solid">3</Badge> },
      { id: 'history', label: 'Lịch sử', icon: <History size={18} /> },
      { id: 'profile', label: 'Hồ sơ', icon: <User size={18} />, group: 'Tài khoản' },
    ],
    []
  )

  const commands: ReadonlyArray<CommandItem> = useMemo(
    () => [
      { id: 'go-home', label: 'Về trang chủ', hint: 'Tổng quan tiến độ hôm nay', group: 'Điều hướng', icon: <Home size={16} />, run: () => setActiveNav('overview') },
      { id: 'go-ranked', label: 'Tìm trận đấu hạng', hint: '1v1 · 3 hoặc 5 phút', group: 'Điều hướng', icon: <Swords size={16} />, run: () => setActiveNav('ranked') },
      { id: 'go-quiz', label: 'Vào phòng Quiz bằng mã PIN', hint: '6 chữ số', group: 'Điều hướng', icon: <DoorOpen size={16} />, run: () => setActiveNav('quiz') },
      { id: 'go-sets', label: 'Quản lý bộ đề', hint: 'Bản nháp và đã xuất bản', group: 'Điều hướng', icon: <Library size={16} />, keywords: ['bo de', 'quiz set'], run: () => setActiveNav('sets') },
      { id: 'go-board', label: 'Bảng xếp hạng', hint: 'Xếp hạng theo tổng điểm', group: 'Điều hướng', icon: <Trophy size={16} />, keywords: ['bxh'], run: () => setActiveNav('leaderboard') },
      { id: 'act-theme', label: 'Đổi giao diện sáng / tối', group: 'Hành động', icon: <Settings size={16} />, shortcut: ['Ctrl', 'J'], run: () => changeTheme(theme === 'dark' ? 'light' : 'dark') },
      { id: 'act-toast', label: 'Hiện thông báo mẫu', group: 'Hành động', icon: <Bell size={16} />, run: () => toasts.push({ title: 'Đã lưu bộ đề', description: '12 câu hỏi đã được cập nhật.', tone: 'success' }) },
    ],
    [theme, toasts]
  )

  return (
    <>
      <AppShell
        titleBar={
          <AppTitleBar
            context="Design preview"
            theme={theme}
            onThemeChange={changeTheme}
            connection={{ state: connection }}
            rightSlot={
              <Tooltip content="Mở bảng lệnh (Ctrl/Cmd + K)" placement="bottom">
                <IconButton label="Mở bảng lệnh" size="sm" icon={<Search size={15} />} onClick={() => setPaletteOpen(true)} />
              </Tooltip>
            }
          />
        }
        sidebar={
          <AppSidebar
            items={navItems}
            activeId={activeNav}
            onNavigate={setActiveNav}
            collapsed={collapsed}
            onCollapsedChange={setCollapsed}
            user={{ name: 'Nguyễn Minh Anh', meta: '1 240 điểm · Hạng 12', status: 'online' }}
            onLogout={() => toasts.push({ title: 'Đã đăng xuất (demo)' })}
          />
        }
        header={
          <AppHeader
            left={<span className="nq-caps">Thư viện thành phần</span>}
            right={
              <>
                <SegmentedControl
                  label="Chế độ màu"
                  value={theme}
                  onChange={changeTheme}
                  size="sm"
                  options={[
                    { value: 'light', label: 'Sáng' },
                    { value: 'dark', label: 'Tối' },
                    { value: 'system', label: 'Hệ thống' },
                  ]}
                />
                <Button size="sm" variant="secondary" leftIcon={<Plus size={15} />} onClick={() => setDialogOpen(true)}>
                  Mở hộp thoại
                </Button>
              </>
            }
          />
        }
        rightRail={
          <div className="flex flex-col gap-4">
            <div>
              <p className="nq-caps mb-2">Trạng thái kết nối</p>
              <SegmentedControl
                label="Trạng thái kết nối"
                value={connection}
                onChange={setConnection}
                size="sm"
                fullWidth
                options={[
                  { value: 'connected', label: 'OK' },
                  { value: 'connecting', label: '…' },
                  { value: 'error', label: 'Lỗi' },
                ]}
              />
            </div>
            <div>
              <p className="nq-caps mb-2">Thanh điều hướng</p>
              <Button size="sm" variant="secondary" fullWidth onClick={() => setCollapsed((current) => !current)}>
                {collapsed ? 'Mở rộng rail' : 'Thu gọn thành rail'}
              </Button>
            </div>
            <div className="rounded-nq-lg border border-nq-border bg-nq-surface p-3">
              <p className="nq-caps mb-1.5">Điểm của bạn</p>
              <p className="nq-tabular nq-display nq-score-updated text-nq-3xl text-nq-text">1 240</p>
              <p className="mt-1 text-nq-xs text-nq-text-tertiary">+18 điểm ở trận gần nhất</p>
              <ProgressBar value={62} label="Tới hạng kế tiếp" showValue tone="accent" className="mt-3" />
            </div>
          </div>
        }
      >
        <PageHeader
          eyebrow="Hệ thống thiết kế · v1"
          title="Sumi — ngôn ngữ thị giác cho NihongoQuest"
          subtitle="Một nền giấy ấm, mực teal sâu và sắc xanh sage tiết chế. Mọi thành phần bên dưới dùng cùng token, cùng nhịp 8pt và cùng thang chuyển động 150–250 ms."
          meta={
            <>
              <Badge tone="primary" appearance="soft" dot>
                Sẵn sàng review
              </Badge>
              <Tag tone="accent">React 19</Tag>
              <Tag>Tailwind v4</Tag>
              <Tag>Không phụ thuộc font ngoài</Tag>
            </>
          }
          actions={
            <>
              <Button variant="secondary" leftIcon={<RefreshCw size={16} />} onClick={() => changeTheme('light')}>
                Xem bản sáng
              </Button>
              <Button leftIcon={<Check size={16} />} onClick={() => setDialogOpen(true)}>
                Kiểm tra hộp thoại
              </Button>
            </>
          }
        />

        <div className="flex flex-col gap-10">
          {/* ---------------------------------------------------------------- */}
          <Section
            title="Màu & bề mặt"
            description="Năm lớp bề mặt, hai sắc nhấn, bốn màu trạng thái. Không gradient, không bóng đổ trang trí — phân cấp đến từ bề mặt và đường kẻ mảnh."
          >
            <Demo label="Bề mặt">
              {SURFACE_TOKENS.map((token) => (
                <Swatch key={token} token={token} role="surface" />
              ))}
            </Demo>
            <Demo label="Chữ">
              {TEXT_TOKENS.map((token) => (
                <Swatch key={token} token={token} role="text" />
              ))}
            </Demo>
            <Demo label="Nhấn & trạng thái">
              {ACCENT_TOKENS.map((token) => (
                <Swatch key={token} token={token} role="accent" />
              ))}
            </Demo>
          </Section>

          {/* ---------------------------------------------------------------- */}
          <Section
            title="Kiểu chữ"
            description="Một họ chữ humanist cho UI, một bản display siết chặt cho tiêu đề, và một stack tiếng Nhật thật (Noto Sans JP → Hiragino → Yu Gothic → Meiryo). Không tải font từ CDN."
          >
            <div className="rounded-nq-lg border border-nq-border bg-nq-surface p-6">
              <p className="nq-caps mb-3">Display · 30/36 · tracking −0.018em</p>
              <p className="nq-display text-nq-3xl text-nq-text">Hôm nay bạn muốn chinh phục điều gì?</p>
              <p className="mt-4 text-nq-base leading-normal text-nq-text-secondary">
                Một trận đấu nhanh, một phòng Quiz cùng bạn bè hoặc một bộ đề mới. Mỗi lựa chọn đều giúp bạn
                tiến gần hơn tới mục tiêu. Chữ tiếng Việt có dấu được kiểm tra ở cỡ nhỏ nhất: “Trăm năm trong
                cõi người ta, chữ tài chữ mệnh khéo là ghét nhau.”
              </p>
              <div className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-3">
                {['text-nq-5xl', 'text-nq-4xl', 'text-nq-3xl', 'text-nq-2xl', 'text-nq-xl', 'text-nq-lg', 'text-nq-base', 'text-nq-md', 'text-nq-sm', 'text-nq-xs'].map(
                  (size) => (
                    <span key={size} className={cn('nq-display text-nq-text', size)}>
                      Aa 44
                    </span>
                  )
                )}
              </div>
              <div className="mt-6 grid gap-4 border-t border-nq-border-subtle pt-5 md:grid-cols-2">
                <div>
                  <p className="nq-caps mb-1.5">Tiếng Nhật · Noto Sans JP</p>
                  <p className="font-jp text-nq-xl leading-relaxed text-nq-text">日本語を毎日少しずつ</p>
                  <p className="mt-1 font-jp text-nq-sm leading-relaxed text-nq-text-secondary">
                    漢字・ひらがな・カタカナ・語彙・文法
                  </p>
                </div>
                <div>
                  <p className="nq-caps mb-1.5">Số liệu · tabular</p>
                  <p className="nq-tabular text-nq-xl text-nq-text">180s · 1 240 · 08:45</p>
                  <p className="nq-tabular mt-1 text-nq-sm text-nq-text-secondary">PIN 482 913 · 62%</p>
                </div>
              </div>
            </div>
          </Section>

          {/* ---------------------------------------------------------------- */}
          <Section title="Nút" description="Bốn biến thể, ba kích thước, bốn trạng thái. Chỉ một nút primary cho mỗi màn hình.">
            <Demo label="Primary">
              <Button size="lg">Tìm trận 1v1</Button>
              <Button leftIcon={<Play size={16} />}>Bắt đầu</Button>
              <Button size="sm">Nhỏ</Button>
              <Button loading>Đang gửi</Button>
              <Button disabled>Không khả dụng</Button>
            </Demo>
            <Demo label="Secondary / Ghost / Danger">
              <Button variant="secondary" leftIcon={<Library size={16} />}>
                Chọn bộ đề
              </Button>
              <Button variant="ghost" rightIcon={<ChevronRight size={16} />}>
                Bỏ qua
              </Button>
              <Button variant="danger" leftIcon={<X size={16} />}>
                Hủy phòng
              </Button>
              <Button variant="secondary" size="sm" loading>
                Đang lưu
              </Button>
            </Demo>
            <Demo label="Icon button">
              <IconButton label="Sao chép PIN" icon={<Copy size={16} />} variant="secondary" />
              <IconButton label="Bật camera" icon={<Camera size={16} />} />
              <IconButton label="Xóa" icon={<X size={16} />} variant="danger" />
              <IconButton label="Bảo mật" icon={<ShieldCheck size={16} />} size="lg" variant="primary" />
            </Demo>
            <Demo label="Keycap">
              <span className="flex items-center gap-1.5 text-nq-xs text-nq-text-secondary">
                Mở bảng lệnh <Kbd>Ctrl</Kbd>
                <Kbd>K</Kbd>
              </span>
              <Kbd size="sm">Esc</Kbd>
              <Kbd size="sm">Enter</Kbd>
            </Demo>
          </Section>

          {/* ---------------------------------------------------------------- */}
          <Section title="Biểu mẫu" description="Nhãn — điều khiển — trợ giúp/lỗi theo một nhịp dọc duy nhất. Lỗi luôn là chữ, không chỉ là màu.">
            <div className="grid gap-5 rounded-nq-lg border border-nq-border bg-nq-surface p-5 md:grid-cols-2">
              <Input label="Tên đăng nhập" placeholder="minhanh" hint="3–24 ký tự, không dấu cách." leftIcon={<User size={16} />} />
              <PasswordInput label="Mật khẩu" value={showPassword} onChange={(event) => setShowPassword(event.target.value)} hint="Tối thiểu 8 ký tự." />
              <Input
                label="Mã PIN phòng"
                placeholder="482913"
                mono
                defaultValue="482913"
                hint="6 chữ số do host chia sẻ."
                rightSlot={<Kbd size="sm">⏎</Kbd>}
              />
              <Input
                label="Mã PIN phòng"
                placeholder="482913"
                mono
                defaultValue="4829"
                error="Mã PIN phải gồm đúng 6 chữ số."
              />
              <Select
                label="Thời lượng trận"
                defaultValue="3"
                options={[
                  { value: '3', label: '3 phút · 12 câu' },
                  { value: '5', label: '5 phút · 20 câu' },
                ]}
              />
              <Select label="Bộ đề" defaultValue="jlpt" disabled options={[{ value: 'jlpt', label: 'JLPT N4 · Từ vựng' }]} hint="Đang tải danh sách bộ đề." />
              <Textarea label="Mô tả bộ đề" placeholder="Mô tả ngắn cho người chơi…" defaultValue="Bộ đề luyện từ vựng N4 theo chủ đề trường học." className="md:col-span-2" />
              <div className="flex flex-col gap-3 md:col-span-2">
                <Switch label="Giảm chuyển động" description="Tắt hiệu ứng chuyển cảnh và hiệu ứng điểm số." checked={motion} onCheckedChange={setMotion} />
                <Switch label="Âm thanh" description="Ứng dụng không phát âm thanh theo quyết định D-015." checked={sounds} onCheckedChange={setSounds} />
                <Checkbox
                  label="Tôi đồng ý chia sẻ camera khi thi đấu"
                  description="Camera lỗi không chặn việc tham gia phòng."
                  checked={agree}
                  onChange={(event) => setAgree(event.target.checked)}
                />
                <Checkbox label="Chọn tất cả" indeterminate checked={false} onChange={() => undefined} />
              </div>
            </div>
          </Section>

          {/* ---------------------------------------------------------------- */}
          <Section title="Điều khiển phân đoạn & tab" description="Roving tabindex: Tab vào một lần, phím mũi tên di chuyển lựa chọn.">
            <Demo label="Segmented">
              <SegmentedControl
                label="Thời lượng trận"
                value={range}
                onChange={setRange}
                options={[
                  { value: '3m', label: '3 phút' },
                  { value: '5m', label: '5 phút' },
                  { value: 'free', label: 'Tự do', disabled: true },
                ]}
              />
              <SegmentedControl
                label="Bảng xếp hạng theo"
                value="week"
                onChange={() => undefined}
                size="sm"
                options={[
                  { value: 'today', label: 'Hôm nay' },
                  { value: 'week', label: 'Tuần này' },
                  { value: 'all', label: 'Tất cả' },
                ]}
              />
            </Demo>
            <Demo label="Tabs">
              <div className="w-full">
                <Tabs
                  label="Bộ lọc lịch sử"
                  value={tab}
                  onChange={setTab}
                  items={[
                    { value: 'all', label: 'Tất cả', badge: <Badge tone="neutral">24</Badge> },
                    { value: 'win', label: 'Thắng' },
                    { value: 'loss', label: 'Thua' },
                    { value: 'quiz', label: 'Phòng Quiz' },
                  ]}
                />
                <p className="mt-3 text-nq-sm text-nq-text-secondary">Đang xem: {tab}</p>
              </div>
            </Demo>
          </Section>

          {/* ---------------------------------------------------------------- */}
          <Section title="Thẻ, nhãn, danh tính" description="Card 14px, popover 20px, pill tròn hoàn toàn. Không trộn bán kính trong cùng một khối.">
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              <Card accent="primary">
                <CardHeader
                  eyebrow="Đấu hạng"
                  title="Tìm trận 1v1"
                  description="Ghép đối thủ theo điểm, 180 hoặc 300 giây."
                  icon={<Swords size={18} />}
                  action={<Badge tone="success" dot>Trực tuyến</Badge>}
                />
                <CardBody>Điểm của bạn: 1 240. Đối thủ gần nhất: 1 210.</CardBody>
                <CardFooter>
                  <Button size="sm">Tìm trận</Button>
                  <Button size="sm" variant="ghost">
                    Xem luật
                  </Button>
                </CardFooter>
              </Card>

              <Card tone="sunken">
                <CardHeader title="Bộ đề nháp" description="Chỉ bạn nhìn thấy bộ đề này." icon={<BookOpen size={18} />} />
                <CardBody>
                  <div className="flex flex-wrap gap-1.5">
                    <Tag tone="primary">JLPT N4</Tag>
                    <Tag tone="accent">Từ vựng</Tag>
                    <Tag>12 câu</Tag>
                    <Tag tone="warning" onRemove={() => undefined} removeLabel="Xóa thẻ nháp">
                      Nháp
                    </Tag>
                  </div>
                </CardBody>
                <CardFooter>
                  <Badge tone="warning" appearance="soft" dot>
                    Chưa xuất bản
                  </Badge>
                  <Badge tone="info" appearance="outline">
                    Riêng tư
                  </Badge>
                </CardFooter>
              </Card>

              <Card tone="raised">
                <CardHeader title="Người chơi" description="Danh tính, trạng thái và vai trò." />
                <CardBody>
                  <div className="flex flex-col gap-3">
                    {[
                      { name: 'Nguyễn Minh Anh', meta: 'Host · Hạng 12', status: 'online' as const },
                      { name: 'Trần Bảo Long', meta: 'Sẵn sàng', status: 'away' as const },
                      { name: 'Lê Thu Hà', meta: 'Camera tắt', status: 'busy' as const },
                    ].map((player, index) => (
                      <div key={player.name} className="flex items-center gap-2.5">
                        <Avatar name={player.name} size="sm" status={player.status} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-nq-sm font-medium text-nq-text">{player.name}</p>
                          <p className="text-nq-2xs text-nq-text-tertiary">{player.meta}</p>
                        </div>
                        {index === 0 ? (
                          <Badge tone="primary">HOST</Badge>
                        ) : (
                          <Badge tone="success" appearance="soft" dot>
                            OK
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            </div>
            <Demo label="Badge & Tag">
              <Badge tone="primary">Primary</Badge>
              <Badge tone="accent">Accent</Badge>
              <Badge tone="success" dot>
                Đúng
              </Badge>
              <Badge tone="warning">Sắp hết giờ</Badge>
              <Badge tone="danger" appearance="solid">
                Mất kết nối
              </Badge>
              <Badge tone="info" appearance="outline">
                Thông tin
              </Badge>
              <Badge tone="neutral">Trung tính</Badge>
            </Demo>
          </Section>

          {/* ---------------------------------------------------------------- */}
          <Section title="Tiến trình & thời gian" description="Vòng đếm ngược đổi màu theo ngưỡng nhưng vẫn có con số — không phụ thuộc màu sắc.">
            <div className="grid gap-4 rounded-nq-lg border border-nq-border bg-nq-surface p-5 sm:grid-cols-2 xl:grid-cols-4">
              <div className="flex flex-col items-center gap-2">
                <CircularTimer remaining={24} total={30} label="Câu hỏi" />
                <span className="text-nq-2xs text-nq-text-tertiary">Bình tĩnh</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <CircularTimer remaining={8} total={30} label="Sắp hết" />
                <span className="text-nq-2xs text-nq-text-tertiary">Cảnh báo ≤ 10s</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <CircularTimer remaining={3} total={30} label="Khẩn cấp" size={96} />
                <span className="text-nq-2xs text-nq-text-tertiary">Nguy cấp ≤ 5s</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <CircularTimer remaining={liveSeconds} total={30} label="Trực tiếp" format="clock" />
                <span className="text-nq-2xs text-nq-text-tertiary">Đang chạy</span>
              </div>
            </div>
            <div className="grid gap-5 rounded-nq-lg border border-nq-border bg-nq-surface p-5 md:grid-cols-2">
              <ProgressBar value={72} label="Tiến độ bộ đề" showValue />
              <ProgressBar value={38} label="Tỷ lệ chính xác" showValue tone="accent" size="md" />
              <ProgressBar value={92} label="Mùa giải" showValue tone="success" />
              <ProgressBar value={12} label="Kết nối lại" showValue tone="warning" />
            </div>
          </Section>

          {/* ---------------------------------------------------------------- */}
          <Section title="Trạng thái tải & trống" description="Skeleton giữ đúng kích thước cuối; empty state luôn nói vì sao trống và làm gì tiếp.">
            <div className="grid gap-4 md:grid-cols-2">
              <Card padding="md">
                <div className="flex items-center gap-3">
                  <Skeleton width="40px" height="40px" rounded="full" />
                  <div className="flex-1">
                    <Skeleton width="60%" height="12px" />
                    <Skeleton width="40%" height="10px" className="mt-2" />
                  </div>
                </div>
                <div className="mt-4">
                  <Skeleton lines={3} height="10px" />
                </div>
              </Card>
              <EmptyState
                size="sm"
                icon={<Trophy size={20} />}
                title="Chưa có trận nào tuần này"
                description="Chơi một trận 1v1 hoặc vào phòng Quiz của bạn bè để bắt đầu ghi điểm."
                action={<Button size="sm">Tìm trận ngay</Button>}
              />
            </div>
            <ErrorBanner
              title="Không kết nối được máy chủ"
              description="Đã thử cổng 5000 trong 5 giây. Kiểm tra máy chủ đang chạy rồi thử lại."
              onRetry={() => toasts.push({ title: 'Đang kết nối lại…', tone: 'info' })}
              onDismiss={() => undefined}
            />
            <ErrorBanner
              tone="warning"
              title="Camera chưa sẵn sàng"
              description="Bạn vẫn có thể vào phòng và thi đấu; proctoring sẽ ghi nhận thiếu video."
            />
            <ErrorBanner tone="info" title="Server là nguồn quyết định" description="Điểm, đáp án và thời gian do máy chủ tính; giao diện chỉ hiển thị." />
          </Section>

          {/* ---------------------------------------------------------------- */}
          <Section title="Lớp phủ, thông báo & lệnh" description="Hộp thoại và sheet có focus trap, Escape và trả focus. Toast là một live region polite duy nhất.">
            <Demo label="Mở thử">
              <Button variant="secondary" onClick={() => setDialogOpen(true)}>
                Hộp thoại xác nhận
              </Button>
              <Button variant="secondary" onClick={() => setSheetOpen(true)}>
                Sheet chi tiết người chơi
              </Button>
              <Button variant="secondary" onClick={() => setPaletteOpen(true)} leftIcon={<Search size={16} />}>
                Bảng lệnh
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  toasts.push({
                    title: 'Đã cập nhật điểm',
                    description: 'Bạn vừa nhận +18 điểm từ câu trả lời đúng.',
                    tone: 'success',
                    action: { label: 'Xem chi tiết', onClick: () => setSheetOpen(true) },
                  })
                }
              >
                Hiện toast thành công
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  toasts.push({ title: 'Không gửi được câu trả lời', description: 'Kết nối đã đóng. Đang thử lại…', tone: 'danger', duration: 8000 })
                }
              >
                Hiện toast lỗi
              </Button>
              <Tooltip content="Tooltip hiện cả khi focus bằng bàn phím">
                <IconButton label="Thông tin thêm" icon={<Info size={16} />} variant="secondary" />
              </Tooltip>
            </Demo>
          </Section>

          {/* ---------------------------------------------------------------- */}
          <Section title="Khung ứng dụng" description="Title bar kéo cửa sổ, sidebar thu gọn thành rail 72px, cột nội dung tối đa 1120px và rail phải chỉ hiện từ 1280px.">
            <div className="grid gap-4 rounded-nq-lg border border-nq-border bg-nq-surface p-5 md:grid-cols-3">
              <div>
                <p className="nq-caps mb-1.5">Title bar</p>
                <p className="text-nq-sm leading-normal text-nq-text-secondary">
                  Vùng kéo chiếm toàn bộ thanh; mọi nút tự động `no-drag` nên không bị nuốt click.
                </p>
              </div>
              <div>
                <p className="nq-caps mb-1.5">Sidebar</p>
                <p className="text-nq-sm leading-normal text-nq-text-secondary">
                  248px mở rộng / 72px rail. Một tab stop, phím mũi tên di chuyển, nhãn thành tooltip khi thu gọn.
                </p>
              </div>
              <div>
                <p className="nq-caps mb-1.5">Breakpoint</p>
                <p className="nq-tabular text-nq-sm leading-normal text-nq-text-secondary">
                  1024 lề 20px · 1280 lề 32px + rail · ≥1536 lề 40px
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl
                label="Trạng thái kết nối (title bar)"
                value={connection}
                onChange={setConnection}
                size="sm"
                options={[
                  { value: 'idle', label: 'Idle' },
                  { value: 'connecting', label: 'Connecting' },
                  { value: 'connected', label: 'Connected' },
                  { value: 'disconnected', label: 'Disconnected' },
                  { value: 'error', label: 'Error' },
                ]}
              />
              <span className="flex items-center gap-1.5 text-nq-xs text-nq-text-tertiary">
                <Clock size={14} aria-hidden="true" /> Đồng hồ câu hỏi 30s · thời gian phòng 180s
              </span>
            </div>
          </Section>
        </div>
      </AppShell>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Rời phòng Quiz?"
        description="Bạn đang ở phòng 482 913 với 3 người chơi. Rời phòng sẽ mất điểm của câu đang trả lời."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Ở lại
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDialogOpen(false)
                toasts.push({ title: 'Đã rời phòng', tone: 'warning' })
              }}
            >
              Rời phòng
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input label="Nhập PIN để xác nhận" placeholder="482913" mono />
          <p className="text-nq-xs text-nq-text-tertiary">Hộp thoại: Escape để đóng, Tab bị giữ trong panel.</p>
        </div>
      </Dialog>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Trần Bảo Long"
        description="Hạng 28 · 980 điểm · 41 trận"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSheetOpen(false)}>
              Đóng
            </Button>
            <Button onClick={() => setSheetOpen(false)}>Mời 1v1</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar name="Trần Bảo Long" size="lg" status="online" />
            <div>
              <p className="text-nq-sm font-semibold text-nq-text">Trần Bảo Long</p>
              <p className="text-nq-xs text-nq-text-secondary">Thắng 24 · Hòa 3 · Thua 14</p>
            </div>
          </div>
          <ProgressBar value={68} label="Tỷ lệ chính xác" showValue tone="accent" />
          <div className="flex flex-wrap gap-1.5">
            <Tag tone="primary">JLPT N4</Tag>
            <Tag tone="accent">Từ vựng</Tag>
            <Tag>Chuỗi 6 ngày</Tag>
          </div>
          <p className="text-nq-xs leading-normal text-nq-text-tertiary">
            Sheet dùng cùng focus trap với Dialog nhưng trượt từ cạnh phải và không chặn luồng chính.
          </p>
        </div>
      </Sheet>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        commands={commands}
        triggerShortcut={['Ctrl', 'K']}
      />

      <ToastHost toasts={toasts.toasts} onDismiss={toasts.dismiss} />
    </>
  )
}
