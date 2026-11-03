package com.nihongoquest.server.ranked;

import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.server.network.ClientHandler;
import com.nihongoquest.server.question.Question;
import com.nihongoquest.server.question.QuestionFixtures;
import com.nihongoquest.server.question.QuestionService;
import com.nihongoquest.server.ranked.MatchRepository.EndReason;
import com.nihongoquest.server.ranked.MatchRepository.MatchResult;
import org.junit.jupiter.api.Test;

import java.net.Socket;
import java.sql.SQLException;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

import static com.nihongoquest.server.question.QuestionFixtures.question;
import static org.junit.jupiter.api.Assertions.*;

class GameRoomTest {
    private static final List<Question> BANK = List.of(
            question(1, 4, 1), question(2, 4, 1), question(3, 4, 1));

    @Test
    void playersAdvanceIndependentlyAndStaleOrDuplicateAnswersAreIgnored() throws Exception {
        ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);
        FakeMatches matches = new FakeMatches();
        StubClient first = new StubClient(1);
        StubClient second = new StubClient(2);
        GameRoom room = new GameRoom("room", first, second, BANK,
                GameRoom.FIVE_MINUTES, matches, scheduler);
        try {
            room.start();
            Payloads.QuestionData firstOne = takeQuestion(first);
            Payloads.QuestionData secondOne = takeQuestion(second);
            assertQuestionHasNoAnswer(firstOne, first.messages);

            room.handleAnswer(first, answer(firstOne, 0));
            Payloads.QuestionData firstTwo = takeQuestion(first);
            room.handleAnswer(first, answer(firstTwo, 0));
            Payloads.QuestionData firstThree = takeQuestion(first);

            assertEquals(3, firstThree.attempt());
            assertEquals(3, firstThree.questionId());
            assertTrue(second.questions.isEmpty(), "Người thứ hai không bị kéo theo tiến độ đối thủ");
            assertEquals(2, first.count(MessageType.ANSWER_RESULT));

            room.handleAnswer(first, answer(firstOne, 0));
            room.handleAnswer(first, answer(firstTwo, 0));
            assertEquals(2, first.count(MessageType.ANSWER_RESULT));

            room.handleAnswer(second, answer(secondOne, 1));
            assertEquals(2, takeQuestion(second).attempt());
            room.endGame();

            assertEquals(new Payloads.GameOver("WIN", 2, 0),
                    Payloads.parseGameOver(first.finished.poll(2, TimeUnit.SECONDS).getPayload()));
            assertEquals(1, matches.calls);
            assertEquals(300, matches.duration);
            assertEquals(new MatchResult(1, 2, 2, 2), matches.first);
            assertEquals(new MatchResult(2, 0, 1, 0), matches.second);
        } finally {
            scheduler.shutdownNow();
        }
    }

    @Test
    void questionPoolRepeatsWhileAttemptKeepsIncreasing() throws Exception {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        StubClient first = new StubClient(1);
        StubClient second = new StubClient(2);
        GameRoom room = new GameRoom("repeat", first, second, BANK,
                GameRoom.THREE_MINUTES, new FakeMatches(), scheduler);
        try {
            room.start();
            for (int attempt = 1; attempt <= 3; attempt++) {
                Payloads.QuestionData current = takeQuestion(first);
                assertEquals(attempt, current.attempt());
                room.handleAnswer(first, answer(current, 0));
            }
            Payloads.QuestionData repeated = takeQuestion(first);
            assertEquals(4, repeated.attempt());
            assertEquals(1, repeated.questionId());
        } finally {
            room.endGame();
            scheduler.shutdownNow();
        }
    }

    @Test
    void lateAnswerBecomesTimeoutAndAutomaticallyMovesForward() throws Exception {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        AtomicLong time = new AtomicLong();
        StubClient first = new StubClient(1);
        StubClient second = new StubClient(2);
        GameRoom room = new GameRoom("timeout", first, second, BANK,
                GameRoom.THREE_MINUTES, new FakeMatches(), scheduler, time::get);
        try {
            room.start();
            Payloads.QuestionData initial = takeQuestion(first);
            time.set(TimeUnit.SECONDS.toNanos(31));
            room.handleAnswer(first, answer(initial, 0));

            Message timeoutFrame = first.first(MessageType.ANSWER_RESULT);
            Payloads.AnswerResult timeout = Payloads.parseAnswerResult(timeoutFrame.getPayload());
            assertFalse(timeout.correct());
            assertNull(timeout.chosenChoiceId());
            assertEquals(0, timeout.scoreAwarded());
            assertEquals(2, takeQuestion(first).attempt());
        } finally {
            room.endGame();
            scheduler.shutdownNow();
        }
    }

    @Test
    void disconnectForfeitsImmediatelyAndOpponentReceivesWin() throws Exception {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        FakeMatches matches = new FakeMatches();
        StubClient first = new StubClient(1);
        StubClient second = new StubClient(2);
        GameRoom room = new GameRoom("room", first, second, BANK,
                GameRoom.THREE_MINUTES, matches, scheduler);
        try {
            room.start();
            room.playerDisconnected(first);
            assertEquals(EndReason.DISCONNECT, matches.reason);
            assertEquals(1L, matches.forfeiting);
            Message result = second.finished.poll(2, TimeUnit.SECONDS);
            assertNotNull(result);
            assertEquals("WIN", Payloads.parseGameOver(result.getPayload()).result());
            assertTrue(room.isFinished());
        } finally {
            scheduler.shutdownNow();
        }
    }

    @Test
    void equalScoresFinishAsDrawForBothPlayers() throws Exception {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        FakeMatches matches = new FakeMatches();
        StubClient first = new StubClient(1);
        StubClient second = new StubClient(2);
        GameRoom room = new GameRoom("draw", first, second, BANK,
                GameRoom.THREE_MINUTES, matches, scheduler);
        try {
            room.start();
            room.endGame();
            assertEquals("DRAW", Payloads.parseGameOver(
                    first.finished.poll(2, TimeUnit.SECONDS).getPayload()).result());
            assertEquals("DRAW", Payloads.parseGameOver(
                    second.finished.poll(2, TimeUnit.SECONDS).getPayload()).result());
            assertEquals(180, matches.duration);
        } finally {
            scheduler.shutdownNow();
        }
    }

    @Test
    void matchmakingOnlyPairsPlayersWithSameDuration() {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        QuestionService questions = new QuestionService(new QuestionFixtures.Bank(BANK));
        MatchmakingManager manager = new MatchmakingManager(questions, new FakeMatches(), scheduler);
        StubClient first = new StubClient(1);
        StubClient second = new StubClient(2);
        StubClient third = new StubClient(3);
        try {
            manager.enqueue(first, 180);
            manager.enqueue(second, 300);
            assertNull(first.getCurrentRoom());
            assertNull(second.getCurrentRoom());

            manager.enqueue(third, 180);
            assertNotNull(first.getCurrentRoom());
            assertSame(first.getCurrentRoom(), third.getCurrentRoom());
            assertNull(second.getCurrentRoom());
            assertTrue(second.isQueued());
            assertEquals(1, manager.getWaitingCount());
        } finally {
            if (first.getCurrentRoom() != null) first.getCurrentRoom().endGame();
            scheduler.shutdownNow();
        }
    }

    @Test
    void matchmakingRejectsInvalidDurationAndTooSmallQuestionBank() {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        MatchmakingManager invalidBank = new MatchmakingManager(
                new QuestionService(new QuestionFixtures.Bank(List.of(question(1, 4, 1)))),
                new FakeMatches(), scheduler);
        StubClient invalidDuration = new StubClient(1);
        StubClient first = new StubClient(2);
        StubClient second = new StubClient(3);
        try {
            invalidBank.enqueue(invalidDuration, 60);
            assertEquals("INVALID_DURATION", invalidDuration.first(MessageType.MATCH_ERROR).payloadText());

            invalidBank.enqueue(first, 180);
            invalidBank.enqueue(second, 180);
            assertNull(first.getCurrentRoom());
            assertFalse(first.isQueued());
            assertEquals("QUESTIONS_UNAVAILABLE", first.first(MessageType.MATCH_ERROR).payloadText());
        } finally {
            scheduler.shutdownNow();
        }
    }

    private static Payloads.QuestionData takeQuestion(StubClient client) throws InterruptedException {
        Message message = client.questions.poll(2, TimeUnit.SECONDS);
        assertNotNull(message);
        return Payloads.parseQuestion(message.getPayload());
    }

    private static Payloads.AnswerData answer(Payloads.QuestionData question, int choiceIndex) {
        return new Payloads.AnswerData(question.sessionId(), question.attempt(), question.questionId(),
                question.choices().get(choiceIndex).choiceId());
    }

    private static void assertQuestionHasNoAnswer(Payloads.QuestionData question,
                                                   List<Message> messages) {
        assertEquals(4, question.choices().size());
        Message frame = messages.stream().filter(message -> message.getType() == MessageType.QUESTION)
                .findFirst().orElseThrow();
        assertTrue(frame.getPayload().findValues("correct").isEmpty());
        assertTrue(frame.getPayload().findValues("correctChoiceId").isEmpty());
        assertTrue(frame.getPayload().findValues("explanation").isEmpty());
    }

    private static final class FakeMatches extends MatchRepository {
        int calls;
        int duration;
        MatchResult first;
        MatchResult second;
        EndReason reason;
        Long forfeiting;

        FakeMatches() { super(QuestionFixtures.offlineDatabase()); }

        @Override
        public void saveResult(MatchResult first, MatchResult second, int duration,
                               EndReason reason, Long forfeiting) throws SQLException {
            calls++;
            this.duration = duration;
            this.first = first;
            this.second = second;
            this.reason = reason;
            this.forfeiting = forfeiting;
        }
    }

    private static final class StubClient extends ClientHandler {
        final List<Message> messages = new CopyOnWriteArrayList<>();
        final BlockingQueue<Message> questions = new LinkedBlockingQueue<>();
        final BlockingQueue<Message> finished = new LinkedBlockingQueue<>();
        final long id;

        StubClient(long id) {
            super(new Socket());
            this.id = id;
        }

        @Override public boolean isConnected() { return true; }
        @Override public boolean isAuthenticated() { return true; }
        @Override public Long getPlayerId() { return id; }
        @Override public String getUsername() { return "player" + id; }
        @Override public void send(Message message) {
            messages.add(message);
            if (message.getType() == MessageType.QUESTION) questions.add(message);
            if (message.getType() == MessageType.GAME_OVER) finished.add(message);
        }

        long count(MessageType type) {
            return messages.stream().filter(message -> message.getType() == type).count();
        }

        Message first(MessageType type) {
            return messages.stream().filter(message -> message.getType() == type)
                    .findFirst().orElseThrow();
        }
    }
}
