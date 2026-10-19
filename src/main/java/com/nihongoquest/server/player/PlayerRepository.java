package com.nihongoquest.server.player;

import com.nihongoquest.server.database.Database;

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
        public com.fasterxml.jackson.databind.JsonNode toPayload() {
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
