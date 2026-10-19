# Ranked 1v1 persistence

## Schema đã xác minh

`sql/supabase_schema.sql` là schema legacy (`players`, `matches`, câu hỏi JSONB),
không phải schema JDBC hiện hành. Ngày 2026-10-04 đã kiểm tra read-only metadata
`information_schema.columns` và `pg_constraint` của Supabase qua cấu hình JDBC
hiện có, không đọc password hash và không ghi dữ liệu database.

Các cột thực tế dùng trong persistence:

| Bảng | Cột |
| --- | --- |
| `ranked_matches` | `id` BIGINT, `status`, `started_at`, `finished_at`, `winner_id` BIGINT nullable |
| `ranked_match_players` | `match_id`, `user_id` BIGINT, `score`, `correct_answers`, `rating_before`, `rating_after` INT |
| `ranked_match_questions` | `match_id`, `question_id` BIGINT, `question_order`, `time_limit_seconds` INT, `question_content_snapshot` TEXT NOT NULL |
| `ranked_answers` | `id`, `match_id`, `user_id`, `question_id`, `choice_id` BIGINT (choice nullable), `is_correct` BOOLEAN, `response_time_ms` BIGINT, `score_earned` INT, `answered_at` |
| `users` | `id`, `username`, `ranked_rating`, `total_score`, `total_matches`, `wins`, `losses`, `draws`, `questions_answered`, `correct_answers`, `updated_at` |

Các timestamp là `timestamp without time zone`. `started_at`, `answered_at` có
default `CURRENT_TIMESTAMP`; điểm và số câu đúng của participant mặc định 0.
Status hợp lệ: `PLAYING`, `FINISHED`, `CANCELLED`. Thứ tự câu bắt đầu từ 1,
time limit nằm trong 5–120 giây; gameplay hiện dùng 30 giây.

Database có UNIQUE `(match_id, user_id, question_id)` ở answers, PRIMARY KEY
`(match_id, user_id)` ở participants, PRIMARY KEY `(match_id, question_id)` và
UNIQUE `(match_id, question_order)` ở danh sách câu. Foreign key tổng hợp kiểm tra
answer thuộc participant, câu thuộc trận và choice thuộc đúng câu.

## Luồng và transaction

1. `MatchmakingManager` lấy đủ 3 câu hợp lệ từ `QuestionService`.
2. `RankedMatchService` mở một connection và transaction: đọc rating hai user,
   INSERT trận `PLAYING`, INSERT hai participant, INSERT toàn bộ câu kèm snapshot
   và thứ tự. Chỉ sau commit mới tạo `GameRoom`, gắn session và gửi `MATCH_FOUND`.
3. Room giữ `matchId`, user ID cố định, rating đầu trận, câu hỏi, điểm, deadline và
   answered flags trong RAM. Không đọc DB ở mỗi tick. Session đã đăng nhập không
   được đăng nhập lại dưới tài khoản khác.
4. ANSWER được kiểm tra membership, duplicate, question/choice và deadline. INSERT
   `ranked_answers` bằng connection riêng với auto-commit, rồi mới cộng điểm và gửi
   phản hồi. Response time đo bằng đồng hồ monotonic của server.
5. Khi kết thúc, `RankedResultService` dùng một connection, tắt auto-commit, khóa
   dòng trận bằng `SELECT ... FOR UPDATE`, cập nhật hai participant, trận và hai
   user, rồi commit. `GAME_OVER` chỉ gửi sau khi service thành công.

`JdbcTransaction` rollback khi SQLException/RuntimeException; nếu rollback cũng lỗi,
giữ lỗi gốc và gắn lỗi rollback qua suppressed exception. Connection được đóng bằng
try-with-resources; không bật lại auto-commit trên connection sắp đóng để tránh vô
tình commit khi rollback thất bại. Repository nhận `Connection` không mở connection
khác hoặc tự commit/close connection đó.

SQL chỉ nằm trong repositories. Không thêm framework, thay đổi payload hoặc triển
khai Quiz Room. `roomId` của protocol vẫn là UUID; `matchId` BIGINT dùng nội bộ cho DB.

## Duplicate, kết quả và statistics

Mọi thay đổi trạng thái room được bảo vệ bởi cùng monitor `synchronized`.
`answered[index]` được kiểm tra trước SQL; `finished` được bật trước khi gọi kết thúc
trận. ANSWER lặp không đến repository, các thread kết thúc sau không ghi/gửi lần hai.
Timer cũ kiểm tra chỉ số round và `advancing` để không xử lý lại câu sau khi chuyển.

Khóa dòng trận trong result service ngăn hai transaction cùng tính statistics.
Trận đã `FINISHED` trả về mà không cập nhật lại. User updates đi theo thứ tự ID
nhằm giảm nguy cơ deadlock giữa các trận.

Điểm cao hơn thắng, bằng điểm hòa; disconnect vẫn xử thua người ngắt kết nối như
hành vi cũ và gửi `MATCH_ERROR/OPPONENT_DISCONNECTED` sau khi lưu kết quả.

Mỗi user được cộng `total_score += score`, `total_matches += 1`, đúng một trong
`wins/losses/draws`, `questions_answered += answeredCount`,
`correct_answers += correctCount`. Giữ quy ước cũ: timeout cũng tăng answeredCount,
được lưu với `choice_id = NULL`, sai, 0 điểm và response time 30000 ms. Disconnect
không tự tính các câu chưa được xử lý. Các thống kê này chỉ dành cho Ranked.

Chưa có hệ thống Elo: `rating_after = rating_before`, delta trên `users.ranked_rating`
bằng 0. TODO chỉ bổ sung thuật toán khi có chính sách rating cụ thể.

## Lỗi và giới hạn

- Tạo trận lỗi: rollback toàn bộ, không tạo room/`MATCH_FOUND`, gửi `MATCH_ERROR/DATABASE_ERROR`.
- Answer lỗi: không cộng điểm/phản hồi thành công; dừng room, thử đánh dấu `CANCELLED`,
  giữ lịch sử đã lưu và không cộng statistics.
- Kết quả lỗi: rollback toàn bộ participant/match/user updates, gửi lỗi và thử cancel
  như trên. Cancellation là thao tác riêng, có điều kiện `status = 'PLAYING'`, không
  thể ghi đè một kết quả `FINISHED` đã commit nhưng mất ACK.
- Nếu DB mất kết nối cả khi cancel, log `matchId` cần đối soát; chưa có job phục hồi
  trận `PLAYING` sau DB outage hoặc process crash. Không thể đảm bảo cập nhật trạng
  thái hủy khi database không truy cập được. Transaction kết quả vẫn không cập nhật
  statistics một phần. Mất ACK của commit có thể khiến client nhận lỗi dù DB đã lưu
  kết quả đầy đủ; gọi lại result service là idempotent.
- Snapshot chỉ lưu nội dung câu, chưa snapshot choices. Câu chưa chơi khi disconnect
  vẫn có trong `ranked_match_questions` vì đã lưu toàn bộ lúc tạo trận.
- JDBC chạy trong monitor hiện có của matchmaking/room; DB chậm có thể chặn xử lý
  gameplay. Các statement Ranked có query timeout 10 giây; chưa có hàng đợi ghi bất đồng bộ.

## Kiểm thử và demo

Test mặc định không kết nối Internet/Supabase: dùng JDBC proxy để kiểm tra binding
BIGINT/NULL, một connection cho mỗi transaction, rollback tại từng write/commit,
đóng resources, win/loss/draw, rating, duplicate finish, và game room giả lập.
GameRoom test chạy ba vòng thực, kiểm tra duplicate answer đồng thời, timeout,
disconnect, lỗi persistence và không lộ đáp án trước khi trả lời.

Chạy bằng JDK 21: `mvn clean test`, sau đó `mvn clean package` (hoặc Maven wrapper).
Chưa chạy trận bằng hai JavaFX client trên Supabase thật trong lần kiểm tra này;
việc kiểm tra live DB chỉ đọc metadata.

Demo: hai tài khoản khác nhau login, cùng FIND_MATCH, trả lời ba câu, nhận GAME_OVER.
Chạy [các query kiểm tra](../sql/verify_ranked.sql). Một trận hoàn tất bình thường có
2 participants, 3 match questions, 6 answers (kể cả timeout), status FINISHED,
winner_id phù hợp hoặc NULL khi hòa, và statistics tăng đúng một trận mỗi user.
