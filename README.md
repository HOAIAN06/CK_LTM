# NihongoQuest

Trò chơi JavaFX 1v1 học tiếng Nhật. Hai client kết nối tới một Game Server bằng
TCP Socket; server ghép trận, gửi câu hỏi, chấm đáp án và quyết định kết quả.

## Hai khái niệm mạng chính

### 1. Mô hình Client–Server

```text
Client A ──TCP──┐
                ├── Game Server ──JDBC/TLS── Supabase PostgreSQL
Client B ──TCP──┘
```

- Client chỉ hiển thị giao diện và gửi thao tác của người chơi.
- Server quản lý kết nối, đăng nhập, hàng chờ, phòng đấu, câu hỏi và điểm.
- Client không kết nối trực tiếp với client khác và không tự chấm điểm.
- Supabase chỉ được Game Server truy cập; client không biết thông tin database.

### 2. TCP Socket

- `GameServer` mở `ServerSocket` tại cổng mặc định `5000`.
- Mỗi lần `accept()` tạo một `Socket` và một `ClientHandler` riêng.
- `GameClient` mở `Socket(host, port)` tới server.
- Dữ liệu được đọc/ghi liên tục trên cùng kết nối bằng UTF-8.
- Mỗi bản tin là một dòng JSON; ký tự xuống dòng kết thúc một bản tin.

Luồng chính:

```text
kết nối TCP → đăng ký/đăng nhập → tìm trận → ghép 2 người
→ gửi câu hỏi → gửi đáp án → server chấm điểm → kết thúc
```

Chi tiết các bản tin nằm tại [docs/protocol.md](docs/protocol.md).

## Các công nghệ và kỹ thuật khác

Ngoài TCP Socket giữa Client và Game Server, dự án còn dùng:

- **PostgreSQL qua JDBC và TLS**: Game Server kết nối Supabase để đăng ký,
  đăng nhập và lưu thống kê. Đây là giao tiếp database riêng, không thay thế TCP
  Socket của trò chơi.
- **JSON**: định dạng dữ liệu trong bản tin TCP và file câu hỏi; JSON không phải
  giao thức mạng.
- **JavaFX, FXML, CSS**: giao diện client và dashboard server.
- **Luồng nền/Executor**: tránh thao tác socket làm treo giao diện và cho phép
  server phục vụ nhiều client.
- **ScheduledExecutorService/Timeline**: giới hạn thời gian trả lời và cập nhật
  đồng hồ giao diện.
- **bcrypt**: băm mật khẩu trước khi lưu vào Supabase.
- **Maven và JUnit**: build, quản lý thư viện và kiểm thử.

Dự án **không dùng** UDP, WebSocket, HTTP cho gameplay, RMI, P2P hoặc kết nối
trực tiếp Client–Client. Heartbeat PING/PONG đã được loại bỏ vì không cần cho
yêu cầu hiện tại.

## Cấu trúc chính

```text
src/main/java/com/nihongoquest/
├── client/
│   ├── ClientApp.java
│   ├── controller/        # Nhận sự kiện UI, gọi GameClient
│   ├── model/Player.java  # Hồ sơ nhận từ server
│   └── network/           # TCP phía client
├── common/                # Message, MessageType, Payloads, Protocol
└── server/
    ├── GameServer.java    # ServerSocket và danh sách client
    ├── ClientHandler.java # Một kết nối TCP
    ├── MatchmakingManager.java
    ├── GameRoom.java
    ├── QuestionManager.java
    ├── dashboard/         # Giao diện quản trị server
    └── db/                # JDBC tới Supabase
```

## Chuẩn bị Supabase

1. Chạy `sql/supabase_schema.sql` trong Supabase SQL Editor.
2. Sao chép `src/main/resources/db.properties.example` thành
   `src/main/resources/db.properties`.
3. Điền host, user và password từ Database Settings của Supabase.

Không commit `db.properties` vì tệp này chứa mật khẩu database.

Địa chỉ server của client được đặt trong
`src/main/resources/client.properties`. Khi chạy trên hai máy, đổi
`server.host` thành IP LAN của máy chạy Game Server.

## Build và chạy

Yêu cầu: JDK 21 và kết nối Internet tới Supabase.

```powershell
.\mvnw.cmd clean test
```

Chạy dashboard server:

```powershell
.\mvnw.cmd -Pserver-dashboard javafx:run
```

Nhấn **Khởi động** trên dashboard, sau đó mở hai client bằng hai terminal:

```powershell
.\mvnw.cmd javafx:run
```

Đăng nhập bằng hai tài khoản khác nhau, bấm **Tìm trận** và kiểm tra dashboard.

## Trách nhiệm quan trọng

- Controller không được tạo `Socket`; mọi giao tiếp đi qua `GameClient`.
- Server là nguồn dữ liệu đúng cho đáp án, thời gian, điểm và người thắng.
- Mật khẩu chỉ được gửi Client → Server trong bản tin đăng ký/đăng nhập rồi băm
  bằng bcrypt trước khi lưu; khi demo qua Internet cần đặt Game Server sau một
  lớp mã hóa vận chuyển như TLS/VPN.
