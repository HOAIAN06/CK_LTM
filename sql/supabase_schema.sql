-- NihongoQuest — schema Supabase (Postgres)
-- LEGACY: chỉ tham khảo phiên bản cũ; không chạy để thiết lập bản JDBC hiện tại.
-- Bản hiện tại dùng schema users/questions/choices đã có trên Supabase.
-- Chạy trong Supabase Dashboard → SQL Editor
-- Chỉ Game Server (JDBC) đọc/ghi; Client không nối thẳng DB.

-- ---------------------------------------------------------------------------
-- 1) Người chơi (đăng ký / đăng nhập / hồ sơ)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS players (
  id                  BIGSERIAL PRIMARY KEY,
  username            TEXT UNIQUE NOT NULL,
  password_hash       TEXT NOT NULL,
  wins                INT NOT NULL DEFAULT 0,   -- số trận thắng (hiển thị hồ sơ)
  losses              INT NOT NULL DEFAULT 0,   -- số trận thua
  questions_answered  INT NOT NULL DEFAULT 0,   -- tổng câu đã trả lời
  correct_answers     INT NOT NULL DEFAULT 0,   -- tổng câu trả lời đúng
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2) Câu hỏi (Server load khi mở trận; Client chỉ nhận qua TCP)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questions (
  id              BIGSERIAL PRIMARY KEY,
  question_text   TEXT NOT NULL,
  -- 4 đáp án theo thứ tự index 0..3 của model legacy
  answers         JSONB NOT NULL,
  -- index đáp án đúng (0..3)
  correct_answer  INT NOT NULL CHECK (correct_answer BETWEEN 0 AND 3),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT answers_is_array CHECK (jsonb_typeof(answers) = 'array')
);

-- ---------------------------------------------------------------------------
-- 3) Lịch sử trận (sau GAME_OVER server ghi 1 dòng)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matches (
  id          BIGSERIAL PRIMARY KEY,
  player1_id  BIGINT NOT NULL REFERENCES players(id),
  player2_id  BIGINT NOT NULL REFERENCES players(id),
  winner_id   BIGINT REFERENCES players(id),  -- NULL = hòa
  score1      INT NOT NULL,
  score2      INT NOT NULL,
  played_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matches_player1 ON matches (player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_player2 ON matches (player2_id);

-- ---------------------------------------------------------------------------
-- RLS: chặn anon/authenticated; Server dùng connection string (role DB) vẫn OK
-- ---------------------------------------------------------------------------
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Seed câu hỏi demo của schema legacy
-- ---------------------------------------------------------------------------
INSERT INTO questions (question_text, answers, correct_answer) VALUES
  (
    'たべる có nghĩa là gì?',
    '["Ăn", "Uống", "Ngủ", "Đi"]'::jsonb,
    0
  ),
  (
    'みず nghĩa là gì?',
    '["Lửa", "Nước", "Gió", "Đất"]'::jsonb,
    1
  ),
  (
    'こんにちは dùng để làm gì?',
    '["Chào buổi sáng", "Chào buổi tối", "Chào ban ngày / xin chào", "Tạm biệt"]'::jsonb,
    2
  );
