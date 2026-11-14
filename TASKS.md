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
- [ ] Viết test và kịch bản demo bảo vệ đồ án.
- [x] Cập nhật README, PROGRESS, TASKS và AI_LOG sau phiên tài liệu.
