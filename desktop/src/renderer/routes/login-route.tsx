/**
 * `/login` — màn hình xác thực thật, nối trực tiếp vào protocol TCP hiện có.
 *
 * Luồng (docs/protocol.md §2–3):
 *   connect → CONNECT → LOGIN | REGISTER
 *   → LOGIN_OK (PlayerStats) → vào `/`
 *   → REGISTER_OK (server KHÔNG tạo phiên) → tự gửi LOGIN với cùng credentials
 *   → LOGIN_FAIL | REGISTER_FAIL → hiển thị đúng field + câu tiếng Việt
 *
 * Bất biến:
 * - Mật khẩu chỉ sống trong state của component và một ref tạm cho bước auto-login;
 *   không log, không persist, xoá ngay khi phiên mở hoặc khi unmount.
 * - Server là nguồn quyết định: client không tự tạo phiên, không bỏ qua bước LOGIN.
 * - Không gửi trùng: `pendingRef` chặn mọi lần submit thứ hai khi yêu cầu đang chờ.
 */
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode
} from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import type { ConnectionStatus } from '@shared/ipc'
import type { Credentials, OutboundMessage } from '@shared/protocol'
import {
  Badge,
  Button,
  Card,
  Check,
  ChevronDown,
  ErrorBanner,
  Input,
  PasswordInput,
  Tabs,
  TriangleAlert,
  type BadgeTone,
  type TabItem
} from '../components/ui'
import { BookOpen, DoorOpen, Library, Settings, ShieldCheck, Swords, Wifi } from '../components/ui/icons'
import { AppTitleBar } from '../components/shell'
import { DemoBadge } from '../app/demo-badge'
import { useTheme } from '../app/theme-provider'
import { isBridgeAvailable, readAppInfo, BRIDGE_UNAVAILABLE } from '../lib/bridge'
import { useConnectionStore } from '../lib/connection-store'
import { useSessionStore } from '../lib/session-store'
import {
  UI_ERROR,
  describeErrorCode,
  errorCodeLabel,
  type ErrorCopy,
  type FormField
} from '../lib/error-codes'
import { useServerMessage } from '../lib/hooks'
import {
  describeServerTarget,
  readServerTarget,
  writeServerTarget,
  type ServerTarget
} from '../lib/server-config'
import {
  CONFIRM_HINT,
  PASSWORD_HINT,
  USERNAME_HINT,
  firstInvalidField,
  parsePort,
  validateAuthForm,
  validateHost,
  validateServerTarget,
  type AuthMode,
  type FieldErrors
} from '../lib/validation'

/** Server không trả lời trong 15 giây thì UI phải mở lại form, không được treo. */
const REQUEST_TIMEOUT_MS = 15_000

/**
 * Kết nối được coi là "có từ trước" khi `connectedAt` cũ hơn mốc mount quá ngưỡng này.
 * Một lần kết nối mới luôn có `connectedAt` sát thời điểm mount (F-07).
 */
const STALE_SESSION_TOLERANCE_MS = 5_000

const FIELD_IDS: Record<FormField, string> = {
  username: 'auth-username',
  password: 'auth-password',
  confirm: 'auth-confirm',
  host: 'auth-host',
  port: 'auth-port'
}

/** Khớp `id` do `Tabs` sinh ra với `idPrefix="auth"` (xem components/ui/Tabs.tsx). */
const TAB_PANEL_ID = {
  login: 'auth-panel-login',
  register: 'auth-panel-register'
} as const
const TAB_ID = {
  login: 'auth-tab-login',
  register: 'auth-tab-register'
} as const

const CONNECTION_PILL: Record<ConnectionStatus['state'], { label: string; tone: BadgeTone }> = {
  idle: { label: 'Chưa kết nối', tone: 'neutral' },
  connecting: { label: 'Đang kết nối', tone: 'warning' },
  connected: { label: 'Đã kết nối', tone: 'success' },
  disconnected: { label: 'Mất kết nối', tone: 'danger' },
  error: { label: 'Lỗi kết nối', tone: 'danger' }
}

const FEATURES = [
  {
    icon: Swords,
    title: 'Đấu hạng 1v1',
    description: 'Câu hỏi 30 giây, đối thủ cùng trình độ, kết quả do máy chủ chốt.'
  },
  {
    icon: DoorOpen,
    title: 'Phòng Quiz nhóm',
    description: 'Tạo phòng bằng PIN và thi cùng lớp, tối đa 20 người chơi.'
  },
  {
    icon: Library,
    title: 'Bộ đề tự soạn',
    description: 'Soạn, xuất bản và dùng lại bộ câu hỏi cho từng buổi học.'
  }
] as const

interface Issue {
  copy: ErrorCopy
  code: string | null
}

function toIssue(code: string | null | undefined): Issue {
  return { copy: describeErrorCode(code), code: errorCodeLabel(code) }
}

function ConnectionPill({ status }: { status: ConnectionStatus }): ReactNode {
  const pill = CONNECTION_PILL[status.state]
  return (
    <Badge tone={pill.tone} appearance="soft" dot>
      {pill.label}
    </Badge>
  )
}

export function LoginRoute(): ReactNode {
  const player = useSessionStore((state) => state.player)
  const setPlayer = useSessionStore((state) => state.setPlayer)

  const status = useConnectionStore((state) => state.status)
  const connecting = useConnectionStore((state) => state.connecting)
  const connect = useConnectionStore((state) => state.connect)
  const send = useConnectionStore((state) => state.send)
  const disconnect = useConnectionStore((state) => state.disconnect)
  const syncStatus = useConnectionStore((state) => state.syncStatus)
  const connectionLost = useConnectionStore((state) => state.connectionLost)
  const dismissConnectionLost = useConnectionStore((state) => state.dismissConnectionLost)

  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  const [bridgeAvailable] = useState(isBridgeAvailable)
  const appInfo = useMemo(() => readAppInfo(), [])

  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formIssue, setFormIssue] = useState<Issue | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const [server, setServer] = useState<ServerTarget>(readServerTarget)
  const [serverOpen, setServerOpen] = useState(false)
  const [serverErrors, setServerErrors] = useState<FieldErrors>({})
  const [connectionIssue, setConnectionIssue] = useState<Issue | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  /**
   * Phiên cũ mà máy chủ còn giữ trên socket này (F-01/F-07). Chỉ bật khi renderer **phát
   * hiện** ra (socket có trước lần mount) hoặc khi server trả `ALREADY_AUTHENTICATED`.
   * Một lần "Kết nối" do chính người dùng bấm không bao giờ đặt cờ này.
   */
  const [staleSession, setStaleSession] = useState(false)

  const [focusTarget, setFocusTarget] = useState<string | null>(null)

  /** Mốc mount: dùng để phân biệt socket cũ (trước khi tải lại) với kết nối vừa mở. */
  const mountedAtRef = useRef(Date.now())
  /** Lần kết nối này do chính màn hình đăng nhập mở → không phải phiên cũ. */
  const selfConnectRef = useRef(false)
  const pendingRef = useRef(false)
  /** Lần `connect` đang chạy; submit trong lúc chờ sẽ **chờ** nó thay vì no-op (F-05). */
  const connectPromiseRef = useRef<Promise<boolean> | null>(null)
  const disconnectRef = useRef(false)
  const awaitingRef = useRef<'login' | 'register' | 'auto-login' | null>(null)
  const credentialsRef = useRef<Credentials | null>(null)
  const watchdogRef = useRef<number | null>(null)

  const clearWatchdog = (): void => {
    if (watchdogRef.current !== null) {
      window.clearTimeout(watchdogRef.current)
      watchdogRef.current = null
    }
  }

  const finishPending = (): void => {
    clearWatchdog()
    pendingRef.current = false
    awaitingRef.current = null
    credentialsRef.current = null
    setPending(false)
  }

  const startWatchdog = (): void => {
    clearWatchdog()
    watchdogRef.current = window.setTimeout(() => {
      watchdogRef.current = null
      awaitingRef.current = null
      credentialsRef.current = null
      pendingRef.current = false
      setPending(false)
      setFormIssue(toIssue(UI_ERROR.requestTimeout))
    }, REQUEST_TIMEOUT_MS)
  }

  /* Focus luôn chạy sau commit, nên field trong panel vừa mở vẫn nhận được focus. */
  useEffect(() => {
    if (!focusTarget) return
    const element = document.getElementById(focusTarget)
    if (element instanceof HTMLElement) element.focus()
    setFocusTarget(null)
  }, [focusTarget])

  useEffect(
    () => () => {
      clearWatchdog()
      credentialsRef.current = null
      pendingRef.current = false
    },
    []
  )

  /**
   * F-07: chỉ cảnh báo "phiên cũ" khi kết nối có **trước** lần mount này.
   * Một lần kết nối mới (nút "Kết nối" hoặc submit tự kết nối) có `connectedAt ≈ now`,
   * nên không bao giờ hiện cảnh báo — tránh mâu thuẫn với gợi ý "Kết nối trước, sau đó
   * đăng nhập" ngay dưới form.
   */
  useEffect(() => {
    if (status.state !== 'connected') {
      setStaleSession(false)
      return
    }
    if (selfConnectRef.current) return
    const connectedAt = status.connectedAt
    if (connectedAt !== null && connectedAt < mountedAtRef.current - STALE_SESSION_TOLERANCE_MS) {
      setStaleSession(true)
    }
  }, [status.state, status.connectedAt])

  const failWithCode = (code: string | null | undefined): void => {
    const issue = toIssue(code)
    finishPending()
    setNotice(null)
    setFormIssue(issue)
    if (issue.copy.field) setFocusTarget(FIELD_IDS[issue.copy.field])
  }

  /**
   * Đóng kết nối đang giữ phiên cũ trên máy chủ (QA F-01).
   *
   * Sau khi renderer reload, socket ở main process vẫn còn phiên đã xác thực phía server:
   * `LOGIN` sẽ trả `ALREADY_AUTHENTICATED` mãi. Cách duy nhất để thoát là ngắt kết nối
   * rồi mở phiên mới — đúng hành vi `ClientApp` khi đóng client.
   */
  async function closeStaleSession(noticeText: string): Promise<void> {
    if (disconnectRef.current) return
    disconnectRef.current = true
    setDisconnecting(true)
    try {
      await disconnect()
      await syncStatus()
      setConnectionIssue(null)
      setNotice(noticeText)
    } finally {
      disconnectRef.current = false
      setDisconnecting(false)
    }
  }

  function handleDisconnectClick(): void {
    if (pendingRef.current || disconnectRef.current) return
    finishPending()
    setFormIssue(null)
    setNotice('Đang ngắt kết nối tới máy chủ…')
    void closeStaleSession('Đã ngắt kết nối. Bấm Đăng nhập để tạo phiên mới.')
  }

  /** `ALREADY_AUTHENTICATED`: ngắt phiên cũ rồi mời người dùng đăng nhập lại. */
  function handleStaleSession(): void {
    if (disconnectRef.current) return
    finishPending()
    setFormIssue(null)
    setStaleSession(true)
    setNotice('Máy chủ vẫn giữ phiên đăng nhập cũ. Đang ngắt kết nối…')
    void closeStaleSession('Đã ngắt phiên cũ. Bấm Đăng nhập để tạo phiên mới.')
  }

  /** Kết nối TCP + gửi CONNECT. Trả `false` nếu không thể tiếp tục. */
  function ensureConnected(): Promise<boolean> {
    if (useConnectionStore.getState().status.state === 'connected') return Promise.resolve(true)

    // Một lần connect đang chạy (bấm nút hoặc submit trước đó): chờ chính nó, không no-op.
    const inFlight = connectPromiseRef.current
    if (inFlight) return inFlight

    const attempt = runConnect()
    connectPromiseRef.current = attempt
    void attempt.finally(() => {
      if (connectPromiseRef.current === attempt) connectPromiseRef.current = null
    })
    return attempt
  }

  async function runConnect(): Promise<boolean> {
    const errors = validateServerTarget(server.host, server.port)
    if (errors.host || errors.port) {
      setServerErrors(errors)
      setServerOpen(true)
      setFocusTarget(errors.host ? FIELD_IDS.host : FIELD_IDS.port)
      return false
    }

    const port = parsePort(server.port)
    if (port === null) return false

    setConnectionIssue(null)
    // Từ đây socket (nếu mở được) là do màn hình này tạo ra, không phải phiên cũ.
    selfConnectRef.current = true
    try {
      const result = await connect(server.host.trim(), port)
      if (!result.ok) {
        selfConnectRef.current = false
        const issue = toIssue(result.error)
        setConnectionIssue(issue)
        setServerOpen(true)
        if (issue.copy.field) setFocusTarget(FIELD_IDS[issue.copy.field])
        return false
      }

      writeServerTarget({ host: server.host.trim(), port: String(port) })

      const handshake = await send({ type: 'CONNECT', payload: '' })
      if (!handshake.ok) {
        setConnectionIssue(toIssue(handshake.error))
        return false
      }
      return true
    } catch {
      setConnectionIssue(toIssue(undefined))
      return false
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (pendingRef.current || disconnectRef.current) return

    const trimmed = username.trim()
    const errors = validateAuthForm({ mode, username: trimmed, password, confirm })
    if (errors.username || errors.password || errors.confirm) {
      setFieldErrors(errors)
      setFormIssue(null)
      setNotice(null)
      setFocusTarget(FIELD_IDS[firstInvalidField(errors) ?? 'username'])
      return
    }

    setFieldErrors({})
    setFormIssue(null)
    setNotice(null)

    if (!bridgeAvailable) {
      // Không có tiến trình main thì mọi lệnh IPC đều vô nghĩa: báo ngay, không gửi gì.
      setFormIssue(toIssue(BRIDGE_UNAVAILABLE))
      return
    }

    pendingRef.current = true
    setPending(true)

    const credentials: Credentials = { username: trimmed, password }
    credentialsRef.current = credentials
    awaitingRef.current = mode

    const connected = await ensureConnected()
    if (!connected) {
      finishPending()
      return
    }

    const frame: OutboundMessage =
      mode === 'login'
        ? { type: 'LOGIN', payload: credentials }
        : { type: 'REGISTER', payload: credentials }
    const result = await send(frame)
    if (!result.ok) {
      failWithCode(result.error)
      return
    }
    // Server có thể đã trả lời trước khi promise send() resolve (LOGIN_OK rất nhanh);
    // khi đó form đã mở lại và không được đặt watchdog nữa.
    if (pendingRef.current) startWatchdog()
  }

  function switchMode(next: AuthMode): void {
    if (pendingRef.current) return
    setMode(next)
    setPassword('')
    setConfirm('')
    setFieldErrors({})
    setFormIssue(null)
    setNotice(null)
    credentialsRef.current = null
  }

  function handleConnectClick(): void {
    if (pendingRef.current) return
    void ensureConnected()
  }

  /** Rời field cấu hình thì lưu lại nếu hợp lệ — không chờ tới lúc kết nối thành công. */
  function persistServerIfValid(): void {
    if (validateHost(server.host) === null && parsePort(server.port) !== null) {
      writeServerTarget(server)
    }
  }

  useServerMessage((message) => {
    const awaiting = awaitingRef.current

    switch (message.type) {
      case 'LOGIN_OK': {
        if (!awaiting) return
        // Server đã mở phiên; giữ nguyên PlayerStats nó gửi, không suy diễn gì thêm.
        setPlayer(message.payload)
        setPassword('')
        setConfirm('')
        finishPending()
        navigate('/', { replace: true })
        break
      }
      case 'LOGIN_FAIL': {
        if (awaiting !== 'login' && awaiting !== 'auto-login') return
        // Phiên cũ còn trên socket: ngắt rồi mời đăng nhập lại thay vì báo lỗi chết.
        if (errorCodeLabel(message.payload) === 'ALREADY_AUTHENTICATED') {
          handleStaleSession()
          break
        }
        failWithCode(message.payload)
        break
      }
      case 'REGISTER_OK': {
        if (awaiting !== 'register') return
        awaitingRef.current = 'auto-login'
        setMode('login')
        setConfirm('')
        setFieldErrors({})
        setFormIssue(null)
        setNotice('Tài khoản đã được tạo. Đang đăng nhập…')

        const credentials = credentialsRef.current
        if (!credentials) {
          finishPending()
          break
        }

        void send({ type: 'LOGIN', payload: credentials }).then((result) => {
          if (!result.ok) {
            failWithCode(result.error)
            return
          }
          if (pendingRef.current) startWatchdog()
        })
        break
      }
      case 'REGISTER_FAIL': {
        if (awaiting !== 'register') return
        if (errorCodeLabel(message.payload) === 'ALREADY_AUTHENTICATED') {
          handleStaleSession()
          break
        }
        failWithCode(message.payload)
        break
      }
      default:
        break
    }
  })

  if (player) {
    return <Navigate to="/" replace />
  }

  const modeTabs: ReadonlyArray<TabItem<AuthMode>> = [
    { value: 'login', label: 'Đăng nhập', disabled: pending },
    { value: 'register', label: 'Đăng ký', disabled: pending }
  ]

  const form = (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
      aria-describedby="auth-form-status"
    >
      <Input
        id={FIELD_IDS.username}
        name="username"
        label="Username"
        hint={USERNAME_HINT}
        error={fieldErrors.username}
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        autoComplete="username"
        spellCheck={false}
        autoFocus
      />
      <PasswordInput
        id={FIELD_IDS.password}
        name="password"
        label="Mật khẩu"
        hint={PASSWORD_HINT}
        error={fieldErrors.password}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
      />
      {mode === 'register' ? (
        <PasswordInput
          id={FIELD_IDS.confirm}
          name="confirmPassword"
          label="Nhập lại mật khẩu"
          hint={CONFIRM_HINT}
          error={fieldErrors.confirm}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          autoComplete="new-password"
        />
      ) : null}

      <div
        id="auth-form-status"
        aria-live="polite"
        aria-atomic="true"
        className="flex min-h-9 items-start"
      >
        {formIssue ? (
          <p className="flex items-start gap-1.5 text-nq-xs leading-snug text-nq-danger">
            <TriangleAlert aria-hidden="true" size={14} className="mt-px shrink-0" />
            <span>
              <span className="font-semibold">{formIssue.copy.title}</span>
              {formIssue.copy.description ? (
                <span className="mt-0.5 block opacity-90">{formIssue.copy.description}</span>
              ) : null}
            </span>
          </p>
        ) : notice ? (
          <p className="flex items-start gap-1.5 text-nq-xs leading-snug text-nq-success">
            <Check aria-hidden="true" size={14} className="mt-px shrink-0" />
            <span>{notice}</span>
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" fullWidth loading={pending} disabled={pending || disconnecting}>
        {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
      </Button>
    </form>
  )

  return (
    <div className="grid h-dvh min-h-0 grid-rows-[auto_minmax(0,1fr)] bg-nq-bg">
      <AppTitleBar
        context="Đăng nhập"
        connection={{ state: status.state, detail: status.lastError ?? undefined }}
        theme={theme}
        onThemeChange={setTheme}
        rightSlot={<DemoBadge />}
      />

      <div className="nq-scroll min-h-0">
        <div className="mx-auto grid min-h-full w-full max-w-[1440px] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(420px,470px)]">
          <section
            aria-labelledby="auth-marketing-title"
            className="hidden flex-col justify-between gap-12 border-r border-nq-border-subtle px-10 py-12 lg:flex xl:px-16"
          >
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="grid size-10 place-items-center rounded-nq-lg bg-nq-primary font-jp text-nq-xl font-semibold text-nq-primary-contrast shadow-nq-sm"
              >
                語
              </span>
              <span className="min-w-0">
                <span className="nq-display block truncate text-nq-base text-nq-text">
                  NihongoQuest
                </span>
                <span className="nq-caps mt-1 block">Học · Thi đấu · Tiến bộ</span>
              </span>
            </div>

            <div className="max-w-[52ch]">
              <p className="nq-caps">Bản desktop</p>
              <h2
                id="auth-marketing-title"
                className="nq-display nq-balance mt-3 text-nq-4xl leading-tight text-nq-text"
              >
                Học tiếng Nhật bằng những trận đấu thật.
              </h2>
              <p className="nq-pretty mt-4 text-nq-base leading-normal text-nq-text-secondary">
                Luyện từ vựng và kanji trong phòng Quiz cùng bạn học, hoặc đấu hạng 1v1. Đáp án,
                điểm số và thời gian đều do máy chủ quyết định — không có gì được tính trên máy
                bạn.
              </p>
              <p lang="ja" className="mt-6 text-nq-lg text-nq-text-tertiary">
                日本語を、遊びながら。
              </p>
            </div>

            <ul className="flex max-w-[52ch] flex-col gap-4">
              {FEATURES.map((feature) => {
                const Icon = feature.icon
                return (
                  <li key={feature.title} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="grid size-9 shrink-0 place-items-center rounded-nq-md border border-nq-border bg-nq-surface text-nq-primary"
                    >
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-nq-sm font-semibold text-nq-text">
                        {feature.title}
                      </span>
                      <span className="nq-pretty block text-nq-sm leading-normal text-nq-text-secondary">
                        {feature.description}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-nq-xs text-nq-text-tertiary">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck aria-hidden="true" size={15} />
                Dữ liệu thi đấu lưu trên máy chủ của lớp học
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BookOpen aria-hidden="true" size={15} />
                Không quảng cáo, không theo dõi
              </span>
              {appInfo ? (
                <span className="nq-tabular">Phiên bản {appInfo.version}</span>
              ) : null}
            </div>
          </section>

          <main id="nq-main" className="flex flex-col justify-center px-5 py-10 sm:px-8 lg:px-9">
            <Card tone="default" padding="lg" className="mx-auto w-full max-w-[440px]">
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="grid size-9 place-items-center rounded-nq-md bg-nq-primary font-jp text-nq-lg font-semibold text-nq-primary-contrast shadow-nq-sm"
                >
                  語
                </span>
                <span className="nq-caps">NihongoQuest</span>
              </div>

              <h1 className="nq-display mt-5 text-nq-2xl text-nq-text">
                {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
              </h1>
              <p className="nq-pretty mt-1.5 text-nq-sm leading-normal text-nq-text-secondary">
                {mode === 'login'
                  ? 'Chào mừng bạn quay lại. Tiến độ của bạn đã được lưu trên máy chủ.'
                  : 'Tài khoản dùng chung với bản JavaFX của NihongoQuest.'}
              </p>

              {!bridgeAvailable ? (
                <ErrorBanner
                  className="mt-4"
                  tone="danger"
                  title="Desktop bridge không khả dụng"
                  description="Ứng dụng chưa chạy trong NihongoQuest Desktop nên không thể mở kết nối TCP tới máy chủ. Hãy mở bằng ứng dụng desktop."
                />
              ) : null}

              {connectionLost ? (
                <ErrorBanner
                  className="mt-4"
                  tone="warning"
                  title="Mất kết nối tới máy chủ"
                  description="Phiên đăng nhập đã kết thúc khi socket đóng. Kết nối lại rồi đăng nhập để tiếp tục."
                  onRetry={handleConnectClick}
                  retryLabel="Kết nối lại"
                  onDismiss={dismissConnectionLost}
                />
              ) : null}

              {staleSession && status.state === 'connected' ? (
                <div className="mt-4 flex flex-col gap-2">
                  <ErrorBanner
                    tone="warning"
                    title="Máy chủ vẫn đang giữ phiên đăng nhập cũ"
                    description="Cửa sổ vừa tải lại nhưng kết nối TCP cũ vẫn còn phiên trên máy chủ, nên đăng nhập sẽ bị từ chối. Ngắt kết nối rồi đăng nhập lại."
                  />
                  <div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleDisconnectClick}
                      loading={disconnecting}
                      disabled={disconnecting}
                    >
                      Ngắt kết nối
                    </Button>
                  </div>
                </div>
              ) : status.state === 'connected' ? (
                <p className="mt-4 flex items-center gap-1.5 text-nq-xs leading-snug text-nq-text-tertiary">
                  <Wifi aria-hidden="true" size={13} className="shrink-0" />
                  <span>
                    Đang kết nối tới máy chủ
                    {status.host ? ` ${status.host}:${status.port ?? ''}` : ''}. Đăng nhập để mở
                    phiên mới.
                  </span>
                </p>
              ) : null}

              <Tabs
                className="mt-5"
                items={modeTabs}
                value={mode}
                onChange={switchMode}
                label="Chế độ xác thực"
                idPrefix="auth"
                variant="underline"
              />

              <div
                role="tabpanel"
                id={TAB_PANEL_ID.login}
                aria-labelledby={TAB_ID.login}
                tabIndex={0}
                hidden={mode !== 'login'}
                className="nq-focusable pt-5 outline-none"
              >
                {mode === 'login' ? form : null}
              </div>
              <div
                role="tabpanel"
                id={TAB_PANEL_ID.register}
                aria-labelledby={TAB_ID.register}
                tabIndex={0}
                hidden={mode !== 'register'}
                className="nq-focusable pt-5 outline-none"
              >
                {mode === 'register' ? form : null}
              </div>

              <div className="mt-5 border-t border-nq-border-subtle pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    aria-expanded={serverOpen}
                    aria-controls="auth-server-config"
                    onClick={() => setServerOpen((value) => !value)}
                    className="nq-focusable inline-flex items-center gap-1.5 rounded-nq-sm text-nq-sm font-semibold text-nq-text-secondary transition-colors duration-[var(--nq-motion-fast)] hover:text-nq-text"
                  >
                    <Settings aria-hidden="true" size={15} />
                    Cấu hình server
                    <ChevronDown
                      aria-hidden="true"
                      size={14}
                      className={
                        serverOpen
                          ? 'rotate-180 transition-transform duration-[var(--nq-motion-fast)]'
                          : 'transition-transform duration-[var(--nq-motion-fast)]'
                      }
                    />
                  </button>
                  <ConnectionPill status={status} />
                </div>

                <div id="auth-server-config" hidden={!serverOpen} className="mt-3 flex flex-col gap-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_104px] items-start gap-3">
                    <Input
                      id={FIELD_IDS.host}
                      name="serverHost"
                      inputSize="sm"
                      label="Địa chỉ máy chủ"
                      hint="Tên máy hoặc IP trong LAN"
                      error={serverErrors.host}
                      value={server.host}
                      onChange={(event) =>
                        setServer((current) => ({ ...current, host: event.target.value }))
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          handleConnectClick()
                        }
                      }}
                      onBlur={persistServerIfValid}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <Input
                      id={FIELD_IDS.port}
                      name="serverPort"
                      inputSize="sm"
                      label="Cổng"
                      hint="1–65535"
                      error={serverErrors.port}
                      value={server.port}
                      onChange={(event) =>
                        setServer((current) => ({ ...current, port: event.target.value }))
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          handleConnectClick()
                        }
                      }}
                      onBlur={persistServerIfValid}
                      inputMode="numeric"
                      autoComplete="off"
                      mono
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleConnectClick}
                      loading={connecting || status.state === 'connecting'}
                      disabled={pending || status.state === 'connected'}
                    >
                      {status.state === 'connected' ? 'Đã kết nối' : 'Kết nối'}
                    </Button>
                    <span className="nq-tabular text-nq-xs text-nq-text-tertiary">
                      {status.state === 'connected' && status.host
                        ? `${status.host}:${status.port ?? ''}`
                        : describeServerTarget(server)}
                    </span>
                  </div>

                  <div aria-live="polite" className="flex min-h-5 items-start">
                    {connectionIssue ? (
                      <p className="flex items-start gap-1.5 text-nq-xs leading-snug text-nq-danger">
                        <TriangleAlert aria-hidden="true" size={14} className="mt-px shrink-0" />
                        <span>
                          <span className="font-semibold">{connectionIssue.copy.title}</span>
                          {connectionIssue.copy.description ? (
                            <span className="mt-0.5 block opacity-90">
                              {connectionIssue.copy.description}
                            </span>
                          ) : null}
                          {connectionIssue.code ? (
                            <span className="mt-0.5 block opacity-70">
                              Mã lỗi: {connectionIssue.code}
                            </span>
                          ) : null}
                        </span>
                      </p>
                    ) : (
                      <p className="text-nq-xs leading-snug text-nq-text-tertiary">
                        Kết nối TCP có timeout 5 giây. Kết nối trước, sau đó đăng nhập.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </main>
        </div>
      </div>
    </div>
  )
}
