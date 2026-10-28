# NihongoQuest

Hệ thống thi đấu tiếng Nhật thời gian thực theo mô hình client-server, dùng Java 21,
JavaFX, TCP Socket, JSON line protocol, JDBC PostgreSQL/Supabase và BCrypt.

## Nguyên tắc chính

- Client chỉ hiển thị UI và gửi/nhận TCP qua `GameClient`.
- Server giữ đáp án, timer, chấm điểm và quyết định kết quả.
- Mỗi frame là một JSON object UTF-8 kết thúc bằng xuống dòng.
- Câu hỏi chỉ được đọc từ PostgreSQL; không có ngân hàng JSON trong source.
- Không dùng Spring Boot, Hibernate, HTTP gameplay, WebSocket, RMI, TLS hoặc JWT.

## Chuẩn bị database

1. Chạy `sql/supabase_schema.sql` trong Supabase SQL Editor. Script này xóa dữ liệu cũ.
2. Tùy chọn chạy `sql/seed_demo.sql` để tạo ba tài khoản và một bộ đề N5.
3. Chạy `sql/verify_schema.sql` để kiểm tra.
4. Sao chép `src/main/resources/db.properties.example` thành `db.properties` và điền
   thông tin Supabase. Không commit file chứa mật khẩu.

Chi tiết schema: [docs/database.md](docs/database.md).

## Chạy chương trình

Yêu cầu JDK 21.

```powershell
.\mvnw.cmd clean test
.\mvnw.cmd -Pserver-dashboard javafx:run
```

Mở terminal khác để chạy client:

```powershell
.\mvnw.cmd javafx:run
```

Dashboard hiển thị IP LAN và mặc định mở TCP port `5000`. Client nhập IP đó để kết nối.

## Tài liệu

- [Kiến trúc](docs/architecture.md)
- [Giao thức TCP](docs/protocol.md)
- [Database](docs/database.md)
- [Lộ trình MVP](docs/roadmap.md)

## Trạng thái

Nền tảng hiện có đăng ký/đăng nhập BCrypt, dashboard, Ranked 1v1 theo chế độ 3/5 phút,
quản lý bộ đề, Quiz Room nhiều người bằng PIN, Top 10 Ranked, lịch sử 100 trận gần nhất,
bạn bè/presence và lời mời trực tiếp vào Ranked hoặc Quiz Room.
