# Lộ trình mở rộng NihongoQuest thành nền tảng quiz

Tài liệu này là đề xuất phát triển; các chức năng mới bên dưới chưa được triển khai.
Mục tiêu là giữ thế mạnh học tiếng Nhật và bổ sung luồng: tạo bộ đề → mở phòng →
người chơi nhập mã → trả lời → xem bảng xếp hạng và báo cáo.

## Nền tảng hiện có

- Client JavaFX, giao tiếp TCP/JSON với server.
- Đăng ký/đăng nhập, hồ sơ và thống kê thắng/thua, số câu đúng.
- Ghép trận tự động 1v1, lấy câu hỏi/lựa chọn từ PostgreSQL qua JDBC.
- Server điều khiển thời gian, chấm điểm và xử lý đối thủ mất kết nối.
- Dashboard theo dõi kết nối, phòng đấu và lưu lượng.

Chưa có bộ đề do người dùng tạo, chủ phòng, mã PIN, phòng nhiều người hay lịch sử
chi tiết từng câu. `GameRoom` đang dùng mảng cố định hai người; database hiện lưu
thống kê cộng dồn trong `users`. Mã Java đã đọc `questions`/`choices`, chưa ghi
lịch sử chi tiết từng trận. File SQL trong repo là schema legacy.

## Chức năng theo mức ưu tiên

| Mức | Chức năng | Phạm vi đề xuất | Nhóm mã dự kiến |
| --- | --- | --- | --- |
| P1 | Quản lý bộ đề | Tạo/sửa/xóa bộ đề, tiêu đề, mô tả, chủ đề, JLPT, nháp/xuất bản, quyền sở hữu | `quiz`, `question` |
| P1 | Soạn câu hỏi | Ban đầu một đáp án đúng trong bốn lựa chọn; giải thích, thời gian và điểm từng câu | `question` |
| P1 | Tạo và vào phòng | Chủ phòng chọn bộ đề; server tạo PIN duy nhất cho phòng đang hoạt động; danh sách người tham gia | `session` |
| P1 | Điều khiển phòng | Bắt đầu, khóa vào phòng, chuyển câu, kết thúc; chỉ chủ phòng có quyền điều khiển | `session` |
| P1 | Thi đấu nhiều người | Server đồng bộ câu hỏi, deadline, nhận đáp án một lần và chấm điểm | `session` |
| P1 | Kết quả và xếp hạng | Điểm sau mỗi câu, thứ hạng, top 3, kết quả cuối buổi | `session`, `report` |
| P2 | Lịch sử và báo cáo | Lưu đáp án, thời gian trả lời; thống kê theo người và theo câu; xuất CSV | `report` |
| P2 | Tự luyện | Chọn bộ đề, làm theo tốc độ cá nhân, xem giải thích, ôn câu sai | `practice` |
| P2 | Giao bài có hạn nộp | Chia sẻ mã bài, thời hạn, số lần làm, tiến độ và kết quả | `assignment` |
| P2 | Thư viện bộ đề | Tìm theo chủ đề/JLPT, lọc của tôi/công khai, sao chép bộ đề | `quiz` |
| P3 | Câu hỏi tiếng Nhật nâng cao | Ảnh, audio nghe hiểu, điền từ, ghép kana–kanji–nghĩa | `question` |
| P3 | Tương tác bổ sung | Chơi theo đội, huy hiệu, chuỗi ngày học, bảng xếp hạng dài hạn | `team`, `profile`, `leaderboard` |

Đây là thứ tự triển khai đề xuất cho đồ án. Báo cáo chi tiết và giao bài chỉ nên
xây khi bộ đề, phòng chơi và việc lưu kết quả đã ổn định.

## Bản đầu tiên nên demo được

Phạm vi mục tiêu: một chủ phòng và khoảng 2–20 người chơi trong LAN, câu hỏi bốn
lựa chọn, dùng tài khoản hiện có. Số người này là mục tiêu kiểm thử, chưa phải
khả năng tải đã được xác nhận.

1. Chủ bộ đề tạo ít nhất một bộ đề hợp lệ và xuất bản.
2. Chủ phòng chọn bộ đề, tạo PIN; nhiều client nhập PIN và xuất hiện trong sảnh.
3. Chủ phòng bắt đầu; tất cả client nhận cùng câu hỏi và hạn trả lời từ server.
4. Người chơi chỉ gửi một đáp án hợp lệ cho mỗi câu; đáp án trễ không được tính.
5. Kết thúc câu mới công bố đáp án và bảng điểm; hết bộ đề hiển thị tổng kết.
6. Rời phòng, mất kết nối và chủ phòng thoát đều có hành vi xác định; bản đầu có thể
   kết thúc phòng khi chủ phòng mất kết nối và thông báo cho các thành viên.

Mốc đầu tiên nên làm: **quản lý bộ đề + lưu câu hỏi trong database**, sau đó mới
triển khai sảnh phòng PIN và vòng chơi nhiều người.

## Các thay đổi kỹ thuật cần chuẩn bị

| Khu vực hiện tại | Hướng phát triển |
| --- | --- |
| `QuestionService` đọc qua `QuestionRepository` | Thêm `QuizRepository` và giao diện soạn/chọn bộ đề |
| `GameRoom` gắn với hai người | Tạo `QuizSession` cho phòng nhiều người; dùng danh sách/map người tham gia và giữ chế độ 1v1 trong `ranked` |
| Kết nối giữ trực tiếp trạng thái trận | Tách `Participant`/trạng thái phiên khỏi `ClientHandler` để dễ xử lý rời/vào lại |
| `ClientHandler` chứa xác thực và điều phối | Tách `AuthService`; bổ sung handler theo chức năng khi số bản tin tăng |
| Điểm đúng hiện tăng một đơn vị | Tách `ScoringPolicy`; bản đầu điểm cố định, sau đó tùy chọn thưởng tốc độ dựa trên giờ server |
| `ANSWER` chứa `questionId`, `choiceId` | Khi phát triển Quiz, bổ sung định danh phiên/vòng nếu cần |
| `users` lưu tổng thống kê | Lưu phiên, người tham gia và từng đáp án để truy xuất báo cáo |
| Mỗi câu gửi ngay kết quả cho người trả lời | Với phòng nhiều người, chỉ công bố đáp án đúng sau khi đóng câu |

Vòng đời phòng đề xuất: `LOBBY → QUESTION_OPEN → QUESTION_CLOSED → LEADERBOARD →`
`QUESTION_OPEN … → FINISHED`; thêm `CANCELLED` khi chủ phòng kết thúc sớm.
Server kiểm tra chuyển trạng thái và quyền chủ phòng cho từng thao tác.

Database mới đã tách `questions` và `choices`. Khi phát triển các chức năng còn lại,
tích hợp các bảng bộ đề, phiên và lịch sử của schema Supabase đang dùng;
không dùng cấu trúc câu hỏi JSONB của file SQL legacy.
Dùng khóa ngoại, thứ tự câu/lựa chọn,
chủ sở hữu bộ đề và ràng buộc duy nhất cho đáp án của một người trong một vòng.
Phiên chơi cần lưu bản chụp nội dung bộ đề để sửa đề về sau không đổi lịch sử.

Các bản tin dự kiến: `QUIZ_CREATE`, `QUIZ_LIST`, `SESSION_CREATE`, `SESSION_JOIN`,
`SESSION_LEAVE`, `LOBBY_UPDATE`, `SESSION_START`, `QUESTION_OPEN`, `SUBMIT_ANSWER`,
`QUESTION_CLOSED`, `LEADERBOARD`, `SESSION_FINISHED`. Đây chưa phải giao thức hiện
đang chạy; cần định nghĩa payload, mã lỗi và cập nhật `protocol.md` khi triển khai.

JavaFX và TCP hiện tại có thể dùng cho bản demo LAN. Nếu muốn người chơi vào bằng
trình duyệt/điện thoại, cần frontend web và lớp HTTP/WebSocket kết nối tới nghiệp vụ
server; trình duyệt không dùng trực tiếp giao thức TCP Socket hiện tại.

Kiểm thử trọng tâm khi phát triển: phòng đủ/chưa đủ người, PIN sai hoặc hết hiệu
lực, thành viên không có quyền điều khiển, gửi đáp án lặp/trễ/sai vòng, mất kết nối,
đồng hạng và lưu kết quả một lần. Kiểm tra tải thực tế trước khi nâng giới hạn phòng.

## Tham khảo sản phẩm

Đề xuất lấy cảm hứng từ quiz trực tiếp và bài tự làm; không giả định `quiz.com` là
cùng một sản phẩm với Quizizz/Wayground.

- [Kahoot: giao bài với hạn nộp, PIN/link/QR](https://support.kahoot.com/hc/en-us/articles/360039411334-How-to-assign-a-kahoot-in-web-platform).
- [Kahoot: báo cáo phiên chơi](https://support.kahoot.com/hc/en-us/articles/360035063054-Kahoot-quiz-reports).
- [Wayground: tạo bộ câu hỏi để tổ chức trực tiếp hoặc giao bài](https://help.wayground.com/support/solutions/articles/158000462332-create-an-assessment-quiz).
- [Wayground: báo cáo theo người học và câu hỏi](https://help.wayground.com/support/solutions/articles/158000404058-reports-on-wayground).
