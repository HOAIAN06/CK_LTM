# TCP Protocol

Mỗi message gameplay là JSON object UTF-8 kết thúc bằng `\n`. `MessageType` và record trong `Payloads.java` là nguồn sự thật.

## Quy tắc

- Client không tự tính điểm hoặc đáp án đúng.
- Message câu hỏi không chứa đáp án đúng.
- Server phải xử lý message lỗi, trùng, cũ và timeout.
- Protocol thay đổi phải cập nhật test payload và tài liệu này.

## Nhóm message

- Auth: connect, register, login.
- Quiz Room: create, join, lobby, start, question, answer, leaderboard, leave, cancel, rejoin, finish.
- Proctoring: status, event, media session.
- Ranked, friends, profile, leaderboard và history.

Chi tiết field phải đọc trực tiếp từ `src/main/java/com/nihongoquest/common/protocol/Payloads.java`.
