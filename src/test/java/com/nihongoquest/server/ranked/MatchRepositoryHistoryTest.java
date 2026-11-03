package com.nihongoquest.server.ranked;

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
import java.sql.Timestamp;
import java.sql.Types;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MatchRepositoryHistoryTest {
    @Test
    void returnsNewestMatchesFromCurrentPlayerPerspective() throws Exception {
        JdbcStub jdbc = new JdbcStub();

        List<MatchRepository.MatchHistoryItem> history =
                new MatchRepository(jdbc.database()).findHistory(8, 100);

        MatchRepository.MatchHistoryItem match = history.getFirst();
        assertEquals("sakura", match.opponentUsername());
        assertEquals(5, match.myScore());
        assertEquals(3, match.opponentScore());
        assertEquals("WIN", match.result());
        assertEquals("2026-10-19T05:00:00Z", match.playedAt());
        assertTrue(jdbc.sql.contains("ORDER BY m.played_at DESC"));
        assertEquals(Map.of(1, 8L, 2, 8L, 3, 100), jdbc.parameters);
    }

    private static final class JdbcStub {
        String sql;
        final Map<Integer, Object> parameters = new HashMap<>();

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
                        case "prepareStatement" -> {
                            sql = (String) args[0];
                            yield statement();
                        }
                        case "close" -> null;
                        default -> throw new AssertionError("Unexpected connection call " + method.getName());
                    });
        }

        private PreparedStatement statement() {
            return (PreparedStatement) Proxy.newProxyInstance(getClass().getClassLoader(),
                    new Class<?>[]{PreparedStatement.class}, (proxy, method, args) -> switch (method.getName()) {
                        case "setLong", "setInt" -> { parameters.put((Integer) args[0], args[1]); yield null; }
                        case "setQueryTimeout", "close" -> null;
                        case "executeQuery" -> rows();
                        default -> throw new AssertionError("Unexpected statement call " + method.getName());
                    });
        }

        private ResultSet rows() throws SQLException {
            String[] columns = {"id", "player1_id", "player2_id", "player1_username",
                    "player2_username", "score1", "score2", "winner_id",
                    "duration_seconds", "end_reason", "played_at"};
            int[] types = {Types.BIGINT, Types.BIGINT, Types.BIGINT, Types.VARCHAR,
                    Types.VARCHAR, Types.INTEGER, Types.INTEGER, Types.BIGINT,
                    Types.INTEGER, Types.VARCHAR, Types.TIMESTAMP};
            Object[] values = {21L, 7L, 8L, "sakura", "tanaka", 3, 5, 8L,
                    180, "NORMAL", Timestamp.from(Instant.parse("2026-10-19T05:00:00Z"))};
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
