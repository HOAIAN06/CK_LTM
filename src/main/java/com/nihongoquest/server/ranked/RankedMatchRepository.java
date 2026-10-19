package com.nihongoquest.server.ranked;

import com.nihongoquest.server.infrastructure.persistence.Database;
import com.nihongoquest.server.question.Question;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Types;

/** JDBC only. Methods accepting a connection never own its transaction or lifetime. */
public class RankedMatchRepository {
    private final Database database;

    public RankedMatchRepository(Database database) {
        this.database = database;
    }

    public long createMatch(Connection connection) throws SQLException {
        try (PreparedStatement statement = prepare(connection, """
                INSERT INTO ranked_matches (status, started_at)
                VALUES ('PLAYING', CURRENT_TIMESTAMP) RETURNING id
                """)) {
            try (var result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Missing generated match ID");
                return result.getLong("id");
            }
        }
    }

    public void addPlayer(Connection connection, long matchId, long userId, int ratingBefore)
            throws SQLException {
        try (PreparedStatement statement = prepare(connection, """
                INSERT INTO ranked_match_players (match_id, user_id, rating_before)
                VALUES (?, ?, ?)
                """)) {
            statement.setLong(1, matchId);
            statement.setLong(2, userId);
            statement.setInt(3, ratingBefore);
            requireOne(statement.executeUpdate());
        }
    }

    public void addMatchQuestion(Connection connection, long matchId, Question question,
                                 int questionOrder, int timeLimitSeconds) throws SQLException {
        try (PreparedStatement statement = prepare(connection, """
                INSERT INTO ranked_match_questions
                    (match_id, question_id, question_order, time_limit_seconds, question_content_snapshot)
                VALUES (?, ?, ?, ?, ?)
                """)) {
            statement.setLong(1, matchId);
            statement.setLong(2, question.getId());
            statement.setInt(3, questionOrder);
            statement.setInt(4, timeLimitSeconds);
            statement.setString(5, question.getContent());
            requireOne(statement.executeUpdate());
        }
    }

    public void saveAnswer(long matchId, long userId, long questionId, Long choiceId,
                           boolean correct, long responseTimeMs, int scoreEarned) throws SQLException {
        try (Connection connection = database.getConnection();
             PreparedStatement statement = prepare(connection, """
                     INSERT INTO ranked_answers
                         (match_id, user_id, question_id, choice_id, is_correct, response_time_ms, score_earned)
                     VALUES (?, ?, ?, ?, ?, ?, ?)
                     """)) {
            statement.setLong(1, matchId);
            statement.setLong(2, userId);
            statement.setLong(3, questionId);
            nullableId(statement, 4, choiceId);
            statement.setBoolean(5, correct);
            statement.setLong(6, responseTimeMs);
            statement.setInt(7, scoreEarned);
            requireOne(statement.executeUpdate());
        }
    }

    public void updatePlayerResult(Connection connection, long matchId, long userId,
                                   int score, int correctAnswers, int ratingAfter) throws SQLException {
        try (PreparedStatement statement = prepare(connection, """
                UPDATE ranked_match_players SET score = ?, correct_answers = ?, rating_after = ?
                WHERE match_id = ? AND user_id = ?
                """)) {
            statement.setInt(1, score);
            statement.setInt(2, correctAnswers);
            statement.setInt(3, ratingAfter);
            statement.setLong(4, matchId);
            statement.setLong(5, userId);
            requireOne(statement.executeUpdate());
        }
    }

    /** Serializes finalization across rooms/retries, including an ambiguous commit acknowledgement. */
    public String lockStatus(Connection connection, long matchId) throws SQLException {
        try (PreparedStatement statement = prepare(connection,
                "SELECT status FROM ranked_matches WHERE id = ? FOR UPDATE")) {
            statement.setLong(1, matchId);
            try (var result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Ranked match missing: " + matchId);
                return result.getString("status");
            }
        }
    }

    public void finishMatch(Connection connection, long matchId, Long winnerId) throws SQLException {
        try (PreparedStatement statement = prepare(connection, """
                UPDATE ranked_matches SET status = 'FINISHED', finished_at = CURRENT_TIMESTAMP, winner_id = ?
                WHERE id = ? AND status = 'PLAYING'
                """)) {
            nullableId(statement, 1, winnerId);
            statement.setLong(2, matchId);
            requireOne(statement.executeUpdate());
        }
    }

    /** An answer write failure invalidates the match; keep its history without awarding statistics. */
    public void cancelMatch(long matchId) throws SQLException {
        try (Connection connection = database.getConnection();
             PreparedStatement statement = prepare(connection, """
                     UPDATE ranked_matches SET status = 'CANCELLED', finished_at = CURRENT_TIMESTAMP
                     WHERE id = ? AND status = 'PLAYING'
                     """)) {
            statement.setLong(1, matchId);
            statement.executeUpdate();
        }
    }

    private static PreparedStatement prepare(Connection connection, String sql) throws SQLException {
        PreparedStatement statement = connection.prepareStatement(sql);
        try {
            statement.setQueryTimeout(10);
            return statement;
        } catch (SQLException e) {
            statement.close();
            throw e;
        }
    }

    private static void nullableId(PreparedStatement statement, int index, Long id) throws SQLException {
        if (id == null) statement.setNull(index, Types.BIGINT);
        else statement.setLong(index, id);
    }

    private static void requireOne(int count) throws SQLException {
        if (count != 1) throw new SQLException("Expected exactly one Ranked row, got " + count);
    }
}
