# PROGRESS — Trạng thái dự án

## Cập nhật gần nhất

- Ngày: 2026-11-15
- Phiên: **Desktop (Electron + React + TypeScript) — Phase 0 audit + Phase 2 foundation.**
- Nhánh: `feature/electron-desktop` (tạo từ HEAD `feature/ui-quiz-flow`; **chưa commit**).
- Đã làm:
  - Audit repo thật: 76 Java file, 17 FXML, 71 `MessageType`, TCP 5000/5001.
  - Xác nhận baseline JavaFX: `mvnw -o clean test` → **135 test pass**, BUILD SUCCESS, JDK 21.
  - Tạo `desktop/` (Electron 45 + React 19 + TS 5.9 + electron-vite 6 + Vite 7 + Tailwind 4),
    cấu hình build/test/packaging do orchestrator sở hữu.
  - Viết `docs/desktop/contracts.md`: ranh giới process, bảng IPC, `ControlChannel`,
    quy tắc framing, token CSS bắt buộc, lệnh kiểm chứng.
  - Xử lý chặn môi trường: repo nằm trên exFAT (không symlink) nên `npm install` in-tree
    lỗi `EPERM`; thêm `desktop/scripts/verify-linux.sh` dùng sandbox `/tmp/opencode/nq-verify`.
  - Khởi chạy song song 3 subagent với quyền ghi file tách rời: `architecture` (IPC/preload/
    security), `protocol` (TS types + TCP transport + test), `ui-designer` (design system +
    primitives + shell).
  - **Phase 3**: Login + Home thật (protocol TCP qua IPC), theme provider, connection/session
    store, route guard, 8 nav + placeholder; ảnh render headless light/dark 1024–1440.
  - **Ranked**: matchmaking 180/300, battle reducer (guard sessionId/attempt, timeout chỉ khoá
    input, server chấm điểm), result WIN/LOSE/DRAW; 60 test riêng.
  - **Camera**: codec media + publisher/subscriber latest-frame trong main, IPC `nq:media:*`,
    preview renderer; 91 test; đã nối `registerMediaHandlers()` vào `index.ts`.
  - **QA**: báo cáo `docs/desktop/qa-report.md`; 0 blocker, 71/71 `MessageType`, 55/55 record khớp;
    đã sửa lỗi menu Reload và doc drift.
  - **Phase 4 hoàn tất**: Quiz sets (list/editor + validate), leaderboard, profile, friends
    (search/presence/invite 60 s), history; toàn bộ 8 mục sidebar có màn hình thật.
  - **Proctoring**: consent + status report, event chỉ gồm APP_FOCUS_LOST/APP_MINIMIZED/
    CAMERA_BLOCKED (không có vision model nên 4 loại còn lại không phát), dashboard host
    `/proctor/:pin`, tile latest-frame 15 fps.
  - **Đóng gói**: `electron-builder --win --dir` chạy được trên Linux → `dist/win-unpacked`
    có `NihongoQuest.exe` + `resources/app.asar` 54 MB chứa `out/main|preload|renderer`.
    NSIS installer và icon thương hiệu chưa làm (cần Windows hoặc wine + asset icon).
  - **Chốt kiểm chứng cuối**: node+web `tsc` 0 lỗi, **561 test pass / 48 file**,
    `electron-vite build` OK, production bundle 0 rò rỉ fixture/DesignPreview,
    ảnh chụp 9 màn light/dark bằng Chromium headless.
  - Sự cố: follow-up thiếu `sessionID` làm sinh 6 agent song song trên 3 scope; đã dừng bản
    trùng, snapshot cây file, cho owner chuẩn hợp nhất lại. Không mất dữ liệu, chưa commit.
- Chưa làm: Ranked/Quiz/sets/camera/packaging; sửa `AppShell` chiều cao và vùng title bar.
- Không thể làm tại chỗ: render/visual QA và webcam thật (môi trường Linux không display).
- Kiểm thử: Java 135 test pass. Desktop: `tsc` node+web 0 lỗi, **144 test pass**
  (11 file: protocol 80, main/security+ipc 45, renderer 19), `electron-vite build` thành công.
- Kiểm tra trực quan: dựng Chromium headless (puppeteer) chụp shell/gallery ở 1440×900 light,
  1440×900 dark và 1024×700; phát hiện và sửa lỗi cascade CSS (xem `docs/AI_LOG.md`).

## Cập nhật trước (Calm Study)

- Ngày: 2026-11-15
- Phiên: Calm Study visual correction — loại bỏ neon và đồng bộ các màn hình còn cũ.
- Đã làm: đổi token từ Sakura Arcade sang nền giấy/teal/sage/terracotta; bỏ gradient khỏi
  `client/shared/style.css`; giảm shadow/bo góc; thêm style scope cho đấu hạng, phòng quiz,
  quản lý bộ đề/editor và xếp hạng; đồng bộ dashboard; giữ nguyên controller/FXML binding.
- Kiểm thử: `/tmp/opencode/mvnw -o clean test` bằng JDK 21 — **135 test pass**, 0 failure,
  0 error, 0 skipped.
- Chưa làm: QA trực quan Windows 10/11 và DPI cao vì môi trường Linux không có display.

## Cập nhật gần nhất

- Ngày: 2026-11-15
- Phiên: Phase 2 UI/UX overhaul — Login, Home, Quiz Room, Lobby và Battle.
- Người thực hiện: AI + người dùng

## P4.2 — Phase 2: Login, Home, Quiz Room, Lobby, Battle (phiên này)

- Tạo nhánh `feature/ui-quiz-flow` từ `2245504` (đầu Phase 1 đã commit/push).
- **Home là màn hình đích sau đăng nhập** (D-019): thêm `AuthenticatedRoute.HOME`, nút
  "Trang chủ" trên sidebar và `ClientApp.showHome()/showHome(Player)`; `LOGIN_OK` điều hướng
  về Home thay vì Matchmaking. Bỏ `ClientApp.showMatchmaking(Player)` không còn dùng.
- **Login**: bố cục hai cột (brand + auth card), orb Sakura/Cyan trang trí, 3 feature row có
  icon Lucide, card đăng nhập gọn hơn. Cấu hình server chuyển vào `TitledPane` thu gọn với
  GridPane 2 cột (host + port) và status pill đổi màu theo `status-success`/`status-error`.
  Toàn bộ nội dung nằm trong `ScrollPane` trong suốt để không bị cắt khi mở rộng cấu hình ở
  cửa sổ thấp.
- **Home**: hero card Indigo→Sakura với lời chào và CTA, thẻ tiến độ dùng dữ liệu thật từ
  `Player` (độ chính xác, số trận thắng, tổng điểm, gợi ý theo số câu đã trả lời), 3 mode card
  (Ranked 1v1, Phòng Quiz, Bộ đề) và panel mẹo + lịch sử. Không gọi mạng, không tự tính điểm.
- **Quiz Room**: hai action card lớn Tạo/Vào phòng, tách field label rõ, PIN field chỉ nhận
  6 chữ số bằng `TextFormatter`, badge "6 CHỮ SỐ", step bar 3 bước và status bar cố định ở đáy.
- **Lobby**: header card có PIN panel gradient + nút Sao chép PIN (clipboard, tự reset nhãn),
  player list dùng `PlayerCell` tuỳ biến (avatar chữ cái, chip HOST/vai trò/trực tuyến/camera,
  chip camera đổi màu theo trạng thái), panel camera + thông tin phòng bên phải, action bar
  dính đáy. Chip dùng `FlowPane` để tự xuống dòng khi cửa sổ hẹp; card bind `prefWidth` theo
  `ListView` để lấp đầy chiều ngang. Rời phòng/hủy phòng quay về Home.
- **Battle**: header gameplay có brand mark, pill PIN và pill thời gian phòng; HUD điểm +
  timer lớn với ProgressBar Cyan và trạng thái `countdown-critical` khi ≤5 giây; question card
  nổi bật, 4 answer card 2×2 có badge A–D, bọc chữ khi đáp án dài, giữ nguyên class
  `answer-correct`/`answer-wrong`; leaderboard render hàng tuỳ biến (hạng, tên, số câu đúng,
  điểm), highlight chính người chơi bằng `leaderboard-me`; panel camera giám sát có tiêu đề
  icon. Khi phòng kết thúc, nút chuyển thành "Về trang chủ".
- Chỉ thay đổi FXML/CSS/controller phụ trợ; giữ nguyên `fx:id`, `onAction`, protocol,
  server authority, luồng camera/proctoring và không thêm âm thanh.
- Icon mới trong `Icons`: `HOME`, `PLUS`, `KEY`, `COPY`, `CAMERA` (Lucide, SVGPath 24×24).
- Test: thêm `ClientFxmlTest.shellMarksHomeActiveAndKeepsSidebarVisible` và
  `phaseTwoScreensRenderSakuraBlocks` (assert cấu trúc từng màn hình), thêm
  `UiThemeTest.quizFlowThemeDefinesSakuraComponentBlocks` cho 20 selector Phase 2.
- Kiểm thử: `mvnw -o clean test` bằng JDK 21 (wrapper LF tạm) → **BUILD SUCCESS**,
  **135 test**, 0 failure/error/skip; FXML load + `applyCss()` không có cảnh báo CSS.
- Chưa làm: kiểm tra trực quan trên Windows 10/11 và DPI cao, đo layout ở 1024/1180 khi mở
  rộng cấu hình server, lobby hẹp và lưới đáp án; lý do môi trường Linux không có display.
  Chuyển sang Phase 5 QA.
- Bước tiếp theo: Phase 3 — Ranked, Matchmaking, Result và celebration overlay.

## P4.1 — Phase 1: Design foundation Sakura Arcade (phiên trước)

- Tạo nhánh `feature/ui-foundation` từ nhánh Phase 0 `chore/ui-phase0-tooling`.
- Bundle font vào `src/main/resources/client/fonts/`: **Be Vietnam Pro** Regular/Medium/
  SemiBold/Bold cho body và **Nunito** Bold/ExtraBold cho heading; kèm license OFL trong
  `src/main/resources/licenses/`.
- Thêm `FontLoader` nạp font một lần trước khi load FXML cho cả `ClientApp` và
  `ServerDashboardApp`. Nunito variable mặc định bị JavaFX 21 nạp thành ExtraLight, nên đã
  tạo static instance `wght=700/800` và đóng gói TTF (D-018).
- Viết lại `client/shared/style.css` theo palette Sakura Arcade: nền `#FFF7FA`, text `#1E1B4B`,
  border `#FBCFE8`, Sakura `#F472B6`/`#DB2777`, Coral `#FB7185`, giữ Indigo `#4F46E5` và
  Cyan `#06B6D4` cho focus/tiến trình. Claymorphism: card 18–24px, border 2px, button viền đáy
  3px, shadow tông sakura.
- Đồng bộ `server/dashboard/server-dashboard.css` cùng token/font; header dashboard thêm dải
  Sakura, bảng/log/JSON dùng token mới.
- Thêm hệ icon nội tuyến `com.nihongoquest.ui.Icons` (SVGPath 24×24, Lucide ISC), áp dụng cho
  8 mục sidebar; icon đổi màu theo hover/active/logout bằng `.nav-icon`.
- Nâng shell: logo Sakura, nhãn nhóm **CHƠI**/**CỘNG ĐỒNG**, sidebar 248px, header có thanh
  nhấn gradient Sakura–Coral. Giữ nguyên `fx:id`, `onAction` và luồng controller.
- Cập nhật `UiThemeTest` cho palette Sakura + font + component mới; thêm `FontLoaderTest`,
  `IconsTest` và test token dashboard.
- Kiểm thử: `mvnw -o clean test` bằng JDK 21 (wrapper LF tạm) -> **BUILD SUCCESS**,
  **132 test**, 0 failure/error/skip. `ClientFxmlTest` load 16 màn hình + dashboard,
  `applyCss()` không phát sinh cảnh báo CSS.
- Chưa làm: kiểm tra trực quan trên Windows 10/11 và DPI cao; lý do môi trường Linux hiện tại
  không có Xvfb/display. Chuyển sang Phase 5 QA.
- Bước tiếp theo: Phase 2 — Login, Home, Quiz Room, Lobby và Battle; bắt đầu bằng Login + Home,
  sau đó lobby/battle và giữ nguyên server authority.

## P4.0 — Phase 0: Git workflow + UI/UX tooling + đề xuất hướng giao diện

- Tạo nhánh `chore/ui-phase0-tooling` từ `main`; Phase 0 đã được người dùng duyệt commit/push.
- Cài UI UX Pro Max project-local bằng `npx ui-ux-pro-max-cli init --ai opencode`;
  skill nằm trong `.opencode/skills/` và đã được gitignore (D-016).
- Thêm mục **Git workflow** vào `AGENTS.md`: mỗi task/phase tạo nhánh riêng, chỉ commit/push
  sau khi người dùng OK.
- Tạo `docs/ui-tooling.md`: hướng dẫn cài/cập nhật và cách chạy search của skill.
- Tạo `docs/ui-redesign-proposal.md`: audit 16 màn hình, kết quả tra cứu skill và 3 phương án
  thị giác A (Indigo Quest), B (Sakura Arcade), C (Clean Study).
- Chốt hướng **B. Sakura Arcade** (D-017); bundle Nunito + Be Vietnam Pro; scope client +
  server dashboard. Phase 1 sẽ cập nhật token/component, chưa đổi CSS trong phiên này.
- Xác nhận lại **không có âm thanh** (D-015): không thêm `javafx-media`, `AudioManager`,
  `SoundEvent` hay asset âm thanh; pháo hoa/confetti chỉ là hiệu ứng hình ảnh.
- Không thay đổi code Java, FXML, CSS, protocol hay hành vi runtime.
- Kiểm thử: `mvnw -o clean test` bằng JDK 21 (wrapper LF tạm) -> **BUILD SUCCESS**,
  **124 test**, 0 failure/error/skip; chỉ thay đổi tài liệu/cấu hình nên baseline không đổi.
- Chưa làm: chưa bắt đầu Phase 1 (palette/component Sakura Arcade); lý do là Phase 0 cần được
  commit/push và tạo nhánh riêng trước.
- Bước tiếp theo: tạo nhánh `feature/ui-foundation` cho Phase 1
  (palette/component Sakura Arcade).

## P3.1 — Viết lại tài liệu protocol, Ranked và kiến trúc

- Đối chiếu số liệu: baseline hiện tại là **124 test** trên JDK 21, 0 failure/error/skip
  (đọc từ `target/surefire-reports`); sửa các số 120/122 còn sót trong README, PROGRESS và
  `docs/testing.md`.
- Viết lại `docs/protocol.md`: framing JSON-line, phiên/auth, catalog message theo domain,
  payload chính, mã lỗi, timeout và binary media protocol.
- Thêm `docs/ranked.md`: hàng chờ 3/5 phút, luật trận, scoring, disconnect, persistence và
  giới hạn hiện tại (chưa có MMR, chưa reconnect).
- Cập nhật `docs/architecture.md`: module map, thread/network boundary, luồng Ranked/Quiz Room,
  media relay và persistence; thêm liên kết trong README.
- Không thay đổi code, protocol hay hành vi runtime.
- Kiểm thử: `mvnw -o clean test` bằng JDK 21 (wrapper LF tạm) đạt **124 test**,
  0 failure/error/skip, `BUILD SUCCESS`.

## P0.1 — Camera preview đen khi demo LAN

- Bản sửa được hoàn thiện trên nhánh `codex/fix-quiz-camera-black`; kiểm tra webcam thật
  trên hai máy Windows vẫn là bước xác nhận runtime còn lại sau khi tích hợp.
- Nguyên nhân UI: `quiz-lobby.fxml` có `cameraPreview` nhưng `QuizLobbyController`
  chưa đăng ký `previewListener`, nên player không bao giờ nhận frame vào preview lobby.
  Host không capture camera nhưng dùng cùng layout, dễ bị hiểu nhầm là camera host bị đen.
- Nguyên nhân khởi tạo: capture ép `1280×720 @ 45 FPS`; runtime log cho thấy máy
  mở được cũng mất 8,6 giây mới có frame đầu, sát timeout 10 giây, còn các lần
  demo sau liên tục `camera_initialization_timeout`.
- Sửa lobby player hiển thị frame local thật. Chuyển ảnh ngoài JavaFX Application Thread,
  chỉ xếp một lệnh render và luôn thay bằng frame mới nhất; host không hiển preview local.
- Đổi profile capture mặc định thành `640×480 @ 15 FPS`, MJPG trên Windows và một
  buffer. Thêm log profile yêu cầu/thực tế và stack trace nếu webcam không mở được.
- Không đổi gameplay protocol, media framing, server authority, timeout 10 giây hoặc policy
  camera lỗi không chặn quiz.
- Kiểm thử ngày 2026-11-14: `clean test` trên JDK 21 đạt **124 test**,
  0 failure/error/skip và `BUILD SUCCESS`. Môi trường Linux phải dùng bản LF tạm của
  `mvnw` vì wrapper trong repository dùng CRLF cho Windows; không sửa wrapper nguồn.
- Còn chờ người dùng demo webcam thật trên hai máy Windows để xác nhận thiết bị/runtime.

## P2.3 — Design System thống nhất & Design Tokens (phiên này)

- Viết lại `client/shared/style.css` (từ 1518 dòng 3 lớp theme chồng chéo) thành một stylesheet
  duy nhất, tổ chức thành 20 khối: Design Tokens, Base, Buttons, Inputs, Surfaces/Cards/Shell,
  Header, Sidebar, Home, Matchmaking, Battle/Scoreboard, Quiz, Proctor/Camera, Result,
  Data Views, Profile/Stats, Semantic states, Animation components, Action/Welcome, Shell chrome,
  Dialogs/Tooltips.
- **Design Tokens tập trung** khai báo trên `.root` (JavaFX looked-up colors `-ndq-*`); mọi
  selector chỉ tham chiếu token, **không hardcode màu** ở nơi khác. Palette: primary `#4F46E5`,
  primary-dark `#3730A3`, accent `#06B6D4`, bg `#F5F7FB`, surface `#FFFFFF`, text `#172033`,
  text-secondary `#64748B`, border `#E2E8F0`, success `#16A34A`, warning `#D97706`, error `#DC2626`
  + token dẫn xuất (hover/soft/border/muted).
- Loại bỏ hoàn toàn màu theme cũ (xanh dương `#2b6cb0`, Duolingo xanh lá `#58cc02`/`#46a302`,
  Cyan cũ `#1cb0f6`); Indigo là nhận diện, Cyan chỉ làm nhấn; không dùng xanh lá cho
  button/sidebar/header/trang trí; Success chỉ cho trạng thái đúng/thành công.
- Cập nhật `server/dashboard/server-dashboard.css` dùng **cùng bộ token** (header gradient Indigo,
  primary button Indigo) để toàn hệ thống một hệ màu.
- Cập nhật `UiThemeTest`: khẳng định đủ token palette mới, cấm màu theme cũ, bắt buộc token hóa
  (`-ndq-*`). Không đổi `fx:id`, `onAction`, protocol, controller và animation `UiMotion`.

## P2.2 — Gỡ bỏ hoàn toàn hệ thống âm thanh

- Xóa `client/ui/AudioManager.java` và `client/ui/SoundEvent.java` (bao gồm cả `PcmTone` sinh
  sine wave/WAV PCM tại runtime) cùng test `AudioManagerTest` và `SoundEventTest`.
- Gỡ mọi lời gọi phát âm thanh: `ClientApp` (GAME_START/NOTIFICATION/shutdown/stopBackground),
  `AuthenticatedShellController` (NAVIGATE), `QuizBattleController`
  (COUNTDOWN/CORRECT/WRONG/TIME_OUT/GAME_OVER/CAMERA_*), `ProctorDashboardController`
  (PROCTORING_ALERT/CAMERA_*), `ResultController` (VICTORY/GAME_OVER). Giữ nguyên mọi animation
  và logic nghiệp vụ (bỏ biến `previous` không còn dùng ở proctor dashboard).
- Gỡ dependency `org.openjfx:javafx-media` khỏi `pom.xml` (trước đây chỉ `AudioManager` dùng).
- Sửa comment CSS "animation & sound system" -> "animation system".
- Không xóa animation (`UiMotion`), ảnh/icon, model proctoring, các dependency khác.
  Không thay bằng hệ thống âm thanh khác, không tạo âm thanh mới.
- Kết quả: ứng dụng hoàn toàn không phát âm thanh; `grep` toàn `src` xác nhận không còn tham chiếu
  âm thanh. Chi tiết: `docs/AI_LOG.md` [2026-11-03 15:45], `DECISIONS.md` D-012.

## P2.1 — EdTech Gaming theme + Animation (đã xong; phần âm thanh đã gỡ bỏ)

- Đổi hướng thị giác sang **Indigo (#4338ca) + Cyan (#06b6d4)** trên nền sáng `#f6f7fb`,
  giữ semantic Green/Amber/Red; không dùng Dark Neon. Áp dụng bằng khối "theme v2" nối vào
  `client/shared/style.css`, giữ nguyên mọi selector cũ để 16 FXML vẫn load.
- ~~Thêm `AudioManager`/`SoundEvent` + sinh WAV PCM + `javafx-media`~~ -> **ĐÃ GỠ BỎ hoàn toàn.**
- Mở rộng `UiMotion`: `fadeIn/fadeOut/slideIn/pulse/shake/countdown/rankUp/toastIn/toastOut/shimmer`
  và cờ `enabled` toàn cục để tắt animation; tất cả dùng JavaFX Animation API, không chặn FX thread.
- Nối animation theo **trạng thái nghiệp vụ**, không theo packet mạng: page transition ở
  `AuthenticatedShellController.showContent`; đáp án đúng pulse / sai shake, countdown gấp ở
  `QuizBattleController`; toast + rankUp ở proctor dashboard/result. Toàn bộ đều là animation,
  không có âm thanh.

## P2 (phiên trước)

- Redesign UI/UX Duolingo-inspired (theme xanh lá) — đã thay bằng theme v2 Indigo/Cyan ở trên.

## Đã hoàn thành

- Đọc cấu trúc source và xác định các module client/server/common.
- Xác định điểm liên quan camera: `CameraCaptureService`, `ProctoringCoordinator`, `QuizRoom`, `QuizLobbyController`, `QuizRoomManager`.
- Xóa bộ tài liệu hướng dẫn cũ nhưng giữ `srccode.md` và lịch sử Git.
- Tạo bộ tài liệu tiếng Việt mới và quy ước AI.
- Xác định nguyên nhân host bị khóa: `QuizLobbyController` yêu cầu mọi camera `READY` dù server không yêu cầu.
- Sửa policy start: chỉ phụ thuộc host, hai player đang kết nối và request chưa pending.
- Thêm cảnh báo camera không chặn quiz, timeout frame đầu tiên 10 giây, retry và attempt ID chống callback cũ.
- Thêm runtime log xoay vòng cho client/server và log create/join/lobby/camera/start/route transition.
- Thêm test policy UI, mọi camera state phía server và lifecycle camera bằng fake source.
- Thêm metrics theo cửa sổ 5 giây cho capture, JPEG encode, network send/receive,
  JPEG decode và AI inference; log có FPS, độ trễ trung bình/cao nhất, Mbps và số frame drop.
- Xác nhận publisher/AI/relay/dashboard dùng latest-frame semantics, không tạo queue frame vô hạn.
- Chuyển JPEG decode khỏi JavaFX thread; dashboard chỉ thay ảnh đã giải mã ở nhịp render.
- Giới hạn camera tự retry 3 lần, sau đó báo rõ để player chủ động bấm thử lại.
- Frame tối hoặc gần như phẳng được coi là `UNKNOWN`, không tích lũy cửa sổ cảnh báo
  `NO_FACE`/`MULTIPLE_FACES`/`LOOKING_AWAY`.
- Thêm `scripts/run.ps1`: menu chọn server/client/test và tham số IP/port cho demo LAN.
- Kiểm tra cú pháp PowerShell thành công; README và testing guide đã có lệnh chạy Windows.
- Chuẩn hóa theme sáng xanh lá/xanh dương, card 20px, typography, input, button,
  sidebar, list, table, tab, progress, dialog và trạng thái semantic trong một stylesheet chung.
- Áp dụng theme cho login, home, shell, profile, friends, leaderboard, history, quiz,
  ranked và proctor dashboard; loại bỏ inline color/style còn lại trong FXML/controller.
- Thêm animation route 190ms và feedback đúng/sai 110ms, không chặn JavaFX thread.
- Bổ sung empty state cho friends, bộ đề, lobby, leaderboard, history và proctor event.
- Dashboard camera dùng style class `camera-ok/warning/error` thay cho inline style động.

## Chưa hoàn thành

- (Không còn task âm thanh: hệ thống âm thanh đã bị gỡ bỏ hoàn toàn theo yêu cầu người dùng.)
- Xác nhận thủ công P0 với host + 2 player và webcam thật trên Windows 10/11.
- Chạy benchmark camera thật 2 client rồi 6 client và chốt FPS/resolution/JPEG quality.
- Kiểm tra trực quan UI trên Windows 10/11 ở các viewport 1280×720 → 1920×1080 và DPI cao.

## Không thể hoàn thành trong phiên này

- Không thể chạy kịch bản LAN nhiều máy và webcam thật trong môi trường kiểm thử hiện tại.

## Kiểm thử

- 2026-11-15 10:50 — `mvnw -o clean test` bằng JDK 21 (wrapper LF tạm): **BUILD SUCCESS**,
  **124 test pass**, 0 failure, 0 error, 0 skipped. Đây là baseline 2026-11-15; trước khi gỡ
  âm thanh là 135 và đã bỏ đúng 13 test âm thanh (`AudioManagerTest` 8 + `SoundEventTest` 5).
  Số 122 trong các ghi chú cũ không còn là baseline.
- `UiThemeTest` (3) vẫn xác nhận palette Indigo/Cyan, nền sáng và component theme (animation);
  đã đổi tên method `themeDefinesAnimationAndSoundSystemComponents` -> `themeDefinesAnimationSystemComponents`
  cho chính xác (selector kiểm tra không liên quan âm thanh).
- 16 màn hình client vẫn load FXML + stylesheet ở viewport 980×680 (ClientFxmlTest: 19 test pass).

## Cách cập nhật

Sau mỗi phiên AI, ghi rõ task đã xong, task chưa xong và lý do, task không thể làm và lý do, test đã chạy và bước tiếp theo.
