package com.nihongoquest.server.player;

import com.nihongoquest.server.infrastructure.persistence.Database;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.*;

class PlayerRepositoryTest {
    @ParameterizedTest
    @CsvSource({"true,false,1,0,0", "false,true,0,1,0", "false,false,0,0,1"})
    void updatesUsersAndIncrementsMatchCountWithWinLossOrDraw(boolean won, boolean lost,
                                                             int wins, int losses, int draws) throws Exception {
        Map<Integer, Object> parameters = new HashMap<>();
        AtomicBoolean statementClosed = new AtomicBoolean();
        AtomicBoolean connectionClosed = new AtomicBoolean();
        PreparedStatement statement = (PreparedStatement) Proxy.newProxyInstance(getClass().getClassLoader(),
                new Class<?>[]{PreparedStatement.class}, (proxy, method, args) -> switch (method.getName()) {
                    case "setInt", "setLong" -> { parameters.put((Integer) args[0], args[1]); yield null; }
                    case "executeUpdate" -> 1;
                    case "close" -> { statementClosed.set(true); yield null; }
                    default -> throw new AssertionError("Unexpected JDBC method: " + method.getName());
                });
        Connection connection = (Connection) Proxy.newProxyInstance(getClass().getClassLoader(),
                new Class<?>[]{Connection.class}, (proxy, method, args) -> switch (method.getName()) {
                    case "prepareStatement" -> {
                        String sql = (String) args[0];
                        assertTrue(sql.contains("UPDATE users"));
                        assertTrue(sql.contains("total_matches = total_matches + 1"));
                        assertTrue(sql.contains("draws = draws + ?"));
                        yield statement;
                    }
                    case "close" -> { connectionClosed.set(true); yield null; }
                    default -> throw new AssertionError("Unexpected JDBC method: " + method.getName());
                });
        Database database = new Database() {
            @Override public Connection getConnection() { return connection; }
        };
        new PlayerRepository(database).recordMatchResult(3_000_000_000L, won, lost, 3, 2);
        assertEquals(Map.of(1, wins, 2, losses, 3, 3, 4, 2, 5, draws, 6, 3_000_000_000L), parameters);
        assertTrue(statementClosed.get());
        assertTrue(connectionClosed.get());
    }
}
