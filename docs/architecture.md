# Kiến trúc

NihongoQuest là ứng dụng client–server: client JavaFX chỉ hiển thị và gửi ý định, server
Java quyết định toàn bộ trạng thái gameplay. Tài liệu này mô tả module, luồng chạy và
ranh giới trách nhiệm; protocol chi tiết ở [`protocol.md`](protocol.md).

## 1. Bất biến kiến trúc

- Server là nguồn quyết định đáp án đúng, điểm, attempt, deadline và trạng thái phòng.
- Client không kết nối database, không tự tính điểm và không tự kết luận thắng/thua.
- `common` chỉ chứa protocol, payload, media metadata và tiện ích dùng chung; không chứa
  nghiệp vụ server hay UI.
- Client chỉ dùng một kết nối TCP gameplay (`GameClient`); controller không tự mở socket.
- JavaFX Application Thread không bị chặn bởi network, camera, AI hoặc ghi file. Callback
  mạng cập nhật UI qua `Platform.runLater`.
- Camera/proctoring không phải điều kiện để join hoặc start Quiz Room.
- Frame camera dùng latest-frame semantics: consumer chậm thì bỏ frame cũ, không tăng queue
  vô hạn.
- Runtime state (phòng, hàng chờ, invite, ticket media) nằm trong RAM; chỉ user, bộ đề,
  trận Ranked và quan hệ bạn bè được lưu database.

## 2. Bản đồ module

```text
src/main/java/com/nihongoquest/
├── common/
│   ├── protocol/        Message, MessageType, Payloads, Protocol
│   ├── media/           MediaProtocol, VisionMetadata
│   └── logging/         RuntimeLog
├── client/
│   ├── ClientApp        entry point, navigation, global message routing
│   ├── network/         GameClient, ServerListener
│   ├── auth/            login/register
│   ├── layout/          shell, sidebar, route guard
│   ├── home/ profile/   trang chủ, hồ sơ, thống kê
│   ├── ranked/          matchmaking, battle, result
│   ├── quiz/            menu, lobby, battle, proctor dashboard, quiz set editor
│   ├── friend/          bạn bè, presence, lời mời
│   ├── leaderboard/     top 10
│   ├── history/         lịch sử Ranked
│   └── proctor/         camera, AI, media, evidence
└── server/
    ├── GameServer       accept loop, đăng ký client, vòng đời server
    ├── ServerLauncher   entry point JavaFX dashboard
    ├── network/         ClientHandler, ServerRequestRouter, OnlineUserRegistry, TrafficEvent
    ├── player/          PlayerRepository (auth, hồ sơ)
    ├── ranked/          MatchmakingManager, GameRoom, MatchRepository
    ├── question/        QuestionRepository, QuestionService, model
    ├── quiz/            QuizSetRepository, QuizSetService
    ├── quizroom/        QuizRoomManager, QuizRoom
    ├── friend/          FriendshipRepository, SocialService
    ├── media/           ProctorMediaRelay
    └── dashboard/       server dashboard JavaFX
```

Tài nguyên UI nằm trong `src/main/resources/client/` (FXML + CSS dùng chung
`client/shared/style.css`) và `src/main/resources/server/dashboard/`. Schema database nằm
trong `sql/supabase_schema.sql`.

## 3. Trách nhiệm chính

| Thành phần | Trách nhiệm |
|---|---|
| `GameClient` | Một socket TCP, thread `tcp-server-listener`, decode JSON line, chuyển message cho handler hiện tại |
| `ClientApp` | Điều hướng màn hình, giữ `Player`, route message toàn cục (invite, reconnect) |
| `ProctoringCoordinator` | Vòng đời camera, consent, AI, media publisher/subscriber, báo status/event |
| `GameServer` | Mở `ServerSocket`, media relay, pool client handler, scheduler, dashboard listeners |
| `ClientHandler` | Đọc/ghi frame của một kết nối, giữ `playerId`, `currentRoom`, `currentQuizRoom`, `queued` |
| `ServerRequestRouter` | Switch protocol duy nhất phía server; validate sơ bộ và giao cho service/manager |
| `PlayerRepository` | Đăng ký, đăng nhập BCrypt, hồ sơ, bảng xếp hạng |
| `MatchmakingManager` | Hàng chờ FIFO theo 180/300 giây, ghép cặp, tạo `GameRoom` |
| `GameRoom` | Luật trận Ranked, deadline, câu hỏi, điểm, kết thúc và lưu kết quả |
| `MatchRepository` | Transaction lưu `matches` và cộng thống kê `users`; đọc lịch sử |
| `QuestionService` | Validate câu hỏi Ranked và lấy pool hợp lệ |
| `QuizSetService` | Validate draft/publish bộ đề; snapshot bộ đề cho phòng |
| `QuizRoomManager` | Sinh PIN, ánh xạ PIN/user → `QuizRoom`, cấp media session, reconnect Quiz |
| `QuizRoom` | Lobby, start, câu hỏi riêng từng người, điểm, leaderboard, cancel/finish |
| `SocialService` | Bạn bè, presence, lời mời Ranked/Quiz 60 giây |
| `ProctorMediaRelay` | Relay JPEG nhị phân có ticket, latest-frame, không decode/lưu |
| `RuntimeLog` | Cấu hình log xoay vòng, che PIN/password/ticket |

## 4. Luồng mạng điều khiển

```text
JavaFX controller
      │ gọi API GameClient
      ▼
GameClient ── JSON line (UTF-8) ──► GameServer.accept()
                                      │
                                      ▼
                              ClientHandler.run()
                                      │
                                      ▼
                            ServerRequestRouter.handle()
                    ┌─────────────┼──────────────────┐
                    ▼             ▼                  ▼
             Player/Match     Matchmaking        QuizRoomManager
             Repository       Manager            / SocialService
                    │             │                  │
                    ▼             ▼                  ▼
               PostgreSQL     GameRoom/Timer     QuizRoom/Timer
```

Chiều ngược lại:

```text
Manager/Repository → ClientHandler.send() → PrintWriter → socket → GameClient listener
→ handler của màn hình hiện tại → Platform.runLater → JavaFX UI
```

`ClientHandler.send()` được đồng bộ để tránh hai thread ghi xen kẽ một frame. Traffic
listener và activity listener chỉ phục vụ dashboard/log, không tham gia quyết định gameplay.

## 5. Thread và timeout

| Thread/pool | Vai trò |
|---|---|
| JavaFX Application Thread | UI, animation, `Platform.runLater` callback |
| `tcp-server-listener` (client) | Đọc message từ server; không chạm trực tiếp JavaFX |
| `GameServer` accept thread | Chấp nhận socket, tạo `ClientHandler` |
| `client-handler` (fixed 50) | Chạy vòng đọc của từng kết nối |
| `game-timer` (scheduled 4) | Timer Ranked, Quiz, hết hạn lời mời |
| `proctor-media-accept` + virtual threads | Handshake và relay media |
| `proctor-monitor`, `proctor-ai`, virtual media threads (client) | Camera, AI, gửi/nhận frame ngoài JavaFX |

Timeout quan trọng: kết nối client 5 giây; media handshake 10 giây; ticket media 60 giây;
câu hỏi Ranked/Quiz 30 giây; camera first-frame 10 giây với tối đa 3 lần retry cách 5 giây.
Bảng đầy đủ ở [`protocol.md`](protocol.md#9-timeout-và-giới-hạn).

## 6. Luồng Ranked

Chi tiết luật trận ở [`ranked.md`](ranked.md).

```text
FIND_MATCH
   → MatchmakingManager.enqueue(duration)
   → hàng chờ riêng cho 180/300 giây
   → đủ 2 người + pool câu hợp lệ
   → new GameRoom(...).start()
   → MATCH_FOUND, QUESTION, ANSWER/ANSWER_RESULT, SCORE_UPDATE
   → hết deadline hoặc disconnect
   → MatchRepository.saveResult() (transaction)
   → GAME_OVER (nếu lưu thành công)
```

Điểm quan trọng:

- `GameRoom` giữ toàn bộ state trong RAM; không đọc DB trong lúc thi đấu.
- Hai người có deadline chung nhưng `position`, `attempt`, `score` độc lập.
- Điểm Ranked là số câu đúng; không có điểm tốc độ.
- Disconnect kết thúc trận và xử thua ngay; không có reconnect Ranked.
- Nếu lưu DB lỗi, trận kết thúc nhưng không gửi `GAME_OVER`; hai bên nhận
  `MATCH_ERROR`/`DATABASE_ERROR`.
- Lời mời bạn bè tạo trận trực tiếp qua `createDirectMatch`, bỏ qua hàng chờ.

## 7. Luồng Quiz Room

```text
Host chọn Quiz Set đã publish
   → QUIZ_ROOM_CREATE (1–15 phút, hostPlays, proctoring)
   → QuizRoomManager.create() snapshot câu hỏi vào RAM, sinh PIN 6 số
   → QUIZ_ROOM_CREATED + QUIZ_LOBBY_UPDATE

Player nhập PIN
   → QUIZ_ROOM_JOIN → QuizRoom.join() → lobby update

Host bấm bắt đầu
   → QuizRoom.start(): host gửi lệnh, tối thiểu 2 người chơi đang kết nối, không xét camera
   → QUIZ_ROOM_START cho từng người
   → QUIZ_QUESTION riêng từng người, QUIZ_ANSWER_RESULT, QUIZ_LEADERBOARD
   → hết giờ → QUIZ_ROOM_FINISHED → cleanup

Proctoring bật
   → PROCTOR_MEDIA_SESSION cho publisher/subscriber
   → PROCTOR_STATUS_REPORT/UPDATE, PROCTOR_EVENT_REPORT/EVENT
```

Điểm quan trọng:

- `QuizRoomManager` giữ `Map<pin, QuizRoom>` và `Map<userId, QuizRoom>` để hỗ trợ reconnect.
- `QuizRoom` là state machine `LOBBY → RUNNING → FINISHED`; mọi thao tác quan trọng
  `synchronized`.
- Host có thể không chơi; nếu bật proctoring thì host **không được** chơi.
- Camera `READY` không phải điều kiện start; trạng thái camera chỉ là cảnh báo.
- Reconnect Quiz sau `LOGIN_OK` nhận `QUIZ_REJOINED`; nếu phòng đang chạy, server gửi lại
  câu hiện tại hoặc xử lý timeout trước khi gửi câu mới.
- Khi phòng kết thúc/hủy, callback dọn manager và đóng media room.

## 8. Proctoring và media relay

```text
CameraCaptureService
   → frame mới nhất
   → ProctorAiEngine (metadata/vision) ─┐
   → ProctorMediaPublisher ─────────────┼─► ProctorMediaRelay (TCP 5001)
                                        │        │
                                        │        ▼
                                        │   ProctorMediaSubscriber / ProctorDashboard
                                        ▼
                              PROCTOR_EVENT_REPORT / PROCTOR_STATUS_REPORT
```

- Camera và AI chạy ngoài JavaFX thread; preview chỉ render frame đã decode.
- Relay xác thực bằng ticket ngẫu nhiên, dùng một lần, TTL 60 giây; ticket không ghi log.
- Relay giữ tối đa một frame mới nhất cho mỗi publisher; host nhận batch frame mới nhất.
- Relay không decode JPEG, không lưu frame, không có audio.
- `HOST_SUBSCRIBER` chỉ nhận; `PUBLISHER` chỉ gửi. Khi host chưa kết nối, frame bị bỏ.
- Media chỉ dùng trong LAN demo, không thay thế TLS/VoIP.

## 9. Persistence

```text
users ──< quiz_sets ──< questions ──< choices
  │
  ├──< matches (player1_id, player2_id, winner_id)
  └──< friendships (user_low_id, user_high_id)
```

- Client không bao giờ kết nối database; mọi truy vấn qua repository phía server.
- Auth dùng BCrypt; không lưu mật khẩu thô.
- `MatchRepository.saveResult` dùng một transaction: insert `matches` + cập nhật
  `wins/losses/draws/total_score/questions_answered/correct_answers`.
- Quiz Room và leaderboard trong phòng là runtime state; hiện không ghi kết quả Quiz vào DB.
- `QuizSetService` chỉ cho tạo phòng từ bộ đề đã publish và snapshot câu hỏi vào RAM.
- Cấu hình DB đọc từ `~/.nihongoquest/db.properties`, `db.properties` hoặc
  `src/main/resources/db.properties`; không commit file cấu hình thật.
- Schema chuẩn và quy tắc thay đổi ở [`database.md`](database.md).

## 10. Client UI và điều hướng

- `ClientApp` là nơi duy nhất load FXML và đổi route; controller nhận `ClientApp`,
  `GameClient`, `Player` qua `setSession`.
- `AuthenticatedShellController` giữ sidebar/header; route guard hỏi trước khi rời màn
  đang tìm trận, lobby Quiz hoặc trình soạn Quiz Set chưa lưu.
- Mỗi màn đặt `messageHandler`; message toàn cục (invite, reconnect) đi qua
  `setGlobalMessageHandler`.
- `showContent` dùng animation ngắn; feedback đúng/sai và countdown không trì hoãn gửi đáp án.
- CSS dùng design token `-ndq-*` trong `client/shared/style.css`; server dashboard dùng
  cùng token. Chi tiết ở [`ui-design.md`](ui-design.md).

## 11. Cấu hình, cổng và log

| Thành phần | Mặc định / nguồn |
|---|---|
| TCP control | `5000` (`Protocol.DEFAULT_PORT`) |
| TCP media | `5001`; nếu control port khác thì `port + 1` |
| Client host/port | `NIHONGO_SERVER_HOST`, `NIHONGO_SERVER_PORT`, `client.properties` |
| DB | `db.properties` hoặc `-Dnihongoquest.db.config` |
| Log source | `logs/client.log*`, `logs/server.log*` |
| Log packaged | `%USERPROFILE%\.nihongoquest\logs` |
| Log rotation | 5 file, 2 MiB/file |

Không ghi password, PIN đầy đủ, media ticket hoặc nội dung frame vào log.

## 12. Quy tắc mở rộng

1. Thêm message mới: cập nhật `MessageType`, `Payloads`, router/service, test payload và
   [`protocol.md`](protocol.md); không đổi nghĩa type cũ.
2. Thêm trạng thái phòng: giữ server authority, định nghĩa timeout và cleanup rõ ràng.
3. Thêm dữ liệu lâu dài: cập nhật schema, repository, test, [`database.md`](database.md).
4. Thêm UI: dùng style token, route qua `ClientApp`, cập nhật JavaFX từ thread mạng bằng
   `Platform.runLater`.
5. Thêm media field: tăng `MediaProtocol.VERSION`; cập nhật relay, publisher/subscriber,
   test vision metadata và tài liệu.
6. Mọi thay đổi camera/proctoring phải giữ policy "camera lỗi không chặn quiz" và
   latest-frame, trừ khi có quyết định mới trong `DECISIONS.md`.
