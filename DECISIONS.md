# DECISIONS — Nhật ký quyết định

## D-001 — Giữ srccode.md

- Trạng thái: đã quyết định
- Lý do: người dùng yêu cầu không xóa file này.
- Quy tắc: không xem `srccode.md` là tài liệu chuẩn; không cập nhật tự động nếu chưa có yêu cầu.

## D-002 — Camera lỗi không chặn player vào quiz

- Trạng thái: đã quyết định
- Lý do: người dùng muốn player vẫn được vào quiz nhưng phải thấy cảnh báo camera.
- Hệ quả: host start không được phụ thuộc cứng vào camera READY của mọi player.

## D-003 — Hiệu năng phải đo trước khi chốt FPS

- Trạng thái: đã quyết định
- Lý do: tài liệu cũ ghi 5 FPS nhưng yêu cầu mới nói camera phải mượt; FPS capture, truyền và AI không đồng nghĩa.
- Hệ quả: phải có benchmark cho kịch bản 2 client trước khi thay đổi cấu hình.

## D-004 — Phong cách UI Duolingo-inspired

- Trạng thái: đã quyết định
- Hệ quả: ưu tiên sáng, thân thiện, card, feedback và animation nhẹ; không sao chép tài sản thương hiệu.

## D-005 — Điều kiện bắt đầu Quiz không phụ thuộc camera

- Trạng thái: đã quyết định và triển khai
- Điều kiện duy nhất ở lobby: đúng host, đủ hai player đang kết nối và chưa có request start đang chờ.
- Camera `INITIALIZING`, `DENIED`, `NOT_FOUND`, `FAILED`, `LOST`, `BLOCKED` hoặc `STOPPED` chỉ tạo cảnh báo.

## D-006 — Runtime log dùng java.util.logging

- Trạng thái: đã quyết định và triển khai
- Chạy từ source ghi vào `logs/client.log*`, `logs/server.log*`; bản đóng gói ghi vào `%USERPROFILE%\.nihongoquest\logs`.
- Log xoay vòng 5 file, 2 MiB/file; PIN được che và không ghi password, ticket hoặc frame.

## D-007 — Pipeline media dùng latest-frame semantics

- Trạng thái: đã quyết định và triển khai
- Publisher và AI dùng queue 1 phần tử; relay giữ tối đa một frame mới nhất cho mỗi player;
  dashboard giữ tối đa một frame đã decode cho mỗi player.
- Khi consumer chậm, bỏ frame cũ thay vì tăng RAM hoặc làm UI trễ dần.

## D-008 — Không tự retry camera vô hạn

- Trạng thái: đã quyết định và triển khai
- Tự thử lại tối đa 3 lần, mỗi lần sau 5 giây; timeout frame đầu tiên là 10 giây.
- Hết giới hạn thì giữ quiz hoạt động, báo `FAILED` và chờ người chơi bấm thử lại.

## D-009 — Dữ liệu hình ảnh không chắc chắn là UNKNOWN

- Trạng thái: đã quyết định và triển khai
- Frame quá tối hoặc gần như phẳng không được tính là bằng chứng `NO_FACE`, nhiều mặt hoặc nhìn lệch.
- `UNKNOWN` reset cửa sổ kích hoạt đang chờ nhưng không tự kết luận người chơi gian lận.

## D-010 — Một theme dùng chung, animation ngắn và có mục đích

- Trạng thái: đã quyết định và triển khai
- Mọi màn hình client dùng `client/shared/style.css`; controller chỉ đổi style class theo state,
  không nhúng màu sắc hoặc style dài.
- Màu chính là xanh lá `#58cc02`, accent xanh dương `#1cb0f6`; success/warning/error
  luôn có nền/viền ngoài màu chữ để dễ phân biệt.
- Chuyển route dùng fade + slide 190ms; feedback đúng/sai dùng scale 110ms hai chiều.
  Animation không trì hoãn gửi đáp án, network hoặc camera.

## D-011 — Theme v2 "Modern EdTech Gaming" (Indigo/Cyan) thay theme Duolingo xanh lá

- Trạng thái: **đã thay thế bằng D-013** (Design System thống nhất, token hóa hoàn toàn).
  Phần quy tắc "một stylesheet dùng chung và animation ngắn" vẫn giữ nguyên.
- Lịch sử: hệ màu cũ Primary Indigo `#4338ca`, Cyan `#06b6d4`, nền `#f6f7fb`; đã bị thay bằng
  palette chuẩn hóa trong D-013 (`#4F46E5`/`#3730A3`/`#06B6D4`/`#F5F7FB`).

## D-013 — Design Tokens tập trung cho toàn hệ thống màu

- Trạng thái: **tokenization vẫn giữ; palette được mở rộng bởi D-017 (Sakura Arcade)**.
- Lý do: theme cũ là 3 lớp style chồng chéo (base xanh dương `#2b6cb0`, Duolingo xanh lá
  `#58cc02`/`#46a302`, Indigo `#4338ca`) trộn lẫn màu tùy tiện, nhiều rule bị khai báo trùng/ghi
  đè và một số block bị xen kẽ. Cần một nguồn sự thật duy nhất về màu.
- Quyết định: khai báo **Design Tokens** (JavaFX looked-up colors) trên `.root` trong
  `client/shared/style.css`; mọi selector chỉ tham chiếu `-ndq-*`. Không hardcode màu trong
  controller/FXML/rule khác. Server dashboard (`server/dashboard/server-dashboard.css`) dùng
  **cùng bộ token** để toàn hệ thống một hệ màu.
- Palette tại thời điểm D-013 (sẽ được thay bởi D-017 ở Phase 1):
  `-ndq-primary: #4F46E5`, `-ndq-primary-dark: #3730A3`, `-ndq-accent: #06B6D4`,
  `-ndq-bg: #F5F7FB`, `-ndq-surface: #FFFFFF`, `-ndq-text: #172033`,
  `-ndq-text-secondary: #64748B`, `-ndq-border: #E2E8F0`, `-ndq-success: #16A34A`,
  `-ndq-warning: #D97706`, `-ndq-error: #DC2626`; kèm token dẫn xuất (hover/soft/border).
  Palette hiện hành cho overhaul: xem **D-017**.
- Quy tắc áp dụng: Indigo là màu nhận diện (button/sidebar active/scoreboard); Cyan chỉ làm nhấn
  (eyebrow, PIN, orb, focus ring); **không dùng xanh lá cho button/sidebar/header/trang trí**;
  Success chỉ dùng cho trạng thái đúng/thành công; text tối trên nền sáng, chữ trắng chỉ trên nền Indigo/tối.
- Không đổi `fx:id`, `onAction`, protocol hay luồng controller; giữ toàn bộ selector hiện có để
  16 FXML vẫn load. `UiThemeTest` cập nhật để khẳng định palette token mới và cấm màu theme cũ.

## D-012 — AudioManager tập trung và sinh WAV PCM tại runtime (ĐÃ GỠ BỎ)

- Trạng thái: **đã gỡ bỏ** theo yêu cầu bắt buộc của người dùng (xem `docs/AI_LOG.md`
  [2026-11-03 15:45]). Ứng dụng không còn phát âm thanh: đã xóa `AudioManager`, `SoundEvent`,
  test tương ứng, mọi lời gọi phát âm thanh và dependency `org.openjfx:javafx-media`.
- Quyết định thay thế: **không dùng bất kỳ hệ thống âm thanh nào**. Animation (`UiMotion`),
  hình ảnh, icon và model proctoring được giữ nguyên; logic nghiệp vụ không thay đổi.
- Lịch sử (đã lỗi thời): trước đây dùng `AudioManager` singleton + `SoundEvent` mapping, thêm
  `org.openjfx:javafx-media`, sinh sound effect WAV PCM 16-bit mono bằng `AudioManager.PcmTone`.

## D-014 — Profile camera mặc định ưu tiên độ ổn định khi demo LAN

- Trạng thái: đã quyết định và triển khai; chờ xác nhận webcam thật hai máy.
- Lý do: profile cũ `1280×720 @ 45 FPS` mất 8,6 giây để có frame đầu trên máy
  mở được và timeout trên các lần demo khác; băng thông đo được xấp xỉ 12–14 Mbps/player.
- Quyết định: mặc định `640×480 @ 15 FPS`, MJPG trên Windows và latest-frame/buffer 1.
  Đây là profile an toàn cho demo, không phải kết luận hiệu năng cuối cùng.
- Hệ quả: phải benchmark hai rồi sáu client trước khi tăng resolution/FPS; mọi thay đổi
  sau này phải giữ timeout, drop policy và JavaFX thread boundary hiện tại.

## D-015 — Tiếp tục không có âm thanh sau khi rà soát lại

- Trạng thái: đã xác nhận 2026-11-15.
- Bối cảnh: kế hoạch cải thiện UI có đề xuất thêm âm thanh và hiệu ứng; D-012 trước đó đã gỡ
  toàn bộ âm thanh theo yêu cầu bắt buộc của người dùng.
- Quyết định: tiếp tục **không có âm thanh**. Không thêm `javafx-media`, `AudioManager`,
  `SoundEvent` hoặc asset âm thanh. Pháo hoa/confetti chỉ là hiệu ứng hình ảnh.
- Hệ quả: mọi đề xuất UI/UX sau này không được tự ý thêm âm thanh; nếu muốn đổi phải có
  yêu cầu mới và cập nhật D-012/D-015.

## D-016 — UI UX Pro Max là công cụ local, không commit

- Trạng thái: đã quyết định và triển khai 2026-11-15.
- Lý do: skill sinh ra nhiều file dữ liệu/script, không phải source của ứng dụng; commit sẽ
  làm repo nặng và khó cập nhật.
- Quyết định: cài project-local vào `.opencode/skills/`, thêm toàn bộ thư mục vào `.gitignore`;
  hướng dẫn cài lại nằm trong `docs/ui-tooling.md`.
- Hệ quả: máy mới cần chạy `npx ui-ux-pro-max-cli init --ai opencode` trước khi dùng skill.

## D-017 — Hướng UI "Sakura Arcade" cho overhaul

- Trạng thái: đã chọn 2026-11-15; Phase 1 triển khai.
- Bối cảnh: audit 16 màn hình cho thấy UI hiện tại mỏng, thiếu icon/asset, bố cục chưa rõ
  phân cấp; UI UX Pro Max gợi ý Language Learning App dùng Claymorphism + Vibrant & Block-based.
- Quyết định: chọn **Sakura Arcade** — Indigo làm nền, Sakura/Coral làm điểm nhấn Nhật,
  Cyan giữ vai trò accent phụ; kết hợp Claymorphism + block-based, pháo hoa/confetti ở Result.
- Palette chuẩn (Phase 1 sẽ đưa vào `client/shared/style.css`):
  `-ndq-primary #4F46E5`, `-ndq-primary-dark #3730A3`, `-ndq-sakura #F472B6`,
  `-ndq-sakura-deep #DB2777`, `-ndq-sakura-soft #FCE7F3`, `-ndq-coral #FB7185`,
  `-ndq-accent #06B6D4`, `-ndq-bg #FFF7FA`, `-ndq-surface #FFFFFF`, `-ndq-text #1E1B4B`,
  `-ndq-text-secondary #64748B`, `-ndq-border #FBCFE8`, `-ndq-success #16A34A`,
  `-ndq-warning #D97706`, `-ndq-error #DC2626`.
- Typography: bundle **Nunito** (heading) + **Be Vietnam Pro** (body);
  tiếng Nhật fallback `Noto Sans JP`, `Yu Gothic UI`, `Meiryo`.
- Scope: client + server dashboard.
- Hệ quả: D-013 vẫn giữ quy tắc token hóa; palette Indigo/Cyan cũ được mở rộng/thay bởi palette
  trên. Mọi selector tiếp tục dùng token `-ndq-*`, không hardcode màu. Không thêm âm thanh
  (D-015). `UiThemeTest` phải cập nhật theo palette mới ở Phase 1.
