package com.nihongoquest.server.question;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import com.nihongoquest.server.infrastructure.persistence.Database;

import javax.sql.rowset.CachedRowSet;
import javax.sql.rowset.RowSetMetaDataImpl;
import javax.sql.rowset.RowSetProvider;
import java.sql.SQLException;
import java.sql.Types;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class QuestionRepositoryTest {
    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void batchesChoicesOnOneConnectionAndHandlesOptionalActiveColumn(boolean activeColumn) throws Exception {
        JdbcStub jdbc = new JdbcStub(activeColumn, false);
        List<Question> questions = new QuestionRepository(jdbc.database()).findRandomQuestions(
                "N5", 3, List.of(99L));
        assertEquals(1, jdbc.connections);
        assertEquals(3, jdbc.sql.size()); // metadata + random questions + batched choices
        String query = jdbc.sql.get(1);
        assertEquals(activeColumn, query.contains("is_active = TRUE"));
        assertTrue(query.contains("level = ?"));
        assertTrue(query.contains("id NOT IN (?)"));
        assertTrue(query.contains("ORDER BY RANDOM() LIMIT ?"));
        assertEquals(Map.of(1, "N5", 2, 99L, 3, 3), jdbc.bindings.get(1));
        assertTrue(jdbc.sql.get(2).contains("question_id IN (?)"));
        assertTrue(jdbc.sql.get(2).contains("ORDER BY question_id, position"));
        assertEquals(Map.of(1, 3_000_000_000L), jdbc.bindings.get(2));
        assertEquals(30_000_000_001L, questions.getFirst().getChoices().getFirst().id());
        assertEquals(1, jdbc.closedConnections);
        assertEquals(3, jdbc.closedStatements);
        assertEquals(3, jdbc.closedResults);
    }

    @Test
    void closesConnectionAndStatementsWhenChoiceQueryFails() {
        JdbcStub jdbc = new JdbcStub(true, true);
        assertThrows(SQLException.class, () -> new QuestionRepository(jdbc.database()).findRandomQuestions(3));
        assertFalse(jdbc.sql.get(1).contains("level = ?"));
        assertEquals(Map.of(1, 3), jdbc.bindings.get(1));
        assertEquals(1, jdbc.closedConnections);
        assertEquals(3, jdbc.closedStatements);
        assertEquals(2, jdbc.closedResults);
    }

    @Test
    void findByIdAndFindChoicesBindLongIds() throws Exception {
        JdbcStub jdbc = new JdbcStub(true, false);
        assertEquals(3_000_000_000L, new QuestionRepository(jdbc.database()).findById(3_000_000_000L).getId());
        assertTrue(jdbc.sql.get(1).contains("WHERE id = ? AND is_active = TRUE"));
        assertEquals(Map.of(1, 3_000_000_000L), jdbc.bindings.get(1));
        assertEquals(1, new QuestionRepository(jdbc.database()).findChoicesByQuestionId(3_000_000_000L).size());
        assertTrue(jdbc.sql.getLast().contains("WHERE question_id = ? ORDER BY position"));
        assertEquals(Map.of(1, 3_000_000_000L), jdbc.bindings.getLast());
        assertEquals(jdbc.connections, jdbc.closedConnections);
        assertEquals(jdbc.sql.size(), jdbc.closedStatements);
        assertEquals(jdbc.sql.size(), jdbc.closedResults);
    }

    @Test
    void mapsQuestionMetadataAndBigintIdsWithoutDatabase() throws Exception {
        try (CachedRowSet rows = row(new String[]{"id", "content", "category", "level", "explanation"},
                new int[]{Types.BIGINT, Types.VARCHAR, Types.VARCHAR, Types.VARCHAR, Types.VARCHAR},
                new Object[]{3_000_000_000L, "漢字 |\n意味？", "KANJI", null, "説明"})) {
            Question question = QuestionRepository.readQuestions(rows).getFirst();
            assertEquals(3_000_000_000L, question.getId());
            assertEquals("漢字 |\n意味？", question.getContent());
            assertEquals("KANJI", question.getCategory());
            assertNull(question.getLevel());
            assertEquals("説明", question.getExplanation());
            assertTrue(question.getChoices().isEmpty());
        }
    }

    @Test
    void mapsChoiceOwnershipAnswerKeyAndPosition() throws Exception {
        try (CachedRowSet rows = choiceRow(true)) {
            Choice choice = QuestionRepository.readChoices(rows).getFirst();
            assertEquals(30_000_000_001L, choice.id());
            assertEquals(3_000_000_000L, choice.questionId());
            assertEquals("答え", choice.content());
            assertTrue(choice.correct());
            assertEquals(4, choice.position());
        }
    }

    @Test
    void rejectsNullAnswerKeyInsteadOfSilentlyMappingItToFalse() throws Exception {
        try (CachedRowSet rows = choiceRow(null)) {
            assertTrue(assertThrows(SQLException.class, () -> QuestionRepository.readChoices(rows))
                    .getMessage().contains("is_correct is null"));
        }
    }

    private CachedRowSet choiceRow(Boolean correct) throws SQLException {
        return row(new String[]{"id", "question_id", "content", "is_correct", "position"},
                new int[]{Types.BIGINT, Types.BIGINT, Types.VARCHAR, Types.BOOLEAN, Types.INTEGER},
                new Object[]{30_000_000_001L, 3_000_000_000L, "答え", correct, 4});
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
        for (int i = 0; i < values.length; i++) {
            if (values[i] == null) rows.updateNull(i + 1);
            else rows.updateObject(i + 1, values[i]);
        }
        rows.insertRow();
        rows.moveToCurrentRow();
        rows.beforeFirst();
        return rows;
    }

    /** Small strict JDBC fake: tests SQL bindings, mapping and closure, not a real DB. */
    private class JdbcStub {
        final boolean activeColumn;
        final boolean failChoices;
        final List<String> sql = new ArrayList<>();
        final List<Map<Integer, Object>> bindings = new ArrayList<>();
        int connections;
        int closedConnections;
        int closedStatements;
        int closedResults;

        JdbcStub(boolean activeColumn, boolean failChoices) {
            this.activeColumn = activeColumn;
            this.failChoices = failChoices;
        }

        Database database() {
            return new Database() {
                @Override public Connection getConnection() {
                    connections++;
                    return (Connection) Proxy.newProxyInstance(getClass().getClassLoader(),
                            new Class<?>[]{Connection.class}, (proxy, method, args) -> switch (method.getName()) {
                                case "prepareStatement" -> statement((String) args[0]);
                                case "close" -> { closedConnections++; yield null; }
                                default -> throw new AssertionError("Unexpected JDBC method: " + method.getName());
                            });
                }
            };
        }

        PreparedStatement statement(String query) {
            sql.add(query);
            Map<Integer, Object> parameters = new HashMap<>();
            bindings.add(parameters);
            return (PreparedStatement) Proxy.newProxyInstance(getClass().getClassLoader(),
                    new Class<?>[]{PreparedStatement.class}, (proxy, method, args) -> switch (method.getName()) {
                        case "setString", "setInt", "setLong" -> { parameters.put((Integer) args[0], args[1]); yield null; }
                        case "setQueryTimeout" -> null;
                        case "executeQuery" -> results(query);
                        case "close" -> { closedStatements++; yield null; }
                        default -> throw new AssertionError("Unexpected JDBC method: " + method.getName());
                    });
        }

        ResultSet results(String query) throws SQLException {
            CachedRowSet rows;
            if (query.contains("WHERE 1 = 0")) {
                rows = activeColumn
                        ? row(new String[]{"id", "is_active"}, new int[]{Types.BIGINT, Types.BOOLEAN}, new Object[]{1L, true})
                        : row(new String[]{"id"}, new int[]{Types.BIGINT}, new Object[]{1L});
            } else if (query.contains("FROM choices")) {
                if (failChoices) throw new SQLException("Choice query failed");
                rows = choiceRow(true);
            } else {
                rows = row(new String[]{"id", "content", "category", "level", "explanation"},
                        new int[]{Types.BIGINT, Types.VARCHAR, Types.VARCHAR, Types.VARCHAR, Types.VARCHAR},
                        new Object[]{3_000_000_000L, "Q", "KANJI", "N5", null});
            }
            return (ResultSet) Proxy.newProxyInstance(getClass().getClassLoader(), new Class<?>[]{ResultSet.class},
                    (proxy, method, args) -> {
                        if (method.getName().equals("close")) closedResults++;
                        return method.invoke(rows, args);
                    });
        }
    }
}
