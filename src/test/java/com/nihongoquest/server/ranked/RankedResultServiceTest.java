package com.nihongoquest.server.ranked;

import com.nihongoquest.server.player.PlayerRepository;
import com.nihongoquest.server.ranked.RankedResultService.PlayerResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import java.sql.SQLException;
import java.util.Map;
import static com.nihongoquest.server.ranked.RankedJdbcFixture.MATCH_ID;
import static com.nihongoquest.server.ranked.RankedPersistenceTest.assertClosed;
import static org.junit.jupiter.api.Assertions.*;

class RankedResultServiceTest {
    @ParameterizedTest
    @CsvSource({"3,1,1", "1,3,2", "2,2,0"})
    void atomicallyPersistsWinnerDrawStatisticsAndUnchangedRatings(int firstScore, int secondScore, long winner)
            throws Exception {
        var jdbc = new RankedJdbcFixture();
        service(jdbc).finishMatch(MATCH_ID, result(1, firstScore), result(2, secondScore), null);
        assertEquals(5, jdbc.committed.size());
        assertEquals(Map.of(1, firstScore, 2, firstScore, 3, 1001, 4, MATCH_ID, 5, 1L),
                jdbc.committed.get(0).params());
        assertEquals(Map.of(1, secondScore, 2, secondScore, 3, 1002, 4, MATCH_ID, 5, 2L),
                jdbc.committed.get(1).params());
        assertEquals(winner == 0 ? null : winner, jdbc.committed.get(2).params().get(1));
        assertEquals(MATCH_ID, jdbc.committed.get(2).params().get(2));
        for (int i = 0; i < 2; i++) {
            long user = i + 1L;
            var write = jdbc.committed.get(i + 3);
            assertTrue(write.sql().contains("UPDATE users"));
            assertTrue(write.sql().contains("total_score = total_score + ?"));
            assertTrue(write.sql().contains("total_matches = total_matches + 1"));
            assertEquals(Map.of(1, i == 0 ? firstScore : secondScore, 2, winner == user ? 1 : 0,
                    3, winner != 0 && winner != user ? 1 : 0, 4, winner == 0 ? 1 : 0,
                    5, 3, 6, i == 0 ? firstScore : secondScore, 7, 0, 8, user), write.params());
        }
        assertEquals(1, jdbc.connections);
        assertEquals(1, jdbc.commits);
        assertEquals(0, jdbc.rollbacks);
        assertClosed(jdbc);
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 2, 3, 4, 5, 6})
    void rollsBackEveryResultWriteAndCommitFailure(int failure) {
        var jdbc = new RankedJdbcFixture();
        jdbc.failWrite = failure;
        jdbc.failCommit = failure == 6;
        assertThrows(SQLException.class, () -> service(jdbc).finishMatch(MATCH_ID, result(1, 3), result(2, 1), null));
        assertEquals(1, jdbc.rollbacks);
        assertEquals(0, jdbc.commits);
        assertTrue(jdbc.committed.isEmpty());
        assertTrue(jdbc.pending.isEmpty());
        assertEquals("PLAYING", jdbc.status);
        assertClosed(jdbc);
    }

    @Test
    void repeatedFinalizationDoesNotAwardStatisticsTwice() throws Exception {
        var jdbc = new RankedJdbcFixture();
        var service = service(jdbc);
        service.finishMatch(MATCH_ID, result(1, 3), result(2, 1), null);
        service.finishMatch(MATCH_ID, result(1, 3), result(2, 1), null);
        assertEquals(5, jdbc.committed.size());
        assertEquals(2, jdbc.queries.stream().filter(sql -> sql.contains("FOR UPDATE")).count());
        assertClosed(jdbc);
    }

    @Test
    void disconnectForfeitsEvenWhenPlayerHasHigherScore() throws Exception {
        var jdbc = new RankedJdbcFixture();
        service(jdbc).finishMatch(MATCH_ID, result(1, 3), result(2, 0), 1L);
        assertEquals(2L, jdbc.committed.get(2).params().get(1));
        assertEquals(1, jdbc.committed.get(3).params().get(3));
        assertEquals(1, jdbc.committed.get(4).params().get(2));
    }

    @Test
    void cancelledMatchCannotAwardStatistics() {
        var jdbc = new RankedJdbcFixture();
        jdbc.status = "CANCELLED";
        assertThrows(SQLException.class, () -> service(jdbc).finishMatch(MATCH_ID, result(1, 0), result(2, 0), null));
        assertTrue(jdbc.committed.isEmpty());
        assertEquals(1, jdbc.rollbacks);
    }

    private PlayerResult result(long user, int score) { return new PlayerResult(user, score, 3, score, 1000 + (int) user); }
    private RankedResultService service(RankedJdbcFixture jdbc) {
        var db = jdbc.database();
        return new RankedResultService(db, new RankedMatchRepository(db), new PlayerRepository(db));
    }
}
