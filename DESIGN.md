# DESIGN — NihongoQuest

## Người dùng và luồng chính

Player đăng nhập → chọn Phòng Quiz → nhập PIN → lobby → bắt đầu quiz → trả lời → xem leaderboard/kết quả.
Host tạo phòng → chọn bộ đề/thời lượng/giám sát → chờ player → bắt đầu → theo dõi trạng thái camera và quiz.

## Nguyên tắc sản phẩm

- Quiz phải tiếp tục được dù camera denied/not found/failed/lost.
- Không để một tiến trình vô hạn che mất lỗi thật.
- Trạng thái phải có cả mã máy đọc được và thông báo người dùng hiểu được.
- AI proctoring chỉ là tín hiệu hỗ trợ host, cần bằng chứng và quyết định của host.
- Mọi tác vụ nặng chạy ngoài JavaFX Application Thread.

## Hiệu năng mục tiêu

- Kiểm thử thực tế: 2–6 client, ưu tiên kịch bản 2 client.
- Camera ưu tiên cảm giác mượt và ổn định hơn việc đẩy FPS không cần thiết.
- Chốt FPS/resolution sau khi đo capture, encode, network, decode và AI riêng biệt; không dùng một con số FPS chưa được đo làm tiêu chuẩn.
- Frame mới có thể bỏ frame cũ khi pipeline bận; không để queue tăng vô hạn.

## UI

Phong cách Duolingo-inspired: nền sáng, card bo góc, màu xanh chủ đạo, typography rõ, trạng thái đúng/sai dễ nhận biết, animation ngắn và có mục đích. Xem `docs/ui-design.md`.
