# Kiến trúc NihongoQuest

NihongoQuest là một Maven module Java 21 gồm ba vùng độc lập:

- `com.nihongoquest.client`: JavaFX, controller và kết nối TCP qua `GameClient`.
- `com.nihongoquest.server`: socket server, nghiệp vụ, timer và JDBC repository.
- `com.nihongoquest.common.protocol`: frame JSON, message type và payload dùng chung.

Client không import server, server không import client. Controller không tạo socket và
không truy cập database. Mọi đáp án, thời gian, điểm và kết quả đều do server quyết định.

## Luồng server

```text
ServerSocket
  -> ClientHandler (chỉ đọc/ghi TCP và giữ phiên)
  -> ServerRequestRouter (switch theo MessageType)
  -> Manager/Repository của từng chức năng
  -> PostgreSQL qua Database
```

`GameServer` dùng pool 50 thread cho kết nối và một scheduler bốn thread dùng chung
cho timer phòng. `OnlineUserRegistry` đảm bảo một tài khoản chỉ đăng nhập trên một
client và là nền tảng cho presence/reconnect ở các giai đoạn tiếp theo.

## Persistence đơn giản

Ranked chỉ lưu một dòng kết quả trong `matches` và cập nhật hai dòng `users` bằng một
transaction JDBC ngắn trong `MatchRepository`. Không lưu từng answer, không dùng Elo,
`SELECT FOR UPDATE` hay lớp transaction tổng quát. Trạng thái realtime nằm trong RAM.

Quản lý bộ đề đi qua `QuizSetService` để kiểm tra dữ liệu và `QuizSetRepository` để lưu
`quiz_sets`, `questions`, `choices`. Mỗi lần sửa sẽ chuyển bộ đề về draft; chỉ chủ sở hữu
được sửa, xóa hoặc xuất bản. Bộ đề cần ít nhất ba câu hợp lệ mới được xuất bản.

Schema chuẩn duy nhất là `sql/supabase_schema.sql`; xem `database.md`.

## Trạng thái triển khai

Nền tảng đã có xác thực, dashboard, 1v1 ba câu hiện tại, câu hỏi PostgreSQL, protocol
payload object, session registry, persistence đơn giản và giao diện quản lý bộ đề.
Ranked theo thời lượng, Quiz Room, history/leaderboard và friends được triển khai ở các nhánh kế tiếp.
