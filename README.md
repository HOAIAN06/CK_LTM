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
4. Sao chép `src/main/resources/db.properties.example` thành `~/.nihongoquest/db.properties`
   (Windows: `%USERPROFILE%\.nihongoquest\db.properties`) và điền thông tin PostgreSQL.
   Khi chạy từ source, `src/main/resources/db.properties` vẫn được đọc. File cấu hình
   thật không được đóng vào JAR hoặc app-image.

Chi tiết schema: [docs/database.md](docs/database.md).

## Chạy chương trình

Yêu cầu JDK 21.

```powershell
.\mvnw.cmd clean test
.\scripts\run-server.ps1
```

Mở terminal khác để chạy client:

```powershell
.\scripts\run-client.ps1
```

Hai script chạy tự tìm và ép dùng **JDK 21**. Không chạy camera bằng JDK 25: native
OpenCV sẽ không nạp được và client sẽ không gửi hình tới host.

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

## Giám sát Quiz Room (Windows 10/11 x64)

Host có thể chọn **Bật giám sát camera** khi tạo phòng Quiz; host giám sát không tham gia
trả lời. Người chơi có quyền từ chối camera mà vẫn được thi. Ứng dụng chỉ mở camera sau
khi người chơi đồng ý; không thu microphone. Cảnh báo AI là nghi vấn để host xem xét,
không tự trừ điểm hay loại người chơi.

Máy chạy server cần mở inbound TCP **5000** (gameplay JSON) và **5001** (JPEG media).
Máy host/player chỉ cần outbound tới hai cổng này. Media v1 truyền plaintext trong LAN.
Bằng chứng mặc định ở `%USERPROFILE%\Documents\NihongoQuest-Proctoring`; mỗi cảnh báo
có ảnh JPEG và clip MP4 không âm thanh khi host có video.

Build bản Windows app-image offline bằng JDK 21 và `scripts/package-windows.ps1`.
Model AI, native OpenCV/FFmpeg và license được đóng trong bản build. Chưa có MSI/EXE.

Nguồn model và mã kiểm tra SHA-256 nằm trong `src/main/resources/models/proctoring/manifest.json`.
Bốn model Intel trong gói là bản ONNX chuyển từ [Open Model Zoo](https://github.com/openvinotoolkit/open_model_zoo),
để OpenCV DNN CPU đọc được mà không cần OpenVINO runtime. YOLOX-tiny lấy từ
[release chính thức](https://github.com/Megvii-BaseDetection/YOLOX/releases/tag/0.1.1rc0).
