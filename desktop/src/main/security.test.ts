/**
 * Test cho ranh giới bảo mật của renderer (`src/main/security.ts`).
 *
 * Chỉ test phần logic thuần (CSP, định nghĩa "origin tin cậy", resolver file của
 * protocol handler) — không khởi động Electron thật và không mở cửa sổ.
 *
 * `electron` được mock: `protocol.handle` chỉ được ghi lại để test gọi lại handler,
 * `net.fetch` được thay để không chạm filesystem qua Chromium.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, sep } from 'node:path'
import {
  APP_INDEX_URL,
  APP_ORIGIN,
  APP_SCHEME,
  DEV_SERVER_ORIGIN,
  PRODUCTION_CSP,
  buildContentSecurityPolicy,
  buildDevContentSecurityPolicy,
  installAppProtocol,
  isTrustedRendererUrl,
  resolveRendererFilePath
} from './security'

const electron = vi.hoisted(() => {
  const protocolHandlers = new Map<string, (request: { url: string }) => Promise<Response>>()
  return {
    protocolHandlers,
    electron: {
      app: { isPackaged: false },
      net: {
        fetch: (url: string): Promise<Response> =>
          Promise.reject(new Error(`net.fetch không được gọi trong test: ${url}`))
      },
      protocol: {
        registerSchemesAsPrivileged: (): void => undefined,
        handle(scheme: string, handler: (request: { url: string }) => Promise<Response>): void {
          protocolHandlers.set(scheme, handler)
        }
      }
    }
  }
})

vi.mock('electron', () => electron.electron)

// `DEV_SERVER_ORIGIN` được tính ở module scope: test phải chạy như bản production.
vi.hoisted(() => {
  delete process.env['ELECTRON_RENDERER_URL']
})

let rendererRoot = ''

beforeAll(() => {
  rendererRoot = mkdtempSync(join(tmpdir(), 'nq-renderer-'))
  mkdirSync(join(rendererRoot, 'assets'), { recursive: true })
  writeFileSync(join(rendererRoot, 'index.html'), '<!doctype html><title>NihongoQuest</title>')
  writeFileSync(join(rendererRoot, 'assets', 'index-abc123.js'), 'console.log(1)')
})

afterAll(() => {
  if (rendererRoot.length > 0) rmSync(rendererRoot, { recursive: true, force: true })
  rmSync(join(dirname(rendererRoot || tmpdir()), `nq-outside-${process.pid}.txt`), { force: true })
})

describe('CSP production', () => {
  it('khoá mặc định và không cho renderer gọi mạng', () => {
    expect(PRODUCTION_CSP).toContain("default-src 'none'")
    expect(PRODUCTION_CSP).toContain("connect-src 'self'")
    expect(PRODUCTION_CSP).toContain("frame-src 'none'")
    expect(PRODUCTION_CSP).toContain("object-src 'none'")
    expect(PRODUCTION_CSP).toContain("base-uri 'none'")
    expect(PRODUCTION_CSP).toContain("form-action 'none'")
    expect(PRODUCTION_CSP).toContain("worker-src 'self' blob:")
  })

  it('không bao giờ chứa unsafe-eval, và production không cho inline script', () => {
    expect(PRODUCTION_CSP).not.toContain('unsafe-eval')
    expect(PRODUCTION_CSP).toContain("script-src 'self'")
  })
})

describe('CSP dev', () => {
  const devOrigin = 'http://localhost:5173'

  it('chỉ nới script-src (inline preamble) và connect-src (websocket HMR)', () => {
    const csp = buildContentSecurityPolicy({ devServerOrigin: devOrigin })

    expect(csp).toContain(`script-src 'self' 'unsafe-inline'`)
    expect(csp).toContain(`connect-src 'self' ws://localhost:5173`)
    expect(csp).not.toContain('unsafe-eval')
  })

  it('không nới style/img/font sang origin dev (đã same-origin nên thừa)', () => {
    const csp = buildContentSecurityPolicy({ devServerOrigin: devOrigin })
    const directives = new Map(
      csp.split('; ').map((part) => {
        const [name, ...values] = part.split(' ')
        return [name ?? '', values.join(' ')]
      })
    )

    expect(directives.get('style-src')).toBe(`'self' 'unsafe-inline'`)
    expect(directives.get('img-src')).toBe(`'self' data: blob:`)
    expect(directives.get('font-src')).toBe(`'self' data:`)
  })

  it('dùng wss khi dev server là https', () => {
    const csp = buildContentSecurityPolicy({ devServerOrigin: 'https://nq.test' })
    expect(csp).toContain('connect-src \'self\' wss://nq.test')
  })

  it('buildDevContentSecurityPolicy trả null khi không chạy dev server', () => {
    expect(DEV_SERVER_ORIGIN).toBeNull()
    expect(buildDevContentSecurityPolicy()).toBeNull()
  })
})

describe('isTrustedRendererUrl', () => {
  it('chấp nhận origin của app', () => {
    expect(isTrustedRendererUrl(APP_INDEX_URL)).toBe(true)
    expect(isTrustedRendererUrl(`${APP_ORIGIN}/assets/index-abc123.js`)).toBe(true)
  })

  it('từ chối host khác trong cùng scheme', () => {
    expect(isTrustedRendererUrl('nq-app://evil/index.html')).toBe(false)
  })

  it('từ chối scheme/URL nguy hiểm và chuỗi rỗng', () => {
    for (const bad of [
      '',
      'file:///etc/passwd',
      'https://evil.example/index.html',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'about:blank',
      'not a url'
    ]) {
      expect(isTrustedRendererUrl(bad)).toBe(false)
    }
  })

  it('không tin origin dev khi chạy bản production', () => {
    expect(isTrustedRendererUrl('http://localhost:5173/index.html')).toBe(false)
  })
})

describe('resolveRendererFilePath', () => {
  it('ánh xạ asset trong thư mục renderer', () => {
    expect(resolveRendererFilePath(`${APP_ORIGIN}/assets/index-abc123.js`, rendererRoot)).toBe(
      join(rendererRoot, 'assets', 'index-abc123.js')
    )
  })

  it('phục vụ index.html cho root và cho route SPA không có phần mở rộng', () => {
    const index = join(rendererRoot, 'index.html')
    expect(resolveRendererFilePath(`${APP_ORIGIN}/`, rendererRoot)).toBe(index)
    expect(resolveRendererFilePath(`${APP_ORIGIN}/quiz/room/42`, rendererRoot)).toBe(index)
  })

  it('chặn path traversal: không bao giờ đọc file ngoài thư mục renderer', () => {
    // File "bí mật" nằm cạnh thư mục renderer — đúng thứ traversal muốn chạm tới.
    const secretName = `nq-outside-${process.pid}.txt`
    const secretPath = join(dirname(rendererRoot), secretName)
    writeFileSync(secretPath, 'không được phục vụ')

    const attempts = [
      `${APP_ORIGIN}/%2e%2e%2f${secretName}`,
      `${APP_ORIGIN}/assets/%2e%2e%2f%2e%2e%2f${secretName}`,
      `${APP_ORIGIN}/..%2f${secretName}`,
      `${APP_ORIGIN}/..%5c${secretName}`,
      `${APP_ORIGIN}/%2e%2e%2f%2e%2e%2fetc%2fpasswd`,
      `${APP_ORIGIN}/assets/../../package.json`,
      // Trình phân tích URL đã chuẩn hoá `../` trước khi ta thấy pathname, nên URL này
      // trở thành route SPA `/etc/passwd` — vẫn phải nằm trong thư mục renderer.
      `${APP_ORIGIN}/../../etc/passwd`
    ]

    for (const url of attempts) {
      const resolved = resolveRendererFilePath(url, rendererRoot)
      if (resolved === null) continue
      expect(resolved).not.toBe(secretPath)
      expect(resolved === rendererRoot || resolved.startsWith(`${rendererRoot}${sep}`)).toBe(true)
    }

    // Dạng encode và dạng dùng dấu phân cách Windows phải bị từ chối thẳng.
    expect(resolveRendererFilePath(`${APP_ORIGIN}/%2e%2e%2f${secretName}`, rendererRoot)).toBeNull()
    expect(resolveRendererFilePath(`${APP_ORIGIN}/..%5c${secretName}`, rendererRoot)).toBeNull()
  })

  it('từ chối NUL byte, scheme khác và host khác', () => {
    expect(resolveRendererFilePath(`${APP_ORIGIN}/index%00.html`, rendererRoot)).toBeNull()
    expect(resolveRendererFilePath(`https://evil.example/index.html`, rendererRoot)).toBeNull()
    expect(resolveRendererFilePath(`nq-app://evil/index.html`, rendererRoot)).toBeNull()
    expect(resolveRendererFilePath('không-phải-url', rendererRoot)).toBeNull()
  })

  it('trả null cho file không tồn tại có phần mở rộng', () => {
    expect(resolveRendererFilePath(`${APP_ORIGIN}/assets/missing.js`, rendererRoot)).toBeNull()
  })
})

describe('installAppProtocol', () => {
  it('cài handler đúng một lần và từ chối traversal trước khi chạm filesystem', async () => {
    installAppProtocol(rendererRoot)
    installAppProtocol(rendererRoot)

    expect(electron.protocolHandlers.size).toBe(1)
    const handler = electron.protocolHandlers.get(APP_SCHEME)
    expect(handler).toBeDefined()

    const response = await handler?.({ url: `${APP_ORIGIN}/../../etc/passwd` })
    expect(response?.status).toBe(404)
    expect(response?.headers.get('content-type')).toContain('text/plain')
  })
})
