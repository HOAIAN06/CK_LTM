# TCP Protocol — NihongoQuest

Tài liệu này là hợp đồng trao đổi giữa client JavaFX và server Java. Nguồn sự thật của
message type và payload là:

- `src/main/java/com/nihongoquest/common/protocol/MessageType.java`
- `src/main/java/com/nihongoquest/common/protocol/Payloads.java`
- `src/main/java/com/nihongoquest/common/protocol/Message.java`
- `src/main/java/com/nihongoquest/common/media/MediaProtocol.java`

Nếu tài liệu và code khác nhau, code thắng; cập nhật tài liệu và test payload trong cùng thay đổi.

## 1. Kênh điều khiển

| Thuộc tính | Giá trị |
|---|---|
| Giao thức | TCP |
| Cổng mặc định | `5000` (`Protocol.DEFAULT_PORT`) |
| Encoding | UTF-8 |
| Framing | Mỗi frame là một dòng JSON kết thúc bằng newline; đọc bằng `BufferedReader.readLine()` nên chấp nhận LF và CRLF |
| Message | JSON object `{ "type": "<MessageType>", "payload": <object|string|null> }` |
| Chiều dài | Không có giới hạn tường minh ở tầng protocol; không gửi ảnh/nhị phân qua kênh này |
| Kênh media | TCP nhị phân riêng ở mục 8, mặc định cổng `5001` |

Ví dụ:

```json
{"type":"LOGIN","payload":{"username":"an","password":"secret"}}
{"type":"FIND_MATCH","payload":{"durationSeconds":180}}
{"type":"CANCEL_MATCH","payload":""}
{"type":"MATCH_FOUND","payload":{"roomId":"d8d0...","opponent":"binh","durationSeconds":180}}
```

Quy ước payload:

- Message không có dữ liệu dùng payload rỗng `""` hoặc `null`.
- Payload lỗi nghiệp vụ thường là chuỗi mã lỗi, ví dụ `QUIZ_ERROR` với `"INVALID_PIN"`.
- Payload thành công là object JSON theo record DTO trong `Payloads.java`.
- Message JSON sai định dạng hoặc `type` không hợp lệ làm server đóng kết nối
  (`ClientHandler.run()` bắt `IllegalArgumentException` rồi `close()`).
- `MessageType` hợp lệ nhưng chưa có nhánh xử lý sẽ bị bỏ qua và ghi log mức `FINE`.

## 2. Vòng đời phiên

```text
Client mở TCP → gửi CONNECT
→ REGISTER (tạo tài khoản) → REGISTER_OK
→ LOGIN → LOGIN_OK (kèm hồ sơ) → server phục hồi phòng Quiz nếu có
→ gameplay: Ranked, Quiz Room, hồ sơ, bạn bè, lịch sử
→ DISCONNECT hoặc đóng socket → server dọn phiên
```

Quy tắc:

- `CONNECT` chỉ báo client đã sẵn sàng; không cấp quyền.
- `REGISTER` chỉ tạo tài khoản, **không** đăng nhập. Client phải gửi `LOGIN` sau `REGISTER_OK`.
- Mỗi tài khoản chỉ có một kết nối online (`OnlineUserRegistry`); đăng nhập trùng nhận
  `LOGIN_FAIL` với `ALREADY_ONLINE`.
- Username hợp lệ: 3–20 ký tự `[a-zA-Z0-9_]`; mật khẩu tối thiểu 4 ký tự.
- Chỉ tài khoản đã đăng nhập mới được tìm trận, tạo/join Quiz Room, query dữ liệu và social.
- Ngắt socket sẽ: rời hàng chờ Ranked, kết thúc trận Ranked hiện tại (xử thua),
  đánh dấu mất kết nối trong Quiz Room, cập nhật presence và xóa khỏi online registry.
- Reconnect chỉ được hỗ trợ cho **Quiz Room**: sau `LOGIN_OK`, server gửi `QUIZ_REJOINED`
  nếu tài khoản còn phòng. Ranked không có reconnect; mất kết nối là forfeit.

## 3. Auth, hồ sơ và dữ liệu tổng hợp

### Client → Server

| Type | Payload | Ghi chú |
|---|---|---|
| `CONNECT` | rỗng | Báo client đã kết nối |
| `REGISTER` | `{username, password}` | Tạo tài khoản, chưa tạo phiên |
| `LOGIN` | `{username, password}` | Tạo phiên và đăng ký online |
| `PROFILE_GET` | rỗng | Hồ sơ của chính mình |
| `LEADERBOARD_GET` | rỗng | Top 10 |
| `MATCH_HISTORY_GET` | rỗng | Tối đa 100 trận gần nhất |
| `DISCONNECT` | rỗng | Đóng phiên chủ động |

### Server → Client

| Type | Payload | Ghi chú |
|---|---|---|
| `REGISTER_OK` / `LOGIN_OK` | `PlayerStats` | Đăng ký xong vẫn phải login |
| `REGISTER_FAIL` / `LOGIN_FAIL` | mã lỗi dạng chuỗi | Xem bảng lỗi |
| `PROFILE_DATA` | `PlayerStats` | |
| `LEADERBOARD_DATA` | `{players:[LeaderboardEntry]}` | Server sắp xếp, không phải client |
| `MATCH_HISTORY_DATA` | `{matches:[MatchHistoryEntry]}` | Theo `playedAt` giảm dần |
| `QUERY_ERROR` | mã lỗi dạng chuỗi | Query hồ sơ/bảng xếp hạng/lịch sử |

`PlayerStats`:

```json
{"id":1,"username":"an","wins":4,"losses":2,"draws":1,"totalScore":37,
 "questionsAnswered":80,"correctAnswers":52}
```

`LeaderboardEntry`: `{rank,userId,username,wins,losses,draws,totalScore}`.

`MatchHistoryEntry`: `{matchId,opponentUsername,myScore,opponentScore,result,durationSeconds,
endReason,playedAt}`. `result` là `WIN|LOSS|DRAW` theo góc nhìn người xem;
`endReason` là `NORMAL|DISCONNECT`; `playedAt` là ISO-8601 UTC.

## 4. Bạn bè, presence và lời mời

### Client → Server

| Type | Payload |
|---|---|
| `USER_SEARCH` | `{query}` — 1–20 ký tự |
| `FRIEND_REQUEST_SEND` | `{userId}` |
| `FRIEND_REQUEST_LIST` | rỗng |
| `FRIEND_REQUEST_RESPOND` | `{userId, accept}` |
| `FRIEND_LIST` | rỗng |
| `FRIEND_REMOVE` | `{userId}` |
| `GAME_INVITE_SEND` | `{targetUserId, type, durationSeconds, roomPin}` |
| `GAME_INVITE_RESPOND` | `{inviteId, accept}` |

`GAME_INVITE_SEND.type`:

- `RANKED`: `durationSeconds` phải là `180` hoặc `300`; `roomPin` bỏ trống.
- `QUIZ`: người gửi phải là host của lobby đang ở trạng thái chờ; `roomPin` là PIN 6 số.

### Server → Client

| Type | Payload |
|---|---|
| `USER_SEARCH_RESULT` | `{users:[{userId,username,online,busy}]}` |
| `FRIEND_REQUEST_SENT` | `{userId}` |
| `FRIEND_REQUEST_LIST` | `{requests:[{userId,username}]}` |
| `FRIEND_REQUEST_RESPOND` | `{userId, accept}` (echo/đồng bộ hai phía) |
| `FRIEND_LIST` | `{friends:[{userId,username,online,busy}]}` |
| `FRIEND_REMOVED` | `{userId}` |
| `PRESENCE_UPDATE` | `{userId,online,busy}` |
| `GAME_INVITE_RECEIVED` | `{inviteId,fromUserId,fromUsername,type,durationSeconds,roomPin,expiresAtEpochMillis}` |
| `GAME_INVITE_STATUS` | `{inviteId,status}` |
| `SOCIAL_ERROR` | mã lỗi dạng chuỗi |

Lời mời hết hạn sau **60 giây**. `GAME_INVITE_STATUS.status`:
`SENT`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CANCELLED`.

Chấp nhận lời mời Ranked tạo trận trực tiếp, bỏ qua hàng chờ; hai người nhận `MATCH_FOUND`
ngay. Chấp nhận lời mời Quiz join thẳng vào lobby và nhận `QUIZ_LOBBY_UPDATE`.

## 5. Ranked 1v1

Luật trận, scoring và persistence chi tiết ở [`ranked.md`](ranked.md).

### Client → Server

| Type | Payload |
|---|---|
| `FIND_MATCH` | `{durationSeconds}` — chỉ `180` hoặc `300` |
| `CANCEL_MATCH` | rỗng |
| `ANSWER` | `{sessionId,attempt,questionId,choiceId}` |

### Server → Client

| Type | Payload |
|---|---|
| `WAITING` | rỗng — đã vào hàng chờ |
| `MATCH_CANCELLED` | rỗng |
| `MATCH_ERROR` | mã lỗi dạng chuỗi |
| `MATCH_FOUND` | `{roomId,opponent,durationSeconds}` |
| `QUESTION` | `QuestionData` |
| `ANSWER_RESULT` | `AnswerResult` |
| `SCORE_UPDATE` | `{myScore,opponentScore}` |
| `GAME_OVER` | `{result,myScore,opponentScore}` |

`QuestionData`:

```json
{"sessionId":"<roomId>","attempt":1,"questionDurationSeconds":30,
 "matchRemainingSeconds":180,"questionId":42,"content":"...",
 "choices":[{"choiceId":101,"content":"...","position":1}, "..."]}
```

- `sessionId` của Ranked là `roomId`.
- `attempt` bắt đầu từ 1 và tăng mỗi câu, kể cả khi câu trong pool lặp lại.
- `questionDurationSeconds` là `min(30, thời gian còn lại của trận)`.
- Payload câu hỏi **không** chứa đáp án đúng, `correctChoiceId`, `correct` hay `explanation`.

`AnswerResult`:

```json
{"sessionId":"<roomId>","attempt":1,"questionId":42,"correct":true,
 "chosenChoiceId":101,"correctChoiceId":101,"scoreAwarded":1}
```

- Trả lời sai hoặc timeout: `correct=false`, `chosenChoiceId=null` khi timeout,
  `correctChoiceId` vẫn được gửi để client tô đáp án đúng.
- `scoreAwarded` của Ranked là `1` khi đúng, `0` khi sai/timeout.
- Answer trùng, sai `sessionId`/`attempt`/`questionId` hoặc `choiceId` không thuộc câu bị bỏ qua
  im lặng. Answer đúng định danh nhưng đến sau `questionDeadline` được xử lý như timeout;
  nếu `matchDeadline` đã qua, server kết thúc trận ngay.

`GAME_OVER.result`: `WIN|LOSE|DRAW`.

## 6. Quiz Set (bộ đề)

### Client → Server

| Type | Payload |
|---|---|
| `QUIZ_SET_LIST` | `{scope}` — `OWN` hoặc `PUBLISHED` |
| `QUIZ_SET_GET` | `{quizSetId}` |
| `QUIZ_SET_SAVE` | `QuizSetEdit` |
| `QUIZ_SET_PUBLISH` | `{quizSetId,published}` |
| `QUIZ_SET_DELETE` | `{quizSetId}` |

`QuizSetEdit`:

```json
{"id":null,"title":"...","description":"...","level":"N5",
 "questions":[{"id":null,"content":"...","explanation":"...",
   "choices":[{"id":null,"content":"...","position":1,"correct":true}]}]}
```

### Server → Client

| Type | Payload |
|---|---|
| `QUIZ_SET_LIST_RESULT` | `{items:[QuizSetSummary]}` |
| `QUIZ_SET_DETAIL` | `QuizSetEdit` |
| `QUIZ_SET_SAVED` | `{quizSetId}` |
| `QUIZ_SET_PUBLISHED` | `{quizSetId,published}` |
| `QUIZ_SET_DELETED` | `{quizSetId}` |
| `QUIZ_SET_ERROR` | mã lỗi dạng chuỗi |

`QuizSetSummary`:
`{id,ownerId,ownerUsername,title,description,level,published,questionCount,ownedByMe}`.

Quy tắc validate:

- `title` 1–100 ký tự; `level` thuộc `N5|N4|N3|N2|N1`.
- Draft có thể chưa có câu; câu đã có phải đủ 4 lựa chọn, `position` 1–4 duy nhất,
  đúng một `correct=true`.
- Xuất bản cần tối thiểu 3 câu hợp lệ.
- Chỉ chủ sở hữu được sửa/xuất bản/xóa draft; bộ đã publish được dùng để tạo Quiz Room.
- `QUIZ_SET_DETAIL` là payload biên tập nên có cờ `correct`; payload câu hỏi live
  (`QUIZ_QUESTION`) không bao giờ có cờ này.

## 7. Quiz Room

### Client → Server

| Type | Payload |
|---|---|
| `QUIZ_ROOM_CREATE` | `{quizSetId,durationMinutes,hostPlays,proctoringEnabled}` |
| `QUIZ_ROOM_JOIN` | `{pin}` — đúng 6 chữ số |
| `QUIZ_ROOM_START` | rỗng — chỉ host |
| `QUIZ_ANSWER` | `{sessionId,attempt,questionId,choiceId}` |
| `QUIZ_ROOM_LEAVE` | rỗng |
| `QUIZ_ROOM_CANCEL` | rỗng — chỉ host |

### Server → Client

| Type | Payload | Khi nào |
|---|---|---|
| `QUIZ_ROOM_CREATED` | `{lobby:QuizLobbyData}` | Host tạo phòng xong |
| `QUIZ_LOBBY_UPDATE` | `QuizLobbyData` | Join/leave/status camera thay đổi |
| `QUIZ_ROOM_START` | `QuizRoomStarted` | Host bắt đầu thành công |
| `QUIZ_QUESTION` | `QuizQuestionData` | Server gửi câu kế tiếp cho từng người |
| `QUIZ_ANSWER_RESULT` | `QuizAnswerResult` | Sau khi trả lời hoặc timeout |
| `QUIZ_LEADERBOARD` | `QuizLeaderboardData` | Trong trận |
| `QUIZ_ROOM_FINISHED` | `QuizLeaderboardData` với `finished=true` | Hết giờ phòng |
| `QUIZ_ROOM_CANCEL` | lý do dạng chuỗi | Host hủy hoặc server dừng |
| `QUIZ_REJOINED` | `QuizRejoinData` | Sau `LOGIN_OK` nếu còn phòng |
| `QUIZ_ERROR` | mã lỗi dạng chuỗi | Thao tác không hợp lệ |

`QuizLobbyData`:

```json
{"pin":"123456","title":"...","hostUsername":"an","currentUserHost":true,
 "hostPlays":true,"proctoringEnabled":false,"started":false,"playerCount":2,
 "members":[{"userId":1,"username":"an","host":true,"playing":true,"connected":true,
   "cameraStatus":"NOT_REQUIRED","calibrationStatus":"NOT_REQUIRED","warningCount":0}]}
```

- `playerCount` chỉ đếm người `playing` và chưa rời phòng.
- Host không chơi (`hostPlays=false`) vẫn ở lobby nhưng không tính vào `playerCount`.
- Trạng thái camera của người khác bị che (`NOT_APPLICABLE`/`NOT_REQUIRED`, `warningCount=0`)
  nếu người xem không phải host và không phải chính người đó.
- `cameraStatus`: `NOT_REQUIRED|NOT_APPLICABLE|INITIALIZING|READY|DENIED|NOT_FOUND|FAILED|LOST|BLOCKED|STOPPED`.
- `calibrationStatus`: `NOT_REQUIRED|PENDING|READY|FAILED`.

`QuizRoomStarted`: `{pin,title,durationSeconds,playing,host,proctoringEnabled}`.
`QuizRejoinData`: `{lobby,running,playing,proctoringEnabled,remainingSeconds}`.
`QuizQuestionData`:
`{sessionId,pin,attempt,questionId,content,choices,questionDurationSeconds,roomRemainingSeconds}`.
Trong Quiz Room, `sessionId` và `pin` bằng nhau.

`QuizAnswerResult`:
`{sessionId,attempt,questionId,correct,chosenChoiceId,correctChoiceId,scoreAwarded,totalScore}`.
Điểm Quiz: đúng được `500–1000` điểm theo thời gian còn lại; sai/timeout được `0`.
Điểm do server tính, client chỉ hiển thị.

`QuizLeaderboardData`:
`{pin,finished,entries:[{rank,userId,username,score,correctAnswers,connected}]}`.
Xếp hạng theo `score` giảm dần, rồi `correctAnswers` giảm dần, rồi username.

Quy tắc phòng:

- Thời lượng tạo phòng 1–15 phút; server lưu bằng giây.
- Phòng có proctoring: tối đa 6 người chơi; không proctoring: tối đa 20.
- `proctoringEnabled=true` không đi cùng `hostPlays=true`.
- Bắt đầu cần host, tối thiểu 2 người chơi đang kết nối; **không** phụ thuộc camera READY.
- Câu hỏi có 30 giây, hoặc ít hơn nếu phòng sắp hết giờ.
- Host rời phòng (kể cả khi còn ở lobby) sẽ hủy phòng (`HOST_CANCELLED`).
- Người chơi thường rời phòng bị đánh dấu `left`; camera chuyển `STOPPED`.
- Khi phòng hết giờ, server gửi `QUIZ_ROOM_FINISHED` cho người còn kết nối rồi dọn phòng.

## 8. Proctoring và media

### 8.1. Message JSON

| Type | Hướng | Payload |
|---|---|---|
| `PROCTOR_STATUS_REPORT` | C→S | `{pin,cameraStatus,calibrationStatus,detail,observedAtEpochMillis}` |
| `PROCTOR_STATUS_UPDATE` | S→C host | `{pin,userId,username,cameraStatus,calibrationStatus,connected,warningCount,serverTimeEpochMillis}` |
| `PROCTOR_EVENT_REPORT` | C→S | `{pin,eventId,type,severity,frameSequence,occurredAtEpochMillis,durationMillis,confidence}` |
| `PROCTOR_EVENT` | S→C host | `{pin,eventId,userId,username,type,severity,frameSequence,clientOccurredAtEpochMillis,serverReceivedAtEpochMillis,durationMillis,confidence,warningCount}` |
| `PROCTOR_MEDIA_SESSION` | S→C | `{pin,role,mediaPort,ticket,expiresAtEpochMillis}` |

- `type`: `NO_FACE|MULTIPLE_FACES|LOOKING_AWAY|PHONE_DETECTED|CAMERA_BLOCKED|APP_FOCUS_LOST|APP_MINIMIZED`.
- `severity`: `WARNING|EVIDENCE`.
- `role`: `PUBLISHER` (player gửi camera) hoặc `HOST_SUBSCRIBER` (host xem).
- Chỉ người chơi không phải host trong phòng bật proctoring mới được report status/event.
- `PROCTOR_EVENT_REPORT` chỉ hợp lệ khi phòng đang chạy; `eventId` là UUID, tối đa 64 ký tự.
- Server dedupe theo `eventId` (giữ 256 ID gần nhất), tăng `warningCount` và chuyển event cho host.
- `PROCTOR_MEDIA_SESSION` được cấp sau khi phòng bắt đầu, khi reconnect và khi media
  disconnect. Ticket dùng một lần, hết hạn sau 60 giây.

### 8.2. Binary media protocol

Kênh media là TCP riêng, mặc định cổng `5001`. Cổng media do server quyết định:
`5001` nếu control port là `5000`, `port + 1` nếu dùng cổng khác, hoặc cổng ephemeral
khi control port là `0` (test).

Handshake client → server:

```text
int32  MAGIC = 0x4E514D50 ("NQMP")
uint8  VERSION = 2
uint8  ROLE (1=PUBLISHER, 2=HOST_SUBSCRIBER)
uint16 TICKET_LENGTH (1..512)
byte[] TICKET (UTF-8)
```

Server trả một byte ACK:

| ACK | Ý nghĩa |
|---|---|
| `0` | OK |
| `1` | MAGIC sai |
| `2` | VERSION không hỗ trợ |
| `3` | Ticket/role không hợp lệ |
| `4` | Ticket hết hạn |
| `5` | Phòng đã đóng |

Handshake có timeout 10 giây. Sau handshake, publisher gửi frame và host nhận frame;
server không decode, không lưu và không ghi frame.

Publisher frame (`type=0x10`):

```text
uint8  type = 0x10
int64  sequence
int64  captureEpochMillis
int32  jpegLength (1..524288)
byte[] jpeg
VisionMetadata
```

Relayed frame (`type=0x11`):

```text
uint8  type = 0x11
int64  userId
int64  sequence
int64  serverReceivedEpochMillis
int32  jpegLength (1..524288)
byte[] jpeg
VisionMetadata
```

`VisionMetadata`:

```text
int64   frameSequence
int64   analysedAtEpochMillis
uint8   attention ordinal (LOOKING_AT_SCREEN, LOOKING_AWAY, NO_FACE,
                           MULTIPLE_FACES, PHONE, UNKNOWN)
double  gazeX
double  gazeY
float   confidence (0..1)
uint8   faceCount (0..6)
per face: 8 x float (x, y, width, height, leftEyeX, leftEyeY, rightEyeX, rightEyeY)
```

Quy tắc relay:

- Mỗi publisher chỉ giữ **frame mới nhất**; frame cũ bị bỏ thay vì xếp hàng vô hạn.
- Host nhận batch các frame mới nhất, sắp xếp theo `userId`, rồi flush.
- Nếu host chưa kết nối, frame của publisher bị bỏ.
- Gia hạn ticket cũ của cùng user/role khi cấp ticket mới; ticket cũ bị vô hiệu.
- Relay chỉ dành cho camera proctoring trong LAN, không phải VoIP và không có audio.
- Kênh media là TCP plaintext có ticket ngẫu nhiên; không thay thế TLS.

## 9. Timeout và giới hạn

| Thành phần | Giá trị |
|---|---|
| Client kết nối TCP control | timeout 5 giây |
| Media handshake | 10 giây |
| Media ticket | 60 giây, dùng một lần |
| JPEG tối đa | 524.288 byte |
| Ranked duration | 180 hoặc 300 giây |
| Ranked/Quiz question | 30 giây, không vượt deadline trận/phòng |
| Quiz Room duration | 1–15 phút |
| Quiz Room capacity | 6 (proctoring) / 20 (không proctoring) |
| Quiz Room tối thiểu để start | 2 người chơi đang kết nối |
| Lời mời chơi | 60 giây |
| Lịch sử trận | tối đa 100 bản ghi |
| Bảng xếp hạng | top 10 |
| Camera first frame (client) | 10 giây, retry tối đa 3 lần cách 5 giây |

## 10. Mã lỗi

### Auth

`BAD_REQUEST`, `ALREADY_AUTHENTICATED`, `USERNAME_TAKEN`, `INVALID_CREDENTIALS`,
`ALREADY_ONLINE`, `DATABASE_ERROR`.

### Query

`NOT_AUTHENTICATED`, `DATABASE_ERROR`.

### Social

`NOT_AUTHENTICATED`, `BAD_REQUEST`, `DATABASE_ERROR`, `INVALID_QUERY`, `REQUEST_EXISTS`,
`REQUEST_NOT_FOUND`, `FRIEND_NOT_FOUND`, `INVALID_USER`, `NOT_FRIENDS`, `TARGET_OFFLINE`,
`TARGET_BUSY`, `SENDER_BUSY`, `INVALID_DURATION`, `NOT_QUIZ_HOST`, `INVALID_INVITE_TYPE`,
`INVITE_EXPIRED`, `SENDER_OFFLINE`, `ROOM_STARTED`, `ROOM_FULL`, `QUESTIONS_UNAVAILABLE`.

### Ranked / matchmaking

`NOT_AUTHENTICATED`, `INVALID_DURATION`, `ALREADY_MATCHED`, `ALREADY_WAITING`, `SAME_USER`,
`QUESTIONS_UNAVAILABLE`, `DATABASE_ERROR`.

### Quiz Set

`NOT_AUTHENTICATED`, `BAD_REQUEST`, `NOT_FOUND`, `NOT_OWNER`, `INVALID_QUIZ`,
`QUIZ_NOT_PUBLISHED`, `DATABASE_ERROR`.

### Quiz Room

`NOT_AUTHENTICATED`, `BUSY`, `BAD_REQUEST`, `INVALID_DURATION`,
`PROCTORING_HOST_CANNOT_PLAY`, `INVALID_PIN`, `ROOM_NOT_FOUND`, `ROOM_STARTED`,
`ROOM_FULL`, `NOT_ENOUGH_PLAYERS`, `NOT_HOST`, `NOT_IN_ROOM`, `NOT_FOUND`,
`QUIZ_NOT_PUBLISHED`, `INVALID_QUIZ`, `PIN_UNAVAILABLE`, `DATABASE_ERROR`, `BAD_PROCTOR_STATUS`,
`BAD_PROCTOR_EVENT`, `PROCTORING_NOT_ENABLED`, `NOT_PROCTORED_PLAYER`, `ROOM_NOT_RUNNING`.

`QUIZ_ROOM_CANCEL` dùng lý do, không phải mã lỗi: `HOST_CANCELLED`, `SERVER_STOPPED`.

## 11. Bất biến và thay đổi protocol

- Server là nguồn quyết định đáp án đúng, điểm, attempt hợp lệ, deadline và trạng thái phòng.
- Client không gửi đáp án đúng và không tự tính điểm.
- Message câu hỏi không chứa đáp án đúng/giải thích.
- Client phải kiểm tra `sessionId`, `attempt`, `questionId` trước khi hiển thị kết quả.
- Thay đổi protocol phải cập nhật: `MessageType`, `Payloads`, test payload, tài liệu này
  và tài liệu luồng liên quan (`ranked.md`, `proctoring.md`, `architecture.md`).
- Không tái sử dụng `MessageType` cho nghĩa khác; thêm type mới nếu cần.
- Media protocol có version riêng; thay đổi layout frame phải tăng `MediaProtocol.VERSION`.
