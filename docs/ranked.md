# Ranked 1v1

Tài liệu này mô tả chế độ **Đấu hạng 1v1** đang có trong code. Protocol chi tiết nằm ở
[`protocol.md`](protocol.md); tài liệu này tập trung vào luật trận, đồng hồ, tính điểm,
lỗi và persistence.

## 1. Ranked hiện tại là gì

Ranked là trận đối kháng 1v1 có **deadline chung** nhưng **tiến độ câu hỏi độc lập** cho
từng người. Có hai chế độ:

- `180` giây (3 phút)
- `300` giây (5 phút)

Người chơi trả lời càng nhiều câu đúng càng có điểm cao. Khi hết deadline, người nhiều điểm
hơn thắng; bằng điểm là hòa.

> **Quan trọng:** phiên bản hiện tại chưa có MMR/Elo, chưa có bậc/division và chưa ghép
> theo kỹ năng. Chữ "Ranked" dùng cho chế độ thi đấu có thời lượng cố định; bảng xếp hạng
> toàn hệ thống xếp theo `wins`, rồi `total_score`, rồi username.

## 2. Tham số

| Tham số | Giá trị | Nguồn |
|---|---|---|
| Số người | 2 | `GameRoom` |
| Thời lượng | `180` hoặc `300` giây | `GameRoom.THREE_MINUTES`, `FIVE_MINUTES` |
| Thời gian mỗi câu | 30 giây, hoặc ít hơn nếu trận sắp hết | `GameRoom.QUESTION_SECONDS` |
| Pool câu hỏi | 3–10 câu hợp lệ | `MIN_QUESTION_POOL`, `MAX_QUESTION_POOL` |
| Điểm mỗi câu đúng | 1 | `GameRoom.resolveAnswer` |
| Điểm sai/timeout | 0 | `GameRoom.resolveAnswer` |
| Kết quả | `WIN`, `LOSE`, `DRAW` | `GameRoom.resultText` |
| Lưu DB | 1 transaction sau khi trận kết thúc | `MatchRepository.saveResult` |
| Reconnect | Không hỗ trợ | `ClientHandler` / `GameRoom` |

## 3. Vào trận

### 3.1. Tìm trận ngẫu nhiên

1. Người chơi đã đăng nhập mở màn `Đấu hạng 1v1`, chọn 3 hoặc 5 phút.
2. Client gửi `FIND_MATCH` với `durationSeconds`.
3. Server kiểm tra:
   - đã đăng nhập chưa;
   - duration có phải `180`/`300`;
   - người chơi không đang ở trận Ranked, không đang trong Quiz Room, không đang chờ;
   - chưa có hàng chờ trùng.
4. Hợp lệ: server gửi `WAITING` và đưa người chơi vào **hàng chờ FIFO riêng** cho từng
   duration. Server thử ghép ngay; nếu chưa đủ hai người, người chơi chờ.
5. Hủy khi đang chờ: client gửi `CANCEL_MATCH`; server gửi `MATCH_CANCELLED`.

Hàng chờ 3 phút và 5 phút tách biệt; người chọn 3 phút không bị ghép với người chọn 5 phút.

### 3.2. Lời mời bạn bè

Host/người chơi có thể gửi `GAME_INVITE_SEND` loại `RANKED` kèm duration. Khi bạn chấp nhận:

- server kiểm tra hai người còn là bạn, người nhận online, cả hai không bận;
- server lấy pool câu hỏi và gọi `createDirectMatch` (không qua hàng chờ);
- cả hai nhận `MATCH_FOUND` ngay.

Khi chấp nhận, nếu một bên đang bận/không online, lời mời đã hết hạn hoặc không còn là bạn,
lỗi đi qua `SOCIAL_ERROR`. Khi hết hạn trước đó, server gửi `GAME_INVITE_STATUS` với
`EXPIRED` cho cả hai.

### 3.3. Điều kiện tạo trận

`MatchmakingManager.tryCreateMatch` bỏ qua client đã mất kết nối, chưa đăng nhập hoặc đang
ở phòng khác. Hai người cùng một `playerId` bị từ chối bằng `MATCH_ERROR` (`SAME_USER`).
Nếu ngân hàng câu hỏi không đủ tối thiểu 3 câu hợp lệ, cả hai nhận
`MATCH_ERROR` (`QUESTIONS_UNAVAILABLE`).

## 4. Vòng đời trận

```text
FIND_MATCH
   │
   ▼
WAITING ──(đủ 2 người)──► MATCH_FOUND
   │                         │
   │                    QUESTION (câu 1)
   │                         │
   │                    ANSWER / timeout
   │                         │
   │                    ANSWER_RESULT + SCORE_UPDATE
   │                         │
   │                    QUESTION (câu tiếp)
   │                         │
   └──────────────► deadline / disconnect
                             │
                             ▼
                         GAME_OVER
                             │
                             ▼
                     màn hình kết quả
```

- `MATCH_FOUND` được gửi cho từng người, kèm `opponent` và `durationSeconds`.
- Server gửi câu đầu tiên ngay sau `MATCH_FOUND`.
- Không có màn hình lobby/ready; cả hai vào trận ngay.
- Mỗi người tự tiến qua câu hỏi của mình; không phải chờ đối thủ trả lời.
- Trận kết thúc khi hết deadline chung hoặc một người mất kết nối.

## 5. Đồng hồ và tính điểm

### 5.1. Deadline chung

Khi trận bắt đầu, server tính một mốc duy nhất:

```text
matchDeadline = now + durationSeconds
```

Mỗi câu có deadline riêng:

```text
questionDeadline = min(now + 30 giây, matchDeadline)
```

Client chỉ hiển thị countdown; server mới quyết định timeout. Câu trả lời đến sau
`questionDeadline` bị xử lý như timeout, không được cộng điểm. Nếu câu trả lời đến khi
`matchDeadline` đã qua, server kết thúc trận ngay. Nếu trận hết giờ trong lúc đang có câu hỏi,
server kết thúc trận thay vì gửi câu mới.

### 5.2. Cách tính điểm

- Trả lời đúng: `+1` điểm, `correct=true`, `scoreAwarded=1`.
- Trả lời sai: `0` điểm, `correct=false`, `scoreAwarded=0`.
- Timeout: `0` điểm, `correct=false`, `chosenChoiceId=null`.
- Ranked **không** cộng điểm theo tốc độ; chỉ có đúng/sai.
- `SCORE_UPDATE` được gửi sau mỗi lần resolve để hai bên thấy tỉ số mới.

### 5.3. Kết quả

- Điểm cao hơn: `WIN`; thấp hơn: `LOSE`; bằng điểm: `DRAW`.
- Khi hòa, `winner_id` trong database là `NULL`.
- Kết quả được tính trên điểm, không dựa trên số câu đã trả lời.

## 6. Câu hỏi

Server lấy câu hỏi từ các **Quiz Set đã publish**:

- tối đa 10 câu (`ORDER BY RANDOM()`), tối thiểu 3 câu hợp lệ;
- mỗi câu phải có đúng 4 lựa chọn, một đáp án đúng, `position` 1–4 duy nhất;
- câu không hợp lệ bị loại và server thử lấy câu khác;
- nếu không đủ 3 câu, trận không được tạo.

Hai người bắt đầu với pool giống nhau nhưng vị trí câu là độc lập. Khi trả lời, người đó
tiến sang câu kế tiếp theo kiểu vòng tròn `(position + 1) % pool.size()`. Vì vậy:

- hai người có thể đang ở các câu khác nhau;
- câu trong pool có thể lặp lại sau khi đi hết vòng;
- `attempt` tăng liên tục, kể cả khi nội dung câu lặp lại;
- payload câu hỏi không chứa đáp án đúng.

## 7. Ngắt kết nối và lỗi

### 7.1. Mất kết nối

Ranked không có reconnect. Khi socket đóng:

1. `ClientHandler.close()` gọi router để dọn hàng chờ/social/online.
2. `GameRoom.playerDisconnected()` kết thúc trận ngay.
3. Kết quả được lưu với `end_reason=DISCONNECT` và người mất kết nối là bên xử thua.
4. Đối thủ còn kết nối nhận `GAME_OVER` với `result=WIN` nếu lưu DB thành công.

Người đã mất kết nối không nhận thêm message. Nếu người chơi cố tình đóng client giữa trận,
đối thủ vẫn được xử thắng (trừ khi DB lỗi).

### 7.2. Lỗi database

`MatchRepository.saveResult` chạy trong một transaction JDBC ngắn (query timeout 10 giây):

- insert vào `matches`;
- cộng `wins`/`losses`/`draws`, `total_score`, `questions_answered`, `correct_answers`
  cho cả hai người.

Nếu transaction lỗi:

- trận vẫn kết thúc trong RAM;
- cả hai nhận `MATCH_ERROR` với `DATABASE_ERROR`;
- **không** gửi `GAME_OVER`;
- không có thống kê nào được ghi.

### 7.3. Lỗi matchmaking

`MATCH_ERROR` là chuỗi mã lỗi. Client hiển thị thông báo tương ứng:

| Mã | Khi nào |
|---|---|
| `NOT_AUTHENTICATED` | Chưa đăng nhập |
| `INVALID_DURATION` | Không phải 180/300 |
| `ALREADY_MATCHED` | Đang ở trận/phòng khác |
| `ALREADY_WAITING` | Đã ở trong hàng chờ |
| `SAME_USER` | Hai bên cùng một tài khoản |
| `QUESTIONS_UNAVAILABLE` | Không đủ 3 câu hợp lệ |
| `DATABASE_ERROR` | Lưu kết quả thất bại |

## 8. Persistence và thống kê

### 8.1. Bảng `matches`

Mỗi trận lưu:

| Cột | Ý nghĩa |
|---|---|
| `player1_id`, `player2_id` | Hai người chơi |
| `score1`, `score2` | Số câu đúng của từng người |
| `winner_id` | Người thắng; `NULL` nếu hòa |
| `duration_seconds` | `180` hoặc `300` |
| `end_reason` | `NORMAL` hoặc `DISCONNECT` |
| `played_at` | Thời điểm lưu |

Ràng buộc schema: hai người khác nhau; duration chỉ 180/300; winner phải là một trong hai.

### 8.2. Bảng `users`

Sau mỗi trận, server cộng dồn:

- `wins`, `losses`, `draws`;
- `total_score` (tổng số câu đúng Ranked);
- `questions_answered`;
- `correct_answers`.

Đây là dữ liệu cho hồ sơ, lịch sử và bảng xếp hạng. Bảng xếp hạng top 10 sắp xếp theo
`wins DESC, total_score DESC, username ASC`.

### 8.3. Lịch sử

`MATCH_HISTORY_GET` trả tối đa 100 trận gần nhất của người dùng. Mỗi bản ghi có điểm,
đối thủ, kết quả theo góc nhìn người xem, duration, `end_reason` và `playedAt`.

## 9. Protocol tóm tắt

```text
C→S: {"type":"FIND_MATCH","payload":{"durationSeconds":180}}
S→C: {"type":"WAITING","payload":""}
S→C: {"type":"MATCH_FOUND","payload":{"roomId":"...","opponent":"binh","durationSeconds":180}}
S→C: {"type":"QUESTION","payload":{"sessionId":"...","attempt":1,...}}
C→S: {"type":"ANSWER","payload":{"sessionId":"...","attempt":1,"questionId":42,"choiceId":101}}
S→C: {"type":"ANSWER_RESULT","payload":{"correct":true,...}}
S→C: {"type":"SCORE_UPDATE","payload":{"myScore":1,"opponentScore":0}}
S→C: {"type":"GAME_OVER","payload":{"result":"WIN","myScore":3,"opponentScore":1}}
```

Chi tiết field và mã lỗi: [`protocol.md`](protocol.md#5-ranked-1v1).

## 10. UI hiện tại

- Màn tìm trận: chọn 3/5 phút, nút tìm, spinner, trạng thái chờ và nút hủy.
- Màn battle: tên hai người, tỉ số, câu hỏi, 4 đáp án, countdown câu và đồng hồ trận.
- Màn kết quả: `CHIẾN THẮNG` / `THẤT BẠI` / `HÒA`, điểm hai bên, tên đối thủ.
- Không có âm thanh; animation chỉ phản hồi trạng thái và không chặn gửi đáp án.

## 11. Kiểm thử

Test tự động hiện có:

- `GameRoomTest`: tiến độ độc lập, câu lặp lại, timeout, disconnect, hòa, ghép cùng duration,
  duration sai và pool câu hỏi quá nhỏ.
- `MatchRepositoryTest`: transaction insert match và cập nhật thống kê.
- `MatchRepositoryHistoryTest`: đọc lịch sử theo góc nhìn người chơi.
- `PayloadsTest`: round-trip payload Ranked và kiểm tra câu hỏi không lộ đáp án.

Kịch bản thủ công tối thiểu:

1. Hai client đăng nhập hai tài khoản khác nhau.
2. Cùng chọn 3 phút, bấm tìm; kiểm tra `WAITING` và `MATCH_FOUND`.
3. Trả lời đúng/sai, quan sát `ANSWER_RESULT`, `SCORE_UPDATE`.
4. Không trả lời một câu, kiểm tra timeout và câu kế tiếp.
5. Đóng một client giữa trận; client còn lại phải nhận `GAME_OVER WIN`.
6. Kiểm tra hồ sơ, lịch sử, bảng xếp hạng sau trận.
7. Lặp với chế độ 5 phút.

## 12. Giới hạn hiện tại

- Chưa có MMR/Elo, rank/division, chuỗi thắng hoặc phần thưởng.
- Ghép trận FIFO theo duration, không theo kỹ năng hay độ trễ.
- Không reconnect Ranked; mất kết nối là xử thua.
- Không có trận hoãn/pause, không có spectator, không có bot.
- Không có xử lý gian lận riêng cho Ranked; proctoring hiện gắn với Quiz Room.
- Pool câu hỏi lấy từ Quiz Set đã publish; nếu DB lỗi hoặc thiếu câu, trận không tạo được.
- Kết quả chỉ có `NORMAL` hoặc `DISCONNECT`; không có `SURRENDER`/`TIMEOUT` riêng.
- Bảng xếp hạng dựa trên thống kê tổng, không phải rating theo mùa.

## 13. Liên quan

- [`protocol.md`](protocol.md): JSON message, lỗi, timeout.
- [`architecture.md`](architecture.md): module và luồng server.
- [`database.md`](database.md): schema và quy ước persistence.
- [`testing.md`](testing.md): baseline test và kịch bản LAN.
