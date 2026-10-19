package com.nihongoquest.server.ranked;

import com.nihongoquest.server.infrastructure.persistence.Database;
import com.nihongoquest.server.infrastructure.persistence.JdbcTransaction;
import com.nihongoquest.server.player.PlayerRepository;
import com.nihongoquest.server.question.Question;

import java.sql.SQLException;
import java.util.List;

/** Creates the complete match before a realtime room is attached to either session. */
public class RankedMatchService {
    private final Database database;
    private final RankedMatchRepository matches;
    private final PlayerRepository players;

    public RankedMatchService(Database database, RankedMatchRepository matches, PlayerRepository players) {
        this.database = database;
        this.matches = matches;
        this.players = players;
    }

    public CreatedMatch createMatch(long firstUserId, long secondUserId, List<Question> questions,
                                     int timeLimitSeconds) throws SQLException {
        if (firstUserId == secondUserId) throw new IllegalArgumentException("Ranked needs two distinct users");
        if (questions.isEmpty()) throw new IllegalArgumentException("Ranked needs questions");
        return JdbcTransaction.execute(database, connection -> {
            int firstRating = players.getRankedRating(connection, firstUserId);
            int secondRating = players.getRankedRating(connection, secondUserId);
            long id = matches.createMatch(connection);
            matches.addPlayer(connection, id, firstUserId, firstRating);
            matches.addPlayer(connection, id, secondUserId, secondRating);
            for (int i = 0; i < questions.size(); i++) {
                matches.addMatchQuestion(connection, id, questions.get(i), i + 1, timeLimitSeconds);
            }
            return new CreatedMatch(id, firstRating, secondRating);
        });
    }

    public record CreatedMatch(long matchId, int firstRating, int secondRating) { }
}
