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

## Ranked theo thời gian

`MatchmakingManager` giữ hai hàng chờ riêng cho chế độ 180 và 300 giây. Mỗi `GameRoom`
chỉ dùng scheduler chung của server nhưng giữ con trỏ câu hỏi, attempt và timer 30 giây
riêng cho từng người. Vì vậy người trả lời nhanh được chuyển câu ngay, không chờ đối thủ.
Server dùng `sessionId + attempt + questionId` để bỏ qua đáp án cũ hoặc trùng.

Mỗi trận lấy tối đa 10 câu hợp lệ từ các bộ đề đã publish và cần ít nhất 3 câu. Khi hết
danh sách, câu hỏi lặp lại cho tới deadline chung. Ngắt kết nối vẫn xử thua ngay.

## Quiz Room trong RAM

`QuizRoomManager` sinh và quản lý PIN sáu số. Khi host tạo phòng, server lấy snapshot của
bộ đề published; việc sửa/xóa bộ đề sau đó không ảnh hưởng phòng đang chạy. `QuizRoom`
giữ lobby, deadline chung, tiến độ và timer câu riêng của tối đa 20 người chơi.

Điểm, số câu đúng và leaderboard chỉ ở RAM. Slot được gắn với user ID thay vì socket nên
mất TCP không xóa người chơi; đăng nhập lại trước deadline sẽ gắn kết nối mới và phát lại
câu hiện tại. Rời chủ động sẽ khóa reconnect. Host mất TCP trong trận không hủy phòng,
nhưng host bấm hủy/rời sẽ kết thúc phòng cho mọi người.

## Trạng thái triển khai

Nền tảng đã có xác thực, dashboard, Ranked 1v1 3/5 phút, câu hỏi PostgreSQL, protocol
payload object, session registry, persistence đơn giản, quản lý bộ đề, Quiz Room, Top 10 Ranked
và lịch sử thi đấu. `PlayerRepository` phục vụ hồ sơ/leaderboard; `MatchRepository` vừa lưu kết
quả vừa đọc lịch sử theo user. `FriendshipRepository` lưu quan hệ bạn bè; `SocialService` giữ
lời mời chơi 60 giây trong RAM và nối accept với direct Ranked hoặc join Quiz.

## Giám sát Quiz Room

`QuizRoom` giữ trạng thái camera, hiệu chuẩn và số cảnh báo trong RAM. Control channel
TCP 5000 truyền status, event và media ticket; `ProctorMediaRelay` dùng TCP 5001 chỉ
xác thực và chuyển JPEG, không giải mã hay lưu frame. Ticket ngẫu nhiên 32 byte gắn
với PIN/user/role, dùng một lần và hết hạn handshake sau 60 giây.

Trên máy player, `ProctoringCoordinator` sở hữu consent, camera, AI, media publisher và
focus monitor. Camera phát tối đa 5 FPS ở 320×240; AI dùng queue kích thước một.
Host có dashboard JavaFX riêng, media subscriber và `EvidenceRecorder`: buffer JPEG
15 giây/8 MiB mỗi player, snapshot và MP4 pre/post trên executor hai worker. Server
không chạy AI và không ghi bằng chứng. Toàn bộ model nằm trong resources để chạy offline.

Bốn model Intel được chuyển từ OpenVINO IR sang ONNX khi chuẩn bị bản phát hành;
YOLOX-tiny dùng ONNX chính thức. Runtime chỉ dùng OpenCV DNN CPU. Bản ONNX và SHA-256
nằm trong `src/main/resources/models/proctoring/manifest.json`; không tải model khi chạy.
