# NihongoQuest

NihongoQuest là ứng dụng thi đấu và luyện tiếng Nhật realtime theo mô hình client–server, dùng Java 21, JavaFX, TCP Socket, JSON line protocol, JDBC PostgreSQL/Supabase và BCrypt.

## Mục tiêu hiện tại

- Ổn định luồng player vào Quiz Room và host bắt đầu phòng.
- Camera/proctoring mượt, không khóa lobby hoặc JavaFX UI.
- Khi camera lỗi, player vẫn vào quiz và nhận thông báo rõ ràng.
- Phát hiện gian lận có trạng thái, bằng chứng và giới hạn false positive rõ ràng; AI chỉ cảnh báo, không tự kết luận thay host.
- Làm lại UI toàn bộ theo cảm giác Duolingo, có loading, feedback, transition và animation nhẹ.

## Chạy dự án

Yêu cầu JDK 21 và Windows 10/11 nếu chạy camera.

```powershell
.\mvnw.cmd clean test
.\scripts\run-server.ps1
.\scripts\run-client.ps1
```

Cách nhanh bằng một script menu:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\run.ps1
```

Hoặc chạy trực tiếp:

```powershell
.\scripts\run.ps1 -Mode server
.\scripts\run.ps1 -Mode client
.\scripts\run.ps1 -Mode test
```

Mặc định client kết nối `localhost:5000`. Khi chạy client ở máy khác trong LAN,
dùng IP của máy server:

```powershell
.\scripts\run.ps1 -Mode client -ServerHost 192.168.1.100 -ServerPort 5000
```

Trình tự demo: mở `server` trước trên máy host, chờ Server Dashboard báo đang chạy,
sau đó mở `client` trên từng máy người chơi. Nếu Windows Firewall hỏi quyền mạng,
cho phép Java/Maven ở mạng Private. Log runtime nằm trong `logs/server.log*` và
`logs/client.log*`.

Database dùng các script trong `sql/`. Cấu hình thật không commit vào Git. Chi tiết kiến trúc, protocol, camera, UI và kiểm thử nằm trong thư mục `docs/`.

Khi chạy từ source, client và server ghi log xoay vòng trong `logs/client.log*` và
`logs/server.log*`. Bản đóng gói ghi tại `%USERPROFILE%\.nihongoquest\logs`.

## Trạng thái triển khai

- P0 lobby/camera gate: đã hoàn thành bằng code và test; còn kiểm tra webcam thật Windows 10/11.
- P1 pipeline camera: đã có metrics 5 giây, latest-frame/drop policy, retry tối đa 3 lần,
  decode ngoài JavaFX thread và evidence `UNKNOWN`; còn benchmark 2 rồi 6 client để chốt FPS.
- P2 UI: đã áp dụng theme Duolingo-inspired, semantic state và animation ngắn cho toàn client;
  còn kiểm tra trực quan Windows 10/11 và DPI cao.
- Baseline: `mvnw.cmd clean test` trên JDK 21 đạt 120 test, không có failure/error/skip.

## Tài liệu điều khiển dự án

- [AGENTS.md](AGENTS.md): quy tắc cho AI/người phát triển.
- [PROGRESS.md](PROGRESS.md): trạng thái sau mỗi phiên AI.
- [TASKS.md](TASKS.md): backlog và tiêu chí hoàn thành.
- [DESIGN.md](DESIGN.md): mục tiêu sản phẩm và định hướng kỹ thuật.
- [DECISIONS.md](DECISIONS.md): các quyết định có lý do.
- [docs/AI_LOG.md](docs/AI_LOG.md): nhật ký lỗi và bằng chứng chẩn đoán.
- [docs/architecture.md](docs/architecture.md): bản đồ module.
- [docs/protocol.md](docs/protocol.md): hợp đồng TCP.
- [docs/proctoring.md](docs/proctoring.md): camera và phát hiện gian lận.
- [docs/ui-design.md](docs/ui-design.md): hệ thống giao diện Duolingo-inspired.
- [docs/testing.md](docs/testing.md): chiến lược test.
- [docs/execution-plan.md](docs/execution-plan.md): kế hoạch triển khai theo task.
