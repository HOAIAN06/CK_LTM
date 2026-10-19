-- Cac truy van read-only dung de kiem tra sau khi reset schema.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'quiz_sets', 'questions', 'choices', 'matches', 'friendships')
ORDER BY table_name;

SELECT qs.id, qs.title, qs.level, qs.is_published, count(q.id) AS question_count
FROM quiz_sets qs
LEFT JOIN questions q ON q.quiz_set_id = qs.id
GROUP BY qs.id, qs.title, qs.level, qs.is_published
ORDER BY qs.id;

SELECT q.id, q.content, count(c.id) AS choice_count,
       count(c.id) FILTER (WHERE c.is_correct) AS correct_count
FROM questions q
LEFT JOIN choices c ON c.question_id = q.id
GROUP BY q.id, q.content
ORDER BY q.id;
