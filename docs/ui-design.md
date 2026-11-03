# UI Design — Modern EdTech Gaming

## Nguyên tắc

- Sáng, thân thiện, tương phản tốt, nội dung chính nổi bật.
- Card bo góc, spacing 8/12/16/24/32, font dễ đọc.
- Màu semantic: primary, success, warning, danger, neutral.
- Nút có hover/focus/pressed/disabled.
- Animation ngắn 150–300ms; không animation khi làm chậm thao tác trả lời.

## Component bắt buộc

- App shell/sidebar/header.
- Primary/secondary button.
- Quiz answer card với đúng/sai/đã chọn.
- Timer và progress bar.
- Lobby player card với camera status.
- Toast, error banner, empty state, loading state.
- Leaderboard update animation.

## Design System thống nhất (Indigo/Cyan) — hiện hành

- **Design Tokens tập trung** khai báo trên `.root` trong `client/shared/style.css` (JavaFX
  looked-up colors). Mọi selector chỉ tham chiếu `-ndq-*`; **không hardcode màu** trong
  controller/FXML/rule khác. Server dashboard dùng cùng bộ token.
- Palette (nguồn sự thật): `-ndq-primary #4F46E5`, `-ndq-primary-dark #3730A3`,
  `-ndq-accent #06B6D4`, `-ndq-bg #F5F7FB`, `-ndq-surface #FFFFFF`, `-ndq-text #172033`,
  `-ndq-text-secondary #64748B`, `-ndq-border #E2E8F0`, `-ndq-success #16A34A`,
  `-ndq-warning #D97706`, `-ndq-error #DC2626`; kèm token dẫn xuất (hover/soft/border/muted).
- Quy tắc: **Indigo là màu nhận diện** (button, sidebar active, scoreboard, tab selected);
  **Cyan chỉ làm nhấn** (eyebrow, PIN phòng, orb trang trí, focus ring input);
  **không dùng xanh lá** cho button/sidebar/header/trang trí; **Success chỉ dùng cho trạng thái
  đúng/thành công**; text tối trên nền sáng, chữ trắng chỉ trên nền Indigo/tối (scoreboard, header server).
- Nền tối có kiểm soát chỉ cho điểm nhấn: scoreboard `linear-gradient(#4F46E5,#3730A3)` và các
  khung log/JSON của server dashboard; không dùng nền tối toàn màn hình.
- Button có hover/pressed/focused (viền Cyan)/disabled. Input có focus ring Cyan. List/table/tab có
  hover, selected và empty state; status có loading/success/error. Camera tile dùng
  `camera-ok`/`camera-warning`/`camera-error` không còn inline color.
- Việc kiểm soát được tự động hóa bằng `UiThemeTest`: khẳng định đủ token palette, cấm màu theme
  cũ (`#58cc02`, `#46a302`, `#1cb0f6`, `#2b6cb0`, `#183b66`) và bắt buộc token hóa (`-ndq-*`).

## Animation System (UiMotion)

- Nguyên tắc: dùng JavaFX Animation API, animation ngắn, không chặn JavaFX Application Thread,
  không ảnh hưởng camera capture/network; có cờ `UiMotion.setEnabled(false)` để giảm/tắt.
- Các API: `enter` (page transition fade+slide), `fadeIn`, `fadeOut`, `slideIn`, `pulse`
  (đáp án đúng, cập nhật leaderboard), `shake` (đáp án sai), `countdown` (còn ≤ 5s),
  `rankUp` (thăng hạng/thắng), `toastIn`/`toastOut` (notification), `shimmer` (skeleton loading).
- Countdown thời gian thực ở `QuizBattleController` chỉ pulse ở mốc giây thay đổi khi ≤ 5 giây
  để tránh tạo quá nhiều animation đồng thời.

## Âm thanh (ĐÃ GỠ BỎ)

- Ứng dụng **không phát âm thanh**. Toàn bộ hệ thống âm thanh trước đây (`AudioManager`,
  `SoundEvent`, sinh WAV PCM `PcmTone`, `AudioClip`/`MediaPlayer`, dependency
  `org.openjfx:javafx-media`, mọi lời gọi `playSafe`/`stopBackground`) đã bị xóa hoàn toàn theo
  yêu cầu người dùng. Chi tiết: `docs/AI_LOG.md` [2026-11-03 15:45] và `DECISIONS.md` D-012.
- Phản hồi UI/UX vẫn đầy đủ bằng **animation** (`UiMotion`: enter/fade/pulse/shake/countdown/
  rankUp/toast) và **màu semantic**; không có hiệu ứng âm thanh nào được kích hoạt.
- Không thay thế bằng hệ thống âm thanh khác và không tạo âm thanh mới.

## Kích thước

- Login tối thiểu 880×600.
- Khu vực đã đăng nhập tối thiểu 1024×680, mặc định 1180×760.
- Mục tiêu responsive 1280×720, 1366×768, 1600×900, 1920×1080 (dùng GridPane/HBox/TilePane co giãn,
  hạn chế absolute positioning).
- Test FXML chạy ở 980×680 để bắt layout phụ thuộc kích thước trước khi kiểm tra thủ công.

## Phạm vi

Áp dụng cho login, home, authenticated shell, quiz menu/lobby/battle, ranked, profile, friends, leaderboard, history và proctor dashboard.
