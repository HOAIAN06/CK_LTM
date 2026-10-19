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
  đăng nhập, nạp câu hỏi/lựa chọn và lưu thống kê. Đây là giao tiếp database riêng, không thay thế TCP
  Socket của trò chơi.
- **JSON**: định dạng dữ liệu trong bản tin TCP; JSON không phải
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
│   ├── auth/              # Đăng nhập, đăng ký
│   ├── home/              # Màn hình chính
│   ├── profile/           # Player và hiển thị hồ sơ dùng chung
│   ├── ranked/
│   │   ├── matchmaking/   # Tìm và hủy tìm trận 1v1
│   │   └── battle/        # Thi đấu và kết quả 1v1
│   ├── quiz/              # .gitkeep, dành cho Quiz Room sau này
│   ├── config/            # Cấu hình kết nối client
│   └── network/           # TCP phía client
├── common/protocol/       # Message, MessageType, Payloads, Protocol
└── server/
    ├── GameServer.java    # ServerSocket và danh sách client
    ├── network/           # Kết nối client và sự kiện lưu lượng
    ├── ranked/            # Ghép trận, phòng đấu và chấm điểm 1v1
    ├── quiz/              # .gitkeep, dành cho Quiz Room sau này
    ├── question/          # Câu hỏi và nạp ngân hàng câu hỏi
    ├── player/            # Lưu và truy vấn tài khoản, thống kê
    ├── dashboard/         # Giao diện quản trị server
    └── infrastructure/persistence/ # Kết nối JDBC tới Supabase
```

FXML và CSS nằm trong `src/main/resources/client/<chức năng>/` và
`src/main/resources/server/<chức năng>/`. CSS chung của client nằm trong
`client/shared/`. Câu hỏi và lựa chọn được nạp từ PostgreSQL khi tạo mỗi trận Ranked.
Các test nghiệp vụ dùng package tương ứng với mã nguồn.

Xem [quy ước tổ chức mã nguồn](docs/architecture.md) và
[lộ trình mở rộng nền tảng quiz](docs/roadmap.md).

## Chuẩn bị Supabase

1. Dùng schema Supabase mới với `users`, `questions`, `choices` theo
   [hợp đồng dữ liệu câu hỏi](docs/question-data.md). `sql/supabase_schema.sql` là
   schema legacy, không dùng để khởi tạo hoặc cập nhật database cho phiên bản này.
2. Sao chép `src/main/resources/db.properties.example` thành
   `src/main/resources/db.properties`.
3. Điền host, user và password từ Database Settings của Supabase.
4. Chuẩn bị ít nhất 3 câu hỏi active hợp lệ: mỗi câu có 4 lựa chọn, vị trí dương
   không trùng và đúng 1 đáp án đúng. Database rỗng sẽ báo lỗi khi ghép trận.

Không commit `db.properties` vì tệp này chứa mật khẩu database.

Địa chỉ server của client được đặt trong
`src/main/resources/client.properties`. Khi chạy trên hai máy, đổi
`server.host` thành IP LAN của máy chạy Game Server.

## Build và chạy

Yêu cầu: JDK 21. Chạy game cần kết nối Supabase; unit/FXML test dùng dữ liệu giả
và không truy cập database thật.

Trong IntelliJ, nhớ đặt **Project SDK** và **Run/Debug JRE** về **JDK 21**.
Nếu vẫn để JDK 24, bạn sẽ thấy các warning JavaFX/JDK màu đỏ như trong ảnh dù
project vẫn có thể chạy.

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

Nếu bấm Run trực tiếp trong IntelliJ, chạy `server/ServerLauncher.java` trước,
nhấn **Khởi động** ở cổng 5000, rồi chạy `client/ClientLauncher.java` hai lần
trong hai cấu hình riêng. Mỗi client chọn `localhost:5000`, bấm **KẾT NỐI** và
đăng nhập một tài khoản khác nhau.

Các launcher là class Java thông thường gọi `Application.launch(...)`, giúp tránh
lỗi `JavaFX runtime components are missing` khi IDE đưa dependencies lên classpath
và chạy trực tiếp một class kế thừa `Application`. Dùng launcher cho cách chạy này;
các lệnh Maven ở trên vẫn giữ nguyên.

## Trách nhiệm quan trọng

- Controller không được tạo `Socket`; mọi giao tiếp đi qua `GameClient`.
- Server là nguồn dữ liệu đúng cho đáp án, thời gian, điểm và người thắng.
- Mật khẩu chỉ được gửi Client → Server trong bản tin đăng ký/đăng nhập rồi băm
  bằng bcrypt trước khi lưu; khi demo qua Internet cần đặt Game Server sau một
  lớp mã hóa vận chuyển như TLS/VPN.
