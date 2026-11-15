/**
 * Vòng đời cửa sổ chính.
 *
 * Cửa sổ dùng chrome riêng (frameless) để UI có thể vẽ thanh tiêu đề theo design system:
 * - macOS: `titleBarStyle: 'hidden'` + vị trí traffic light cố định.
 * - Windows/Linux: `titleBarOverlay` cao 40px, khớp `--nq-titlebar-height` trong
 *   `renderer/styles/tokens.css`. Vùng kéo cửa sổ do CSS `.nq-drag` khai báo.
 *
 * Mọi webPreferences bảo mật nằm ở đây và không được nới lỏng: `sandbox`, `contextIsolation`,
 * `nodeIntegration: false`, không `webview`, không chạy nội dung insecure.
 */
import { app, BrowserWindow, nativeTheme } from 'electron'
import { join } from 'node:path'
import { APP_INDEX_URL, DEV_SERVER_ORIGIN } from './security'

/** Khớp token `--nq-bg` (light/dark) để không nháy trắng khi cửa sổ hiện ra. */
const CANVAS_LIGHT = '#f4f4ef'
const CANVAS_DARK = '#0f1415'
/** Khớp token `--nq-text` để ký hiệu window control đọc được trên nền. */
const SYMBOL_LIGHT = '#17201f'
const SYMBOL_DARK = '#edf2f0'
/** Khớp token `--nq-titlebar-height`. */
const TITLEBAR_HEIGHT = 40

const WINDOW_WIDTH = 1280
const WINDOW_HEIGHT = 860
const WINDOW_MIN_WIDTH = 1024
const WINDOW_MIN_HEIGHT = 680

const IS_MAC = process.platform === 'darwin'

let mainWindow: BrowserWindow | null = null

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

/** Đưa cửa sổ chính lên trước (dùng cho `second-instance`). */
export function focusMainWindow(): void {
  const win = mainWindow
  if (!win || win.isDestroyed()) return
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

function overlayOptions(useDark: boolean): { color: string; symbolColor: string; height: number } {
  return {
    color: useDark ? CANVAS_DARK : CANVAS_LIGHT,
    symbolColor: useDark ? SYMBOL_DARK : SYMBOL_LIGHT,
    height: TITLEBAR_HEIGHT
  }
}

/**
 * Nạp renderer: dev server khi có `ELECTRON_RENDERER_URL`, còn lại là scheme `nq-app://`.
 * Không nhận URL từ ngoài nên không thể bị trỏ sang nội dung lạ.
 */
async function loadRenderer(win: BrowserWindow): Promise<void> {
  const target = DEV_SERVER_ORIGIN ?? APP_INDEX_URL
  try {
    await win.loadURL(target)
  } catch (error) {
    console.error('[nq] không nạp được renderer', error)
    if (!win.isDestroyed()) win.show()
  }
}

/**
 * Tạo cửa sổ chính. Có thể gọi lại sau khi cửa sổ bị đóng (macOS `activate`).
 * Chỉ giữ một cửa sổ: gọi lần hai sẽ trả về cửa sổ hiện có.
 */
export function createMainWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow

  const useDark = nativeTheme.shouldUseDarkColors
  const win = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    show: false,
    title: 'NihongoQuest',
    backgroundColor: useDark ? CANVAS_DARK : CANVAS_LIGHT,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    ...(IS_MAC
      ? { trafficLightPosition: { x: 16, y: 13 } }
      : { titleBarOverlay: overlayOptions(useDark) }),
    webPreferences: {
      // Preload đã build nằm cạnh main: out/preload/index.js.
      preload: join(__dirname, '../preload/index.js'),
      // Ranh giới bảo mật: renderer không có Node, không thấy biến main, không tạo webview.
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      webviewTag: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      spellcheck: false,
      // Bản đóng gói không mở DevTools; bản dev mở khi cần.
      devTools: !app.isPackaged,
      // Preload đọc version từ argv để `window.nq.app` là dữ liệu đồng bộ, không cần IPC.
      additionalArguments: [
        `--nq-app-version=${app.getVersion()}`,
        `--nq-app-packaged=${app.isPackaged ? '1' : '0'}`
      ]
    }
  })

  mainWindow = win

  win.once('ready-to-show', () => {
    if (!win.isDestroyed()) win.show()
  })

  const syncTheme = (): void => {
    if (win.isDestroyed()) return
    const dark = nativeTheme.shouldUseDarkColors
    win.setBackgroundColor(dark ? CANVAS_DARK : CANVAS_LIGHT)
    if (!IS_MAC) win.setTitleBarOverlay(overlayOptions(dark))
  }
  nativeTheme.on('updated', syncTheme)

  win.on('closed', () => {
    nativeTheme.off('updated', syncTheme)
    if (mainWindow === win) mainWindow = null
  })

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return
    console.error(`[nq] tải renderer thất bại: ${errorCode} ${errorDescription} (${validatedURL})`)
    // Không để người dùng nhìn cửa sổ trống vô hạn khi renderer lỗi.
    if (!win.isDestroyed() && !win.isVisible()) win.show()
  })

  win.webContents.on('render-process-gone', (_event, details) => {
    console.error(`[nq] renderer process gone: ${details.reason} (exitCode=${details.exitCode})`)
  })

  if (!app.isPackaged && process.env['NQ_DEVTOOLS'] === '1') {
    win.webContents.openDevTools({ mode: 'detach' })
  }

  void loadRenderer(win)

  return win
}
