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

import static com.nihongoquest.server.question.QuestionFixtures.question;
import static org.junit.jupiter.api.Assertions.*;

class GameRoomTest {
    @Test
    void playsThreeRoundsWithoutLeakingAnswerAndSavesOnce() throws Exception {
        ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);
        FakeMatches matches = new FakeMatches();
        StubClient first = new StubClient(1);
        StubClient second = new StubClient(2);
        List<Question> bank = List.of(question(1, 4, 1), question(2, 4, 1), question(3, 4, 1));
        GameRoom room = new GameRoom("room", first, second, bank, matches, scheduler);
        try {
            room.start();
            for (int round = 0; round < 3; round++) {
                Message frame = first.questions.poll(5, TimeUnit.SECONDS);
                assertNotNull(frame);
                assertTrue(frame.getPayload().findValues("correct").isEmpty());
                assertTrue(frame.getPayload().findValues("explanation").isEmpty());
                Payloads.QuestionData data = Payloads.parseQuestion(frame.getPayload());
                room.handleAnswer(first, data.questionId(), data.choices().getFirst().choiceId());
                room.handleAnswer(first, data.questionId(), data.choices().getFirst().choiceId());
                room.handleAnswer(second, data.questionId(), data.choices().get(1).choiceId());
            }
            Message finished = first.finished.poll(5, TimeUnit.SECONDS);
            assertNotNull(finished);
            assertEquals(new Payloads.GameOver("WIN", 3, 0),
                    Payloads.parseGameOver(finished.getPayload()));
            assertEquals(1, matches.calls);
            assertEquals(new MatchResult(1, 3, 3, 3), matches.first);
            assertEquals(new MatchResult(2, 0, 3, 0), matches.second);
            assertNull(first.getCurrentRoom());
        } finally {
            scheduler.shutdownNow();
        }
    }

    @Test
    void duplicateAnswerIsIgnored() throws Exception {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        FakeMatches matches = new FakeMatches();
        StubClient first = new StubClient(1);
        StubClient second = new StubClient(2);
        GameRoom room = new GameRoom("room", first, second,
                List.of(question(1, 4, 1)), matches, scheduler);
        try {
            room.start();
            room.handleAnswer(first, 1, 11);
            room.handleAnswer(first, 1, 11);
            assertEquals(1, first.count(MessageType.ANSWER_RESULT));
            room.handleAnswer(second, 1, 11);
            assertNotNull(first.finished.poll(5, TimeUnit.SECONDS));
            assertEquals(1, matches.calls);
        } finally {
            scheduler.shutdownNow();
        }
    }

    @Test
    void disconnectForfeitsAndNotifiesOpponent() {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        FakeMatches matches = new FakeMatches();
        StubClient first = new StubClient(1);
        StubClient second = new StubClient(2);
        GameRoom room = new GameRoom("room", first, second,
                List.of(question(1, 4, 1)), matches, scheduler);
        try {
            room.start();
            room.playerDisconnected(first);
            assertEquals(EndReason.DISCONNECT, matches.reason);
            assertEquals(1L, matches.forfeiting);
            assertTrue(second.messages.stream().anyMatch(message ->
                    message.getType() == MessageType.MATCH_ERROR
                            && "OPPONENT_DISCONNECTED".equals(message.payloadText())));
        } finally {
            scheduler.shutdownNow();
        }
    }

    @Test
    void matchmakingRejectsInvalidQuestionBankWithoutCreatingRoom() {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        FakeMatches matches = new FakeMatches();
        QuestionService questions = new QuestionService(
                new QuestionFixtures.Bank(List.of(question(1, 3, 1))));
        MatchmakingManager manager = new MatchmakingManager(questions, matches, scheduler);
        StubClient first = new StubClient(1);
        StubClient second = new StubClient(2);
        try {
            manager.enqueue(first);
            manager.enqueue(second);
            assertNull(first.getCurrentRoom());
            assertFalse(first.isQueued());
            assertTrue(first.messages.stream().anyMatch(message ->
                    "QUESTIONS_UNAVAILABLE".equals(message.payloadText())));
        } finally {
            scheduler.shutdownNow();
        }
    }

    private static final class FakeMatches extends MatchRepository {
        int calls;
        MatchResult first;
        MatchResult second;
        EndReason reason;
        Long forfeiting;

        FakeMatches() { super(QuestionFixtures.offlineDatabase()); }

        @Override
        public void saveResult(MatchResult first, MatchResult second, int duration,
                               EndReason reason, Long forfeiting) throws SQLException {
            calls++;
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
    }
}
