package com.nihongoquest.server.quiz;

import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.server.database.Database;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** Các truy vấn JDBC đơn giản cho bộ đề, câu hỏi và bốn lựa chọn. */
public class QuizSetRepository {
    private static final int QUERY_TIMEOUT_SECONDS = 10;
    private static final String LIST_OWNED_SQL = """
            SELECT qs.id, qs.owner_id, u.username AS owner_username,
                   qs.title, qs.description, qs.level, qs.is_published,
                   COUNT(q.id)::INT AS question_count
            FROM quiz_sets qs
            JOIN users u ON u.id = qs.owner_id
            LEFT JOIN questions q ON q.quiz_set_id = qs.id
            WHERE qs.owner_id = ?
            GROUP BY qs.id, u.username
            ORDER BY qs.updated_at DESC, qs.id DESC
            """;
    private static final String LIST_PUBLISHED_SQL = """
            SELECT qs.id, qs.owner_id, u.username AS owner_username,
                   qs.title, qs.description, qs.level, qs.is_published,
                   COUNT(q.id)::INT AS question_count
            FROM quiz_sets qs
            JOIN users u ON u.id = qs.owner_id
            LEFT JOIN questions q ON q.quiz_set_id = qs.id
            WHERE qs.is_published = TRUE
            GROUP BY qs.id, u.username
            ORDER BY qs.updated_at DESC, qs.id DESC
            """;
    private final Database database;

    public QuizSetRepository(Database database) {
        this.database = database;
    }

    public List<Payloads.QuizSetSummary> listOwned(long ownerId) throws SQLException {
        return list(LIST_OWNED_SQL, ownerId, ownerId);
    }

    public List<Payloads.QuizSetSummary> listPublished(long currentUserId) throws SQLException {
        return list(LIST_PUBLISHED_SQL, null, currentUserId);
    }

    private List<Payloads.QuizSetSummary> list(String sql, Long parameter, long currentUserId)
            throws SQLException {
        try (Connection connection = database.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
            if (parameter != null) statement.setLong(1, parameter);
            try (ResultSet result = statement.executeQuery()) {
                List<Payloads.QuizSetSummary> items = new ArrayList<>();
                while (result.next()) {
                    long ownerId = result.getLong("owner_id");
                    items.add(new Payloads.QuizSetSummary(
                            result.getLong("id"), ownerId, result.getString("owner_username"),
                            result.getString("title"), result.getString("description"),
                            result.getString("level"), result.getBoolean("is_published"),
                            result.getInt("question_count"), ownerId == currentUserId));
                }
                return items;
            }
        }
    }

    public Optional<StoredQuizSet> findById(long quizSetId) throws SQLException {
        try (Connection connection = database.getConnection()) {
            String sql = """
                    SELECT id, owner_id, title, description, level, is_published
                    FROM quiz_sets WHERE id = ?
                    """;
            long ownerId;
            boolean published;
            String title;
            String description;
            String level;
            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                statement.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
                statement.setLong(1, quizSetId);
                try (ResultSet result = statement.executeQuery()) {
                    if (!result.next()) return Optional.empty();
                    ownerId = result.getLong("owner_id");
                    published = result.getBoolean("is_published");
                    title = result.getString("title");
                    description = result.getString("description");
                    level = result.getString("level");
                }
            }
            List<Payloads.QuizQuestionEdit> questions = loadQuestions(connection, quizSetId);
            return Optional.of(new StoredQuizSet(ownerId, published,
                    new Payloads.QuizSetEdit(quizSetId, title, description, level, questions)));
        }
    }

    private List<Payloads.QuizQuestionEdit> loadQuestions(Connection connection, long quizSetId)
            throws SQLException {
        String sql = """
                SELECT id, content, explanation FROM questions
                WHERE quiz_set_id = ? ORDER BY position
                """;
        List<Payloads.QuizQuestionEdit> questions = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
            statement.setLong(1, quizSetId);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) {
                    long questionId = result.getLong("id");
                    questions.add(new Payloads.QuizQuestionEdit(
                            questionId, result.getString("content"),
                            result.getString("explanation"), loadChoices(connection, questionId)));
                }
            }
        }
        return questions;
    }

    private List<Payloads.QuizChoiceEdit> loadChoices(Connection connection, long questionId)
            throws SQLException {
        String sql = """
                SELECT id, content, position, is_correct FROM choices
                WHERE question_id = ? ORDER BY position
                """;
        List<Payloads.QuizChoiceEdit> choices = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
            statement.setLong(1, questionId);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) {
                    choices.add(new Payloads.QuizChoiceEdit(
                            result.getLong("id"), result.getString("content"),
                            result.getInt("position"), result.getBoolean("is_correct")));
                }
            }
        }
        return choices;
    }

    /** Lưu header và thay toàn bộ danh sách câu hỏi trong một transaction ngắn. */
    public long save(long ownerId, Payloads.QuizSetEdit quizSet) throws SQLException {
        try (Connection connection = database.getConnection()) {
            connection.setAutoCommit(false);
            try {
                long quizSetId = quizSet.id() == null
                        ? insertQuizSet(connection, ownerId, quizSet)
                        : updateQuizSet(connection, ownerId, quizSet);
                replaceQuestions(connection, quizSetId, quizSet.questions());
                connection.commit();
                return quizSetId;
            } catch (SQLException | RuntimeException e) {
                connection.rollback();
                throw e;
            }
        }
    }

    private long insertQuizSet(Connection connection, long ownerId, Payloads.QuizSetEdit quizSet)
            throws SQLException {
        String sql = """
                INSERT INTO quiz_sets (owner_id, title, description, level, is_published)
                VALUES (?, ?, ?, ?, FALSE) RETURNING id
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, ownerId);
            setQuizSetFields(statement, quizSet, 2);
            try (ResultSet result = statement.executeQuery()) {
                result.next();
                return result.getLong("id");
            }
        }
    }

    private long updateQuizSet(Connection connection, long ownerId, Payloads.QuizSetEdit quizSet)
            throws SQLException {
        String sql = """
                UPDATE quiz_sets
                SET title = ?, description = ?, level = ?, is_published = FALSE, updated_at = now()
                WHERE id = ? AND owner_id = ?
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            setQuizSetFields(statement, quizSet, 1);
            statement.setLong(4, quizSet.id());
            statement.setLong(5, ownerId);
            if (statement.executeUpdate() == 0) throw ownershipError(connection, quizSet.id());
            return quizSet.id();
        }
    }

    private void setQuizSetFields(PreparedStatement statement, Payloads.QuizSetEdit quizSet, int start)
            throws SQLException {
        statement.setString(start, quizSet.title());
        statement.setString(start + 1, quizSet.description());
        statement.setString(start + 2, quizSet.level());
    }

    private void replaceQuestions(Connection connection, long quizSetId,
                                  List<Payloads.QuizQuestionEdit> questions) throws SQLException {
        try (PreparedStatement delete = connection.prepareStatement(
                "DELETE FROM questions WHERE quiz_set_id = ?")) {
            delete.setLong(1, quizSetId);
            delete.executeUpdate();
        }
        String questionSql = """
                INSERT INTO questions (quiz_set_id, content, explanation, position)
                VALUES (?, ?, ?, ?) RETURNING id
                """;
        String choiceSql = """
                INSERT INTO choices (question_id, content, position, is_correct)
                VALUES (?, ?, ?, ?)
                """;
        for (int index = 0; index < questions.size(); index++) {
            Payloads.QuizQuestionEdit question = questions.get(index);
            long questionId;
            try (PreparedStatement insertQuestion = connection.prepareStatement(questionSql)) {
                insertQuestion.setLong(1, quizSetId);
                insertQuestion.setString(2, question.content());
                insertQuestion.setString(3, question.explanation());
                insertQuestion.setInt(4, index + 1);
                try (ResultSet result = insertQuestion.executeQuery()) {
                    result.next();
                    questionId = result.getLong("id");
                }
            }
            try (PreparedStatement insertChoice = connection.prepareStatement(choiceSql)) {
                for (Payloads.QuizChoiceEdit choice : question.choices()) {
                    insertChoice.setLong(1, questionId);
                    insertChoice.setString(2, choice.content());
                    insertChoice.setInt(3, choice.position());
                    insertChoice.setBoolean(4, choice.correct());
                    insertChoice.addBatch();
                }
                insertChoice.executeBatch();
            }
        }
    }

    public void setPublished(long quizSetId, long ownerId, boolean published) throws SQLException {
        String sql = """
                UPDATE quiz_sets SET is_published = ?, updated_at = now()
                WHERE id = ? AND owner_id = ?
                """;
        try (Connection connection = database.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setBoolean(1, published);
            statement.setLong(2, quizSetId);
            statement.setLong(3, ownerId);
            if (statement.executeUpdate() == 0) throw ownershipError(connection, quizSetId);
        }
    }

    public void delete(long quizSetId, long ownerId) throws SQLException {
        try (Connection connection = database.getConnection();
             PreparedStatement statement = connection.prepareStatement(
                     "DELETE FROM quiz_sets WHERE id = ? AND owner_id = ?")) {
            statement.setLong(1, quizSetId);
            statement.setLong(2, ownerId);
            if (statement.executeUpdate() == 0) throw ownershipError(connection, quizSetId);
        }
    }

    private QuizSetException ownershipError(Connection connection, long quizSetId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT 1 FROM quiz_sets WHERE id = ?")) {
            statement.setLong(1, quizSetId);
            try (ResultSet result = statement.executeQuery()) {
                return new QuizSetException(result.next() ? "NOT_OWNER" : "NOT_FOUND");
            }
        }
    }

    public record StoredQuizSet(long ownerId, boolean published, Payloads.QuizSetEdit data) { }
}
