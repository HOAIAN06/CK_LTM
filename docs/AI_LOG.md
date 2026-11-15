# AI_LOG — Nhật ký lỗi và bằng chứng

## [2026-11-15 13:10 Asia/Saigon] [FIXED]
- Task/commit: Calm Study visual correction trên nhánh `feature/ui-quiz-flow`, chưa commit.
- Bước tái hiện: rà soát UI theo UI UX Pro Max; kiểm tra `style.css` và FXML của đấu hạng,
  phòng quiz, quản lý bộ đề, xếp hạng, lobby/battle.
- Kết quả thực tế: palette Sakura Arcade có quá nhiều màu nhấn và gradient; các màn hình cũ
  chưa có scope style riêng nên cảm giác chắp vá/neon.
- Thay đổi: token Calm Study (teal sâu, sage, nền giấy, terracotta); bỏ gradient; giảm shadow,
  radius và border; thêm scope `.matchmaking-page`, `.quiz-room-page`, `.quiz-sets-page`,
  `.quiz-editor-page`, `.leaderboard-page`; không đổi logic nghiệp vụ.
- Kiểm thử: `/tmp/opencode/mvnw -o clean test` bằng JDK 21 đạt 135 test pass.
- Còn lại: chưa có GUI display để kiểm tra trực quan Windows/DPI.

Đây là nơi AI đọc trước khi chẩn đoán. Không ghi mật khẩu, token, ảnh khuôn mặt hoặc dữ liệu cá nhân nhạy cảm. Có thể che PIN và username.

## Cách ghi

Mỗi lỗi thêm entry mới nhất lên đầu file:

```text
## [YYYY-MM-DD HH:mm Asia/Saigon] [OPEN|INVESTIGATING|FIXED|BLOCKED]
- Task/commit:
- Vai trò và số client:
- Windows/JDK/camera:
- Bước tái hiện:
- Kết quả mong đợi:
- Kết quả thực tế:
- UI state cuối:
- Camera state cuối:
- Message/event cuối:
- Exception/stack trace:
- Giả thuyết:
- Bằng chứng đã kiểm tra:
- Thay đổi đã thử:
- Kết luận/bước tiếp theo:
```

## Entry hiện tại

## [2026-11-15 15:40 Asia/Saigon] [FIXED]
- Task/commit: `QUIZ_SET_*` không bao giờ tới màn Bộ đề (`feature/electron-desktop`, chưa commit).
- Bước tái hiện: mở `/sets` hoặc `/sets/editor` với demo fixture; skeleton quay mãi dù server trả lời.
- Nguyên nhân: `lib/sets/sets-store.ts` đăng ký kênh bằng `useQuizStoreSets()` (hook) thay vì
  `.getState()`; connection store bọc mỗi listener trong `try/catch` nên lỗi bị nuốt im lặng,
  message `QUIZ_SET_LIST_RESULT`/`QUIZ_SET_DETAIL` không bao giờ được áp dụng. Unit test không
  phát hiện vì gọi thẳng `applyServerMessage`.
- Cách sửa: dùng `useSetsStore.getState()` trong listener.
- Bằng chứng: `/sets` hiện 3 bộ đề OWN + badge "chưa đủ để xuất bản"; editor 3/3 câu hợp lệ.
- Kết luận: lỗi thật trong lớp store, đã sửa; nhắc lại nguyên tắc "listener không được gọi hook".

## [2026-11-15 15:35 Asia/Saigon] [FIXED]
- Task/commit: proctoring Electron không thể phát hiện gian lận bằng vision.
- Bối cảnh: JavaFX dùng OpenCV/Javacv (`ProctorAiEngine`) cho NO_FACE/MULTIPLE_FACES/LOOKING_AWAY/
  PHONE_DETECTED; Electron không có model tương đương và không được thêm dependency nặng.
- Quyết định: chỉ phát các event đo được — `APP_FOCUS_LOST`, `APP_MINIMIZED` (debounce 5 s,
  một event mỗi lần rời cửa sổ) và `CAMERA_BLOCKED` (track mute/ended). `confidence = 0`.
  Host dashboard vẫn hiển thị cảnh báo do server tổng hợp.
- Hệ quả: báo cáo proctoring của bản desktop **không** tương đương bản JavaFX về phát hiện
  khuôn mặt; phải ghi rõ khi demo/bảo vệ. Không sửa server, không thêm event giả.

## [2026-11-15 14:35 Asia/Saigon] [FIXED]
- Task/commit: desktop shell — footer sidebar bị đẩy khỏi màn hình (`feature/electron-desktop`, chưa commit).
- Bước tái hiện: mở Home (hoặc bất kỳ route dài hơn viewport) ở 1440×900 / 1024×700.
- Kết quả mong đợi: shell cao đúng viewport, chỉ cột nội dung cuộn, footer (user + đăng xuất) luôn thấy.
- Kết quả thực tế: `<aside>` cao 992–3183px trong cửa sổ 860–900px; nút đăng xuất nằm dưới
  viewport; `body.scrollHeight` 3223 > 900.
- Nguyên nhân: grid trong `AppShell` chỉ khai báo `grid-cols-*`; row ngầm định là `auto` nên
  giãn theo nội dung thay vì bị chặn bởi chiều cao còn lại.
- Cách sửa: thêm `grid-rows-[minmax(0,1fr)]` + `h-full` cho grid, `min-h-0` cho cột nội dung.
- Bằng chứng sau sửa (Chromium headless, nội dung 3000px): `aside.height` = 860/820/660 ở
  1440×900 / 1280×860 / 1024×700; logout `bottom` 884 < 900; `body.scrollHeight` = đúng viewport;
  nav 30 mục vẫn cuộn trong sidebar và footer còn hiển thị.
- Kèm theo: title bar chừa `--nq-titlebar-controls-width: 138px` cho `titleBarOverlay`, tránh
  chồng lên nút theme/badge ở góc phải.
- Kết luận: lỗi layout thật; đã sửa và đo lại, không phải vấn đề môi trường.

## [2026-11-15 14:05 Asia/Saigon] [FIXED]
- Task/commit: desktop design system — typography/button utilities bị vô hiệu (`feature/electron-desktop`, chưa commit).
- Vai trò và số client: kiểm tra bằng Chromium headless (Electron 45 dùng Chromium 157) qua puppeteer,
  render `DesignPreview` + `AppShell` ở 1440×900 và 1024×700, light + dark.
- Bước tái hiện: mở preview, đọc `getComputedStyle(h1)` của `h1.nq-display.text-nq-3xl`.
- Kết quả mong đợi: font-size 30px (`--nq-fs-3xl`), button primary nền teal, padding theo utility.
- Kết quả thực tế: h1 = **13px**; button primary trong suốt; `px-*`/`p-*` trên `<button>` mất tác dụng.
  `--nq-fs-3xl` vẫn đúng 30px nên lỗi không nằm ở token.
- Nguyên nhân: `desktop/src/renderer/styles/base.css` cố ý **không nằm trong `@layer`**
  ("để thắng Tailwind preflight"). CSS không layer thắng mọi layer, nên cũng thắng
  toàn bộ utility: `h1{font-size:inherit}` đè `.text-nq-3xl`, `button{background:none;padding:0}`
  đè `.bg-nq-primary`/`.px-4`. Tương tự `p-4`/`p-6` không áp dụng cho `CardBody`.
- Cách sửa: chia `base.css` thành `@layer base` (reset, sizing, scrollbar, selection, CJK,
  reduced-motion), `@layer components` (`.nq-scroll*`, `.nq-skip-link`) và `@layer utilities`
  (`:focus-visible`, `.nq-focusable:focus-visible` — cần thắng `shadow-*` trên cùng element).
- Bằng chứng sau sửa: h1 = 30px, primary button nền `#1f5560`, nav active có thanh + nền,
  dark theme đổi đúng; ảnh lưu tại `/tmp/opencode/screens/v2-*`.
- Ghi chú thêm: `DesignPreview` tự ghi `data-theme="light"` khi mount nên nuốt theme của harness;
  đã giao ui-designer chuyển thành controlled. `Card` mặc định `padding='md'` cộng dồn với
  `CardBody` gây ~52px khoảng trắng — giao ui-designer chốt lại quy ước.
- Kết luận: lỗi design-system thật, đã sửa và xác minh bằng ảnh, không phải lỗi môi trường.

## [2026-11-15 13:45 Asia/Saigon] [FIXED]
- Task/commit: Desktop Phase 0 audit + Phase 2 foundation (`feature/electron-desktop`, chưa commit).
- Bước tái hiện: `cd desktop && npm install` trên `/run/media/...` (volume exFAT).
- Kết quả mong đợi: cài dependency và chạy `tsc`/`vitest`/`vite build` trong repo.
- Kết quả thực tế: `npm error code EPERM / syscall symlink
  ../@babel/parser/bin/babel-parser.js -> desktop/node_modules/.bin/parser`.
- Nguyên nhân: `mount` xác nhận `/dev/sda2 on /run/media/xiaoying/DATA type exfat`; exFAT
  không hỗ trợ symlink/hardlink nên npm không tạo được `node_modules/.bin`.
- Bằng chứng đã kiểm tra: `ln -s` và `ln` đều trả "Thao tác không được phép"; `mount` hiển thị exfat.
- Cách xử lý: cài dependency tại `/tmp/opencode/nq-verify` (ext4); thêm
  `desktop/scripts/verify-linux.sh` để rsync `desktop/` sang sandbox rồi chạy lệnh kiểm chứng.
  Ghi thành D-023 và mục 7.1 trong `docs/desktop/contracts.md`.
- Kết luận: lỗi môi trường, không phải lỗi cấu hình dự án; không sửa `package.json`.

## [2026-11-15 13:39 Asia/Saigon] [FIXED]
- Task/commit: xác nhận baseline JavaFX trước khi thêm desktop client.
- Bước tái hiện: `/tmp/opencode/mvnw -o clean test` (mvnw gốc có CRLF, tạo bản LF ở /tmp).
- Kết quả: **Tests run: 135, Failures: 0, Errors: 0, Skipped: 0 — BUILD SUCCESS** (JDK 21.0.13).
- Kết luận: baseline dùng để so sánh regression; mọi thay đổi desktop không được chạm Java.

## [2026-11-15 11:55 Asia/Saigon] [FIXED]
- Task/commit: Phase 2 UI/UX overhaul — Login, Home, Quiz Room, Lobby, Battle
  (nhánh `feature/ui-quiz-flow`, chưa commit/push).
- Vai trò và số client: test tự động; chưa chạy GUI do môi trường Linux không có display/Xvfb.
- Windows/JDK/camera: JDK 21, JavaFX 21; thay đổi không chạm camera ngoài việc bọc panel preview
  bằng container ẩn/hiện, không đổi pipeline capture/relay.
- Bước tái hiện: load 16 FXML client + dashboard qua `FXMLLoader`, gắn `style.css` và gọi
  `applyCss()/layout()` ở 980×680 cho toàn bộ suite; màn hình Phase 2 kiểm thêm ở 1180×720.
- Kết quả mong đợi: 5 màn hình Phase 2 render đúng khối Sakura Arcade, giữ nguyên `fx:id`/
  `onAction`, không phát sinh cảnh báo CSS, Home trở thành đích sau đăng nhập.
- Kết quả thực tế: **135 test pass**, 0 failure/error/skip; `ClientFxmlTest` 22 test,
  `UiThemeTest` 7 test; không có cảnh báo parse CSS.
- UI state cuối: Login 2 cột + cấu hình server thu gọn; Home hero + 3 mode card + panel tiến độ;
  Quiz Room 2 action card + step bar; Lobby PIN panel + player card + camera/info panel +
  action bar; Battle HUD + question card 2×2 đáp án + leaderboard tuỳ biến.
- Camera state cuối: không đổi logic; lobby preview vẫn chỉ hiện cho player khi proctoring bật,
  lỗi camera vẫn không chặn tham gia/bắt đầu.
- Message/event cuối: không đổi protocol; chỉ đổi đích điều hướng sau `LOGIN_OK`,
  `QUIZ_ROOM_CANCEL` và khi rời phòng.
- Exception/stack trace: không có.
- Giả thuyết/nguyên nhân: trước Phase 2, `LOGIN_OK` mở thẳng Matchmaking nên thiếu màn hình
  tổng hợp tiến độ; CSS cũ còn class dùng chung (`.player-name`) giữa Ranked và Lobby nên dễ
  ghi đè màu chữ trên scoreboard tối.
- Bằng chứng đã kiểm tra: đổi class Lobby sang `.lobby-player-name` để không đè `.player-name`
  của Ranked; scope padding Battle Quiz bằng `.quiz-battle-page` thay vì sửa `.battle-content`
  dùng chung; test cấu trúc xác nhận 3 `.home-mode-card`, 2 `.quiz-action-card`, 4 `.answer-button`.
- Thay đổi đã thử: `TitledPane` + `ScrollPane` cho Login, `FlowPane` chip và bind `prefWidth`
  theo `ListView` cho Lobby, `ContentDisplay.LEFT` + badge chữ cho đáp án Battle.
- Kết luận/bước tiếp theo: Phase 2 xong phần code/tài liệu; còn QA trực quan trên Windows 10/11
  và DPI cao ở Phase 5, đặc biệt khi mở rộng cấu hình server ở cửa sổ thấp và cửa sổ 1024px.

## [2026-11-15 11:10 Asia/Saigon] [FIXED]
- Task/commit: Phase 1 UI/UX overhaul — design foundation Sakura Arcade (nhánh `feature/ui-foundation`, đã được người dùng duyệt commit/push).
- Vai trò và số client: test tự động; chưa chạy GUI do môi trường Linux không có display/Xvfb.
- Windows/JDK/camera: JDK 21, JavaFX 21; không liên quan camera.
- Bước tái hiện: load FXML client/server và `applyCss()` ở viewport 980×680.
- Kết quả mong đợi: token Sakura Arcade, font heading/body đúng weight, icon sidebar hiển thị,
  shell không vỡ layout và không phát sinh lỗi CSS.
- Kết quả thực tế: 16 màn hình client + dashboard load thành công; không có cảnh báo parse CSS.
- UI state cuối: sidebar 248px có logo/gradient, nhãn CHƠI/CỘNG ĐỒNG, 8 icon stroke; header có dải
  Sakura–Coral; client và dashboard dùng chung palette/font.
- Camera state cuối: không đổi.
- Message/event cuối: không đổi protocol.
- Exception/stack trace: không có.
- Giả thuyết/nguyên nhân: `Font.loadFont` trên JavaFX 21 nạp Nunito variable theo instance mặc định
  `ExtraLight`, nên heading đậm sẽ sai weight nếu dùng file variable trực tiếp.
- Bằng chứng đã kiểm tra: probe JavaFX cho thấy `Nunito-Variable.ttf -> Nunito ExtraLight`; sau khi
  tạo static instance `wght=700/800` và đổi name table, probe trả `family=Nunito, style=Bold/ExtraBold`.
- Thay đổi đã thử: bundle Be Vietnam Pro 4 weight + Nunito Bold/ExtraBold; `FontLoader` gọi trong
  `ClientApp.start()`/`ServerDashboardApp.start()`; token/typography/claymorphism trong hai CSS;
  `Icons` SVGPath + `.nav-icon`; shell logo/nhãn nhóm/header accent; test theme/font/icon.
- Kiểm thử: `mvnw -o clean test` JDK 21 (wrapper LF tạm) đạt **132 test**, 0 failure/error/skip,
  `BUILD SUCCESS`.
- Kết luận/bước tiếp theo: Phase 1 code hoàn tất; cần kiểm tra trực quan Windows/DPI cao ở Phase 5.
  Tiếp theo là Phase 2 (Login, Home, Quiz Room, Lobby, Battle); người dùng đã duyệt commit/push Phase 1.

## [2026-11-15 10:52 Asia/Saigon] [FIXED]
- Task/commit: Phase 0 UI/UX overhaul — thêm Git workflow, cài UI UX Pro Max project-local,
  audit 16 màn hình và đề xuất hướng giao diện A/B/C; nhánh `chore/ui-phase0-tooling`.
- Kết quả mong đợi: có quy trình nhánh/commit rõ ràng; skill chạy được nhưng không làm nặng
  repo; có đề xuất giao diện dựa trên dữ liệu; không đổi code/runtime.
- Thay đổi đã thực hiện:
  (1) `.gitignore`: thêm `.opencode/skills/`.
  (2) `AGENTS.md`: thêm mục **Git workflow** (nhánh riêng, chờ OK mới commit/push).
  (3) Thêm `docs/ui-tooling.md` và `docs/ui-redesign-proposal.md`.
  (4) `DECISIONS.md`: D-015 (tiếp tục không âm thanh), D-016 (skill local, không commit).
  (5) `TASKS.md`, `PROGRESS.md`, `docs/ui-design.md`, `README.md` cập nhật liên kết/trạng thái.
- Bằng chứng:
  - `npx ui-ux-pro-max-cli init --ai opencode` tạo `.opencode/skills/` (172 file, 4,6 MB).
  - `git check-ignore -v .opencode/skills/ui-ux-pro-max/SKILL.md` xác nhận file skill bị ignore.
  - Chạy thành công `search.py ... --design-system` và `search.py ... --stack javafx`.
  - Kết quả skill: Language Learning App -> Claymorphism + Vibrant & Block-based; palette
    Indigo `#4F46E5` + accent tiến độ `#16A34A`; JavaFX shell + feature workspace.
- Kiểm thử: `mvnw -o clean test` trên JDK 21 (wrapper LF tạm) -> **BUILD SUCCESS**,
  **124 test**, 0 failure/error/skip.
- Quyết định sau rà soát: người dùng chọn **B. Sakura Arcade** (D-017), bundle
  Nunito + Be Vietnam Pro, scope client + server dashboard; vẫn không âm thanh (D-015).
- Kết luận/bước tiếp theo: commit/push Phase 0 sau khi được duyệt; sau đó tạo nhánh
  `feature/ui-foundation` cho Phase 1.

## [2026-11-15 06:45 Asia/Saigon] [FIXED]
- Task/commit: đối chiếu số liệu/ngày, viết lại `docs/protocol.md`, thêm `docs/ranked.md` và
  cập nhật `docs/architecture.md`; chỉ thay đổi tài liệu, không đổi code hay protocol.
- Kết quả mong đợi: số liệu test thống nhất 124; tài liệu khớp `MessageType`, `Payloads`,
  `GameRoom`, `QuizRoom`, `ProctorMediaRelay` và schema hiện tại.
- Nguồn đã kiểm tra: `MessageType.java`, `Payloads.java`, `Message.java`, `Protocol.java`,
  `ServerRequestRouter.java`, `ClientHandler.java`, `GameRoom.java`, `MatchmakingManager.java`,
  `QuizRoom.java`, `QuizRoomManager.java`, `ProctorMediaRelay.java`, `MediaProtocol.java`,
  `GameServer.java`, `MatchRepository.java`, `sql/supabase_schema.sql`.
- Bằng chứng kiểm thử: `mvnw -o clean test` trên JDK 21 (wrapper LF tạm) -> **BUILD SUCCESS**,
  **124 test**, 0 failure/error/skip; `target/surefire-reports` tổng 124 test.
- Kết luận/bước tiếp theo: tài liệu đã đồng bộ; vẫn chờ demo webcam/LAN thật để đóng P0.1
  và benchmark 2/6 client để chốt cấu hình camera.

## [2026-11-14 22:08 Asia/Saigon] [INVESTIGATING]
- Task/commit: sửa camera đen khi demo 1 server + host + 2 player trên hai máy; nhánh
  `codex/fix-quiz-camera-black` đã merge vào `main` tại `389c285`.
- Bước tái hiện: player vào Quiz Room có proctoring, cho phép camera; preview đen,
  host không thấy hình player.
- Kết quả mong đợi: mỗi player thấy preview local trong lobby/battle; host nhận hai
  luồng qua media relay. Host không bị hiểu là có camera local.
- Bằng chứng runtime: một client cũ có `camera_first_frame` sau 8,6 giây và gửi 11–13 FPS,
  12–14 Mbps; các lần chạy ngày 2026-11-04 không có `camera_first_frame` và liên tục
  `camera_initialization_timeout` sau 10 giây. Host chỉ nhận frame khi player capture thành công.
- Nguyên nhân code: lobby khai báo `cameraPreview` nhưng không gắn `previewListener`;
  capture ép `1280×720 @ 45 FPS`, không phù hợp nhiều webcam Windows và demo LAN.
- Thay đổi đã thử: gắn preview latest-frame cho player lobby, ẩn preview local của host;
  đổi capture sang `640×480 @ 15 FPS`, MJPG Windows, buffer 1; thêm log open profile/lỗi.
- Kiểm thử: targeted 25 test pass; `mvnw.cmd clean test` JDK 21 đạt **124 test pass**,
  0 failure/error/skip.
- Kết luận/bước tiếp theo: code và test tự động đã xong; giữ trạng thái
  `INVESTIGATING` cho tới khi người dùng chạy demo webcam thật hai máy và xác nhận hình.

## [2026-11-03 16:05 Asia/Saigon] [FIXED]
- Task/commit: thống nhất Design System "Modern EdTech Gaming" (Clean, Professional, Minimal)
  theo palette Indigo/Cyan; xây dựng Design Tokens tập trung, loại bỏ phối màu tùy tiện.
- Kết quả mong đợi: một hệ màu duy nhất cho mọi màn hình; Indigo là nhận diện, Cyan chỉ là nhấn,
  không còn xanh lá Duolingo cho button/sidebar/header/trang trí; token hóa màu, không hardcode.
- Nguyên nhân: `client/shared/style.css` là 3 lớp theme chồng chéo (base xanh dương `#2b6cb0`,
  Duolingo xanh lá `#58cc02`/`#46a302`, Indigo `#4338ca`), nhiều rule trùng/ghi đè, một số block
  bị xen kẽ; gây phối màu tùy tiện giữa theme cũ và mới.
- Thay đổi đã thực hiện:
  (1) Viết lại `client/shared/style.css` (từ 1518 dòng theme chồng chéo) thành stylesheet token hóa
  gồm 20 khối có tổ chức; khai báo Design Tokens trên `.root` và mọi selector tham chiếu `-ndq-*`.
  (2) Cập nhật `server/dashboard/server-dashboard.css` dùng cùng bộ token (header chuyển sang
  gradient Indigo, primary button Indigo) để toàn hệ thống một hệ màu.
  (3) Cập nhật `UiThemeTest`: khẳng định đủ token palette mới, cấm màu theme cũ, bắt buộc token hóa.
- Palette token: primary `#4F46E5`, primary-dark `#3730A3`, accent `#06B6D4`, bg `#F5F7FB`,
  surface `#FFFFFF`, text `#172033`, text-secondary `#64748B`, border `#E2E8F0`,
  success `#16A34A`, warning `#D97706`, error `#DC2626`.
- Không đổi: `fx:id`, `onAction`, protocol, luồng controller, animation `UiMotion`; giữ toàn bộ
  style class hiện có để 16 FXML vẫn load styled.
- Bằng chứng đã kiểm tra: `mvnw.cmd clean test` trên JDK 21 -> **BUILD SUCCESS**, **123 test pass**,
  0 failure/error/skip. `ClientFxmlTest` load 16 FXML + stylesheet client và server dashboard với
  `applyCss()`/`layout()` không lỗi CSS. `UiThemeTest` (4) pass. Không còn hardcode hex ngoài khối token.
- Kết luận/bước tiếp theo: design system đã thống nhất và token hóa; kiểm tra trực quan trên
  Windows 10/11 ở nhiều viewport vẫn nằm trong backlog.

## [2026-11-03 15:45 Asia/Saigon] [FIXED]
- Task/commit: XÓA HOÀN TOÀN hệ thống âm thanh (audio) theo yêu cầu bắt buộc của người dùng.
- Kết quả mong đợi: ứng dụng hoàn toàn không phát âm thanh; không còn class/dependency/lời gọi
  âm thanh; giữ nguyên animation, hình ảnh, icon, model và toàn bộ logic nghiệp vụ.
- Thay đổi đã thực hiện:
  (1) Xóa `client/ui/AudioManager.java` và `client/ui/SoundEvent.java` (gồm cả `PcmTone` sinh
  sine wave/WAV PCM tại runtime); xóa `AudioManagerTest.java` và `SoundEventTest.java`.
  (2) Gỡ mọi lời gọi phát âm thanh trong `ClientApp` (stopBackground/playSafe GAME_START,
  NOTIFICATION, shutdown), `AuthenticatedShellController` (NAVIGATE), `QuizBattleController`
  (COUNTDOWN/CORRECT/WRONG/TIME_OUT/GAME_OVER/CAMERA_*), `ProctorDashboardController`
  (PROCTORING_ALERT/CAMERA_*), `ResultController` (VICTORY/GAME_OVER). Giữ nguyên mọi animation
  và logic nghiệp vụ; bỏ biến `previous` không còn dùng trong proctor dashboard.
  (3) Gỡ dependency `org.openjfx:javafx-media` khỏi `pom.xml` (chỉ AudioManager dùng).
  (4) Sửa comment CSS "animation & sound system" -> "animation system".
- Không xóa: `UiMotion` (animation), ảnh/icon, model ONNX proctoring, `javafx-controls/fxml/swing`,
  mọi dependency khác. Không thay bằng hệ thống âm thanh khác, không tạo âm thanh mới.
- Xác minh: `grep` toàn `src` không còn `AudioManager|SoundEvent|javafx.scene.media|playSafe|
  PcmTone|javafx-media`; repository không có asset `.wav/.mp3/...`.
- Bằng chứng đã kiểm tra: `mvnw.cmd clean test` trên JDK 21 -> **BUILD SUCCESS**, **122 test pass**,
  0 failure/error/skip (trước khi xóa: 135; đã bỏ đúng 13 test âm thanh).
- Kết luận/bước tiếp theo: hệ thống âm thanh đã bị loại bỏ hoàn toàn; `docs/ui-design.md`,
  `DECISIONS.md`, `PROGRESS.md`, `TASKS.md` đã cập nhật tương ứng.

## [2026-11-03 15:30 Asia/Saigon] [FIXED]
- Task/commit: P2.1 redesign UI/UX "Modern EdTech Gaming" (Indigo/Cyan) + Animation & Sound System.
- Kết quả mong đợi: giao diện sáng theo Indigo/Cyan, animation thống nhất, hệ thống âm thanh
  tập trung, không ảnh hưởng camera/network/protocol.
- Phát hiện quan trọng: repo **không có asset âm thanh** và `pom.xml` thiếu `javafx-media`;
  `AudioClip` **không có** `setOnFinished` (chỉ `MediaPlayer` có).
- Thay đổi đã thử: thêm khối "theme v2" vào `client/shared/style.css` (giữ mọi selector cũ);
  thêm `AudioManager` + `SoundEvent` (sinh WAV PCM tại runtime, không cần asset);
  mở rộng `UiMotion`; thêm `org.openjfx:javafx-media` cùng version JavaFX; nối âm thanh/animation
  theo trạng thái nghiệp vụ vào shell/battle/proctor/result/ClientApp.
- Sự cố gặp phải: (1) `javafx.scene.media` không tồn tại -> thêm `javafx-media`;
  (2) `AudioClip.setOnFinished` không tồn tại -> giải phóng bộ đếm đồng thời bằng `PauseTransition`
  theo thời lượng clip; (3) test giả định nhóm MUSIC có `SoundEvent` -> đúng là MUSIC chỉ dùng
  nhạc nền qua `MediaPlayer`, đã sửa test.
- Bằng chứng đã kiểm tra: `mvnw.cmd -o clean test` trên JDK 21 (`C:\Users\xiaoying\.jdks\ms-21.0.12.1`):
  **135 test pass**, 0 failure/error/skip; 16 FXML vẫn load ở 980×680.
- Bước tiếp theo: gắn control volume/mute vào màn Settings; thay tone sinh bằng asset nhạc nền thật
  nếu người dùng cung cấp; kiểm tra âm thanh/animation trực quan trên Windows 10/11 thật.

## [2026-11-03 14:40 Asia/Saigon] [FIXED]
- Task/commit: sửa launcher dừng khi `JAVA_HOME` đang trỏ tới JDK 25.
- Nguyên nhân: `java -version` ghi kết quả vào stderr; Windows PowerShell 5.1 biến stderr
  thành `NativeCommandError` do script dùng `ErrorActionPreference=Stop`.
- Thay đổi: tạm dùng `Continue` chỉ lúc đọc phiên bản Java, sau đó khôi phục chế độ `Stop`;
  JDK khác 21 được bỏ qua và script tiếp tục tìm JDK 21.
- Kiểm thử: chạy thật `powershell.exe -File scripts/run.ps1 -Mode test`; Maven nhận JDK 21,
  build thành công với 120 test pass, 0 failure/error/skip.

## [2026-11-03 14:40 Asia/Saigon] [FIXED]
- Task/commit: sửa lỗi parser `scripts/run.ps1` trên Windows PowerShell 5.1.
- Nguyên nhân: file launcher chứa UTF-8 tiếng Việt nhưng Windows PowerShell 5.1 đọc
  không đúng encoding, làm hỏng chuỗi và báo thiếu dấu ngoặc.
- Thay đổi: đổi thông báo trong launcher sang ASCII; không ảnh hưởng logic chạy server/client/test.
- Kiểm thử: PowerShell 5.1 parser xác nhận `OK`, không còn ký tự non-ASCII trong script.

## [2026-11-03 14:35 Asia/Saigon] [FIXED]
- Task/commit: đơn giản hóa cách chạy Windows client/server/test.
- Thay đổi: thêm `scripts/run.ps1` với menu tương tác và các lệnh `-Mode server|client|test`;
  client nhận `-ServerHost` và `-ServerPort` để demo LAN.
- Kiểm thử: PowerShell parser báo `PowerShell syntax OK`; hướng dẫn đã cập nhật trong README.
- Lưu ý: script yêu cầu JDK 21 và tự tìm trong `JAVA_HOME`, `.jdks`, Eclipse Adoptium hoặc Java.

## [2026-11-03 14:35 Asia/Saigon] [FIXED]
- Task/commit: P2 redesign UI/UX Duolingo-inspired.
- Kết quả mong đợi: giao diện sáng, thống nhất, có semantic state và animation nhẹ.
- Bằng chứng đã kiểm tra: 16 FXML load + apply CSS + layout; không còn inline style trong
  FXML/client controller; theme test kiểm tra các interaction/state bắt buộc.
- Thay đổi đã thử: shared theme xanh lá, sidebar/card/table/list/tab/input/button mới;
  route transition, answer feedback, empty state và camera tile state class.
- Kiểm thử: `mvnw.cmd clean test` trên JDK 21: 120 pass, 0 failure/error/skip.
- Kết luận/bước tiếp theo: P2 code hoàn thành; cần kiểm tra trực quan Windows 10/11,
  DPI 100%/125% trước khi chốt nghiệm thu giao diện.

## [2026-11-03 14:30 Asia/Saigon] [INVESTIGATING]
- Task/commit: P1 đo và ổn định pipeline camera/proctoring.
- Vai trò và số client: test tự động; chưa có webcam thật/LAN nhiều máy.
- Thay đổi đã thử: metrics từng stage 5 giây; latest-frame/drop counter; decode ngoài
  JavaFX; retry tối đa 3; frame tối/phẳng thành `UNKNOWN`.
- Runtime log: tìm `proctor_pipeline` trong `logs/client.log*`; so sánh `fps`, `avgMs`,
  `maxMs`, `mbps`, `dropped` giữa capture/encode/network/decode/AI.
- Kiểm thử: `mvnw.cmd clean test` trên JDK 21: 119 pass, 0 failure/error/skip.
- Kết luận/bước tiếp theo: code instrumentation và backpressure đã xong; cần benchmark
  host + player trên Windows 10/11 để chốt FPS/resolution/JPEG quality.

## [2026-11-03 14:20 Asia/Saigon] [INVESTIGATING]
- Task/commit: player join Quiz Room và host không start được.
- Bước tái hiện: source inspection và test cho thấy UI khóa start khi camera khác `READY`.
- Kết quả mong đợi: player vào quiz dù camera lỗi; host start được.
- Kết quả thực tế trước sửa: player kẹt ở lobby; host không bấm bắt đầu do trạng thái camera.
- Bằng chứng đã kiểm tra: `QuizLobbyController` dùng `allMatch(READY)`; `QuizRoom.start()` chỉ kiểm tra hai player kết nối.
- Thay đổi đã thử: bỏ camera gate, thêm start pending, timeout 10 giây, attempt ID, retry và runtime log.
- Kiểm thử: 114 test pass trên JDK 21; mọi camera state đều không chặn server/UI policy.
- Runtime log: đọc file mới nhất trong `logs/client.log*` và `logs/server.log*`; bản đóng gói ở `%USERPROFILE%\.nihongoquest\logs`.
- Kết luận/bước tiếp theo: code fix đã được xác nhận tự động; cần test thủ công host + 2 player với webcam thật trước khi đổi trạng thái thành `FIXED`.
