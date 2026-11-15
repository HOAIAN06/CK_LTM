# NihongoQuest Desktop — Kiến trúc Electron (Phase 2)

Tài liệu này mô tả phần **architecture** sở hữu: main process, preload, hợp đồng IPC và ranh
giới bảo mật của renderer. Hợp đồng tích hợp giữa các agent nằm ở
[`contracts.md`](./contracts.md); tài liệu này mô tả **đúng những gì đã được hiện thực và
đã kiểm chứng**, không mô tả kế hoạch.

Server Java, JavaFX client, PostgreSQL và wire protocol **không thay đổi**. Electron chỉ là
một client khác của cùng giao thức TCP JSON-line.

---

## 1. Phạm vi và quyền sở hữu file

```text
desktop/
├── src/shared/ipc.ts                              architecture  (hợp đồng IPC dùng chung)
├── src/main/index.ts                              architecture  (vòng đời app)
├── src/main/window.ts                             architecture  (cửa sổ + webPreferences)
├── src/main/security.ts                           architecture  (scheme, CSP, permission, navigation)
├── src/main/security.test.ts                      architecture  (test CSP + resolver)
├── src/main/ipc/register-control-handlers.ts       architecture  (IPC điều khiển + transport wiring)
├── src/main/ipc/register-control-handlers.test.ts  architecture  (test validator + handler)
├── src/preload/index.ts                           architecture  (window.nq)
├── src/preload/api.d.ts                           architecture  (tài liệu kiểu của preload)
├── src/shared/protocol/**                         protocol
├── src/shared/media-ipc.ts                        camera   (hợp đồng IPC kênh media)
├── src/main/net/**                                protocol
├── src/main/media/**                              camera
├── src/main/ipc/register-media-handlers.ts        camera   (đã nối vào index.ts)
├── src/renderer/**                                ui-designer + gameplay + camera
└── docs/desktop/architecture.md                   architecture  (file này)
```

Quy tắc bất di bất dịch: **mỗi file một chủ**. Cần đổi file của agent khác thì ghi đề nghị
trong báo cáo cuối, không tự sửa.

---

## 2. Mô hình process và ranh giới tin cậy

```text
┌──────────────────────────── Java backend (không đổi) ────────────────────────────┐
│  NihongoQuestServer : TCP 5000 (control JSON-line), 5001 (media nhị phân)       │
│  PostgreSQL/Supabase : chỉ server truy cập                                      │
└───────────────────────────────────▲─────────────────────────────────────────────┘
                                    │ TCP (node:net) — CHỈ ở main process
┌───────────────────────────────────┴─────────────────────────────────────────────┐
│ MAIN PROCESS (Node của Electron, full quyền)                                    │
│  index.ts        vòng đời app, single-instance lock, dispose                    │
│  window.ts       BrowserWindow, webPreferences, nạp renderer                    │
│  security.ts     scheme nq-app://, CSP, permission, chặn điều hướng/window.open │
│  ipc/*           kiểm tra input renderer → ControlChannel → TCP                 │
│  net/* (protocol) framing + encode/decode + socket                              │
└───────────────────────────────────▲─────────────────────────────────────────────┘
                                    │ contextBridge (chỉ hàm, chỉ dữ liệu clone được)
┌───────────────────────────────────┴─────────────────────────────────────────────┐
│ PRELOAD (sandbox, contextIsolation)                                             │
│  window.nq = { connect, disconnect, send, getStatus, onEvent, app }             │
└───────────────────────────────────▲─────────────────────────────────────────────┘
                                    │ window.nq (không có ipcRenderer, không có require)
┌───────────────────────────────────┴─────────────────────────────────────────────┐
│ RENDERER (Chromium sandbox, origin nq-app://nihongoquest)                       │
│  React UI. KHÔNG có Node, KHÔNG có socket, KHÔNG có DB, KHÔNG có file system.   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

Nguyên tắc suy ra từ mô hình này:

1. **Server authority.** Đáp án, điểm, attempt, deadline, trạng thái phòng do Java quyết định.
   Main process chỉ chuyển tiếp message; renderer chỉ hiển thị.
2. **Renderer không có khả năng mạng.** CSP đặt `default-src 'none'` và `connect-src 'self'`,
   nên kể cả khi UI bị XSS thì cũng không gọi được endpoint lạ.
3. **Main là nguồn sự thật về kết nối.** Renderer không giữ socket, không tự reconnect; nó đọc
   `ConnectionStatus` và quyết định UI.
4. **Không có đường tắt qua preload.** Preload chỉ expose các hàm đã đóng gói; không expose
   `ipcRenderer`, `process`, `require`, `shell` hay bất kỳ API Electron nào khác.

---

## 3. Trình tự khởi động (`src/main/index.ts`)

| Bước | Việc làm | Lý do |
|---|---|---|
| 1 | `registerAppScheme()` | `protocol.registerSchemesAsPrivileged` **bắt buộc** trước `whenReady` |
| 2 | `app.enableSandbox()` | Ép sandbox cho mọi renderer, kể cả khi ai đó quên `webPreferences` |
| 3 | `app.setAppUserModelId()` (chỉ Windows) | Taskbar dùng đúng appId của electron-builder |
| 4 | `app.requestSingleInstanceLock()` | Một cửa sổ = một kết nối TCP; instance thứ hai focus instance đầu |
| 5 | `applyWebContentsHardening()` | Đăng ký `web-contents-created` trước khi có cửa sổ nào |
| 6 | `whenReady()` → `installAppProtocol(out/renderer)` | Chỉ production; dev dùng Vite |
| 7 | `applySessionSecurity(session.defaultSession)` | Permission + CSP cho dev server |
| 8 | `applyApplicationMenu()` | Production: `Menu.setApplicationMenu(null)`; dev: menu tối thiểu (§5.2) |
| 9 | `registerControlHandlers()` | Đăng ký IPC **trước** khi renderer kịp gọi |
| 10 | `createMainWindow()` | Nạp renderer, hiện cửa sổ khi `ready-to-show` |

Handler `nq-app://` vì vậy **luôn** tồn tại trước khi cửa sổ nạp URL đầu tiên. Trình tự này
là bất biến: đảo thứ tự 6/8 sau 9 sẽ tạo ra cửa sổ trắng hoặc lời gọi IPC bị reject.

### 3.1 Vòng đời

- `window-all-closed` → `dispose()` (gỡ 4 IPC handler, đóng socket) → `app.quit()` trên **mọi**
  nền tảng, kể cả macOS. App thi đấu không có khái niệm "cửa sổ tài liệu", và ta không muốn giữ
  socket TCP trong nền.
- `before-quit` → `dispose()` (idempotent, an toàn khi gọi hai lần).
- `second-instance` → `focusMainWindow()` (restore nếu minimize).
- `activate` (macOS dock) → nếu không còn cửa sổ: đăng ký lại IPC nếu đã dispose rồi
  `createMainWindow()`.
- `uncaughtException` / `unhandledRejection` chỉ `console.error`, **không** tự thoát: một
  listener UI lỗi không được làm mất phiên thi.

---

## 4. Nạp renderer: `nq-app://` thay cho `file://`

### 4.1 Production

Renderer đã build (`out/renderer`) được phục vụ qua scheme riêng. URL nạp là
`nq-app://nihongoquest/index.html`; electron-vite build ra asset đường dẫn **tương đối**
(`./assets/index-<hash>.js`) nên chúng resolve thành `nq-app://nihongoquest/assets/...`.

Đường dẫn thư mục được tính từ main bundle: `__dirname` = `out/main` →
`join(__dirname, '../renderer')` = `out/renderer`.

| | `file://` | `nq-app://` |
|---|---|---|
| Origin | `null`/opaque | `nq-app://nihongoquest` (thật) |
| CSP theo response | không gắn được header | gắn trực tiếp trong handler |
| `localStorage` | bị hạn chế | hoạt động bình thường |
| BrowserRouter (history) | hỏng | hoạt động |
| Quyền của trang | dễ lẫn với quyền file hệ thống | tách biệt hoàn toàn |

Scheme đăng ký với `standard: true, secure: true, supportFetchAPI: true, corsEnabled: true,
stream: true, codeCache: true`.

`installAppProtocol()` (đã kiểm chứng bằng test):

- Cài **đúng một lần** (`protocol.handle` trùng scheme là lỗi runtime); lần gọi sau là no-op.
- `resolveRendererFilePath()` chỉ nhận scheme `nq-app:` + host `nihongoquest`.
- `decodeURIComponent` lỗi → từ chối.
- NUL byte hoặc **bất kỳ `\` nào** trong pathname → từ chối. URL không bao giờ cần dấu phân
  cách Windows; từ chối luôn để hành vi giống nhau trên Linux và Windows.
- `normalize(join(root, relative))` rồi so **tiền tố thư mục** → chặn `../` (kể cả dạng encode
  `%2e%2e%2f`).
- Đường dẫn không tồn tại + không có phần mở rộng → trả `index.html` cho client router.
- Mọi response có `Content-Security-Policy`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: no-referrer`; body giữ nguyên stream (`net.fetch` trên `file://`).
- 404 trả `text/plain` “Not found”, không log đường dẫn tuyệt đối.

### 4.2 Dev

`ELECTRON_RENDERER_URL` do electron-vite bơm vào, được quy về **origin** và chỉ chấp nhận
`http|https`. Khi **đã đóng gói** (`app.isPackaged`), biến này bị bỏ qua hoàn toàn: bản
production không bao giờ nạp nội dung từ mạng, kể cả khi env bị đặt từ shell.

Dev không cài protocol (tránh hai nguồn tài nguyên cùng lúc). `NQ_DEVTOOLS=1` (chỉ khi chưa
đóng gói) mở DevTools detach; bản đóng gói đặt `devTools: false`.

---

## 5. `webPreferences` và chrome cửa sổ

```ts
webPreferences: {
  preload: join(__dirname, '../preload/index.js'),
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
  devTools: !app.isPackaged,
  additionalArguments: ['--nq-app-version=<version>', '--nq-app-packaged=0|1']
}
```

Không có cờ nào ở đây được nới lỏng. `additionalArguments` chỉ mang version/packaged để
`window.nq.app` là dữ liệu đồng bộ, không cần thêm kênh IPC (preload đọc `process.argv`).

### 5.1 Frameless window

| Nền tảng | Cấu hình | Hệ quả |
|---|---|---|
| Windows/Linux | `titleBarStyle: 'hidden'` + `titleBarOverlay` cao **40px** | Nút thu nhỏ/phóng to/đóng do Chromium vẽ ở góc phải; màu theo `nativeTheme` |
| macOS | `titleBarStyle: 'hidden'` + `trafficLightPosition: { x: 16, y: 13 }` | Traffic light nằm trong 40px đầu |

- Chiều cao 40px khớp token `--nq-titlebar-height` trong `renderer/styles/tokens.css`.
- Màu overlay (`#f4f4ef` / `#0f1415`, ký hiệu `#17201f` / `#edf2f0`) cập nhật khi
  `nativeTheme` đổi; listener được gỡ khi cửa sổ `closed`.
- Kích thước: 1280×860, min 1024×680.
- `ready-to-show` mới `show()` để không nháy trắng; `did-fail-load` cũng `show()` để không treo
  cửa sổ vô hình; `render-process-gone` chỉ log.

**Lưu ý phối hợp với UI:** window controls là overlay native, vùng ~138px bên phải của thanh
40px (Windows/Linux) thuộc về Chromium, macOS cần chừa ~78px bên trái. Chưa có kênh
`nq:window:*`; nếu muốn nút tự vẽ thì phải bổ sung hợp đồng (xem §8).

### 5.2 Chính sách menu và hợp đồng reload

`applyApplicationMenu()` trong `src/main/index.ts` là nơi **duy nhất** chạm tới `Menu`
(grep: `Menu` chỉ xuất hiện trong file này).

| Chế độ | Menu | Nội dung |
|---|---|---|
| Production (`app.isPackaged === true`) | `Menu.setApplicationMenu(null)` | **Không menu** → không có accelerator `Reload` (CmdOrCtrl+R), `Force Reload` (CmdOrCtrl+Shift+R) hay `Toggle DevTools` nào tới được người dùng |
| Dev | `Menu.buildFromTemplate` | Đúng 3 mục: **Reload** (`CmdOrCtrl+R`), **Toggle DevTools** (`F12`, macOS `Cmd+Alt+I`), **Quit**. Không link Help, không `shell.openExternal`, không role nào khác |

**Vì sao bản đóng gói không có menu (đừng thêm lại menu mặc định):** menu mặc định của
Electron chứa `Reload`/`Force Reload`. Reload chỉ nạp lại **renderer**, không chạm main
process: socket TCP vẫn đang xác thực và main vẫn báo `connected`, trong khi state phiên của
renderer bị xoá sạch. Router sẽ đẩy người dùng về `/login`, nhưng form login không connect lại
được vì server/main đang giữ kết nối (`ALREADY_AUTHENTICATED`) — app kẹt cho tới khi thoát.
Đó là lý do menu bị bỏ hẳn ở production, đồng thời `devTools: !app.isPackaged`.

**Hợp đồng reload (phía main):**

1. Main **không** expose kênh reload/điều khiển cửa sổ. Bề mặt renderer chỉ có
   `connect|disconnect|send|getStatus|onEvent|app` (+ `media` của giai đoạn camera).
2. Main **chịu được** reload: trạng thái kết nối thuộc main nên `nq:status` vẫn trả đúng sau
   reload, `nq:event` chỉ phát cho document hiện tại (đăng ký của preload cũ bị huỷ cùng
   document, không rò rỉ listener trong main).
3. `nq:connect` khi kênh đang mở sẽ **đóng kênh cũ rồi mở kênh mới**, nên app có thể phục hồi
   mà không cần thoát — với điều kiện UI cho phép người dùng bấm kết nối lại.
4. Renderer vẫn có thể tự gọi `location.reload()` (error boundary của gameplay). Main không
   chặn được và **không cần** chặn; điều bắt buộc là UI phải có hành động thoát khỏi trạng thái
   "đang kết nối nhưng chưa đăng nhập" (ví dụ nút "Ngắt kết nối" ở `/login`). Việc đó thuộc
   gameplay agent — architecture chỉ bảo đảm không còn accelerator reload trong bản phát hành.

---

## 6. Ranh giới bảo mật (`src/main/security.ts`)

### 6.1 CSP

Production (chuỗi thật, gắn vào **mọi** response `nq-app://`):

```text
default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:;
connect-src 'self'; worker-src 'self' blob:; frame-src 'none'; child-src 'none';
object-src 'none'; base-uri 'none'; form-action 'none'
```

Dev nới **đúng hai** directive, gắn qua `session.webRequest.onHeadersReceived` **chỉ** cho
response của origin dev:

| Directive | Production | Dev | Vì sao |
|---|---|---|---|
| `script-src` | `'self'` | `'self' 'unsafe-inline'` | `@vitejs/plugin-react` chèn preamble React Refresh nội tuyến |
| `connect-src` | `'self'` | `'self' ws://<host>:<port>` | websocket HMR; origin ws dẫn xuất từ chính `ELECTRON_RENDERER_URL` |
| `style-src`, `img-src`, `font-src` | như trên | **giữ nguyên** | tài nguyên Vite là same-origin nên `'self'` đã bao |

`'unsafe-eval'` **không** xuất hiện ở bất kỳ đâu (có test khẳng định). Nếu HMR trên Windows
cần thêm, đó là quyết định mới phải ghi `docs/AI_LOG.md` kèm lý do.

Đánh đổi đã biết: `style-src 'unsafe-inline'` cần vì React dùng `style={{...}}`. Rủi ro thấp
(chỉ CSS) và không mở đường cho script.

### 6.2 Permission

`setPermissionCheckHandler` + `setPermissionRequestHandler` trên `session.defaultSession`,
**deny by default**:

| Permission | Điều kiện | Vì sao |
|---|---|---|
| `media` (camera/micro) | request từ main frame + origin tin cậy | proctoring |
| `fullscreen` | origin tin cậy | chế độ thi toàn màn hình |

Tất cả quyền khác bị **từ chối**, gồm `notifications`, `geolocation`, `midi`/`midiSysex`,
`clipboard-read`, `display-capture`, `usb`, `serial`, `hid`, `openExternal`,
`payment-handler`, `window-management`, `storage-access`, `background-sync`… Muốn thêm quyền
phải sửa đúng tập `ALLOWED_PERMISSIONS` và ghi lý do vào `docs/AI_LOG.md`.

Camera không chặn việc vào quiz: nếu người dùng từ chối, `getUserMedia` lỗi, renderer hiển thị
và vẫn chơi được (chính sách P0).

### 6.3 Điều hướng và cửa sổ

`app.on('web-contents-created')` áp cho **mọi** WebContents:

- `setWindowOpenHandler` → `deny`: không có `window.open`, không có cửa sổ con.
- `will-attach-webview` → `preventDefault()`: không có `<webview>` (kể cả khi `webviewTag` bị bật).
- `will-navigate` / `will-redirect` → `preventDefault()` nếu URL không thuộc origin tin cậy.
  Ngoại lệ duy nhất: `devtools://` khi **chưa** đóng gói (DevTools là WebContents riêng; chặn
  nó sẽ làm hỏng reload của DevTools).

`isTrustedRendererUrl()` là định nghĩa duy nhất của “origin tin cậy”: `nq-app://nihongoquest`
hoặc origin Vite trong dev. Cùng hàm này được dùng để kiểm tra sender của IPC.

---

## 7. Hợp đồng IPC

Nguồn sự thật của kênh điều khiển: `src/shared/ipc.ts` (`IPC_CHANNELS`). Kênh media có hợp
đồng riêng do camera sở hữu: `src/shared/media-ipc.ts` (`NQ_MEDIA_CHANNELS`).

| Channel | Hướng | Kiểu | Trạng thái |
|---|---|---|---|
| `nq:connect` | renderer → main | `invoke` | **đã có** — `{ host, port }` → `NqResult` |
| `nq:disconnect` | renderer → main | `invoke` | **đã có** — → `void` |
| `nq:send` | renderer → main | `invoke` | **đã có** — `OutboundMessage` → `NqResult` |
| `nq:status` | renderer → main | `invoke` | **đã có** — → `ConnectionStatus` |
| `nq:event` | main → renderer | `webContents.send` | **đã có** — `NqEvent` |
| `nq:media:*` | cả hai chiều | `invoke` / `send` | **đã có** — 6 lệnh + kênh đẩy `nq:media:frame` |

Kênh media nằm ở `src/main/media/**`, `src/main/ipc/register-media-handlers.ts`,
`src/preload/media.ts`, `src/shared/media-ipc.ts`; `src/main/index.ts` gọi
`registerMediaHandlers()` ngay cạnh `registerControlHandlers()` và dispose cùng vòng đời.
`NqBridge` trong `src/shared/ipc.ts` **không** có field `media` (giữ bề mặt cũ ổn định);
renderer đọc qua `readMediaBridge()`/`getMediaApi()` của `features/proctor/media-client.ts`.

`OutboundMessage`/`ServerMessage` **không định nghĩa lại**: `shared/ipc.ts` re-export từ
`shared/protocol/payloads.ts` (mirror `Payloads.java`), nên renderer có type-safety thật theo
`MessageType` mà chỉ có một nguồn sự thật.

### 7.1 Quy ước lỗi: **không ném lỗi qua IPC**

Ném từ `ipcMain.handle` khiến Electron trả rejected promise với chuỗi
`Error invoking remote method 'nq:…': …` — renderer nhận nội bộ main dưới dạng text, UI buộc
phải parse chuỗi, và lỗi “mong đợi” bị trộn với crash thật. Vì vậy **mọi handler đều total**:

| Channel | Kiểu trả về (không bao giờ throw) | Khi sender không tin cậy |
|---|---|---|
| `nq:connect` | `NqResult` | `{ ok: false, error: 'UNTRUSTED_SENDER' }` |
| `nq:send` | `NqResult` | `{ ok: false, error: 'UNTRUSTED_SENDER' }` |
| `nq:status` | `ConnectionStatus` | trả `createIdleConnectionStatus()` |
| `nq:disconnect` | `void` | no-op (không chạm transport) |

Sender bị từ chối được log **origin** (không log query/hash vì có thể chứa token). Đây là lớp
phòng thủ theo chiều sâu: navigation đã bị chặn, `webviewTag: false`, CSP `frame-src 'none'`.

### 7.2 Máy trạng thái

```text
idle ──connect──▶ connecting ──ok──▶ connected ──disconnect──▶ disconnected
                      │
                      └──lỗi──▶ error            (connect lại được từ mọi trạng thái)
```

- `connect` khi đang kết nối: đóng kênh cũ trước, không bao giờ có hai socket.
- Hai lệnh connect đồng thời: lệnh thứ hai nhận `CONNECT_IN_PROGRESS`.
- Transport cũng phát trạng thái (`onStatus`); main chuẩn hoá (`normalizeStatus`) rồi mới đẩy
  xuống renderer qua `nq:event`.
- Main nhớ **mục tiêu kết nối gần nhất** (`lastTarget`) riêng khỏi `ConnectionStatus`, vì
  transport phát `host:null/port:null` khi đóng socket; nhờ vậy `disconnect` vẫn báo đúng
  host/port cho UI (contracts.md §7.1).
- Một lần connect thất bại có thể phát hai event `status` (`error` từ transport và từ handler);
  cả hai đều đã làm sạch, event sau là trạng thái cuối.

### 7.3 Kiểm tra input (renderer là không tin cậy)

| Input | Luật | Mã lỗi |
|---|---|---|
| `host` | chuỗi 1..255 sau trim, chỉ ASCII in được (`0x21..0x7e`), cấm `\ / @ ? #` và khoảng trắng | `INVALID_HOST` |
| `port` | số nguyên 1..65535; chấp nhận chuỗi toàn chữ số (form nhập liệu) | `INVALID_PORT` |
| frame | object không phải array, `type` là chuỗi 1..64; payload do codec protocol kiểm tra | `INVALID_FRAME` |
| sender | phải là **main frame** của `nq-app://nihongoquest` hoặc origin dev | `UNTRUSTED_SENDER` |

### 7.4 Mã lỗi (`NQ_ERROR`)

UI ánh xạ mã sang câu tiếng Việt; chi tiết kỹ thuật đi qua `ConnectionStatus.lastError` hoặc
sự kiện `transport-error` (đã cắt control character, tối đa 300 ký tự).

| Mã | Nghĩa | Gợi ý UI |
|---|---|---|
| `INVALID_HOST` | host rỗng/sai ký tự | “Địa chỉ máy chủ không hợp lệ” |
| `INVALID_PORT` | port ngoài 1..65535 | “Cổng phải từ 1 đến 65535” |
| `INVALID_FRAME` | message sai hình dạng | “Dữ liệu gửi đi không hợp lệ” (bug nội bộ) |
| `INVALID_FRAME_DATA` | payload không encode được theo `MessageType` | “Dữ liệu gửi đi không hợp lệ” |
| `NOT_CONNECTED` | chưa kết nối | “Chưa kết nối tới máy chủ” |
| `CONNECT_IN_PROGRESS` | đang kết nối | “Đang kết nối, vui lòng chờ” |
| `CONNECT_FAILED` | connect thất bại | “Không kết nối được tới máy chủ” |
| `CONNECT_TIMEOUT` | quá 5000 ms (`CONTROL_CONNECT_TIMEOUT_MS`) | “Máy chủ không phản hồi” |
| `SEND_FAILED` | ghi socket lỗi | “Mất kết nối, đang thử lại” |
| `UNTRUSTED_SENDER` | IPC từ nguồn lạ | không hiển thị (chỉ log) |

### 7.5 `window.nq` (bề mặt thật)

```ts
window.nq.connect({ host, port })   // Promise<NqResult>
window.nq.disconnect()              // Promise<void>
window.nq.send(frame)               // Promise<NqResult>
window.nq.getStatus()               // Promise<ConnectionStatus>
window.nq.onEvent(fn)               // () => void  (huỷ đăng ký)
window.nq.app                      // { version, platform, packaged }
// window.nq.media                 // có ở runtime (preload/media.ts); kiểu qua features/proctor/media-client
```

Khai báo `Window.nq` nằm trong `src/shared/ipc.ts`, **không** nằm trong `src/preload/api.d.ts`,
vì `tsconfig.web.json` chỉ include `src/renderer/**` + `src/shared/**`. `api.d.ts` re-export lại
toàn bộ kiểu để tra cứu.

Preload **fail closed**: nếu `process.contextIsolated` là `false` thì ném lỗi và không expose
gì cả.

### 7.6 Logging

Chỉ `console.*` của Electron (stderr/stdout); chưa có file log.

- Lỗi IPC/transport được log dưới dạng **mã + thông điệp đã làm sạch**
  (`sanitizeErrorMessage`: bỏ control character, gộp khoảng trắng, tối đa 300 ký tự).
- `nq:send` **không** log frame: payload có thể chứa username/PIN/ticket. Chỉ log mã lỗi.
- Sender bị từ chối: log channel + **origin** (không log query/hash vì có thể chứa token).
- `uncaughtException`/`unhandledRejection`/lỗi nạp renderer log nguyên `Error` để còn stack;
  đường duy nhất mang payload (`nq:send`) tự catch nên không rò rỉ qua các handler này.

---

## 8. Những gì **chưa** hiện thực (không được coi là đã có)

1. **Media transport đã có code và đã nối vào main**, nhưng **chưa từng chạy với webcam thật**
   và chưa đối chiếu với `ProctorMediaRelay` thật trên LAN. Bằng chứng hiện có: 91 unit test
   (codec golden vector, publisher/subscriber qua TCP loopback, validator IPC) + build chứa
   `nq:media:*`. Các bước kiểm tra thủ công nằm ở `docs/desktop/proctoring.md`.
2. **Đóng gói (packaging).** `electron-builder.yml` tồn tại nhưng chưa từng chạy trên máy này;
   chưa xác minh `nq-app://` + `net.fetch(file://)` đọc được file **trong asar** (asar chưa được
   kiểm chứng), chưa có cài đặt thử trên Windows.
3. **Kiểm tra ở tầng OS.** Không có code signing, notarization (macOS), hardened runtime, kiểm
   tra toàn vẹn bản cập nhật, hay chống debugger attach. Không thuộc phạm vi Phase 2.
4. **Kênh điều khiển cửa sổ.** Không có `nq:window:minimize|toggle-maximize|close`; UI phải
   dùng window controls native (overlay).
5. **E2E / visual test.** Máy Linux này không có display nên chưa chạy Electron thật lần nào.
   Toàn bộ kiểm chứng hiện tại là typecheck + unit test + build.
6. **Auto-reconnect.** Cố ý không có: transport báo lỗi, người dùng bấm kết nối lại; tránh vòng
   retry vô hạn che mất sự cố server.
7. **Nhiều cửa sổ.** Chỉ một cửa sổ; nhiều cửa sổ sẽ chia sẻ cùng một `ControlChannel`.
8. **Logging bền vững.** Chỉ `console.*` của Electron; chưa có file log, chưa có redaction tự
   động ngoài `sanitizeErrorMessage`.

---

## 9. Rủi ro còn lại (cho QA)

| # | Rủi ro | Cách xác minh |
|---|---|---|
| 1 | Dev CSP `script-src 'unsafe-inline'` có thể chưa đủ cho HMR (preamble React Refresh) trên Windows | Chạy `npm run dev` trên Windows, xem Console có CSP violation nào; nếu có, ghi `docs/AI_LOG.md` trước khi nới thêm |
| 2 | `style-src 'unsafe-inline'` (bắt buộc cho inline style của React) | Code review; không có cách bỏ nếu UI còn `style={{}}` |
| 3 | Chưa xác minh `net.fetch(file://)` trong **asar** | Build bản đóng gói rồi mở app; nếu trắng cửa sổ, kiểm tra `did-fail-load` |
| 4 | Frameless + `titleBarOverlay` ở DPI 125/150% trên Windows 10/11 | Kiểm tra trực quan: vùng kéo, nút đóng, màu overlay khi đổi theme OS |
| 5 | `disconnect` khi thoát app có thể chưa kịp flush frame `DISCONNECT` (app quit ngay) | Chấp nhận được: server Java dọn session khi socket đóng; kiểm tra `logs/server.log` khi thoát đột ngột |
| 6 | Một lần connect lỗi phát hai event `status=error` | UI nên idempotent khi nhận `status`; kiểm tra không nháy thông báo hai lần |
| 7 | DevTools được phép điều hướng `devtools://` khi chưa đóng gói | Chỉ ảnh hưởng bản dev; `devTools: false` khi đóng gói |
| 8 | Permission `media` cấp cho cả micro, không chỉ camera | Nếu proctoring chỉ cần hình, siết `details.mediaTypes` khi camera agent làm |
| 9 | Bản đóng gói **không có menu**, nên trên macOS không còn Edit menu: `Cmd+C/V/A` trong ô nhập và `Cmd+Q` có thể không hoạt động (trên Windows/Linux Chromium tự xử lý phím soạn thảo, không cần menu) | Nếu macOS thành mục tiêu: thêm menu chỉ gồm `appMenu` + `editMenu` (không View/Reload/DevTools) — hiện chưa làm vì deliverable là Windows NSIS và yêu cầu là **không menu** ở production |
| 10 | Renderer vẫn có thể tự `location.reload()` (error boundary) → main giữ socket đã xác thực, UI về `/login` mà không connect lại được | Gameplay phải thêm hành động "Ngắt kết nối" ở `/login` (hoặc nút reload có `disconnect()` trước); QA kiểm tra lại kịch bản F-01 sau khi gameplay sửa |
| 11 | Menu dev vẫn cho `Ctrl+R` — dev có thể tự tạo trạng thái "connected nhưng chưa đăng nhập" | Chỉ ảnh hưởng bản dev; không có trong bản phát hành (`app.isPackaged`) |

---

## 10. Kiểm chứng đã chạy (2026-11-15)

Repo nằm trên exFAT nên `npm install` trong `desktop/` thất bại (không hỗ trợ symlink). Dùng
sandbox ngoài repo qua `desktop/scripts/verify-linux.sh`:

```bash
bash desktop/scripts/verify-linux.sh arch3 npx tsc --noEmit -p tsconfig.node.json
bash desktop/scripts/verify-linux.sh arch3 npx vitest run src/main
bash desktop/scripts/verify-linux.sh arch3 npm run build
```

Kết quả quan sát (sau khi thêm chính sách menu):

| Lệnh | Kết quả |
|---|---|
| `tsc --noEmit -p tsconfig.node.json` | **0 lỗi** (toàn bộ `src/main/**`, `src/preload/**`, `src/shared/**`) |
| `vitest run src/main` | **154 test pass / 9 file** (gồm test của protocol + camera đang có trong `src/main`) |
| `npm run build` | **thành công**: `out/main/index.js` 41.3 kB, `out/preload/index.js` 6.1 kB, `out/renderer/index.html` + assets |

Kiểm tra thêm bằng mắt trên bundle đã build: `out/main/index.js` chứa
`electron.Menu.setApplicationMenu(null)` (nhánh `app.isPackaged`), `label: "NihongoQuest (dev)"`
và `role: "toggleDevTools"` (nhánh dev). `Menu` không xuất hiện ở bất kỳ file nào khác trong
`src/main`/`src/preload`.

Nội dung test (trong phạm vi architecture):

- `src/main/security.test.ts` (16 test): chuỗi CSP production (khoá mặc định, không
  `unsafe-eval`, không inline script), CSP dev chỉ nới `script-src`/`connect-src`, `wss` khi dev
  server là https, `isTrustedRendererUrl` (app/dev/file/javascript/data/about), resolver file
  (asset, SPA fallback, traversal thường + encode + `%5c`, NUL, sai scheme/host), handler
  `nq-app://` cài một lần và trả 404 cho traversal.
- `src/main/ipc/register-control-handlers.test.ts` (29 test): validator host/port/envelope,
  `normalizeStatus`, `sanitizeErrorMessage`, đăng ký/gỡ 4 channel, connect thành công/thất
  bại/timeout/đồng thời, send khi chưa kết nối / frame sai / lỗi transport (`SEND_FAILED`,
  `INVALID_FRAME_DATA`), disconnect giữ `host`/`port`, `status` snapshot, forward
  `message`/`transport-error`, và từ chối sender lạ (origin khác, iframe) mà **không throw**.

Snapshot cùng thời điểm (phụ thuộc file của agent khác, có thể đổi):

- `tsc --noEmit -p tsconfig.web.json` → 0 lỗi (lần chạy gần nhất của architecture).

Chưa chạy: **Electron thật** (máy không có display) và bản đóng gói (electron-builder).
