-- Chạy sau supabase_schema.sql. Mật khẩu của ba tài khoản demo là: 1234
-- BCrypt hash được tạo sẵn; server vẫn dùng BCrypt.checkpw khi đăng nhập.
INSERT INTO users (username, password_hash) VALUES
('demo_host', '$2a$10$0LYMg2WQDxwPnSuG3FbMg./dVzrMH4DwD/WpvBqmPiNOiLUbVtiWK'),
('demo_player1', '$2a$10$0LYMg2WQDxwPnSuG3FbMg./dVzrMH4DwD/WpvBqmPiNOiLUbVtiWK'),
('demo_player2', '$2a$10$0LYMg2WQDxwPnSuG3FbMg./dVzrMH4DwD/WpvBqmPiNOiLUbVtiWK')
ON CONFLICT (username) DO NOTHING;

-- Cho phép chạy lại seed trên database hiện có mà không tạo bộ đề demo trùng lặp.
-- ON DELETE CASCADE sẽ chỉ xóa câu hỏi/lựa chọn thuộc các bộ demo này.
DELETE FROM quiz_sets
WHERE owner_id = (SELECT id FROM users WHERE username = 'demo_host')
  AND title IN (
      'Tu vung N5 co ban',
      'Từ vựng N5 cơ bản',
      'Ngữ pháp N5',
      'Kanji N5 thông dụng',
      'Giao tiếp hằng ngày',
      'Từ vựng N4 mở rộng',
      'Ngữ pháp N4'
  );

-- Sáu bộ đề published bên dưới sẽ tự xuất hiện trong danh sách chọn của host.
-- Mỗi bộ có 10 câu, mỗi câu có đúng bốn lựa chọn và một đáp án đúng.
WITH seed_sets(set_key, title, description, level) AS (
    VALUES
        ('n5_vocab', 'Từ vựng N5 cơ bản',
         'Danh từ và động từ thường gặp dành cho người mới học', 'N5'),
        ('n5_grammar', 'Ngữ pháp N5',
         'Trợ từ, mẫu câu và cách chia động từ N5', 'N5'),
        ('n5_kanji', 'Kanji N5 thông dụng',
         'Nhận biết chữ Hán, âm đọc và ý nghĩa cơ bản', 'N5'),
        ('conversation', 'Giao tiếp hằng ngày',
         'Các câu chào hỏi và hội thoại thực tế bằng tiếng Nhật', 'N5'),
        ('n4_vocab', 'Từ vựng N4 mở rộng',
         'Từ vựng về học tập, công việc và đời sống ở trình độ N4', 'N4'),
        ('n4_grammar', 'Ngữ pháp N4',
         'Các cấu trúc ngữ pháp quan trọng thường gặp trong JLPT N4', 'N4')
), inserted_sets AS (
    INSERT INTO quiz_sets (owner_id, title, description, level, is_published)
    SELECT u.id, s.title, s.description, s.level, TRUE
    FROM seed_sets s
    CROSS JOIN users u
    WHERE u.username = 'demo_host'
    RETURNING id, title
), question_data(
    set_key, position, content, explanation,
    choice_1, choice_2, choice_3, choice_4, correct_position
) AS (
    VALUES
        -- Từ vựng N5 cơ bản
        ('n5_vocab', 1, '「たべる」 có nghĩa là gì?', 'たべる (食べる): ăn.',
         'Ăn', 'Uống', 'Ngủ', 'Đi', 1),
        ('n5_vocab', 2, '「みず」 có nghĩa là gì?', 'みず (水): nước.',
         'Lửa', 'Nước', 'Gió', 'Đất', 2),
        ('n5_vocab', 3, '「ねこ」 là con vật nào?', 'ねこ (猫): con mèo.',
         'Chó', 'Chim', 'Mèo', 'Cá', 3),
        ('n5_vocab', 4, '「でんしゃ」 là phương tiện nào?', 'でんしゃ (電車): tàu điện.',
         'Xe đạp', 'Máy bay', 'Ô tô', 'Tàu điện', 4),
        ('n5_vocab', 5, '「きく」 có nghĩa là gì?', 'きく (聞く): nghe hoặc hỏi.',
         'Nghe', 'Viết', 'Đọc', 'Mua', 1),
        ('n5_vocab', 6, '「あした」 chỉ thời gian nào?', 'あした (明日): ngày mai.',
         'Hôm qua', 'Ngày mai', 'Hôm nay', 'Tuần sau', 2),
        ('n5_vocab', 7, '「せんせい」 dùng để gọi ai?', 'せんせい (先生): giáo viên/thầy cô.',
         'Học sinh', 'Bác sĩ thú y', 'Giáo viên', 'Cảnh sát', 3),
        ('n5_vocab', 8, '「やすい」 có nghĩa là gì?', 'やすい (安い): rẻ.',
         'Đắt', 'Cao', 'Mới', 'Rẻ', 4),
        ('n5_vocab', 9, '「としょかん」 là nơi nào?', 'としょかん (図書館): thư viện.',
         'Thư viện', 'Bệnh viện', 'Nhà ga', 'Bưu điện', 1),
        ('n5_vocab', 10, '「おおきい」 trái nghĩa với từ nào?', 'おおきい (大きい) là lớn; trái nghĩa là ちいさい (nhỏ).',
         'あたらしい', 'ちいさい', 'たかい', 'おそい', 2),

        -- Ngữ pháp N5
        ('n5_grammar', 1, 'Điền trợ từ: わたし___学生です。', '「は」 đánh dấu chủ đề của câu.',
         'は', 'を', 'で', 'へ', 1),
        ('n5_grammar', 2, 'Điền trợ từ: パン___食べます。', '「を」 đánh dấu tân ngữ trực tiếp.',
         'に', 'を', 'が', 'と', 2),
        ('n5_grammar', 3, 'Điền trợ từ: 7時___起きます。', '「に」 dùng với thời điểm cụ thể.',
         'を', 'で', 'に', 'へ', 3),
        ('n5_grammar', 4, 'Dạng phủ định lịch sự của 「行きます」 là gì?', '行きます → 行きません.',
         '行きました', '行きたいです', '行きましょう', '行きません', 4),
        ('n5_grammar', 5, 'Câu nào có nghĩa “Đây là sách của tôi”?', '「N1 の N2」 biểu thị sở hữu.',
         'これはわたしの本です。', 'これはわたしを本です。', 'これが本にわたしです。', '本はこれとわたしです。', 1),
        ('n5_grammar', 6, 'Điền từ: きのう映画を___。', 'Có mốc quá khứ きのう nên dùng 見ました.',
         '見ます', '見ました', '見ません', '見るです', 2),
        ('n5_grammar', 7, 'Muốn hỏi giá tiền, dùng câu nào?', '「いくらですか」 dùng để hỏi giá.',
         '何時ですか。', 'だれですか。', 'いくらですか。', 'どこですか。', 3),
        ('n5_grammar', 8, 'Điền từ: 日本語は___おもしろいです。', '「とても」 đứng trước tính từ và có nghĩa là rất.',
         'まだ', 'だけ', 'から', 'とても', 4),
        ('n5_grammar', 9, 'Mẫu 「～てもいいです」 diễn tả điều gì?', 'Mẫu này dùng để cho phép hoặc xin phép.',
         'Được phép làm', 'Bắt buộc làm', 'Không được làm', 'Đã từng làm', 1),
        ('n5_grammar', 10, 'Điền trợ từ: 学校___日本語を勉強します。', '「で」 chỉ địa điểm diễn ra hành động.',
         'へ', 'で', 'を', 'の', 2),

        -- Kanji N5 thông dụng
        ('n5_kanji', 1, 'Kanji 「山」 có nghĩa là gì?', '山 (やま): núi.',
         'Núi', 'Sông', 'Biển', 'Trời', 1),
        ('n5_kanji', 2, 'Cách đọc của 「水」 là gì?', '水 được đọc là みず khi đứng một mình.',
         'ひ', 'みず', 'き', 'つち', 2),
        ('n5_kanji', 3, 'Kanji nào có nghĩa là “lửa”?', '火 (ひ): lửa.',
         '木', '金', '火', '土', 3),
        ('n5_kanji', 4, '「日本」 được đọc là gì?', '日本: にほん hoặc にっぽん.',
         'にんほん', 'ひもと', 'にちほん', 'にほん', 4),
        ('n5_kanji', 5, 'Kanji 「人」 có nghĩa là gì?', '人 (ひと): người.',
         'Người', 'Trẻ em', 'Phụ nữ', 'Bạn bè', 1),
        ('n5_kanji', 6, 'Cách đọc của 「月曜日」 là gì?', '月曜日 được đọc là げつようび (thứ Hai).',
         'かようび', 'げつようび', 'すいようび', 'もくようび', 2),
        ('n5_kanji', 7, 'Kanji nào có nghĩa là “trường học”?', '学校 (がっこう): trường học.',
         '先生', '学生', '学校', '会社', 3),
        ('n5_kanji', 8, '「三人」 có nghĩa là gì?', '三人 (さんにん): ba người.',
         'Một người', 'Hai người', 'Bốn người', 'Ba người', 4),
        ('n5_kanji', 9, 'Kanji 「上」 thường có nghĩa là gì?', '上 (うえ): trên/phía trên.',
         'Trên', 'Dưới', 'Trong', 'Ngoài', 1),
        ('n5_kanji', 10, 'Kanji nào biểu thị số 5?', '五 được đọc là ご và biểu thị số 5.',
         '四', '五', '六', '九', 2),

        -- Giao tiếp hằng ngày
        ('conversation', 1, 'Buổi sáng gặp bạn, bạn nên nói gì?', '「おはようございます」 là lời chào buổi sáng lịch sự.',
         'おはようございます。', 'こんばんは。', 'さようなら。', 'おやすみなさい。', 1),
        ('conversation', 2, 'Khi được người khác cảm ơn, bạn đáp lại thế nào?', '「どういたしまして」 nghĩa là không có gì.',
         'すみません。', 'どういたしまして。', 'いただきます。', 'いってきます。', 2),
        ('conversation', 3, 'Muốn xin lỗi lịch sự, bạn dùng câu nào?', '「すみません」 có thể dùng để xin lỗi hoặc gọi người khác.',
         'ありがとう。', 'はじめまして。', 'すみません。', 'おめでとう。', 3),
        ('conversation', 4, 'Trước khi ăn, người Nhật thường nói gì?', '「いただきます」 được nói trước bữa ăn.',
         'ごちそうさまでした。', 'いらっしゃいませ。', 'おかえりなさい。', 'いただきます。', 4),
        ('conversation', 5, 'Lần đầu gặp mặt, câu nào phù hợp nhất?', '「はじめまして」 dùng khi lần đầu gặp nhau.',
         'はじめまして。', 'おだいじに。', 'もしもし。', 'おつかれさま。', 1),
        ('conversation', 6, 'Nhân viên cửa hàng thường chào khách bằng câu nào?', '「いらっしゃいませ」 là lời chào khách tại cửa hàng.',
         'ただいま。', 'いらっしゃいませ。', 'いってらっしゃい。', 'おかえり。', 2),
        ('conversation', 7, 'Khi nghe điện thoại, câu mở đầu phổ biến là gì?', '「もしもし」 thường được dùng khi bắt đầu cuộc gọi.',
         'どうぞ。', 'なるほど。', 'もしもし。', 'もちろん。', 3),
        ('conversation', 8, 'Muốn hỏi nhà ga ở đâu, bạn nói câu nào?', '「駅はどこですか」 nghĩa là nhà ga ở đâu?',
         '駅はいくらですか。', '駅はだれですか。', '駅はいつですか。', '駅はどこですか。', 4),
        ('conversation', 9, 'Khi về đến nhà, bạn nói gì?', 'Người trở về nhà nói 「ただいま」.',
         'ただいま。', 'いってきます。', 'いってらっしゃい。', 'おじゃまします。', 1),
        ('conversation', 10, 'Sau khi ăn xong, câu nào phù hợp?', '「ごちそうさまでした」 thể hiện sự cảm ơn sau bữa ăn.',
         'いただきます。', 'ごちそうさまでした。', 'おやすみなさい。', 'お元気ですか。', 2),

        -- Từ vựng N4 mở rộng
        ('n4_vocab', 1, '「準備」 có nghĩa là gì?', '準備 (じゅんび): chuẩn bị.',
         'Chuẩn bị', 'Dọn dẹp', 'Luyện tập', 'Kiểm tra', 1),
        ('n4_vocab', 2, '「約束」 có nghĩa là gì?', '約束 (やくそく): lời hứa hoặc cuộc hẹn.',
         'Kế hoạch', 'Lời hứa', 'Quy tắc', 'Ý kiến', 2),
        ('n4_vocab', 3, '「故障」 thường dùng khi nói về điều gì?', '故障 (こしょう): sự hỏng hóc của máy móc.',
         'Thành công', 'Sửa chữa', 'Hỏng hóc', 'Phát minh', 3),
        ('n4_vocab', 4, '「間に合う」 có nghĩa là gì?', '間に合う (まにあう): kịp giờ/kịp lúc.',
         'Bị trễ', 'Bỏ cuộc', 'Lạc đường', 'Kịp giờ', 4),
        ('n4_vocab', 5, '「卒業」 có nghĩa là gì?', '卒業 (そつぎょう): tốt nghiệp.',
         'Tốt nghiệp', 'Nhập học', 'Nghỉ học', 'Du học', 1),
        ('n4_vocab', 6, '「運転」 là hành động nào?', '運転 (うんてん): lái hoặc vận hành phương tiện.',
         'Đi bộ', 'Lái xe', 'Bơi', 'Chạy bộ', 2),
        ('n4_vocab', 7, '「眠い」 mô tả trạng thái nào?', '眠い (ねむい): buồn ngủ.',
         'Đói bụng', 'Khát nước', 'Buồn ngủ', 'Mệt mỏi', 3),
        ('n4_vocab', 8, '「引っ越す」 có nghĩa là gì?', '引っ越す (ひっこす): chuyển nhà.',
         'Đi du lịch', 'Về quê', 'Xây nhà', 'Chuyển nhà', 4),
        ('n4_vocab', 9, '「連絡する」 có nghĩa là gì?', '連絡する (れんらくする): liên lạc.',
         'Liên lạc', 'Tranh luận', 'Giới thiệu', 'Đăng ký', 1),
        ('n4_vocab', 10, '「必要」 có nghĩa là gì?', '必要 (ひつよう): cần thiết.',
         'Tiện lợi', 'Cần thiết', 'Đặc biệt', 'An toàn', 2),

        -- Ngữ pháp N4
        ('n4_grammar', 1, 'Mẫu 「～たことがあります」 diễn tả điều gì?', 'Mẫu này diễn tả kinh nghiệm đã từng làm việc gì.',
         'Kinh nghiệm đã từng làm', 'Dự định sắp làm', 'Việc đang làm', 'Việc bị cấm', 1),
        ('n4_grammar', 2, 'Điền từ: 日本へ行く___、パスポートが必要です。', '「ために」 chỉ mục đích: để đi Nhật.',
         'そうに', 'ために', 'ながら', 'ばかり', 2),
        ('n4_grammar', 3, 'Mẫu 「～ながら」 có nghĩa là gì?', '「ながら」 diễn tả hai hành động diễn ra đồng thời.',
         'Sau khi làm', 'Trước khi làm', 'Vừa làm A vừa làm B', 'Không cần làm', 3),
        ('n4_grammar', 4, 'Điền từ: 雨が降って___、出かけます。', '「ても」 diễn tả nhượng bộ: dù trời mưa vẫn đi.',
         'から', 'ので', 'たり', 'も', 4),
        ('n4_grammar', 5, 'Mẫu 「～なければなりません」 diễn tả điều gì?', 'Mẫu này diễn tả nghĩa vụ: phải làm.',
         'Phải làm', 'Không được làm', 'Có thể làm', 'Muốn làm', 1),
        ('n4_grammar', 6, 'Điền từ: 寝る___、歯を磨きます。', '「前に」 nghĩa là trước khi.',
         'あとで', '前に', 'ながら', 'まで', 2),
        ('n4_grammar', 7, 'Câu 「窓が開いています」 mô tả điều gì?', 'Tự động từ + ています mô tả trạng thái đang duy trì.',
         'Ai đó đang mở cửa sổ', 'Cửa sổ sắp mở', 'Cửa sổ đang ở trạng thái mở', 'Không được mở cửa sổ', 3),
        ('n4_grammar', 8, 'Điền từ: この本は読み___です。', 'Động từ bỏ ます + やすい: dễ làm.',
         'たい', 'そう', 'すぎ', 'やすい', 4),
        ('n4_grammar', 9, 'Mẫu 「～かもしれません」 diễn tả điều gì?', 'Mẫu này diễn tả khả năng không chắc chắn: có lẽ/có thể.',
         'Khả năng có thể xảy ra', 'Mệnh lệnh mạnh', 'Kế hoạch chắc chắn', 'Lời xin phép', 1),
        ('n4_grammar', 10, 'Điền từ: 先生が言った___書いてください。', '「とおりに」 nghĩa là làm đúng như/giống như.',
         'らしい', 'とおりに', 'そうで', 'ところに', 2)
), inserted_questions AS (
    INSERT INTO questions (quiz_set_id, content, explanation, position)
    SELECT i.id, q.content, q.explanation, q.position
    FROM question_data q
    JOIN seed_sets s ON s.set_key = q.set_key
    JOIN inserted_sets i ON i.title = s.title
    RETURNING id, quiz_set_id, position
)
INSERT INTO choices (question_id, content, position, is_correct)
SELECT iq.id, answer.content, answer.position,
       answer.position = q.correct_position
FROM inserted_questions iq
JOIN inserted_sets i ON i.id = iq.quiz_set_id
JOIN seed_sets s ON s.title = i.title
JOIN question_data q ON q.set_key = s.set_key AND q.position = iq.position
CROSS JOIN LATERAL (
    VALUES
        (q.choice_1, 1),
        (q.choice_2, 2),
        (q.choice_3, 3),
        (q.choice_4, 4)
) AS answer(content, position);
