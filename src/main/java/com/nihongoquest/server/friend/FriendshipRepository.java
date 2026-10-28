package com.nihongoquest.server.friend;

import com.nihongoquest.server.database.Database;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/** JDBC đơn giản cho tìm user và bảng friendships đã chuẩn hóa low/high. */
public class FriendshipRepository {
    private final Database database;

    public FriendshipRepository(Database database) {
        this.database = Objects.requireNonNull(database);
    }

    public List<UserRow> searchUsers(long currentUserId, String query) throws SQLException {
        String sql = """
                SELECT id, username
                FROM users
                WHERE id <> ? AND username ILIKE ?
                ORDER BY username ASC
                LIMIT 20
                """;
        List<UserRow> users = new ArrayList<>();
        try (Connection connection = database.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, currentUserId);
            statement.setString(2, "%" + query + "%");
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) users.add(readUser(result));
            }
        }
        return List.copyOf(users);
    }

    public boolean sendRequest(long fromUserId, long toUserId) throws SQLException {
        long low = Math.min(fromUserId, toUserId);
        long high = Math.max(fromUserId, toUserId);
        String sql = """
                INSERT INTO friendships
                    (user_low_id, user_high_id, requested_by_id, status)
                VALUES (?, ?, ?, 'PENDING')
                ON CONFLICT (user_low_id, user_high_id) DO NOTHING
                """;
        try (Connection connection = database.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, low);
            statement.setLong(2, high);
            statement.setLong(3, fromUserId);
            return statement.executeUpdate() == 1;
        }
    }

    public List<UserRow> findIncomingRequests(long userId) throws SQLException {
        String sql = """
                SELECT requester.id, requester.username
                FROM friendships friendship
                JOIN users requester ON requester.id = friendship.requested_by_id
                WHERE friendship.status = 'PENDING'
                  AND friendship.requested_by_id <> ?
                  AND (friendship.user_low_id = ? OR friendship.user_high_id = ?)
                ORDER BY friendship.created_at ASC
                """;
        return findUsers(sql, userId, userId, userId);
    }

    public List<UserRow> findFriends(long userId) throws SQLException {
        String sql = """
                SELECT friend.id, friend.username
                FROM friendships friendship
                JOIN users friend ON friend.id = CASE
                    WHEN friendship.user_low_id = ? THEN friendship.user_high_id
                    ELSE friendship.user_low_id
                END
                WHERE friendship.status = 'ACCEPTED'
                  AND (friendship.user_low_id = ? OR friendship.user_high_id = ?)
                ORDER BY friend.username ASC
                """;
        return findUsers(sql, userId, userId, userId);
    }

    public boolean respond(long currentUserId, long requesterId, boolean accept) throws SQLException {
        long low = Math.min(currentUserId, requesterId);
        long high = Math.max(currentUserId, requesterId);
        String sql = accept ? """
                UPDATE friendships
                SET status = 'ACCEPTED', updated_at = now()
                WHERE user_low_id = ? AND user_high_id = ?
                  AND status = 'PENDING' AND requested_by_id = ?
                """ : """
                DELETE FROM friendships
                WHERE user_low_id = ? AND user_high_id = ?
                  AND status = 'PENDING' AND requested_by_id = ?
                """;
        try (Connection connection = database.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, low);
            statement.setLong(2, high);
            statement.setLong(3, requesterId);
            return statement.executeUpdate() == 1;
        }
    }

    public boolean remove(long userId, long friendId) throws SQLException {
        long low = Math.min(userId, friendId);
        long high = Math.max(userId, friendId);
        String sql = """
                DELETE FROM friendships
                WHERE user_low_id = ? AND user_high_id = ? AND status = 'ACCEPTED'
                """;
        try (Connection connection = database.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, low);
            statement.setLong(2, high);
            return statement.executeUpdate() == 1;
        }
    }

    public boolean areFriends(long firstUserId, long secondUserId) throws SQLException {
        long low = Math.min(firstUserId, secondUserId);
        long high = Math.max(firstUserId, secondUserId);
        String sql = """
                SELECT 1 FROM friendships
                WHERE user_low_id = ? AND user_high_id = ? AND status = 'ACCEPTED'
                """;
        try (Connection connection = database.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, low);
            statement.setLong(2, high);
            try (ResultSet result = statement.executeQuery()) {
                return result.next();
            }
        }
    }

    private List<UserRow> findUsers(String sql, long... parameters) throws SQLException {
        List<UserRow> users = new ArrayList<>();
        try (Connection connection = database.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            for (int i = 0; i < parameters.length; i++) statement.setLong(i + 1, parameters[i]);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) users.add(readUser(result));
            }
        }
        return List.copyOf(users);
    }

    private static UserRow readUser(ResultSet result) throws SQLException {
        return new UserRow(result.getLong("id"), result.getString("username"));
    }

    public record UserRow(long userId, String username) { }
}
