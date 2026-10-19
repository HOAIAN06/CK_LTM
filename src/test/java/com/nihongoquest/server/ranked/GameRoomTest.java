package com.nihongoquest.server.ranked;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.server.network.ClientHandler;
import com.nihongoquest.server.player.PlayerRepository;
import com.nihongoquest.server.question.Question;
import com.nihongoquest.server.question.QuestionFixtures;
import com.nihongoquest.server.question.QuestionService;
import org.junit.jupiter.api.Test;

import java.net.Socket;
import java.sql.SQLException;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicLong;

import static com.nihongoquest.server.question.QuestionFixtures.question;
import static org.junit.jupiter.api.Assertions.*;

class GameRoomTest {
    @Test
    void playsThreeRoundsWithDatabaseIdsAndPreservesScoringWithoutLeakingAnswers() throws Exception {
        StatsRepository stats = new StatsRepository();
        List<Question> bank = List.of(question(3_000_000_000L, 4, 1),
                question(3_000_000_001L, 4, 1), question(3_000_000_002L, 4, 1));
        QuestionService service = new QuestionService(new QuestionFixtures.Bank(bank));
        MatchmakingManager matchmaking = stats.manager(service);
        StubClient first = new StubClient(1, matchmaking, stats);
        StubClient second = new StubClient(2, matchmaking, stats);
        GameRoom room = stats.room(first, second, bank, System::nanoTime);
        try {
            room.start();
            assertSame(room, first.getCurrentRoom());
            for (int round = 0; round < 3; round++) {
                Message message = first.questions.poll(5, TimeUnit.SECONDS);
                assertNotNull(message, "Expected the next question");
                var node = new ObjectMapper().readTree(message.getPayload());
                for (String key : List.of("correct", "is_correct", "correctAnswer", "correctChoiceId", "explanation")) {
                    assertTrue(node.findValues(key).isEmpty(), "Leaked field: " + key);
                }
                Payloads.QuestionData data = Payloads.parseQuestion(message.getPayload());
                assertEquals(round, data.round());
                assertEquals(3, data.totalQuestions());
                assertEquals(30, data.durationSeconds());
                assertEquals(4, data.choices().size());
                long before = first.count(MessageType.ANSWER_RESULT);
                room.handleAnswer(first, data.questionId() - 1, data.choices().getFirst().choiceId());
                room.handleAnswer(first, data.questionId(), 999);
                assertEquals(before, first.count(MessageType.ANSWER_RESULT));
                room.handleAnswer(first, data.questionId(), data.choices().getFirst().choiceId());
                room.handleAnswer(first, data.questionId(), data.choices().getFirst().choiceId());
                assertEquals(before + 1, first.count(MessageType.ANSWER_RESULT));
                assertEquals(round, second.count(MessageType.ANSWER_RESULT), "Other player must not receive answer key yet");
                room.handleAnswer(second, data.questionId(), data.choices().get(1).choiceId());
            }
            Message finished = first.finished.poll(5, TimeUnit.SECONDS);
            assertNotNull(finished);
            assertEquals(new Payloads.GameOver("WIN", 3, 0), Payloads.parseGameOver(finished.getPayload()));
            // Synchronize with endGame after its final send, before asserting persisted statistics.
            room.endGame();
            assertNull(first.getCurrentRoom());
            assertNull(second.getCurrentRoom());
            assertEquals(List.of(new Result(1, true, false, 3, 3),
                    new Result(2, false, true, 3, 0)), stats.results);
            assertEquals(6, stats.answers.size());
            assertEquals(1, stats.finishes);
            assertEquals(1, first.count(MessageType.GAME_OVER));
        } finally {
            room.endGame();
            first.close();
            second.close();
        }
    }

    @Test
    void insufficientQuestionsFailBeforeCreatingRoomAndBothClientsCanRetry() {
        StatsRepository stats = new StatsRepository();
        QuestionService service = new QuestionService(new QuestionFixtures.Bank(List.of(question(1, 3, 1))));
        MatchmakingManager manager = stats.manager(service);
        StubClient first = new StubClient(1, manager, stats);
        StubClient second = new StubClient(2, manager, stats);
        try {
            manager.enqueue(first);
            manager.enqueue(second);
            for (StubClient client : List.of(first, second)) {
                assertNull(client.getCurrentRoom());
                assertFalse(client.isQueued());
                assertEquals(0, client.count(MessageType.MATCH_FOUND));
                assertEquals(0, client.count(MessageType.QUESTION));
                assertTrue(client.messages.stream().anyMatch(m -> m.getType() == MessageType.MATCH_ERROR
                        && "QUESTIONS_UNAVAILABLE".equals(m.getPayload())));
            }
            assertEquals(0, manager.getWaitingCount());
            manager.enqueue(first);
            assertTrue(first.isQueued());
            assertEquals(1, manager.getWaitingCount());
        } finally {
            first.close();
            second.close();
        }
    }

    @Test
    void concurrentDuplicateAnswersAndFinishOnlyPersistOnceAndDrawCorrectly() throws Exception {
        StatsRepository stats = new StatsRepository();
        var bank = List.of(question(1, 4, 1));
        var manager = stats.manager(new QuestionService(new QuestionFixtures.Bank(bank)));
        var first = new StubClient(1, manager, stats);
        var second = new StubClient(2, manager, stats);
        var room = stats.room(first, second, bank, System::nanoTime);
        try (var workers = Executors.newFixedThreadPool(8)) {
            room.start();
            var answers = new java.util.ArrayList<java.util.concurrent.Future<?>>();
            for (int i = 0; i < 20; i++) answers.add(workers.submit(() -> room.handleAnswer(first, 1, 11)));
            for (var task : answers) task.get(5, TimeUnit.SECONDS);
            assertEquals(1, stats.answers.size());
            room.handleAnswer(second, 1, 11);
            answers.clear();
            for (int i = 0; i < 20; i++) answers.add(workers.submit(room::endGame));
            for (var task : answers) task.get(5, TimeUnit.SECONDS);
            assertEquals(1, stats.finishes);
            assertEquals(2, stats.answers.size());
            for (StubClient client : List.of(first, second)) {
                assertEquals(1, client.count(MessageType.GAME_OVER));
                assertEquals(new Payloads.GameOver("DRAW", 1, 1),
                        Payloads.parseGameOver(client.finished.take().getPayload()));
                assertNull(client.getCurrentRoom());
            }
            assertTrue(stats.results.stream().noneMatch(r -> r.won() || r.lost()));
        } finally { room.endGame(); first.close(); second.close(); }
    }

    @Test
    void timeoutPersistsNullChoicesAndKeepsExistingAnsweredCount() {
        StatsRepository stats = new StatsRepository();
        var bank = List.of(question(1, 4, 1));
        var manager = stats.manager(new QuestionService(new QuestionFixtures.Bank(bank)));
        var first = new StubClient(1, manager, stats);
        var second = new StubClient(2, manager, stats);
        AtomicLong clock = new AtomicLong();
        var room = stats.room(first, second, bank, clock::get);
        try {
            room.start();
            clock.set(TimeUnit.SECONDS.toNanos(30));
            room.handleAnswer(first, 1, 11);
            room.handleAnswer(second, 1, 11);
            room.endGame();
            assertEquals(2, stats.answers.size());
            assertTrue(stats.answers.stream().allMatch(a -> a.choiceId() == null && !a.correct()
                    && a.responseMs() == 30000 && a.score() == 0 && a.matchId() == 42));
            assertEquals(List.of(new Result(1, false, false, 1, 0), new Result(2, false, false, 1, 0)), stats.results);
        } finally { room.endGame(); first.close(); second.close(); }
    }

    @Test
    void answerFailureCancelsWithoutAwardingPointsOrReportingSuccess() {
        StatsRepository stats = new StatsRepository();
        stats.failAnswer = true;
        var bank = List.of(question(1, 4, 1));
        var manager = stats.manager(new QuestionService(new QuestionFixtures.Bank(bank)));
        var first = new StubClient(1, manager, stats);
        var second = new StubClient(2, manager, stats);
        var room = stats.room(first, second, bank, System::nanoTime);
        try {
            room.start();
            room.handleAnswer(first, 1, 11);
            room.handleAnswer(first, 1, 11);
            room.endGame();
            assertTrue(room.isFinished());
            assertEquals(1, stats.cancellations);
            assertEquals(0, stats.finishes);
            assertTrue(stats.answers.isEmpty());
            assertEquals(0, first.count(MessageType.ANSWER_RESULT));
            assertEquals(0, first.count(MessageType.SCORE_UPDATE));
            assertEquals(0, first.count(MessageType.GAME_OVER));
            assertEquals(1, second.count(MessageType.MATCH_ERROR));
            assertNull(first.getCurrentRoom());
        } finally { first.close(); second.close(); }
    }

    @Test
    void finishFailureNeverSendsGameOverAndDoesNotRetryFromConcurrentEvents() {
        StatsRepository stats = new StatsRepository();
        stats.failFinish = true;
        var bank = List.of(question(1, 4, 1));
        var manager = stats.manager(new QuestionService(new QuestionFixtures.Bank(bank)));
        var first = new StubClient(1, manager, stats);
        var second = new StubClient(2, manager, stats);
        var room = stats.room(first, second, bank, System::nanoTime);
        try {
            room.start();
            room.endGame();
            room.endGame();
            room.playerDisconnected(first);
            assertEquals(1, stats.finishes);
            assertEquals(1, stats.cancellations);
            assertTrue(stats.results.isEmpty());
            assertEquals(0, first.count(MessageType.GAME_OVER));
            assertEquals(1, first.count(MessageType.MATCH_ERROR));
        } finally { first.close(); second.close(); }
    }

    @Test
    void matchmakingFailureNeverPublishesMatchAndSuccessUsesPersistedId() {
        StatsRepository stats = new StatsRepository();
        stats.failCreate = true;
        var bank = List.of(question(1, 4, 1), question(2, 4, 1), question(3, 4, 1));
        var manager = stats.manager(new QuestionService(new QuestionFixtures.Bank(bank)));
        var first = new StubClient(1, manager, stats);
        var second = new StubClient(2, manager, stats);
        try {
            manager.enqueue(first);
            manager.enqueue(second);
            assertEquals(1, stats.creations);
            for (StubClient client : List.of(first, second)) {
                assertNull(client.getCurrentRoom());
                assertFalse(client.isQueued());
                assertEquals(0, client.count(MessageType.MATCH_FOUND));
                assertEquals(0, client.count(MessageType.QUESTION));
                assertEquals(1, client.count(MessageType.MATCH_ERROR));
            }
            stats.failCreate = false;
            manager.enqueue(first);
            manager.enqueue(second);
            assertEquals(2, stats.creations);
            var room = first.getCurrentRoom();
            assertEquals(42, room.getMatchId());
            assertSame(room, second.getCurrentRoom());
            room.playerDisconnected(first);
            room.endGame();
            assertEquals(1, stats.finishes);
            assertEquals(List.of(new Result(1, false, true, 0, 0), new Result(2, true, false, 0, 0)), stats.results);
        } finally { first.close(); second.close(); }
    }

    private record Result(long playerId, boolean won, boolean lost, int answered, int correct) { }
    private record Answer(long matchId, long userId, long questionId, Long choiceId,
                          boolean correct, long responseMs, int score) { }

    private static class StatsRepository extends PlayerRepository {
        final List<Result> results = new CopyOnWriteArrayList<>();
        final List<Answer> answers = new CopyOnWriteArrayList<>();
        int finishes, cancellations, creations;
        boolean failCreate, failAnswer, failFinish;
        final RankedMatchRepository matches = new RankedMatchRepository(QuestionFixtures.offlineDatabase()) {
            @Override public void saveAnswer(long match, long user, long question, Long choice,
                                             boolean correct, long response, int score) throws SQLException {
                if (failAnswer) throw new SQLException("Injected answer failure");
                answers.add(new Answer(match, user, question, choice, correct, response, score));
            }
            @Override public void cancelMatch(long match) { cancellations++; }
        };
        final RankedResultService resultService = new RankedResultService(QuestionFixtures.offlineDatabase(), matches, this) {
            @Override public void finishMatch(long match, PlayerResult first, PlayerResult second, Long forfeiting)
                    throws SQLException {
                finishes++;
                if (failFinish) throw new SQLException("Injected finish failure");
                Long winner = winner(first, second, forfeiting);
                for (PlayerResult r : List.of(first, second)) {
                    results.add(new Result(r.userId(), winner != null && winner == r.userId(),
                            winner != null && winner != r.userId(), r.questionsAnswered(), r.correctAnswers()));
                }
            }
        };
        StatsRepository() { super(QuestionFixtures.offlineDatabase()); }
        MatchmakingManager manager(QuestionService questions) {
            return new MatchmakingManager(questions, new RankedMatchService(QuestionFixtures.offlineDatabase(), matches, this) {
                @Override public CreatedMatch createMatch(long first, long second, List<Question> bank, int seconds)
                        throws SQLException {
                    creations++;
                    if (failCreate) throw new SQLException("Injected create failure");
                    assertEquals(3, bank.size());
                    assertEquals(30, seconds);
                    return new CreatedMatch(42L, 1000, 1000);
                }
            }, matches, resultService);
        }
        GameRoom room(StubClient first, StubClient second, List<Question> bank, java.util.function.LongSupplier clock) {
            return new GameRoom("test-room", new RankedMatchService.CreatedMatch(42L, 1000, 1000),
                    first, second, bank, matches, resultService, clock);
        }
    }

    private static class StubClient extends ClientHandler {
        final List<Message> messages = new CopyOnWriteArrayList<>();
        final BlockingQueue<Message> questions = new LinkedBlockingQueue<>();
        final BlockingQueue<Message> finished = new LinkedBlockingQueue<>();
        final long id;

        StubClient(long id, MatchmakingManager manager, PlayerRepository stats) {
            super(new Socket(), manager, stats, ignored -> { }, ignored -> { }, ignored -> { });
            this.id = id;
        }

        @Override public boolean isConnected() { return true; }
        @Override public boolean isAuthenticated() { return true; }
        @Override public Long getPlayerId() { return id; }
        @Override public String getUsername() { return "player" + id; }
        @Override public String getDisplayName() { return getUsername(); }
        @Override public void send(Message message) {
            messages.add(message);
            if (message.getType() == MessageType.QUESTION) questions.add(message);
            if (message.getType() == MessageType.GAME_OVER) finished.add(message);
        }

        long count(MessageType type) {
            return messages.stream().filter(m -> m.getType() == type).count();
        }
    }
}
