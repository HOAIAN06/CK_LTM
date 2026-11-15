/**
 * Ranh giới bảo mật của renderer.
 *
 * Mục tiêu: renderer chỉ là một trang React chạy trong sandbox, không có Node, không có
 * `file://`, không mở được cửa sổ mới, không điều hướng ra ngoài, không xin quyền lạ.
 *
 * Cách làm:
 * 1. Renderer production được phục vụ qua scheme riêng `nq-app://` (standard + secure) thay
 *    cho `file://`. Nhờ vậy có origin thật, CSP gắn được vào response, `localStorage` hoạt
 *    động và BrowserRouter không bị phá như khi chạy trên `file://`.
 * 2. CSP mặc định chặn toàn bộ (`default-src 'none'`), chỉ mở đúng những gì UI cần. Đặc
 *    biệt `connect-src 'self'` nghĩa là renderer KHÔNG gọi mạng trực tiếp được — mọi TCP
 *    đi qua main process.
 * 3. Permission của Chromium bị từ chối mặc định; chỉ `media` (camera/micro) và
 *    `fullscreen` được cấp cho chính origin của app.
 * 4. `window.open`, `<webview>`, điều hướng và redirect ra ngoài đều bị chặn.
 *
 * File này chỉ chạy ở main process.
 */
import { app, net, protocol, type Session } from 'electron'
import { statSync } from 'node:fs'
import { extname, join, normalize, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

/** Scheme riêng cho renderer production. Phải đăng ký trước khi app ready. */
export const APP_SCHEME = 'nq-app'
export const APP_HOST = 'nihongoquest'
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`
export const APP_INDEX_URL = `${APP_ORIGIN}/index.html`

/**
 * URL dev server do electron-vite bơm vào (`ELECTRON_RENDERER_URL`).
 * Chỉ chấp nhận http/https và luôn quy về origin để so sánh ranh giới.
 *
 * Bản đóng gói **luôn** trả `null`: nếu biến môi trường bị đặt (kể cả do người dùng chạy
 * từ shell), app đóng gói cũng không bao giờ nạp nội dung từ mạng.
 */
function readDevServerOrigin(): string | null {
  if (app.isPackaged) return null
  const raw = process.env['ELECTRON_RENDERER_URL']
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.origin
  } catch {
    return null
  }
}

/** Origin của Vite dev server, `null` khi chạy bản đóng gói. */
export const DEV_SERVER_ORIGIN: string | null = readDevServerOrigin()

/** Origin cho websocket HMR của Vite (cùng host/port, scheme ws/wss). */
function socketOrigin(origin: string): string {
  try {
    const url = new URL(origin)
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${url.host}`
  } catch {
    return origin
  }
}

/**
 * Dựng chuỗi CSP.
 *
 * Production: chỉ tài nguyên trong app (`'self'` = origin `nq-app://nihongoquest`).
 *
 * Dev: nới **đúng hai** directive cần cho Vite HMR:
 * - `script-src` thêm `'unsafe-inline'` vì `@vitejs/plugin-react` chèn preamble React Refresh
 *   bằng một thẻ script nội tuyến.
 * - `connect-src` thêm websocket HMR (`ws://host:port`, dẫn xuất từ chính
 *   `ELECTRON_RENDERER_URL` nên không thể trỏ sang host khác).
 *
 * CSS/ảnh/font của dev server là same-origin nên `'self'` đã bao; không nới thêm.
 * KHÔNG bao giờ thêm `'unsafe-eval'`: nếu HMR trên Windows cần, đó là quyết định mới phải
 * ghi vào `docs/AI_LOG.md` kèm lý do, không thêm âm thầm.
 */
export function buildContentSecurityPolicy(options: { devServerOrigin?: string | null } = {}): string {
  const devOrigin = options.devServerOrigin ?? null
  const isDev = devOrigin !== null

  const script = [`'self'`, ...(isDev ? [`'unsafe-inline'`] : [])]
  const style = [`'self'`, `'unsafe-inline'`]
  const img = [`'self'`, 'data:', 'blob:']
  const font = [`'self'`, 'data:']
  // `'self'` phủ mọi fetch same-origin tới Vite; chỉ websocket HMR cần thêm.
  const connect = [`'self'`, ...(isDev ? [socketOrigin(devOrigin)] : [])]

  return [
    `default-src 'none'`,
    `script-src ${script.join(' ')}`,
    `style-src ${style.join(' ')}`,
    `img-src ${img.join(' ')}`,
    `font-src ${font.join(' ')}`,
    // Camera preview dùng srcObject nên không cần network; blob: cho ảnh chụp/evidence.
    `media-src 'self' blob:`,
    `connect-src ${connect.join(' ')}`,
    `worker-src 'self' blob:`,
    `frame-src 'none'`,
    `child-src 'none'`,
    `object-src 'none'`,
    `base-uri 'none'`,
    `form-action 'none'`
  ].join('; ')
}

/** CSP của renderer đóng gói. */
export const PRODUCTION_CSP = buildContentSecurityPolicy()

/** CSP áp cho response của Vite dev server; `null` khi chạy production. */
export function buildDevContentSecurityPolicy(): string | null {
  if (!DEV_SERVER_ORIGIN) return null
  return buildContentSecurityPolicy({ devServerOrigin: DEV_SERVER_ORIGIN })
}

/**
 * URL có thuộc ranh giới renderer tin cậy không (scheme app hoặc dev server)?
 * Dùng cho kiểm tra sender của IPC và chặn điều hướng.
 */
export function isTrustedRendererUrl(rawUrl: string): boolean {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0) return false
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return false
  }
  if (url.protocol === `${APP_SCHEME}:`) return url.host === APP_HOST
  if (DEV_SERVER_ORIGIN) return url.origin === DEV_SERVER_ORIGIN
  return false
}

/**
 * Đăng ký scheme là standard + secure. Bắt buộc gọi trước `app.whenReady()`.
 */
export function registerAppScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: APP_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
        codeCache: true
      }
    }
  ])
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

function isInsideRoot(candidate: string, root: string): boolean {
  const prefix = root.endsWith(sep) ? root : `${root}${sep}`
  return candidate === root || candidate.startsWith(prefix)
}

/**
 * Ánh xạ URL `nq-app://nihongoquest/...` sang file trong thư mục renderer.
 *
 * Chống path traversal:
 * - chỉ nhận đúng scheme + host của app;
 * - `decodeURIComponent` lỗi, NUL byte hoặc **bất kỳ `\` nào** → từ chối (URL không bao giờ
 *   cần dấu phân cách Windows; từ chối luôn để hành vi giống nhau trên Linux và Windows);
 * - chuẩn hoá rồi so **tiền tố thư mục** với thư mục gốc.
 *
 * Đường dẫn không có phần mở rộng (route SPA) được trả `index.html`.
 */
export function resolveRendererFilePath(requestUrl: string, rendererRoot: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(requestUrl)
  } catch {
    return null
  }
  if (parsed.protocol !== `${APP_SCHEME}:` || parsed.host !== APP_HOST) return null

  let pathname: string
  try {
    pathname = decodeURIComponent(parsed.pathname)
  } catch {
    return null
  }
  if (pathname.includes('\0') || pathname.includes('\\')) return null

  const root = normalize(rendererRoot)
  const relative = pathname.replace(/^\/+/, '')
  const target = normalize(join(root, relative.length > 0 ? relative : 'index.html'))
  if (!isInsideRoot(target, root)) return null

  if (isFile(target)) return target

  const indexPath = normalize(join(root, 'index.html'))
  if (extname(target) === '' && isFile(indexPath)) return indexPath
  return null
}

function createTextResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8' }
  })
}

/** Gắn CSP + nosniff lên mọi asset của app; body giữ nguyên dạng stream. */
function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers)
  headers.set('content-security-policy', PRODUCTION_CSP)
  headers.set('x-content-type-options', 'nosniff')
  headers.set('referrer-policy', 'no-referrer')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

/** Chỉ cài một lần: `protocol.handle` trùng scheme là lỗi runtime. */
let appProtocolInstalled = false

/**
 * Cài handler phục vụ renderer đã build từ `rendererRoot` (thường là `out/renderer`).
 *
 * Bắt buộc gọi **trước** `createMainWindow()` và **chỉ** khi không chạy dev server; nhờ vậy
 * cửa sổ không bao giờ nạp `nq-app://...` khi chưa có handler (sẽ ra màn hình trắng).
 */
export function installAppProtocol(rendererRoot: string): void {
  if (appProtocolInstalled) return
  appProtocolInstalled = true

  const root = normalize(rendererRoot)

  protocol.handle(APP_SCHEME, async (request) => {
    // Chỉ nhận đúng scheme+host của app, đã kiểm tra path traversal ở dưới.
    const filePath = resolveRendererFilePath(request.url, root)
    if (!filePath) return createTextResponse('Not found', 404)

    try {
      // `net.fetch` trên `file://` đọc được cả đường dẫn trong asar khi đóng gói.
      const upstream = await net.fetch(pathToFileURL(filePath).toString())
      return withSecurityHeaders(upstream)
    } catch {
      // Không log đường dẫn tuyệt đối: không cần thiết và làm lộ layout máy người dùng.
      return createTextResponse('Not found', 404)
    }
  })
}

/**
 * Quyền Chromium được phép: camera/micro cho proctoring và chế độ toàn màn hình.
 *
 * Mọi quyền khác bị từ chối, kể cả `notifications`, `geolocation`, `midi`/`midiSysex`,
 * `clipboard-read`, `display-capture`, `usb`, `serial`, `hid`, `openExternal`, `payment-handler`.
 * Muốn thêm quyền mới thì phải sửa đúng tập này và ghi lý do vào `docs/AI_LOG.md`.
 */
const ALLOWED_PERMISSIONS: ReadonlySet<string> = new Set(['media', 'fullscreen'])

function isAllowedPermission(permission: string): boolean {
  return ALLOWED_PERMISSIONS.has(permission)
}

/**
 * Áp chính sách cho session mặc định: permission + CSP cho dev server.
 * Gọi sau `app.whenReady()` và trước khi tạo cửa sổ.
 */
export function applySessionSecurity(session: Session): void {
  session.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => {
    // Không có webContents/không đúng origin app → từ chối (deny by default).
    return isAllowedPermission(permission) && isTrustedRendererUrl(requestingOrigin)
  })

  session.setPermissionRequestHandler((_webContents, permission, callback, details) => {
    const trusted = details.isMainFrame && isTrustedRendererUrl(details.requestingUrl)
    callback(trusted && isAllowedPermission(permission))
  })

  const devCsp = buildDevContentSecurityPolicy()
  if (!devCsp || !DEV_SERVER_ORIGIN) return

  const devOrigin: string = DEV_SERVER_ORIGIN
  session.webRequest.onHeadersReceived((details, callback) => {
    if (!isOriginOf(details.url, devOrigin)) {
      callback({})
      return
    }
    callback({
      responseHeaders: {
        ...(details.responseHeaders ?? {}),
        'Content-Security-Policy': [devCsp]
      }
    })
  })
}

/** So origin chính xác (không dùng `startsWith` để tránh khớp nhầm `:51730`). */
function isOriginOf(rawUrl: string, origin: string): boolean {
  try {
    return new URL(rawUrl).origin === origin
  } catch {
    return false
  }
}

/**
 * Điều hướng được phép: origin tin cậy của app, và (chỉ ở bản dev) chính DevTools.
 * DevTools là một WebContents riêng; chặn `devtools://` sẽ làm hỏng reload của nó.
 */
function isAllowedNavigation(rawUrl: string): boolean {
  if (isTrustedRendererUrl(rawUrl)) return true
  return !app.isPackaged && rawUrl.startsWith('devtools://')
}

/**
 * Hardening chung cho mọi WebContents. Gọi TRƯỚC khi tạo cửa sổ.
 *
 * - `window.open` bị từ chối hoàn toàn (không có cửa sổ con nào được sinh ra).
 * - `<webview>` bị chặn (kể cả khi ai đó bật `webviewTag`).
 * - Điều hướng/redirect ra ngoài origin tin cậy bị chặn.
 *
 * Đăng ký trên `web-contents-created` nên áp cho mọi WebContents hiện tại và tương lai,
 * không phụ thuộc việc cửa sổ có được tạo qua `createMainWindow()` hay không.
 */
export function applyWebContentsHardening(): void {
  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(() => ({ action: 'deny' }))

    contents.on('will-attach-webview', (event) => {
      event.preventDefault()
    })

    contents.on('will-navigate', (details) => {
      if (!isAllowedNavigation(details.url)) details.preventDefault()
    })

    contents.on('will-redirect', (details) => {
      if (!isAllowedNavigation(details.url)) details.preventDefault()
    })
  })
}
