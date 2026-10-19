-- Read-only verification after a Ranked 1v1 demo. Never selects credentials.
SELECT * FROM ranked_matches ORDER BY id DESC LIMIT 5;
SELECT * FROM ranked_match_players ORDER BY match_id DESC;
SELECT * FROM ranked_match_questions ORDER BY match_id DESC, question_order;
SELECT * FROM ranked_answers ORDER BY match_id DESC, answered_at;
SELECT id, username, ranked_rating, total_score, total_matches, wins, losses, draws,
       questions_answered, correct_answers
FROM users ORDER BY id;

-- For normal FINISHED three-question games: participants=2, questions=3, answers=6.
-- A disconnect forfeits early and may have fewer answers.
SELECT m.id, m.status, m.winner_id,
       (SELECT COUNT(*) FROM ranked_match_players p WHERE p.match_id = m.id) AS participants,
       (SELECT COUNT(*) FROM ranked_match_questions q WHERE q.match_id = m.id) AS questions,
       (SELECT COUNT(*) FROM ranked_answers a WHERE a.match_id = m.id) AS answers
FROM ranked_matches m ORDER BY m.id DESC LIMIT 5;
