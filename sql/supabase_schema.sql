-- NIHONGOQUEST - RESET SCHEMA CHO DO AN
-- CANH BAO: script nay xoa toan bo du lieu NihongoQuest hien co.
-- Chay trong Supabase SQL Editor, sau do chay seed_demo.sql neu can du lieu demo.

DROP TABLE IF EXISTS ranked_answers CASCADE;
DROP TABLE IF EXISTS ranked_match_questions CASCADE;
DROP TABLE IF EXISTS ranked_match_players CASCADE;
DROP TABLE IF EXISTS ranked_matches CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS friendships CASCADE;
DROP TABLE IF EXISTS choices CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS quiz_sets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(60) NOT NULL,
    wins INT NOT NULL DEFAULT 0 CHECK (wins >= 0),
    losses INT NOT NULL DEFAULT 0 CHECK (losses >= 0),
    draws INT NOT NULL DEFAULT 0 CHECK (draws >= 0),
    total_score INT NOT NULL DEFAULT 0 CHECK (total_score >= 0),
    questions_answered INT NOT NULL DEFAULT 0 CHECK (questions_answered >= 0),
    correct_answers INT NOT NULL DEFAULT 0 CHECK (correct_answers >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quiz_sets (
    id BIGSERIAL PRIMARY KEY,
    owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    level VARCHAR(2) NOT NULL CHECK (level IN ('N5', 'N4', 'N3', 'N2', 'N1')),
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE questions (
    id BIGSERIAL PRIMARY KEY,
    quiz_set_id BIGINT NOT NULL REFERENCES quiz_sets(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    explanation TEXT NOT NULL DEFAULT '',
    position INT NOT NULL CHECK (position > 0),
    UNIQUE (quiz_set_id, position)
);

CREATE TABLE choices (
    id BIGSERIAL PRIMARY KEY,
    question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    position INT NOT NULL CHECK (position BETWEEN 1 AND 4),
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (question_id, position),
    UNIQUE (id, question_id)
);

CREATE TABLE matches (
    id BIGSERIAL PRIMARY KEY,
    player1_id BIGINT NOT NULL REFERENCES users(id),
    player2_id BIGINT NOT NULL REFERENCES users(id),
    score1 INT NOT NULL CHECK (score1 >= 0),
    score2 INT NOT NULL CHECK (score2 >= 0),
    winner_id BIGINT REFERENCES users(id),
    duration_seconds INT NOT NULL CHECK (duration_seconds IN (180, 300)),
    end_reason VARCHAR(20) NOT NULL CHECK (end_reason IN ('NORMAL', 'DISCONNECT')),
    played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (player1_id <> player2_id),
    CHECK (winner_id IS NULL OR winner_id IN (player1_id, player2_id))
);

CREATE TABLE friendships (
    user_low_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_high_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_by_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(10) NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_low_id, user_high_id),
    CHECK (user_low_id < user_high_id),
    CHECK (requested_by_id IN (user_low_id, user_high_id))
);

CREATE INDEX idx_quiz_sets_public ON quiz_sets (is_published, level);
CREATE INDEX idx_questions_set ON questions (quiz_set_id, position);
CREATE INDEX idx_matches_player1 ON matches (player1_id, played_at DESC);
CREATE INDEX idx_matches_player2 ON matches (player2_id, played_at DESC);
CREATE INDEX idx_friendships_high ON friendships (user_high_id, status);

-- Client khong bao gio ket noi database. Khong can RLS/JWT cho ban demo JDBC LAN.
