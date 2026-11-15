# PROGRESS — Trạng thái dự án

## Cập nhật gần nhất

- Ngày: 2026-11-15
- Phiên: Phase 0 UI/UX overhaul — Git workflow, cài UI UX Pro Max project-local và chốt
  hướng giao diện Sakura Arcade.
- Người thực hiện: AI + người dùng

## P4.0 — Phase 0: Git workflow + UI/UX tooling + đề xuất hướng giao diện (phiên này)

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
