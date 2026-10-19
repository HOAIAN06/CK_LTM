package com.nihongoquest.server.player;

import com.nihongoquest.server.infrastructure.persistence.Database;

import org.mindrot.jbcrypt.BCrypt;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

public class PlayerRepository {

    private final Database database;

    public PlayerRepository(Database database) {
        this.database = database;
    }

    public AuthResult register(String username, String password) throws SQLException {
        String sql = """
                INSERT INTO users (username, password_hash)
                VALUES (?, ?)
                RETURNING id, username, wins, losses, questions_answered, correct_answers
                """;

        try (Connection connection = database.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, username);
            statement.setString(2, BCrypt.hashpw(password, BCrypt.gensalt()));
            try (ResultSet result = statement.executeQuery()) {
                result.next();
                return AuthResult.success(readPlayer(result));
            }
        } catch (SQLException e) {
            if ("23505".equals(e.getSQLState())) {
                return AuthResult.failure("USERNAME_TAKEN");
            }
            throw e;
        }
    }

    public AuthResult login(String username, String password) throws SQLException {
        String sql = """
                SELECT id, username, password_hash, wins, losses,
                       questions_answered, correct_answers
                FROM users
                WHERE username = ?
                """;

        try (Connection connection = database.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, username);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next() || !BCrypt.checkpw(password, result.getString("password_hash"))) {
                    return AuthResult.failure("INVALID_CREDENTIALS");
                }
                return AuthResult.success(readPlayer(result));
            }
        }
    }

    public void recordMatchResult(long playerId, boolean won, boolean lost,
                                  int questionsAnswered, int correctAnswers) throws SQLException {
        String sql = """
                UPDATE users
                SET wins = wins + ?, losses = losses + ?,
                    questions_answered = questions_answered + ?,
                    correct_answers = correct_answers + ?,
                    total_matches = total_matches + 1,
                    draws = draws + ?
                WHERE id = ?
                """;
        try (Connection connection = database.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, won ? 1 : 0);
            statement.setInt(2, lost ? 1 : 0);
            statement.setInt(3, questionsAnswered);
            statement.setInt(4, correctAnswers);
            statement.setInt(5, !won && !lost ? 1 : 0);
            statement.setLong(6, playerId);
            statement.executeUpdate();
        }
    }

    public int getRankedRating(Connection connection, long userId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT ranked_rating FROM users WHERE id = ?")) {
            statement.setQueryTimeout(10);
            statement.setLong(1, userId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Ranked user missing: " + userId);
                return result.getInt("ranked_rating");
            }
        }
    }

    public void updateRankedStatistics(Connection connection, long userId, int score,
                                       boolean won, boolean lost, int questionsAnswered,
                                       int correctAnswers, int ratingDelta) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("""
                UPDATE users SET total_score = total_score + ?, total_matches = total_matches + 1,
                    wins = wins + ?, losses = losses + ?, draws = draws + ?,
                    questions_answered = questions_answered + ?, correct_answers = correct_answers + ?,
                    ranked_rating = ranked_rating + ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """)) {
            statement.setQueryTimeout(10);
            statement.setInt(1, score);
            statement.setInt(2, won ? 1 : 0);
            statement.setInt(3, lost ? 1 : 0);
            statement.setInt(4, !won && !lost ? 1 : 0);
            statement.setInt(5, questionsAnswered);
            statement.setInt(6, correctAnswers);
            statement.setInt(7, ratingDelta);
            statement.setLong(8, userId);
            if (statement.executeUpdate() != 1) throw new SQLException("Ranked user missing: " + userId);
        }
    }

    private PlayerData readPlayer(ResultSet result) throws SQLException {
        return new PlayerData(
                result.getLong("id"),
                result.getString("username"),
                result.getInt("wins"),
                result.getInt("losses"),
                result.getInt("questions_answered"),
                result.getInt("correct_answers")
        );
    }

    public record PlayerData(long id, String username, int wins, int losses,
                             int questionsAnswered, int correctAnswers) {
        public String toPayload() {
            return com.nihongoquest.common.protocol.Payloads.player(id, username, wins, losses,
                    questionsAnswered, correctAnswers);
        }
    }

    public record AuthResult(boolean success, PlayerData player, String reason) {
        public static AuthResult success(PlayerData player) {
            return new AuthResult(true, player, null);
        }

        public static AuthResult failure(String reason) {
            return new AuthResult(false, null, reason);
        }
    }
}
