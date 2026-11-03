package com.nihongoquest.server.question;

import com.nihongoquest.server.database.Database;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** JDBC access only; Ranked eligibility is decided by QuestionService. */
public class QuestionRepository {
    private static final String QUESTION_COLUMNS = "q.id, q.content, qs.title AS category, "
            + "qs.level, q.explanation";
    private static final int QUERY_TIMEOUT_SECONDS = 10;
    private final Database database;

    public QuestionRepository(Database database) {
        this.database = Objects.requireNonNull(database);
    }

    public List<Question> findRandomQuestions(int limit) throws SQLException {
        return findRandomQuestions(null, limit);
    }

    public List<Question> findRandomQuestions(String level, int limit) throws SQLException {
        return findRandomQuestions(level, limit, List.of());
    }

    /** Exclude previously examined IDs so the service can replace invalid candidates. */
    public List<Question> findRandomQuestions(String level, int limit,
                                               Collection<Long> excludedIds) throws SQLException {
        if (limit <= 0) {
            throw new IllegalArgumentException("Question limit must be positive");
        }
        try (Connection connection = database.getConnection()) {
            boolean filterLevel = level != null && !level.isBlank();
            String sql = "SELECT " + QUESTION_COLUMNS
                    + " FROM questions q JOIN quiz_sets qs ON qs.id = q.quiz_set_id"
                    + " WHERE qs.is_published = TRUE"
                    + (filterLevel ? " AND qs.level = ?" : "")
                    + (excludedIds.isEmpty() ? "" : " AND q.id NOT IN (" + placeholders(excludedIds.size()) + ")")
                    + " ORDER BY RANDOM() LIMIT ?";
            List<Question> questions;
            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                statement.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
                int parameter = 1;
                if (filterLevel) {
                    statement.setString(parameter++, level);
                }
                for (long excludedId : excludedIds) {
                    statement.setLong(parameter++, excludedId);
                }
                statement.setInt(parameter, limit);
                try (ResultSet result = statement.executeQuery()) {
                    questions = readQuestions(result);
                }
            }
            return attachChoices(connection, questions);
        }
    }

    /** Chỉ trả câu hỏi thuộc bộ đề đã xuất bản. */
    public Question findById(long questionId) throws SQLException {
        try (Connection connection = database.getConnection()) {
            String sql = "SELECT " + QUESTION_COLUMNS
                    + " FROM questions q JOIN quiz_sets qs ON qs.id = q.quiz_set_id"
                    + " WHERE q.id = ? AND qs.is_published = TRUE";
            List<Question> questions;
            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                statement.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
                statement.setLong(1, questionId);
                try (ResultSet result = statement.executeQuery()) {
                    questions = readQuestions(result);
                }
            }
            List<Question> loaded = attachChoices(connection, questions);
            return loaded.isEmpty() ? null : loaded.getFirst();
        }
    }

    public List<Choice> findChoicesByQuestionId(long questionId) throws SQLException {
        try (Connection connection = database.getConnection();
             PreparedStatement statement = connection.prepareStatement("""
                     SELECT id, question_id, content, is_correct, position
                     FROM choices WHERE question_id = ? ORDER BY position
                     """)) {
            statement.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
            statement.setLong(1, questionId);
            try (ResultSet result = statement.executeQuery()) {
                return readChoices(result);
            }
        }
    }

    private List<Question> attachChoices(Connection connection, List<Question> questions)
            throws SQLException {
        if (questions.isEmpty()) {
            return List.of();
        }
        String sql = "SELECT id, question_id, content, is_correct, position FROM choices"
                + " WHERE question_id IN (" + placeholders(questions.size()) + ")"
                + " ORDER BY question_id, position";
        Map<Long, List<Choice>> choices = new HashMap<>();
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
            for (int i = 0; i < questions.size(); i++) {
                statement.setLong(i + 1, questions.get(i).getId());
            }
            try (ResultSet result = statement.executeQuery()) {
                for (Choice choice : readChoices(result)) {
                    choices.computeIfAbsent(choice.questionId(), ignored -> new ArrayList<>()).add(choice);
                }
            }
        }
        return questions.stream().map(question -> new Question(question.getId(), question.getContent(),
                question.getCategory(), question.getLevel(), question.getExplanation(),
                choices.getOrDefault(question.getId(), List.of()))).toList();
    }

    static List<Question> readQuestions(ResultSet result) throws SQLException {
        List<Question> questions = new ArrayList<>();
        while (result.next()) {
            questions.add(new Question(result.getLong("id"), result.getString("content"),
                    result.getString("category"), result.getString("level"),
                    result.getString("explanation"), List.of()));
        }
        return questions;
    }

    static List<Choice> readChoices(ResultSet result) throws SQLException {
        List<Choice> choices = new ArrayList<>();
        while (result.next()) {
            boolean correct = result.getBoolean("is_correct");
            if (result.wasNull()) {
                throw new SQLException("Invalid choice id=" + result.getLong("id") + ": is_correct is null");
            }
            choices.add(new Choice(result.getLong("id"), result.getLong("question_id"),
                    result.getString("content"), correct, result.getInt("position")));
        }
        return choices;
    }

    private static String placeholders(int count) {
        return String.join(", ", Collections.nCopies(count, "?"));
    }
}
