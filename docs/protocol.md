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
- Kết nối: `DISCONNECT`.

`QUESTION` chỉ chứa ID, nội dung, lựa chọn và thời gian; không chứa `correct`,
`is_correct`, explanation hoặc đáp án đúng. `ANSWER_RESULT` chỉ công bố đáp án sau
khi server đã nhận/chấm câu trả lời.

Dashboard nhận bản sao traffic đã che trường password của `LOGIN` và `REGISTER`.
Không dùng HTTP, WebSocket, UDP, TLS hay JWT trong bản demo LAN.

Các message Quiz, history, leaderboard, friends và invite sẽ được bổ sung cùng chức
năng tương ứng để client/server luôn thay đổi đồng bộ.
