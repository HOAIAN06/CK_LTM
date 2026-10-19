package com.nihongoquest.server.ranked;

import com.nihongoquest.server.database.Database;
import com.nihongoquest.server.ranked.MatchRepository.EndReason;
import com.nihongoquest.server.ranked.MatchRepository.MatchResult;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class MatchRepositoryTest {
    @Test
    void savesOneMatchAndBothStatisticsInOneTransaction() throws Exception {
        JdbcStub jdbc = new JdbcStub();
        new MatchRepository(jdbc.database()).saveResult(
                new MatchResult(2, 3, 4, 3), new MatchResult(1, 1, 4, 1),
                180, EndReason.NORMAL, null);

        assertEquals(3, jdbc.writes.size());
        assertTrue(jdbc.writes.getFirst().sql().contains("INSERT INTO matches"));
        assertEquals(2L, jdbc.writes.getFirst().params().get(1));
        assertEquals(1L, jdbc.writes.getFirst().params().get(2));
        assertEquals(2L, jdbc.writes.getFirst().params().get(5));
        assertEquals(180, jdbc.writes.getFirst().params().get(6));
        assertEquals("NORMAL", jdbc.writes.getFirst().params().get(7));
        assertEquals(1L, jdbc.writes.get(1).params().get(7));
        assertEquals(2L, jdbc.writes.get(2).params().get(7));
        assertEquals(1, jdbc.commits);
        assertEquals(0, jdbc.rollbacks);
        assertTrue(jdbc.closed);
    }

    @Test
    void rollsBackWhenAnyWriteFails() {
        JdbcStub jdbc = new JdbcStub();
        jdbc.failAt = 2;
        assertThrows(SQLException.class, () -> new MatchRepository(jdbc.database()).saveResult(
                new MatchResult(1, 0, 0, 0), new MatchResult(2, 0, 0, 0),
                300, EndReason.NORMAL, null));
        assertEquals(0, jdbc.commits);
        assertEquals(1, jdbc.rollbacks);
        assertTrue(jdbc.closed);
    }

    @Test
    void disconnectOverridesScoreWhenChoosingWinner() {
        MatchResult first = new MatchResult(1, 10, 10, 10);
        MatchResult second = new MatchResult(2, 0, 0, 0);
        assertEquals(2L, MatchRepository.winner(first, second, 1L));
        assertNull(MatchRepository.winner(first, new MatchResult(2, 10, 10, 10), null));
    }

    private record Write(String sql, Map<Integer, Object> params) { }

    private static final class JdbcStub {
        final List<Write> writes = new ArrayList<>();
        int commits;
        int rollbacks;
        int writeCount;
        int failAt;
        boolean closed;

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
                        case "setAutoCommit" -> null;
                        case "prepareStatement" -> statement((String) args[0]);
                        case "commit" -> { commits++; yield null; }
                        case "rollback" -> { rollbacks++; yield null; }
                        case "close" -> { closed = true; yield null; }
                        default -> throw new AssertionError("Unexpected connection call " + method.getName());
                    });
        }

        private PreparedStatement statement(String sql) {
            Map<Integer, Object> params = new HashMap<>();
            return (PreparedStatement) Proxy.newProxyInstance(getClass().getClassLoader(),
                    new Class<?>[]{PreparedStatement.class}, (proxy, method, args) -> switch (method.getName()) {
                        case "setLong", "setInt", "setString" -> {
                            params.put((Integer) args[0], args[1]); yield null;
                        }
                        case "setNull" -> { params.put((Integer) args[0], null); yield null; }
                        case "setQueryTimeout", "close" -> null;
                        case "executeUpdate" -> {
                            if (++writeCount == failAt) throw new SQLException("Injected failure");
                            writes.add(new Write(sql, new HashMap<>(params)));
                            yield 1;
                        }
                        default -> throw new AssertionError("Unexpected statement call " + method.getName());
                    });
        }
    }
}
