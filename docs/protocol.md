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
- `ANSWER`: JSON gồm `questionId` và `choiceId`, đều là ID kiểu long dương từ database.
- `DISCONNECT`: đóng phiên có chủ đích.

## Bản tin Server gửi

- `REGISTER_OK/FAIL`, `LOGIN_OK/FAIL`: kết quả xác thực.
- `WAITING`, `MATCH_CANCELLED`, `MATCH_ERROR`: trạng thái ghép trận.
- `MATCH_FOUND`: mã phòng và tên đối thủ.
- `QUESTION`: số thứ tự, thời gian, ID, nội dung và bốn lựa chọn; không có đáp án đúng.
- `ANSWER_RESULT`, `SCORE_UPDATE`: kết quả câu vừa trả lời và điểm hiện tại.
- `GAME_OVER`: kết quả trận.

Ranked chỉ gửi `MATCH_FOUND` sau khi transaction tạo trận đã commit, và chỉ gửi
`GAME_OVER` sau khi transaction lưu kết quả/statistics thành công. Lỗi persistence
trả `MATCH_ERROR` với payload `DATABASE_ERROR`; hai session cùng user không được
ghép với nhau (`SAME_USER`). Timeout giữ payload cũ và được lưu server-side với
choice NULL. Không thay đổi định dạng payload, không yêu cầu client biết database.
Session đã login nhận `LOGIN_FAIL/ALREADY_AUTHENTICATED` nếu thử login lại.

Server quyết định deadline, đáp án đúng, điểm, người thắng và xử lý mất kết nối.
Không có UDP, WebSocket, HTTP, P2P hoặc heartbeat PING/PONG trong giao thức này.

## Câu hỏi và đáp án từ database

Payload `QUESTION` ví dụ (vẫn nằm trong trường chuỗi `payload` của JSON frame):

```json
{
  "round": 0,
  "totalQuestions": 3,
  "durationSeconds": 30,
  "questionId": 10,
  "content": "みず nghĩa là gì?",
  "choices": [
    {"choiceId": 101, "content": "Lửa", "position": 1},
    {"choiceId": 102, "content": "Nước", "position": 2},
    {"choiceId": 103, "content": "Gió", "position": 3},
    {"choiceId": 104, "content": "Đất", "position": 4}
  ]
}
```

Client gửi payload `ANSWER`: `{"questionId":10,"choiceId":102}`.
Server chỉ nhận lựa chọn thuộc câu hiện tại, từ người thuộc phòng, chưa trả lời
và còn thời gian. Câu trả lời sai ID, lặp hoặc từ câu cũ không được tính điểm.

`correct`, `is_correct`, đáp án đúng và giải thích không nằm trong `QUESTION`.
Server tạo payload từ `ChoiceData`, không serialize model `Question`/`Choice`.
`ANSWER_RESULT` giữ nguyên `correct`, `chosenIndex`, `correctIndex` để tô màu
bốn nút theo thứ tự đã gửi; chỉ gửi cho người vừa trả lời hoặc đã hết thời gian.

Nếu database lỗi hoặc không đủ câu hợp lệ, cả hai người nhận
`MATCH_ERROR` với payload `QUESTIONS_UNAVAILABLE`, được gỡ khỏi hàng chờ và có thể
hủy về trang chủ rồi tìm lại. Không tạo phòng một phần.

Client/server cần cập nhật cùng phiên bản: payload `QUESTION` và `ANSWER` mới
không tương thích client cũ dùng chỉ số đáp án. TCP frame, MessageType, xác thực,
ghép trận, điểm và kết quả giữ định dạng hiện có.
