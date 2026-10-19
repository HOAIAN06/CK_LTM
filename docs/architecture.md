# Tổ chức mã nguồn theo chức năng

Dự án dùng một Maven module, chia thành `client`, `server` và `common`.
Bên trong mỗi phía, mã nghiệp vụ được nhóm theo chức năng. Kết nối mạng,
cấu hình và kết nối database có package riêng để dùng chung.

## Các nhóm hiện có

| Package dưới `com.nihongoquest` | Trách nhiệm | Lớp chính |
| --- | --- | --- |
| `client.auth` | Giao diện đăng nhập, đăng ký | `LoginController` |
| `client.home` | Trang chính sau đăng nhập | `HomeController` |
| `client.profile` | Dữ liệu và hiển thị hồ sơ người chơi | `Player`, `ProfilePresenter` |
| `client.ranked.matchmaking` | Giao diện tìm/hủy tìm trận 1v1 | `MatchmakingController` |
| `client.ranked.battle` | Giao diện thi đấu và kết quả 1v1 | `BattleController`, `ResultController` |
| `client.quiz` | Dành cho Quiz Room sau này; chỉ có `.gitkeep` | Chưa có class |
| `client.config` | Đọc địa chỉ và cổng server | `ClientConfig` |
| `client.network` | Gửi/nhận dữ liệu TCP | `GameClient`, `ServerListener` |
| `server.network` | Quản lý một kết nối, điều phối bản tin, phát sự kiện mạng | `ClientHandler`, `TrafficEvent` |
| `server.ranked` | Hàng chờ, ghép cặp, vòng chơi, thời gian, điểm và kết quả 1v1 | `MatchmakingManager`, `GameRoom` |
| `server.quiz` | Dành cho Quiz Room sau này; chỉ có `.gitkeep` | Chưa có class |
| `server.question` | Model, truy vấn JDBC và kiểm tra câu hỏi Ranked | `Question`, `Choice`, `QuestionRepository`, `QuestionService` |
| `server.player` | Truy vấn tài khoản, xác thực bằng database, lưu thống kê | `PlayerRepository` |
| `server.dashboard` | Giao diện quản trị máy chủ | `ServerDashboardApp`, `DashboardController`, `ServerAddressResolver` |
| `server.infrastructure.persistence` | Cấu hình và mở kết nối JDBC | `Database` |
| `common.protocol` | Hợp đồng dữ liệu TCP giữa client/server | `Message`, `MessageType`, `Payloads`, `Protocol` |

`client.ClientApp` điều hướng màn hình. `server.GameServer` khởi động server và
khởi tạo các thành phần. Tên hai lớp này và cấu hình Maven để chạy app giữ nguyên.
`ranked` là tên nhóm chứa chế độ 1v1 hiện có, chưa bổ sung hệ thống hạng hay Elo.

## Tài nguyên và test

```text
src/main/resources/
├── client/
│   ├── auth/login.fxml
│   ├── home/home.fxml
│   ├── profile/.gitkeep
│   ├── ranked/
│   │   ├── matchmaking/matchmaking.fxml
│   │   ├── battle/battle.fxml
│   │   └── battle/result.fxml
│   ├── quiz/.gitkeep
│   └── shared/style.css
├── server/
│   ├── dashboard/server-dashboard.fxml
│   └── dashboard/server-dashboard.css
├── client.properties
├── client.properties.example
└── db.properties.example
```

`db.properties` là cấu hình cục bộ do người chạy tạo, không commit. Các file
properties vẫn nằm ở gốc resources để giữ cách cấu hình hiện tại.
Schema cũ được lưu trong `sql/` để tham khảo; phiên bản hiện tại dùng database mới
với `users`, `questions` và `choices`, xem [question-data.md](question-data.md).

Test đặt tại `src/test/java` với package tương ứng lớp được kiểm thử.
`ClientFxmlTest` kiểm tra tải cả các màn hình client và dashboard server, cùng
CSS của mỗi phía. Khi đổi package controller phải cập nhật `fx:controller`;
khi đổi vị trí resources phải cập nhật `getResource`, `getResourceAsStream` và test.
`src/test/resources/db.properties` chứa cấu hình giả dành riêng cho kiểm thử tải
dashboard; test không mở kết nối database và cấu hình này không đi vào bản build app.

## Quy ước khi thêm chức năng

1. Đặt controller, model, service và repository vào nhóm chức năng mà chúng phục vụ.
   Khi nhóm lớn mới chia tiếp thành các package con. Các thư mục `quiz` và resources
   `client/profile` được giữ bằng `.gitkeep` để chuẩn bị cấu trúc, chưa có chức năng mới.
2. Controller gọi `GameClient`; truy cập database chỉ nằm phía server.
3. Dữ liệu truyền qua mạng đặt trong `common.protocol`. Client không import lớp server;
   server không import lớp client. Đáp án đúng do server kiểm soát khi phát câu hỏi.
4. Dữ liệu thuộc chức năng nào thì repository nằm trong chức năng đó.
   `infrastructure.persistence` chỉ cung cấp kết nối database dùng chung.
5. Tên nhóm ở client, server và resources nên khớp khi cùng phục vụ một chức năng.
   Ví dụ quản lý bộ đề sẽ dùng `client.quiz`, `server.quiz` và resources `client/quiz`.
6. Sau khi di chuyển mã hoặc tài nguyên, chạy `./mvnw.cmd clean test` với JDK 21.

## Ranh giới của lần sắp xếp này

`GameRoom` vẫn dành cho hai người, ba câu mỗi trận, 30 giây mỗi câu và một điểm mỗi
câu đúng. Câu hỏi được lấy ngẫu nhiên theo luồng:

```text
MatchmakingManager → QuestionService → QuestionRepository → Database → PostgreSQL
```

Mỗi trận giữ snapshot bất biến sau khi nạp và kiểm tra. Không có nguồn câu hỏi dự
phòng từ file. `QUESTION` chỉ gửi DTO công khai; `ANSWER` dùng `questionId` và
`choiceId`. Xem [protocol.md](protocol.md) cho các payload đã cập nhật.

Ranked persistence đi qua `RankedMatchService` (transaction tạo trận),
`RankedMatchRepository` (SQL) và `RankedResultService` (transaction kết quả và
statistics). `GameRoom` giữ realtime state trong RAM, lưu answer trước khi cộng
điểm, gửi GAME_OVER sau commit. Xem [ranked-persistence.md](ranked-persistence.md)
cho schema thực, rollback, timeout và các giới hạn phục hồi.

Phần xác thực hiện còn nằm
trong `ClientHandler` và `PlayerRepository`. Các nhóm vẫn có phụ thuộc qua lại,
đặc biệt giữa kết nối, ghép trận và phòng đấu.

`ProfilePresenter.populate`, cấu hình địa chỉ server và một số phương thức cập nhật
phiên của `ClientHandler` được mở thành `public` để các package mới truy cập được.
Khi xây phòng nhiều người, nên tách trạng thái người tham gia khỏi kết nối TCP và
đưa xác thực vào service riêng. Thiết kế đề xuất nằm trong [roadmap](roadmap.md).
