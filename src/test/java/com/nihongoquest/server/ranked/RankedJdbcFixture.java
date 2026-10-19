package com.nihongoquest.server.ranked;

import com.nihongoquest.server.infrastructure.persistence.Database;
import java.lang.reflect.Proxy;
import java.sql.*;
import java.util.*;

/** Strict offline JDBC double with staged writes and injected transaction failures. */
final class RankedJdbcFixture {
    static final long MATCH_ID = 4_000_000_000L;
    record Write(String sql, Map<Integer, Object> params) { }
    final List<Write> pending = new ArrayList<>();
    final List<Write> committed = new ArrayList<>();
    final List<String> queries = new ArrayList<>();
    int connections, closedConnections, statements, closedStatements, results, closedResults;
    int commits, rollbacks, writes, failWrite;
    boolean failCommit, failRollback;
    String status = "PLAYING";

    Database database() {
        return new Database() {
            @Override public Connection getConnection() {
                connections++;
                boolean[] autoCommit = {true};
                return proxy(Connection.class, (p, method, args) -> switch (method.getName()) {
                    case "setAutoCommit" -> { autoCommit[0] = (boolean) args[0]; yield null; }
                    case "prepareStatement" -> statement((String) args[0], autoCommit);
                    case "commit" -> {
                        if (failCommit) throw new SQLException("Injected commit failure");
                        commits++;
                        committed.addAll(pending);
                        if (pending.stream().anyMatch(w -> w.sql().contains("status = 'FINISHED'"))) status = "FINISHED";
                        pending.clear();
                        yield null;
                    }
                    case "rollback" -> {
                        rollbacks++;
                        if (failRollback) throw new SQLException("Injected rollback failure");
                        pending.clear();
                        yield null;
                    }
                    case "close" -> { closedConnections++; yield null; }
                    default -> throw new AssertionError("Unexpected connection call " + method.getName());
                });
            }
        };
    }

    private PreparedStatement statement(String sql, boolean[] autoCommit) {
        statements++;
        queries.add(sql);
        Map<Integer, Object> params = new HashMap<>();
        return proxy(PreparedStatement.class, (p, method, args) -> switch (method.getName()) {
            case "setInt", "setLong", "setString", "setBoolean" -> {
                params.put((int) args[0], args[1]); yield null;
            }
            case "setNull" -> { params.put((int) args[0], null); yield null; }
            case "setQueryTimeout" -> null;
            case "executeUpdate" -> { write(sql, params, autoCommit[0]); yield 1; }
            case "executeQuery" -> {
                Object value;
                if (sql.contains("INSERT INTO ranked_matches")) {
                    write(sql, params, autoCommit[0]); value = MATCH_ID;
                } else if (sql.contains("SELECT ranked_rating")) {
                    value = ((Long) params.get(1)) == 1L ? 1000 : 1100;
                } else if (sql.contains("SELECT status") && sql.contains("FOR UPDATE")) {
                    value = status;
                } else throw new AssertionError("Unexpected query " + sql);
                yield row(value);
            }
            case "close" -> { closedStatements++; yield null; }
            default -> throw new AssertionError("Unexpected statement call " + method.getName());
        });
    }

    private void write(String sql, Map<Integer, Object> params, boolean autoCommit) throws SQLException {
        if (++writes == failWrite) throw new SQLException("Injected write failure", "XX000");
        (autoCommit ? committed : pending).add(new Write(sql, new HashMap<>(params)));
    }

    private ResultSet row(Object value) {
        results++;
        boolean[] read = {false};
        return proxy(ResultSet.class, (p, method, args) -> switch (method.getName()) {
            case "next" -> { boolean next = !read[0]; read[0] = true; yield next; }
            case "getInt", "getLong", "getString" -> value;
            case "close" -> { closedResults++; yield null; }
            default -> throw new AssertionError("Unexpected result call " + method.getName());
        });
    }

    private static <T> T proxy(Class<T> type, java.lang.reflect.InvocationHandler handler) {
        return type.cast(Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[]{type}, handler));
    }
}
