-- Chay sau supabase_schema.sql. Mat khau cua ba tai khoan demo la: 1234
-- BCrypt hash duoc tao san; server van dung BCrypt.checkpw khi dang nhap.
INSERT INTO users (username, password_hash) VALUES
('demo_host', '$2a$10$0LYMg2WQDxwPnSuG3FbMg./dVzrMH4DwD/WpvBqmPiNOiLUbVtiWK'),
('demo_player1', '$2a$10$0LYMg2WQDxwPnSuG3FbMg./dVzrMH4DwD/WpvBqmPiNOiLUbVtiWK'),
('demo_player2', '$2a$10$0LYMg2WQDxwPnSuG3FbMg./dVzrMH4DwD/WpvBqmPiNOiLUbVtiWK');

WITH new_set AS (
    INSERT INTO quiz_sets (owner_id, title, description, level, is_published)
    SELECT id, 'Tu vung N5 co ban', 'Bo cau hoi demo cho Ranked va Quiz Room', 'N5', TRUE
    FROM users WHERE username = 'demo_host'
    RETURNING id
), inserted_questions AS (
    INSERT INTO questions (quiz_set_id, content, explanation, position)
    SELECT id, 'たべる co nghia la gi?', 'たべる: an', 1 FROM new_set
    UNION ALL SELECT id, 'みず co nghia la gi?', 'みず: nuoc', 2 FROM new_set
    UNION ALL SELECT id, 'こんにちは dung de lam gi?', 'Loi chao ban ngay', 3 FROM new_set
    RETURNING id, position
)
INSERT INTO choices (question_id, content, position, is_correct)
SELECT id, value.content, value.position, value.correct
FROM inserted_questions
CROSS JOIN LATERAL (
    VALUES
      (CASE inserted_questions.position WHEN 1 THEN 'An' WHEN 2 THEN 'Lua' ELSE 'Chao buoi sang' END, 1, inserted_questions.position = 1),
      (CASE inserted_questions.position WHEN 1 THEN 'Uong' WHEN 2 THEN 'Nuoc' ELSE 'Chao buoi toi' END, 2, inserted_questions.position = 2),
      (CASE inserted_questions.position WHEN 1 THEN 'Ngu' WHEN 2 THEN 'Gio' ELSE 'Xin chao ban ngay' END, 3, inserted_questions.position = 3),
      (CASE inserted_questions.position WHEN 1 THEN 'Di' WHEN 2 THEN 'Dat' ELSE 'Tam biet' END, 4, FALSE)
) AS value(content, position, correct);
