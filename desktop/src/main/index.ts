/**
 * Entry point của main process.
 *
 * Thứ tự khởi động có chủ đích:
 * 1. Đăng ký scheme `nq-app://` và bật sandbox — cả hai phải xong trước `whenReady`.
 * 2. Xin single-instance lock để không có hai app cùng giữ một kết nối TCP.
 * 3. Hardening WebContents + xử lý vòng đời app.
 * 4. Sau khi ready: cài protocol phục vụ renderer đã build, áp chính sách session, áp chính
 *    sách menu, đăng ký IPC, rồi mới tạo cửa sổ.
 *
 * Không có logic nghiệp vụ nào ở đây; server Java vẫn là nguồn quyết định.
 */
import { app, session, BrowserWindow, Menu, type MenuItemConstructorOptions } from 'electron'
import { join } from 'node:path'
import {
  DEV_SERVER_ORIGIN,
  applySessionSecurity,
  applyWebContentsHardening,
  installAppProtocol,
  registerAppScheme
} from './security'
import { registerControlHandlers } from './ipc/register-control-handlers'
import { registerMediaHandlers } from './ipc/register-media-handlers'
import { createMainWindow, focusMainWindow } from './window'

const APP_USER_MODEL_ID = 'com.nihongoquest.desktop'

/**
 * Menu tối thiểu cho bản dev: chỉ Reload, Toggle DevTools, Quit.
 *
 * Không có link Help/`shell.openExternal`, không có role chỉnh sửa file, không có gì khác.
 * F12 cho Windows/Linux, `Cmd+Alt+I` cho macOS (đúng phím người dùng macOS quen).
 */
function buildDevelopmentMenu(): Menu {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'NihongoQuest (dev)',
      submenu: [
        { role: 'reload', accelerator: 'CmdOrCtrl+R' },
        {
          role: 'toggleDevTools',
          accelerator: process.platform === 'darwin' ? 'Cmd+Alt+I' : 'F12'
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }
  ]
  return Menu.buildFromTemplate(template)
}

/**
 * Chính sách menu ứng dụng — gọi sau `whenReady()` và **trước** `createMainWindow()`.
 *
 * VÌ SAO BẢN ĐÓNG GÓI KHÔNG CÓ MENU: menu mặc định của Electron chứa `Reload` (CmdOrCtrl+R)
 * và `Force Reload` (CmdOrCtrl+Shift+R). Reload chỉ nạp lại renderer, KHÔNG chạm main process:
 * socket TCP vẫn đang xác thực và main vẫn báo `connected`, trong khi state phiên của renderer
 * bị xoá sạch. Router khi đó đẩy người dùng về `/login`, nhưng form login không connect lại
 * được vì main đang giữ kết nối (`ALREADY_AUTHENTICATED` từ server) — app kẹt cho tới khi
 * thoát. Vì vậy production không có accelerator reload nào tới được người dùng, và `devTools`
 * cũng đã tắt trong `webPreferences` (xem `window.ts`).
 *
 * Không có kênh IPC nào cho reload/điều khiển cửa sổ: bề mặt renderer chỉ có
 * `connect|disconnect|send|getStatus|onEvent|media|app`. Renderer vẫn có thể tự gọi
 * `location.reload()` (error boundary), và main phải chịu được việc đó: trạng thái kết nối
 * là của main nên vẫn đúng sau reload, và một lệnh `connect` mới sẽ đóng kênh cũ rồi mở kênh
 * mới. Hợp đồng này được ghi ở `docs/desktop/architecture.md` §5.2.
 */
function applyApplicationMenu(): void {
  if (app.isPackaged) {
    Menu.setApplicationMenu(null)
    return
  }
  Menu.setApplicationMenu(buildDevelopmentMenu())
}

process.on('uncaughtException', (error) => {
  console.error('[nq] uncaughtException', error)
})
process.on('unhandledRejection', (reason) => {
  console.error('[nq] unhandledRejection', reason)
})

// Bắt buộc trước khi app ready: scheme phải là standard + secure để có origin thật.
registerAppScheme()
// Ép mọi renderer chạy trong sandbox, kể cả khi ai đó quên đặt webPreferences.
app.enableSandbox()
if (process.platform === 'win32') app.setAppUserModelId(APP_USER_MODEL_ID)

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  // Instance thứ hai chỉ đóng lại; instance đầu tiên nhận sự kiện `second-instance`.
  app.quit()
} else {
  let disposeControlHandlers: (() => void) | null = null
  let disposeMediaHandlers: (() => void) | null = null

  const dispose = (): void => {
    disposeControlHandlers?.()
    disposeControlHandlers = null
    disposeMediaHandlers?.()
    disposeMediaHandlers = null
  }

  applyWebContentsHardening()

  app.on('second-instance', () => {
    focusMainWindow()
  })

  app.on('window-all-closed', () => {
    // App thi đấu không có khái niệm "cửa sổ tài liệu": đóng cửa sổ là thoát hẳn,
    // kể cả trên macOS, để không giữ socket TCP trong nền.
    dispose()
    app.quit()
  })

  app.on('before-quit', () => {
    dispose()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length > 0) return
    // Mở lại cửa sổ trên macOS (dock). IPC phải có handler trước khi renderer gọi lần đầu,
    // nên đăng ký lại nếu lần trước đã dispose.
    if (!disposeControlHandlers) disposeControlHandlers = registerControlHandlers()
    if (!disposeMediaHandlers) disposeMediaHandlers = registerMediaHandlers()
    createMainWindow()
  })

  void app
    .whenReady()
    .then(() => {
      if (!DEV_SERVER_ORIGIN) {
        // Production: phục vụ out/renderer qua nq-app:// (không dùng file://).
        installAppProtocol(join(__dirname, '../renderer'))
      }
      applySessionSecurity(session.defaultSession)
      // Phải trước `createMainWindow()`: nếu không, menu mặc định (có Reload/Force Reload)
      // tồn tại trong lúc cửa sổ ra đời và accelerator vẫn bấm được.
      applyApplicationMenu()
      disposeControlHandlers = registerControlHandlers()
      // Media (camera) tách khỏi kênh điều khiển: cùng vòng đời, prefix `nq:media:*`.
      disposeMediaHandlers = registerMediaHandlers()
      createMainWindow()
    })
    .catch((error: unknown) => {
      console.error('[nq] khởi động thất bại', error)
      app.quit()
    })
}
