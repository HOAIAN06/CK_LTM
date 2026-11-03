# AGENTS.md — Quy ước làm việc của NihongoQuest

## Mục đích

Đây là bản đồ vận hành cho AI và người phát triển. Trước mỗi phiên, phải đọc:

1. `README.md`
2. `PROGRESS.md`
3. `TASKS.md`
4. `DECISIONS.md`
5. `docs/AI_LOG.md`
6. Runtime log mới nhất trong `logs/client.log*` và `logs/server.log*` nếu tồn tại
7. Tài liệu gần nhất với phần code đang sửa

`srccode.md` chỉ là bản tham khảo/dump cũ, không phải nguồn sự thật.

## Nguồn sự thật

- Protocol: `src/main/java/com/nihongoquest/common/protocol/`
- Quiz Room: `src/main/java/com/nihongoquest/server/quizroom/`
- Camera/proctoring client: `src/main/java/com/nihongoquest/client/proctor/`
- Media relay: `src/main/java/com/nihongoquest/server/media/`
- UI: `src/main/resources/client/` và controller tương ứng
- Database: `sql/supabase_schema.sql`
- Build/dependency: `pom.xml`

Nếu tài liệu khác code, ghi mâu thuẫn vào `docs/AI_LOG.md`, kiểm tra code/test rồi cập nhật tài liệu.

## Quy tắc kiến trúc

- Server là nguồn quyết định đáp án, điểm, timer và trạng thái phòng.
- Client không truy cập database và controller không tự mở socket.
- Mọi TCP gameplay dùng `GameClient`; cập nhật JavaFX từ thread mạng phải qua `Platform.runLater`.
- Common chỉ chứa payload, protocol và kiểu dùng chung.
- Không gửi đáp án đúng trong message câu hỏi.
- Camera/proctoring không được chặn việc tham gia quiz; lỗi camera phải hiển thị rõ và cho phép tiếp tục theo yêu cầu hiện tại.
- Không chặn JavaFX Application Thread bằng camera, AI, network hoặc ghi file.

## Quy trình mỗi task

1. Xác định phạm vi nhỏ và cập nhật `TASKS.md`.
2. Đọc `PROGRESS.md`, `DECISIONS.md`, `docs/AI_LOG.md`.
3. Sửa code tối thiểu cần thiết, giữ tương thích protocol nếu chưa có quyết định mới.
4. Viết/cập nhật test cho lỗi hoặc hành vi mới.
5. Chạy `mvnw.cmd clean test` trên Windows.
6. Ghi vào `PROGRESS.md`: đã làm, chưa làm và lý do, không thể làm và lý do, test.
7. Nếu có lỗi runtime, ghi ngay vào `docs/AI_LOG.md` với timestamp, bước tái hiện, log và giả thuyết.

## Giao diện

Mục tiêu UI là cảm giác gần Duolingo: sáng, thân thiện, rõ trạng thái, chuyển động nhẹ và phản hồi tức thì.
Ưu tiên style class trong `style.css`, không nhúng style dài trong FXML. Animation không được làm chậm thao tác quiz.

## Tiêu chí bảo vệ đồ án

Mọi thay đổi mạng phải giải thích được: client/server boundary, TCP framing, thread, timeout, reconnect và server authority.
Ưu tiên Java 21, JavaFX, TCP Socket, JSON line protocol, JDBC/PostgreSQL; không thêm framework lớn nếu không cần.
