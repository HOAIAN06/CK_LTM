# Giao thức TCP của NihongoQuest

Client và Game Server giữ một kết nối TCP trong suốt phiên. Dữ liệu dùng UTF-8;
mỗi dòng là một JSON frame có dạng:

```json
{"type":"QUESTION","payload":"{...}"}
```

`Message` mã hóa/giải mã frame. `Payloads` xử lý các payload JSON có cấu trúc.
Việc dùng ký tự xuống dòng làm ranh giới giúp bên nhận tách các bản tin trong
dòng byte TCP.

## Bản tin Client gửi

- `CONNECT`: báo client đã mở xong kết nối.
- `REGISTER`, `LOGIN`: payload gồm username và password.
- `FIND_MATCH`, `CANCEL_MATCH`: vào hoặc rời hàng chờ.
- `ANSWER`: chỉ số đáp án từ `0` đến `3`.
- `DISCONNECT`: đóng phiên có chủ đích.

## Bản tin Server gửi

- `REGISTER_OK/FAIL`, `LOGIN_OK/FAIL`: kết quả xác thực.
- `WAITING`, `MATCH_CANCELLED`, `MATCH_ERROR`: trạng thái ghép trận.
- `MATCH_FOUND`: mã phòng và tên đối thủ.
- `QUESTION`: số thứ tự, thời gian, nội dung và bốn lựa chọn; không có đáp án đúng.
- `ANSWER_RESULT`, `SCORE_UPDATE`: kết quả câu vừa trả lời và điểm hiện tại.
- `GAME_OVER`: kết quả trận.

Server quyết định deadline, đáp án đúng, điểm, người thắng và xử lý mất kết nối.
Không có UDP, WebSocket, HTTP, P2P hoặc heartbeat PING/PONG trong giao thức này.
