package com.nihongoquest.server.ranked;

import com.nihongoquest.server.infrastructure.persistence.Database;
import com.nihongoquest.server.infrastructure.persistence.JdbcTransaction;
import com.nihongoquest.server.player.PlayerRepository;

import java.sql.SQLException;
import java.util.Comparator;
import java.util.List;

/** Atomically finalizes both participants, the match, and both users' Ranked statistics. */
public class RankedResultService {
    private final Database database;
    private final RankedMatchRepository matches;
    private final PlayerRepository players;

    public RankedResultService(Database database, RankedMatchRepository matches, PlayerRepository players) {
        this.database = database;
        this.matches = matches;
        this.players = players;
    }

    public void finishMatch(long matchId, PlayerResult first, PlayerResult second, Long forfeitingUserId)
            throws SQLException {
        if (first.userId() == second.userId()
                || (forfeitingUserId != null && forfeitingUserId != first.userId()
                    && forfeitingUserId != second.userId())) {
            throw new IllegalArgumentException("Invalid Ranked participants");
        }
        Long winner = winner(first, second, forfeitingUserId);
        JdbcTransaction.execute(database, connection -> {
            String status = matches.lockStatus(connection, matchId);
            if ("FINISHED".equals(status)) return null; // Safe after commit acknowledgement was lost.
            if (!"PLAYING".equals(status)) throw new SQLException("Ranked match is not playing: " + matchId);
            List<PlayerResult> results = List.of(first, second).stream()
                    .sorted(Comparator.comparingLong(PlayerResult::userId)).toList();
            for (PlayerResult result : results) {
                // TODO: add Elo only when a rating policy exists. Preserve the starting rating for now.
                matches.updatePlayerResult(connection, matchId, result.userId(), result.score(),
                        result.correctAnswers(), result.ratingBefore());
            }
            matches.finishMatch(connection, matchId, winner);
            // Consistent user lock order avoids deadlocks across concurrent matches involving the same users.
            for (PlayerResult result : results) {
                players.updateRankedStatistics(connection, result.userId(), result.score(),
                        winner != null && winner == result.userId(),
                        winner != null && winner != result.userId(),
                        result.questionsAnswered(), result.correctAnswers(), 0);
            }
            return null;
        });
    }

    public static Long winner(PlayerResult first, PlayerResult second, Long forfeitingUserId) {
        if (forfeitingUserId != null) return forfeitingUserId == first.userId() ? second.userId() : first.userId();
        if (first.score() == second.score()) return null;
        return first.score() > second.score() ? first.userId() : second.userId();
    }

    public record PlayerResult(long userId, int score, int questionsAnswered, int correctAnswers, int ratingBefore) {
        public PlayerResult {
            if (userId <= 0 || score < 0 || correctAnswers < 0 || questionsAnswered < correctAnswers) {
                throw new IllegalArgumentException("Invalid Ranked result");
            }
        }
    }
}
