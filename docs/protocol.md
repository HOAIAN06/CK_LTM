# Giao thức TCP NihongoQuest

Client giữ một TCP connection tới server. Mỗi frame là một JSON object UTF-8 trên
một dòng kết thúc bằng `\n`:

```json
{"type":"LOGIN","payload":{"username":"demo_player1","password":"1234"}}
```

`payload` là JSON object thật, không còn là chuỗi JSON escaped. Với trạng thái lỗi
ngắn, payload có thể là JSON string, ví dụ `"DATABASE_ERROR"`; message không có dữ
liệu dùng `null`.

## Message hiện có

- Auth: `CONNECT`, `REGISTER`, `REGISTER_OK/FAIL`, `LOGIN`, `LOGIN_OK/FAIL`.
- Ranked: `FIND_MATCH`, `CANCEL_MATCH`, `WAITING`, `MATCH_CANCELLED`,
  `MATCH_ERROR`, `MATCH_FOUND`, `QUESTION`, `ANSWER`, `ANSWER_RESULT`,
  `SCORE_UPDATE`, `GAME_OVER`.
- Bộ đề: `QUIZ_SET_LIST/LIST_RESULT`, `QUIZ_SET_GET/DETAIL`,
  `QUIZ_SET_SAVE/SAVED`, `QUIZ_SET_PUBLISH/PUBLISHED`,
  `QUIZ_SET_DELETE/DELETED` và `QUIZ_SET_ERROR`.
- Phòng Quiz: `QUIZ_ROOM_CREATE/CREATED`, `QUIZ_ROOM_JOIN`, `QUIZ_LOBBY_UPDATE`,
  `QUIZ_ROOM_START`, `QUIZ_QUESTION`, `QUIZ_ANSWER`, `QUIZ_ANSWER_RESULT`,
  `QUIZ_LEADERBOARD`, `QUIZ_ROOM_LEAVE`, `QUIZ_ROOM_CANCEL`, `QUIZ_REJOINED`,
  `QUIZ_ROOM_FINISHED` và `QUIZ_ERROR`.
- Kết nối: `DISCONNECT`.

`QUESTION` chỉ chứa ID, nội dung, lựa chọn và thời gian; không chứa `correct`,
`is_correct`, explanation hoặc đáp án đúng. `ANSWER_RESULT` chỉ công bố đáp án sau
khi server đã nhận/chấm câu trả lời.

## Payload Ranked theo thời gian

- `FIND_MATCH`: `{ "durationSeconds": 180 }` hoặc `300`; hai người chỉ được ghép khi
  chọn cùng thời lượng.
- `MATCH_FOUND`: room ID, tên đối thủ và thời lượng trận.
- `QUESTION`: `sessionId`, `attempt`, `questionId`, nội dung, bốn lựa chọn,
  `questionDurationSeconds` và `matchRemainingSeconds`. Không có đáp án đúng.
- `ANSWER`: gửi lại đúng `sessionId`, `attempt`, `questionId`, `choiceId`. Server bỏ qua
  attempt cũ, trùng hoặc đã quá 30 giây.
- `ANSWER_RESULT`: sau khi chấm mới chứa `correctChoiceId`, lựa chọn đã gửi và điểm nhận được.

Mỗi người nhận câu tiếp theo ngay sau khi trả lời hoặc timeout, không phải đợi đối thủ.
Hết danh sách tối đa 10 câu thì server lặp lại từ đầu cho tới deadline chung.

## Phòng Quiz

Host gửi ID bộ đề published, thời lượng 1–15 phút và lựa chọn có tham gia chơi hay không.
Server trả PIN sáu số duy nhất trong các phòng đang hoạt động. Lobby cần 2–20 người chơi;
host chỉ được tính khi chọn tham gia.

`QUIZ_QUESTION` không có đáp án đúng. `QUIZ_ANSWER` cũng mang session, attempt, question
và choice ID. Điểm đúng do server tính từ 500–1000 theo thời gian còn lại; sai hoặc timeout
bằng 0. Sau mỗi câu server gửi kết quả và leaderboard trực tiếp.

`QUIZ_REJOINED` được gửi sau khi cùng tài khoản đăng nhập lại, tiếp theo là leaderboard và
câu hiện tại. Kết quả phòng chỉ ở RAM, không ghi database.

Dashboard nhận bản sao traffic đã che trường password của `LOGIN` và `REGISTER`.
Không dùng HTTP, WebSocket, UDP, TLS hay JWT trong bản demo LAN.

Các message history, leaderboard, friends và invite sẽ được bổ sung cùng chức
năng tương ứng để client/server luôn thay đổi đồng bộ.
