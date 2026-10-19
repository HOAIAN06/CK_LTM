package com.nihongoquest.server.infrastructure.persistence;

import java.sql.Connection;
import java.sql.SQLException;

/** One owned connection per transaction; never restore auto-commit after a failed rollback. */
public final class JdbcTransaction {
    private JdbcTransaction() { }

    public static <T> T execute(Database database, Work<T> work) throws SQLException {
        try (Connection connection = database.getConnection()) {
            connection.setAutoCommit(false);
            // The connection is closed afterwards, so restoring auto-commit is unnecessary.
            // In particular setAutoCommit(true) could commit partial work if rollback failed.
            try {
                T result = work.run(connection);
                connection.commit();
                return result;
            } catch (SQLException | RuntimeException e) {
                try {
                    connection.rollback();
                } catch (SQLException rollbackFailure) {
                    e.addSuppressed(rollbackFailure);
                }
                throw e;
            }
        }
    }

    @FunctionalInterface
    public interface Work<T> {
        T run(Connection connection) throws SQLException;
    }
}
