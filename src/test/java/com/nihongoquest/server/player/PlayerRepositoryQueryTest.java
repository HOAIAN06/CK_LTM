package com.nihongoquest.server.player;

import com.nihongoquest.server.database.Database;
import org.junit.jupiter.api.Test;

import javax.sql.rowset.CachedRowSet;
import javax.sql.rowset.RowSetMetaDataImpl;
import javax.sql.rowset.RowSetProvider;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PlayerRepositoryQueryTest {
    @Test
    void loadsFreshProfileAndOrderedTopTenWithPreparedStatements() throws Exception {
        JdbcStub jdbc = new JdbcStub();
        PlayerRepository repository = new PlayerRepository(jdbc.database());

        PlayerRepository.PlayerData profile = repository.findProfile(7);
        List<PlayerRepository.LeaderboardPlayer> leaderboard = repository.findLeaderboard(10);

        assertEquals("sakura", profile.username());
        assertEquals(2, profile.draws());
        assertEquals(240, profile.totalScore());
        assertEquals(Map.of(1, 7L), jdbc.parameters.get(0));
        assertEquals(Map.of(1, 10), jdbc.parameters.get(1));
        assertTrue(jdbc.sql.get(1).contains(
                "ORDER BY wins DESC, total_score DESC, username ASC"));
        assertEquals(1, leaderboard.getFirst().rank());
        assertEquals("tanaka", leaderboard.getFirst().username());
        assertEquals(900, leaderboard.getFirst().totalScore());
    }

    @Test
    void rejectsLeaderboardLimitOutsideSimpleProjectBoundary() {
        PlayerRepository repository = new PlayerRepository(new Database("jdbc:test", "", ""));
        org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
                () -> repository.findLeaderboard(101));
    }

    private static final class JdbcStub {
        final List<String> sql = new ArrayList<>();
        final List<Map<Integer, Object>> parameters = new ArrayList<>();

        Database database() {
            return new Database("jdbc:test", "", "") {
                @Override public Connection getConnection() {
                    return connection();
                }
            };
        }

        private Connection connection() {
            return (Connection) Proxy.newProxyInstance(getClass().getClassLoader(),
                    new Class<?>[]{Connection.class}, (proxy, method, args) -> switch (method.getName()) {
                        case "prepareStatement" -> statement((String) args[0]);
                        case "close" -> null;
                        default -> throw new AssertionError("Unexpected connection call " + method.getName());
                    });
        }

        private PreparedStatement statement(String query) {
            sql.add(query);
            Map<Integer, Object> values = new HashMap<>();
            parameters.add(values);
            return (PreparedStatement) Proxy.newProxyInstance(getClass().getClassLoader(),
                    new Class<?>[]{PreparedStatement.class}, (proxy, method, args) -> switch (method.getName()) {
                        case "setLong", "setInt" -> { values.put((Integer) args[0], args[1]); yield null; }
                        case "executeQuery" -> query.contains("WHERE id = ?") ? profileRows() : leaderboardRows();
                        case "close" -> null;
                        default -> throw new AssertionError("Unexpected statement call " + method.getName());
                    });
        }

        private ResultSet profileRows() throws SQLException {
            return row(new String[]{"id", "username", "wins", "losses", "draws", "total_score",
                            "questions_answered", "correct_answers"},
                    new int[]{Types.BIGINT, Types.VARCHAR, Types.INTEGER, Types.INTEGER,
                            Types.INTEGER, Types.INTEGER, Types.INTEGER, Types.INTEGER},
                    new Object[]{7L, "sakura", 4, 1, 2, 240, 20, 12});
        }

        private ResultSet leaderboardRows() throws SQLException {
            return row(new String[]{"id", "username", "wins", "losses", "draws", "total_score"},
                    new int[]{Types.BIGINT, Types.VARCHAR, Types.INTEGER, Types.INTEGER,
                            Types.INTEGER, Types.INTEGER},
                    new Object[]{9L, "tanaka", 8, 2, 1, 900});
        }

        private CachedRowSet row(String[] columns, int[] types, Object[] values) throws SQLException {
            CachedRowSet rows = RowSetProvider.newFactory().createCachedRowSet();
            RowSetMetaDataImpl metadata = new RowSetMetaDataImpl();
            metadata.setColumnCount(columns.length);
            for (int i = 0; i < columns.length; i++) {
                metadata.setColumnName(i + 1, columns[i]);
                metadata.setColumnType(i + 1, types[i]);
            }
            rows.setMetaData(metadata);
            rows.moveToInsertRow();
            for (int i = 0; i < values.length; i++) rows.updateObject(i + 1, values[i]);
            rows.insertRow();
            rows.moveToCurrentRow();
            rows.beforeFirst();
            return rows;
        }
    }
}
