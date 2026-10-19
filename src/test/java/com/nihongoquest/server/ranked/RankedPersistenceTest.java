package com.nihongoquest.server.ranked;

import com.nihongoquest.server.player.PlayerRepository;
import com.nihongoquest.server.infrastructure.persistence.JdbcTransaction;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import static com.nihongoquest.server.question.QuestionFixtures.question;
import static com.nihongoquest.server.ranked.RankedJdbcFixture.MATCH_ID;
import static org.junit.jupiter.api.Assertions.*;

class RankedPersistenceTest {
    @Test
    void createsEntireMatchWithRatingsAndAllQuestionSnapshotsInOneTransaction() throws Exception {
        var jdbc = new RankedJdbcFixture();
        var db = jdbc.database();
        var bank = List.of(question(3_000_000_001L, 4, 1), question(2, 4, 1), question(3, 4, 1));
        var match = new RankedMatchService(db, new RankedMatchRepository(db), new PlayerRepository(db))
                .createMatch(1, 2, bank, 30);
        assertEquals(new RankedMatchService.CreatedMatch(MATCH_ID, 1000, 1100), match);
        assertEquals(6, jdbc.committed.size());
        assertTrue(jdbc.committed.get(0).sql().contains("INSERT INTO ranked_matches"));
        assertEquals(Map.of(1, MATCH_ID, 2, 1L, 3, 1000), jdbc.committed.get(1).params());
        assertEquals(Map.of(1, MATCH_ID, 2, 2L, 3, 1100), jdbc.committed.get(2).params());
        for (int i = 0; i < 3; i++) {
            var write = jdbc.committed.get(i + 3);
            assertTrue(write.sql().contains("INSERT INTO ranked_match_questions"));
            assertTrue(write.sql().contains("question_content_snapshot"));
            assertEquals(Map.of(1, MATCH_ID, 2, bank.get(i).getId(), 3, i + 1,
                    4, 30, 5, bank.get(i).getContent()), write.params());
        }
        assertEquals(1, jdbc.commits);
        assertEquals(1, jdbc.connections);
        assertClosed(jdbc);
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 2, 3, 4, 5, 6})
    void rollsBackAnyCreationWriteFailure(int failAt) {
        var jdbc = new RankedJdbcFixture();
        jdbc.failWrite = failAt;
        var db = jdbc.database();
        assertThrows(SQLException.class, () -> new RankedMatchService(db,
                new RankedMatchRepository(db), new PlayerRepository(db)).createMatch(1, 2,
                List.of(question(1, 4, 1), question(2, 4, 1), question(3, 4, 1)), 30));
        assertEquals(1, jdbc.rollbacks);
        assertTrue(jdbc.committed.isEmpty());
        assertTrue(jdbc.pending.isEmpty());
        assertEquals(0, jdbc.commits);
        assertClosed(jdbc);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void savesAnswerWithBigintIdsOrNullableTimeoutChoice(boolean timeout) throws Exception {
        var jdbc = new RankedJdbcFixture();
        new RankedMatchRepository(jdbc.database()).saveAnswer(MATCH_ID, 3_000_000_001L,
                3_000_000_002L, timeout ? null : 30_000_000_021L, !timeout, timeout ? 30000 : 123, timeout ? 0 : 1);
        var write = jdbc.committed.getFirst();
        assertTrue(write.sql().contains("INSERT INTO ranked_answers"));
        assertEquals(MATCH_ID, write.params().get(1));
        assertEquals(3_000_000_001L, write.params().get(2));
        assertEquals(3_000_000_002L, write.params().get(3));
        assertEquals(timeout ? null : 30_000_000_021L, write.params().get(4));
        assertEquals(!timeout, write.params().get(5));
        assertEquals(timeout ? 30000L : 123L, write.params().get(6));
        assertEquals(timeout ? 0 : 1, write.params().get(7));
        assertClosed(jdbc);
    }

    @Test
    void rollbackFailureIsSuppressedAndConnectionClosesWithoutAutoCommit() {
        var jdbc = new RankedJdbcFixture();
        jdbc.failRollback = true;
        SQLException failure = assertThrows(SQLException.class, () -> JdbcTransaction.execute(jdbc.database(), c -> {
            throw new SQLException("Original failure");
        }));
        assertEquals("Original failure", failure.getMessage());
        assertEquals(1, failure.getSuppressed().length);
        assertEquals(0, jdbc.commits);
        assertClosed(jdbc);
    }

    static void assertClosed(RankedJdbcFixture jdbc) {
        assertEquals(jdbc.connections, jdbc.closedConnections);
        assertEquals(jdbc.statements, jdbc.closedStatements);
        assertEquals(jdbc.results, jdbc.closedResults);
    }
}
