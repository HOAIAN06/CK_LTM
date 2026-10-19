# Database Supabase

`sql/supabase_schema.sql` là schema duy nhất của dự án. Script có tính phá hủy: nó
xóa schema NihongoQuest cũ rồi tạo lại `users`, `quiz_sets`, `questions`, `choices`,
`matches` và `friendships`.

## Thiết lập

1. Sao lưu dữ liệu cũ nếu cần.
2. Chạy `sql/supabase_schema.sql` trong Supabase SQL Editor.
3. Chạy `sql/seed_demo.sql` nếu cần bộ dữ liệu demo.
4. Chạy `sql/verify_schema.sql` để kiểm tra read-only.
5. Sao chép `src/main/resources/db.properties.example` thành `db.properties` và điền
   host/user/password. File thật đã nằm trong `.gitignore`.

Ba tài khoản seed là `demo_host`, `demo_player1`, `demo_player2`, cùng mật khẩu
`1234`. Password trong seed là BCrypt hash; server vẫn xác minh bằng BCrypt.

## Quy tắc câu hỏi

Mỗi question thuộc một quiz set và có đúng bốn choices, một choice đúng. Server chỉ
lấy câu từ quiz set có `is_published = true`. Validation đầy đủ vẫn được thực hiện
trước khi câu được phát tới client.

Client không chứa cấu hình và không kết nối trực tiếp Supabase.

## Truy vấn thống kê

Top 10 đọc trực tiếp từ `users`, sắp theo `wins DESC`, `total_score DESC`, `username ASC`.
Lịch sử đọc từ `matches`, join hai username, lọc một trong hai cột người chơi và giới hạn
100 dòng mới nhất. Hồ sơ và các màn hình truy vấn chỉ tính dữ liệu Ranked; điểm Quiz Room
không được ghi vào database.
