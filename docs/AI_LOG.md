# AI_LOG — Nhật ký lỗi và bằng chứng

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
