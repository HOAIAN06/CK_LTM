package com.nihongoquest.server.ranked;

import com.nihongoquest.server.database.Database;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/** Lưu một kết quả Ranked và thống kê hai người trong một transaction JDBC ngắn. */
public class MatchRepository {
    private static final int QUERY_TIMEOUT_SECONDS = 10;
    private final Database database;

    public MatchRepository(Database database) {
        this.database = Objects.requireNonNull(database);
    }

    public void saveResult(MatchResult first, MatchResult second, int durationSeconds,
                           EndReason reason, Long forfeitingUserId) throws SQLException {
        validate(first, second, durationSeconds, forfeitingUserId);
        Long winnerId = winner(first, second, forfeitingUserId);
        try (Connection connection = database.getConnection()) {
            connection.setAutoCommit(false);
            try {
                insertMatch(connection, first, second, durationSeconds, reason, winnerId);
                List<MatchResult> ordered = List.of(first, second).stream()
                        .sorted(Comparator.comparingLong(MatchResult::userId)).toList();
                for (MatchResult result : ordered) {
                    updateStatistics(connection, result,
                            winnerId != null && winnerId == result.userId(),
                            winnerId != null && winnerId != result.userId());
                }
                connection.commit();
            } catch (SQLException | RuntimeException e) {
                try {
                    connection.rollback();
                } catch (SQLException rollbackFailure) {
                    e.addSuppressed(rollbackFailure);
                }
                throw e;
            }
        }
    }

    public List<MatchHistoryItem> findHistory(long userId, int limit) throws SQLException {
        if (limit < 1 || limit > 100) throw new IllegalArgumentException("Limit khong hop le");
        String sql = """
                SELECT m.id, m.player1_id, m.player2_id,
                       player1.username AS player1_username,
                       player2.username AS player2_username,
                       m.score1, m.score2, m.winner_id, m.duration_seconds,
                       m.end_reason, m.played_at
                FROM matches m
                JOIN users player1 ON player1.id = m.player1_id
                JOIN users player2 ON player2.id = m.player2_id
                WHERE m.player1_id = ? OR m.player2_id = ?
                ORDER BY m.played_at DESC
                LIMIT ?
                """;
        List<MatchHistoryItem> history = new ArrayList<>();
        try (Connection connection = database.getConnection();
             PreparedStatement statement = prepare(connection, sql)) {
            statement.setLong(1, userId);
            statement.setLong(2, userId);
            statement.setInt(3, limit);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) history.add(readHistory(result, userId));
            }
        }
        return List.copyOf(history);
    }

    static MatchHistoryItem readHistory(ResultSet result, long userId) throws SQLException {
        long player1Id = result.getLong("player1_id");
        boolean first = player1Id == userId;
        long winnerId = result.getLong("winner_id");
        boolean draw = result.wasNull();
        String outcome = draw ? "DRAW" : winnerId == userId ? "WIN" : "LOSS";
        return new MatchHistoryItem(
                result.getLong("id"),
                result.getString(first ? "player2_username" : "player1_username"),
                result.getInt(first ? "score1" : "score2"),
                result.getInt(first ? "score2" : "score1"),
                outcome,
                result.getInt("duration_seconds"),
                result.getString("end_reason"),
                result.getTimestamp("played_at").toInstant().toString());
    }

    private void insertMatch(Connection connection, MatchResult first, MatchResult second,
                             int durationSeconds, EndReason reason, Long winnerId) throws SQLException {
        try (PreparedStatement statement = prepare(connection, """
                INSERT INTO matches
                    (player1_id, player2_id, score1, score2, winner_id, duration_seconds, end_reason)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """)) {
            statement.setLong(1, first.userId());
            statement.setLong(2, second.userId());
            statement.setInt(3, first.score());
            statement.setInt(4, second.score());
            if (winnerId == null) statement.setNull(5, Types.BIGINT);
            else statement.setLong(5, winnerId);
            statement.setInt(6, durationSeconds);
            statement.setString(7, reason.name());
            requireOne(statement.executeUpdate());
        }
    }

    private void updateStatistics(Connection connection, MatchResult result,
                                  boolean won, boolean lost) throws SQLException {
        try (PreparedStatement statement = prepare(connection, """
                UPDATE users
                SET wins = wins + ?, losses = losses + ?, draws = draws + ?,
                    total_score = total_score + ?,
                    questions_answered = questions_answered + ?,
                    correct_answers = correct_answers + ?, updated_at = now()
                WHERE id = ?
                """)) {
            statement.setInt(1, won ? 1 : 0);
            statement.setInt(2, lost ? 1 : 0);
            statement.setInt(3, !won && !lost ? 1 : 0);
            statement.setInt(4, result.score());
            statement.setInt(5, result.questionsAnswered());
            statement.setInt(6, result.correctAnswers());
            statement.setLong(7, result.userId());
            requireOne(statement.executeUpdate());
        }
    }

    public static Long winner(MatchResult first, MatchResult second, Long forfeitingUserId) {
        if (forfeitingUserId != null) {
            return forfeitingUserId == first.userId() ? second.userId() : first.userId();
        }
        if (first.score() == second.score()) return null;
        return first.score() > second.score() ? first.userId() : second.userId();
    }

    private static void validate(MatchResult first, MatchResult second, int durationSeconds,
                                 Long forfeitingUserId) {
        if (first.userId() == second.userId() || (durationSeconds != 180 && durationSeconds != 300)) {
            throw new IllegalArgumentException("Kết quả Ranked không hợp lệ");
        }
        if (forfeitingUserId != null && forfeitingUserId != first.userId()
                && forfeitingUserId != second.userId()) {
            throw new IllegalArgumentException("Người bỏ cuộc không thuộc trận");
        }
    }

    private static PreparedStatement prepare(Connection connection, String sql) throws SQLException {
        PreparedStatement statement = connection.prepareStatement(sql);
        statement.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
        return statement;
    }

    private static void requireOne(int count) throws SQLException {
        if (count != 1) throw new SQLException("Expected one changed row, got " + count);
    }

    public enum EndReason { NORMAL, DISCONNECT }

    public record MatchResult(long userId, int score, int questionsAnswered, int correctAnswers) {
        public MatchResult {
            if (userId <= 0 || score < 0 || questionsAnswered < 0
                    || correctAnswers < 0 || correctAnswers > questionsAnswered) {
                throw new IllegalArgumentException("Thống kê người chơi không hợp lệ");
            }
        }
    }

    public record MatchHistoryItem(long matchId, String opponentUsername,
                                   int myScore, int opponentScore, String result,
                                   int durationSeconds, String endReason, String playedAt) { }
}
