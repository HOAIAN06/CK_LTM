package com.nihongoquest.server.quiz;

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

class QuizSetRepositoryTest {
    @Test
    void listQueriesKeepSqlClausesSeparatedAndBindOnlyOwnerId() throws Exception {
        JdbcStub jdbc = new JdbcStub();
        QuizSetRepository repository = new QuizSetRepository(jdbc.database());

        repository.listOwned(7L);
        repository.listPublished(7L);

        assertEquals(2, jdbc.sql.size());
        assertTrue(normalize(jdbc.sql.get(0)).contains(
                "WHERE qs.owner_id = ? GROUP BY qs.id, u.username"));
        assertTrue(normalize(jdbc.sql.get(1)).contains(
                "WHERE qs.is_published = TRUE GROUP BY qs.id, u.username"));
        assertEquals(Map.of(1, 7L), jdbc.parameters.get(0));
        assertTrue(jdbc.parameters.get(1).isEmpty());
    }

    private static String normalize(String sql) {
        return sql.replaceAll("\\s+", " ").trim();
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
                        case "setLong" -> { values.put((Integer) args[0], args[1]); yield null; }
                        case "setQueryTimeout", "close" -> null;
                        case "executeQuery" -> emptyRows();
                        default -> throw new AssertionError("Unexpected statement call " + method.getName());
                    });
        }

        private ResultSet emptyRows() throws SQLException {
            CachedRowSet rows = RowSetProvider.newFactory().createCachedRowSet();
            RowSetMetaDataImpl metadata = new RowSetMetaDataImpl();
            String[] columns = {"id", "owner_id", "owner_username", "title", "description",
                    "level", "is_published", "question_count"};
            int[] types = {Types.BIGINT, Types.BIGINT, Types.VARCHAR, Types.VARCHAR,
                    Types.VARCHAR, Types.VARCHAR, Types.BOOLEAN, Types.INTEGER};
            metadata.setColumnCount(columns.length);
            for (int i = 0; i < columns.length; i++) {
                metadata.setColumnName(i + 1, columns[i]);
                metadata.setColumnType(i + 1, types[i]);
            }
            rows.setMetaData(metadata);
            return rows;
        }
    }
}
