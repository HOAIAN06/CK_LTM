# TASKS — Backlog triển khai

## P0 — Chặn lỗi chính

- [x] Sửa camera preview đen khi demo LAN: hiển thị frame local trong lobby, không hiện
  preview camera giả cho host, và dùng cấu hình capture Windows ổn định thay cho 720p/45 FPS.
- [ ] Xác nhận bản sửa camera bằng demo thật: 1 server + host + 2 player trên 2 máy Windows.
- [x] Xác định lỗi player join → lobby bị giữ do UI chờ mọi camera `READY`.
- [x] Ghi create/join/lobby/camera/start/route transition vào runtime log theo room và attempt.
- [x] Bỏ điều kiện camera khỏi quyền bắt đầu của host; chống gửi start trùng.
- [x] Cho phép player vào quiz khi camera lỗi và hiển thị trạng thái rõ.
- [x] Thêm timeout frame đầu tiên 10 giây, retry và loại callback camera cũ.
- [x] Bổ sung test cho denied/not found/failed/lost/blocked/stopped và host start.
- [ ] Xác nhận thủ công bằng host + 2 player trên Windows 10/11 với webcam thật.

## P1 — Camera và proctoring

- [x] Gắn metrics riêng cho capture, JPEG encode, gửi/nhận mạng, JPEG decode và AI inference.
- [x] Chống queue tăng vô hạn; publisher, AI, relay và dashboard đều giữ frame mới nhất.
- [x] Giới hạn 3 lần retry camera tự động; timeout frame đầu tiên vẫn là 10 giây.
- [x] Chuyển JPEG decode khỏi JavaFX thread; UI chỉ nhận ảnh đã decode và render frame mới nhất.
- [x] Giữ debounce/evidence window, ngưỡng confidence và thêm `UNKNOWN` cho frame tối/phẳng.
- [ ] Benchmark thực tế 2 client rồi 6 client trên Windows 10/11 để chốt FPS/resolution/quality.

## P2 — UI/UX

- [x] Chuẩn hóa màu, typography, spacing, card và component trong `style.css`.
- [x] Redesign login/home/layout/quiz/ranked/friend/profile/dashboard bằng theme dùng chung.
- [x] Thêm loading, empty, error, success, hover, focus, pressed, disabled và transition.
- [x] Test tự động toàn bộ 16 FXML ở viewport 980×680 và min-size app 1024×680.
- [ ] Kiểm tra trực quan trên Windows 10/11 ở 1024×680 và màn hình DPI cao.

## P2.1 — EdTech Gaming theme + Animation & Sound System

- [x] Đổi palette sang Indigo/Cyan trên nền sáng; giữ semantic Green/Amber/Red (D-011).
- [x] Mở rộng `UiMotion` (fadeIn/fadeOut/slideIn/pulse/shake/countdown/rankUp/toast/shimmer)
  và cờ `enabled` để tắt animation; dùng JavaFX Animation API.
- [x] ~~Thêm `AudioManager` tập trung (volume theo nhóm, mute, giới hạn đồng thời, cooldown,
  quản lý AudioClip/MediaPlayer, shutdown) — D-012.~~ **ĐÃ GỠ BỎ** (yêu cầu người dùng).
- [x] ~~Thêm `SoundEvent` mapping event → sound (nhóm/tần số/thời lượng/volume/priority/cooldown).~~
  **ĐÃ GỠ BỎ**.
- [x] ~~Sinh WAV PCM tại runtime, không cần asset ngoài; thêm `javafx-media` cùng version JavaFX.~~
  **ĐÃ GỠ BỎ** (đã bỏ dependency `javafx-media`).
- [x] Nối animation theo trạng thái nghiệp vụ vào shell, battle, proctor dashboard,
  result và ClientApp (phần âm thanh đã bị gỡ bỏ hoàn toàn).
- [x] XÓA HOÀN TOÀN hệ thống âm thanh: xóa `AudioManager`, `SoundEvent`, `AudioManagerTest`,
  `SoundEventTest`, mọi lời gọi phát âm thanh và `javafx-media` — `docs/AI_LOG.md` [2026-11-03 15:45].
- [ ] Kiểm tra trực quan animation trên Windows 10/11 thật.

## P2.3 — Design System thống nhất + Design Tokens (Indigo/Cyan)

- [x] Viết lại `client/shared/style.css` thành stylesheet token hóa thống nhất (20 khối), bỏ 3 lớp
  theme chồng chéo và mọi màu theme cũ.
- [x] Khai báo **Design Tokens** (`-ndq-*`) trên `.root`; mọi selector chỉ tham chiếu token.
- [x] Palette chuẩn: primary `#4F46E5`, primary-dark `#3730A3`, accent `#06B6D4`, bg `#F5F7FB`,
  surface `#FFFFFF`, text `#172033`, text-secondary `#64748B`, border `#E2E8F0`, success `#16A34A`,
  warning `#D97706`, error `#DC2626` (D-013).
- [x] Đồng bộ `server/dashboard/server-dashboard.css` dùng cùng token để toàn hệ thống một hệ màu.
- [x] `UiThemeTest` khẳng định token palette, cấm màu theme cũ, bắt buộc token hóa.
- [ ] Kiểm tra trực quan trên Windows 10/11 ở nhiều viewport/DPI cao.

## P3 — Đồ án và tài liệu

- [x] Viết lại `docs/protocol.md`, thêm `docs/ranked.md` và cập nhật `docs/architecture.md`
  theo code ngày 2026-11-14; đối chiếu baseline **124 test**.
- [x] Tạo mục lục Markdown tập trung, phân loại tài liệu Frontend / Backend / Toàn hệ thống;
  mô tả rule, skill local, nguồn sự thật và tài liệu lịch sử.
- [ ] Viết test và kịch bản demo bảo vệ đồ án.
- [x] Cập nhật README, PROGRESS, TASKS và AI_LOG sau phiên tài liệu.

## P4 — UI/UX overhaul (2026-11-15)

- [x] Phase 0: thêm Git workflow vào `AGENTS.md`; cài UI UX Pro Max project-local và gitignore;
  audit 16 màn hình; tạo `docs/ui-redesign-proposal.md` và `docs/ui-tooling.md`.
- [x] Xác nhận giữ chính sách không âm thanh (D-015); pháo hoa/confetti chỉ là hiệu ứng hình ảnh.
- [x] Chốt hướng thị giác **B. Sakura Arcade**; bundle Nunito + Be Vietnam Pro; scope client + server dashboard (D-017).
- [x] Phase 1: design tokens Sakura Arcade, font, icon, shell và component cơ bản.
- [x] Phase 2: Login, Home (màn hình đích sau đăng nhập — D-019), Quiz Room, Lobby, Battle.
- [ ] Phase 3: Ranked, Matchmaking, Result và celebration overlay.
- [ ] Phase 4: Leaderboard, Profile, Friends, History, Quiz sets, Proctor, Server dashboard.
- [ ] Phase 5: responsive/DPI, accessibility, Windows QA và cập nhật tài liệu.

## P4.1 — Calm Study visual correction (2026-11-15)

- [x] Rà soát theo UI UX Pro Max: thay palette neon Sakura Arcade bằng Calm Study.
- [x] Token hóa lại màu client/dashboard; bỏ gradient, giảm shadow và bo góc.
- [x] Đồng bộ đấu hạng, phòng quiz/lobby/battle, quản lý bộ đề/editor và xếp hạng.
- [ ] Kiểm tra trực quan trên Windows 10/11 ở 1024×680, 1280×720 và DPI 125%.

## P5 — Desktop client (Electron + React + TypeScript)

Nhánh `feature/electron-desktop`. Không sửa Java/JavaFX; server giữ quyền quyết định.

### Phase 0 — Audit

- [x] Audit kiến trúc, protocol (71 `MessageType`), 17 FXML, dependency và rủi ro.
- [x] Xác nhận baseline JavaFX 135 test pass trên JDK 21.
- [x] Ghi quyết định D-021/D-022/D-023 và `docs/desktop/contracts.md`.

### Phase 1–2 — Foundation

- [x] Scaffold `desktop/` (electron-vite 6, Vite 7, React 19, TS 5.9, Tailwind 4, Vitest 5).
- [x] Quy tắc sở hữu file: orchestrator giữ `package.json` + config; agent giữ thư mục riêng.
- [x] `architecture`: IPC contract, main process, preload, CSP/permission.
- [x] `protocol`: mirror 71 `MessageType`, payload types, codec, framing, TCP control channel + test.
- [x] `ui-designer`: design tokens light/dark, primitives, shell, command palette, preview.
- [x] Xác minh tích hợp: `typecheck` (node+web) → `vitest` **144 pass** → `electron-vite build` OK.
- [x] Kiểm tra trực quan bằng headless Chromium: shell + gallery ở light/dark/1024.
- [x] Sửa lỗi cascade `base.css` không nằm trong `@layer` (đè toàn bộ utility Tailwind).

### Phase 3 — Visual redesign

- [x] Login dựng trên design system, flow thật: connect → LOGIN/REGISTER → LOGIN_OK/FAIL,
      validate username 3–20 / password ≥ 4, cấu hình server, watchdog 15 s.
- [x] Home dùng dữ liệu thật (`PlayerStats`, `MATCH_HISTORY_GET`), không số liệu ước lượng.
- [x] Shell/navigation thật: sidebar 8 mục, theme provider light/dark/system, error boundary,
      connection store, route guard, trang placeholder cho màn chưa làm.
- [x] Xác minh trực quan bằng Chromium headless (login/home light+dark, 1440/1024).
- [x] Sửa `AppShell` không giới hạn chiều cao → footer sidebar bị đẩy khỏi màn hình
      (đo lại: aside = viewport, logout trong màn hình ở 1440/1280/1024).
- [x] Chừa vùng native window controls trên title bar (`--nq-titlebar-controls-width` 138px).

### Phase 4 — Feature migration

- [x] Ranked: matchmaking (180/300), battle reducer (attempt/sessionId guards, timeout locks
      without deciding outcome), result WIN/LOSE/DRAW; 60 test riêng, server giữ quyền chấm điểm.
- [x] Quiz Room: menu (tạo/join PIN), lobby (start không phụ thuộc camera), battle reducer riêng,
      leaderboard realtime, finish, reconnect qua `QUIZ_REJOINED`.
- [x] Quiz sets: danh sách OWN/PUBLISHED, editor (validate 4 lựa chọn/1 đáp án, publish ≥3 câu),
      guard thay đổi chưa lưu.
- [x] Leaderboard (top 10, highlight bản thân), Profile (read-only), Friends (search, request,
      presence, invite Ranked/Quiz, modal lời mời 60 s), History (lọc kết quả).

### Phase 5 — Camera và kiểm thử

- [x] Codec media (handshake, ACK 0–5, frame 0x10/0x11, VisionMetadata) + golden vector test.
- [x] Publisher/subscriber TCP trong main, latest-frame 3 tầng, backpressure, không retry vô hạn.
- [x] IPC `nq:media:*` + preload fail-closed + validate sender/size; nối vào `index.ts`.
- [x] Renderer: `getUserMedia` 640×480@15, trạng thái DENIED/NOT_FOUND/FAILED, nút thử lại,
      camera lỗi **không** chặn quiz; dừng track khi unmount, tạm dừng khi tab ẩn.
- [ ] Chạy với webcam thật + relay Java trên Windows/LAN (không thể làm ở môi trường này).

### QA

- [x] Review nền tảng + auth: 0 blocker; 71/71 `MessageType`, 55/55 record khớp field;
      1 HIGH (reload khi đã đăng nhập → dead-end `/login`) đã sửa menu + đang bổ sung nút
      "Ngắt kết nối"; MEDIUM home timeout; LOW doc drift đã sửa `contracts.md`/`protocol.md`.
- [x] QA lại F-01: `/login` có banner + nút "Ngắt kết nối", `ALREADY_AUTHENTICATED` tự ngắt phiên.
- [x] Proctoring: consent, status report, event APP_FOCUS_LOST/APP_MINIMIZED/CAMERA_BLOCKED
      (không có AI nên không phát 4 loại cần vision), dashboard host `/proctor/:pin`.
- [x] Demo fixture `?demo=1&screen=…` cho 9 màn; production 0 rò rỉ (grep 0 chunk/chuỗi).
- [x] QA độc lập cuối cùng: 7/7 PASS; audit 12/12 subscriber không nuốt message; F-07/F-08/F-09 đã sửa.
- [ ] Kiểm tra thủ công trên Windows 10/11 (Electron thật, webcam, DPI, firewall 5001).

### Phase 6 — Packaging

- [x] `electron-builder --win --dir` chạy được: `dist/win-unpacked/NihongoQuest.exe` +
      `resources/app.asar` 54 MB chứa `out/main|preload|renderer`.
- [ ] NSIS installer + icon thương hiệu (cần Windows/wine và asset icon).
- [x] Hướng dẫn chạy/đóng gói trong `desktop/README.md` và `docs/desktop/`.
