package com.nihongoquest.server.friend;

import com.nihongoquest.server.database.Database;
import org.junit.jupiter.api.Test;

import javax.sql.rowset.CachedRowSet;
import javax.sql.rowset.RowSetMetaDataImpl;
import javax.sql.rowset.RowSetProvider;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Types;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FriendshipRepositoryTest {
    @Test
    void normalizesPairForRequestRespondRemoveAndFriendCheck() throws Exception {
        JdbcStub jdbc = new JdbcStub();
        FriendshipRepository repository = new FriendshipRepository(jdbc.database());

        assertTrue(repository.sendRequest(9, 3));
        assertTrue(repository.respond(9, 3, true));
        assertTrue(repository.areFriends(9, 3));
        assertTrue(repository.remove(9, 3));

        assertEquals(Map.of(1, 3L, 2, 9L, 3, 9L), jdbc.parameters.get(0));
        assertEquals(Map.of(1, 3L, 2, 9L, 3, 3L), jdbc.parameters.get(1));
        assertEquals(Map.of(1, 3L, 2, 9L), jdbc.parameters.get(2));
        assertEquals(Map.of(1, 3L, 2, 9L), jdbc.parameters.get(3));
        assertTrue(jdbc.sql.getFirst().contains("ON CONFLICT"));
        assertTrue(jdbc.sql.get(1).contains("status = 'ACCEPTED'"));
    }

    private static final class JdbcStub {
        final List<String> sql = new ArrayList<>();
        final List<Map<Integer, Object>> parameters = new ArrayList<>();

        Database database() {
            return new Database("jdbc:test", "", "") {
                @Override public Connection getConnection() { return connection(); }
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
                        case "setLong" -> { values.put((Integer) args[0], args[1]); yield null; }
                        case "executeUpdate" -> 1;
                        case "executeQuery" -> oneRow();
                        case "close" -> null;
                        default -> throw new AssertionError("Unexpected statement call " + method.getName());
                    });
        }

        private ResultSet oneRow() throws Exception {
            CachedRowSet rows = RowSetProvider.newFactory().createCachedRowSet();
            RowSetMetaDataImpl metadata = new RowSetMetaDataImpl();
            metadata.setColumnCount(1);
            metadata.setColumnName(1, "exists");
            metadata.setColumnType(1, Types.INTEGER);
            rows.setMetaData(metadata);
            rows.moveToInsertRow();
            rows.updateInt(1, 1);
            rows.insertRow();
            rows.moveToCurrentRow();
            rows.beforeFirst();
            return rows;
        }
    }
}
