# Câu hỏi Ranked qua JDBC

## Luồng và phạm vi

`MatchmakingManager → QuestionService → QuestionRepository → Database → PostgreSQL`.
GameServer chỉ khởi tạo các dependency. Việc đọc database diễn ra khi ghép đủ hai
người, trước khi gắn người chơi vào phòng hoặc tạo scheduler.

Mỗi trận lấy 3 câu ngẫu nhiên, không lặp ID; đây là số câu của bộ demo trước migration.
Thời gian 30 giây/câu, điểm đúng +1, phản hồi sau trả lời và kết quả 1v1 giữ nguyên.
Hiện không có lựa chọn level ở UI, nên matchmaking truyền level null. Service hỗ trợ
lọc level khi caller cung cấp giá trị. Không có chức năng Quiz Room trong migration này.

## Hợp đồng database

- `questions`: `id` BIGINT, `content`, `category`, `level`, `explanation`.
- `choices`: `id` BIGINT, `question_id` BIGINT, `content`, `is_correct` BOOLEAN NOT NULL,
  `position` INT.
- Nếu bảng `questions` có cột `is_active`, chỉ lấy dòng có `is_active = TRUE`.
  Repository kiểm tra metadata bằng truy vấn không trả dòng và không yêu cầu cột này
  ở schema cũ hơn. `question_type` chưa được dùng để phân loại; khả năng dùng cho
  Ranked được xác định bằng validation bốn lựa chọn, một đáp án đúng.
- `users`: lớp tài khoản hiện đọc `id`, `username`, `password_hash`, `wins`, `losses`,
  `questions_answered`, `correct_answers`; khi lưu kết quả còn cập nhật `total_matches`
  và `draws` để thỏa ràng buộc thống kê của schema mới.

Không thay schema hay ghi dữ liệu mẫu vào Supabase. File `sql/supabase_schema.sql`
là schema legacy, không phải migration cho phiên bản này.

Ranked hiện lưu đầy đủ trận, participant, snapshot câu hỏi, answer và statistics;
xem [ranked-persistence.md](ranked-persistence.md) cho hợp đồng schema đã xác minh
qua metadata Supabase và transaction kết quả.

## Truy vấn

Ví dụ khi có cột active và caller cung cấp level:

```sql
SELECT id, content, category, level, explanation
FROM questions
WHERE 1 = 1 AND is_active = TRUE AND level = ?
ORDER BY RANDOM()
LIMIT ?;

SELECT id, question_id, content, is_correct, position
FROM choices
WHERE question_id IN (?, ?, ?)
ORDER BY question_id, position;
```

Danh sách placeholder IN thay đổi theo số câu, toàn bộ giá trị dùng PreparedStatement.
Mỗi lần lấy một batch mở một connection, lấy câu hỏi rồi lấy choices cho cả batch
trên cùng connection. Connection, statement và result set đều đóng bằng
try-with-resources; mỗi statement có query timeout 10 giây.

Service lưu các ID đã xét, bổ sung `id NOT IN (...)` khi lấy bù, dừng khi đủ số lượng
hoặc hết ứng viên. Không trả câu lỗi hoặc danh sách thiếu để mở trận.

## Kiểm tra dữ liệu

Question phải có ID dương, nội dung không rỗng, đúng 4 choices. Mỗi choice có ID
dương không trùng, thuộc đúng question, nội dung không rỗng, position dương không
trùng. Phải có đúng 1 choice correct. Model sắp choices theo position và giữ bản
sao bất biến. Position không cần liên tiếp vì bản tin trả lời dùng choice ID.

Câu không hợp lệ được log với question ID và nguyên nhân. Database lỗi hoặc thiếu
câu hợp lệ tạo lỗi có ngữ cảnh và được matchmaking chuyển thành
`MATCH_ERROR/QUESTIONS_UNAVAILABLE`. Database rỗng vẫn cho server khởi động nhưng
không cho tạo trận. Cần ít nhất 3 câu active hợp lệ để demo.

Payload không gửi đáp án đúng: chỉ dùng `ChoiceData(choiceId, content, position)`.
Client/server phải chạy cùng phiên bản payload mới, xem [protocol.md](protocol.md).

## Kiểm thử và giới hạn

Unit test dùng repository giả và JDBC row set trong bộ nhớ; FXML test dùng cấu hình
database giả. Các test này không kết nối Supabase. Test GameRoom chạy đủ ba vòng,
kiểm tra điểm, kết quả, câu trả lời lặp/sai ID và lỗi tạo phòng.

Khi nạp câu hỏi, matchmaking vẫn dùng cơ chế synchronized hiện có; database chậm
có thể làm chậm hàng chờ. ORDER BY RANDOM và danh sách loại trừ phù hợp ngân hàng
nhỏ của đồ án; cần tối ưu riêng khi dữ liệu lớn. Query timeout không thay thế
connection timeout của JDBC. Ngoài snapshot trong RAM, Ranked hiện lưu nội dung
câu vào `ranked_match_questions` khi tạo trận; chưa snapshot nội dung choices.

Hai lần SELECT câu hỏi/choices dùng cùng connection nhưng không ép transaction
snapshot isolation; nên tránh sửa ngân hàng khi đang tạo trận. Service vẫn kiểm
tra dữ liệu đã nạp trước khi gửi cho client.
