package com.nihongoquest.server.quizroom;

import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.server.network.ClientHandler;
import com.nihongoquest.server.question.Question;
import com.nihongoquest.server.question.QuestionFixtures;
import org.junit.jupiter.api.Test;

import java.net.Socket;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import static com.nihongoquest.server.question.QuestionFixtures.question;
import static org.junit.jupiter.api.Assertions.*;

class QuizRoomTest {
    private static final List<Question> BANK = List.of(
            question(1, 4, 1), question(2, 4, 1), question(3, 4, 1));

    @Test
    void lobbyNeedsTwoPlayersAndLocksAfterStart() {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        StubClient host = new StubClient(1);
        StubClient guest = new StubClient(2);
        QuizRoom room = room(host, true, scheduler, new AtomicLong(), new AtomicInteger());
        try {
            assertEquals("NOT_ENOUGH_PLAYERS", assertThrows(QuizRoomException.class,
                    () -> room.start(host)).getCode());
            room.join(guest);
            room.start(host);
            assertTrue(room.isRunning());
            assertEquals("ROOM_STARTED", assertThrows(QuizRoomException.class,
                    () -> room.join(new StubClient(3))).getCode());
            assertNotNull(host.first(MessageType.QUIZ_QUESTION));
            assertNotNull(guest.first(MessageType.QUIZ_QUESTION));
        } finally {
            room.cancelByHost(host);
            scheduler.shutdownNow();
        }
    }

    @Test
    void roomAllowsAtMostTwentyPlayersAndHostCancelNotifiesEveryone() {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        StubClient host = new StubClient(1);
        StubClient lastGuest = null;
        QuizRoom room = room(host, true, scheduler, new AtomicLong(), new AtomicInteger());
        try {
            for (int id = 2; id <= 20; id++) {
                lastGuest = new StubClient(id);
                room.join(lastGuest);
            }
            StubClient overflow = new StubClient(21);
            assertEquals("ROOM_FULL", assertThrows(QuizRoomException.class,
                    () -> room.join(overflow)).getCode());
            room.cancelByHost(host);
            assertTrue(room.isFinished());
            assertEquals("HOST_CANCELLED",
                    lastGuest.last(MessageType.QUIZ_ROOM_CANCEL).payloadText());
        } finally {
            scheduler.shutdownNow();
        }
    }

    @Test
    void hostMayControlWithoutAppearingInPlayerLeaderboard() {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        StubClient host = new StubClient(1);
        StubClient first = new StubClient(2);
        StubClient second = new StubClient(3);
        QuizRoom room = room(host, false, scheduler, new AtomicLong(), new AtomicInteger());
        try {
            room.join(first);
            room.join(second);
            room.start(host);

            assertNull(host.firstOrNull(MessageType.QUIZ_QUESTION));
            Payloads.QuizLeaderboardData board = Payloads.fromJson(
                    host.last(MessageType.QUIZ_LEADERBOARD).getPayload(),
                    Payloads.QuizLeaderboardData.class);
            assertEquals(2, board.entries().size());
            assertTrue(board.entries().stream().noneMatch(entry -> entry.userId() == 1));
            assertEquals(1, board.entries().get(0).rank());
            assertEquals(1, board.entries().get(1).rank());
        } finally {
            room.cancelByHost(host);
            scheduler.shutdownNow();
        }
    }

    @Test
    void scoresBySpeedAndBuildsLiveLeaderboardWithTiedRanks() {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        AtomicLong time = new AtomicLong();
        StubClient host = new StubClient(1);
        StubClient guest = new StubClient(2);
        QuizRoom room = room(host, true, scheduler, time, new AtomicInteger());
        try {
            room.join(guest);
            room.start(host);
            Payloads.QuizQuestionData hostQuestion = questionData(host);
            Payloads.QuizQuestionData guestQuestion = questionData(guest);

            room.answer(host, answer(hostQuestion, 0));
            Payloads.QuizAnswerResult fast = Payloads.fromJson(
                    host.last(MessageType.QUIZ_ANSWER_RESULT).getPayload(),
                    Payloads.QuizAnswerResult.class);
            assertEquals(1000, fast.scoreAwarded());

            time.set(TimeUnit.SECONDS.toNanos(15));
            room.answer(guest, answer(guestQuestion, 0));
            Payloads.QuizAnswerResult slower = Payloads.fromJson(
                    guest.last(MessageType.QUIZ_ANSWER_RESULT).getPayload(),
                    Payloads.QuizAnswerResult.class);
            assertEquals(750, slower.scoreAwarded());

            Payloads.QuizLeaderboardData board = Payloads.fromJson(
                    host.last(MessageType.QUIZ_LEADERBOARD).getPayload(),
                    Payloads.QuizLeaderboardData.class);
            assertEquals(1, board.entries().getFirst().rank());
            assertEquals("player1", board.entries().getFirst().username());
            assertEquals(1000, board.entries().getFirst().score());
        } finally {
            room.cancelByHost(host);
            scheduler.shutdownNow();
        }
    }

    @Test
    void disconnectRejoinsSameAttemptButExplicitLeaveCannotRejoin() {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        AtomicLong time = new AtomicLong();
        StubClient host = new StubClient(1);
        StubClient guest = new StubClient(2);
        QuizRoom room = room(host, true, scheduler, time, new AtomicInteger());
        try {
            room.join(guest);
            room.start(host);
            Payloads.QuizQuestionData original = questionData(guest);
            guest.connected = false;
            room.disconnected(guest);
            assertTrue(room.isRunning());

            time.set(TimeUnit.SECONDS.toNanos(10));
            StubClient reconnected = new StubClient(2);
            assertTrue(room.reconnect(reconnected));
            Payloads.QuizQuestionData resumed = Payloads.fromJson(
                    reconnected.last(MessageType.QUIZ_QUESTION).getPayload(),
                    Payloads.QuizQuestionData.class);
            assertEquals(original.attempt(), resumed.attempt());
            assertEquals(original.questionId(), resumed.questionId());
            assertEquals(20, resumed.questionDurationSeconds());
            assertNotNull(reconnected.first(MessageType.QUIZ_REJOINED));

            room.leave(reconnected);
            assertFalse(room.reconnect(new StubClient(2)));
        } finally {
            room.cancelByHost(host);
            scheduler.shutdownNow();
        }
    }

    @Test
    void roomRepeatsQuestionsAndFinishesAtSharedDeadline() {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        AtomicLong time = new AtomicLong();
        AtomicInteger finished = new AtomicInteger();
        StubClient host = new StubClient(1);
        StubClient guest = new StubClient(2);
        QuizRoom room = room(host, true, scheduler, time, finished);
        try {
            room.join(guest);
            room.start(host);
            for (int attempt = 1; attempt <= 3; attempt++) {
                Payloads.QuizQuestionData current = Payloads.fromJson(
                        host.last(MessageType.QUIZ_QUESTION).getPayload(),
                        Payloads.QuizQuestionData.class);
                assertEquals(attempt, current.attempt());
                room.answer(host, answer(current, 1));
            }
            Payloads.QuizQuestionData repeated = Payloads.fromJson(
                    host.last(MessageType.QUIZ_QUESTION).getPayload(),
                    Payloads.QuizQuestionData.class);
            assertEquals(4, repeated.attempt());
            assertEquals(1, repeated.questionId());

            time.set(TimeUnit.MINUTES.toNanos(3));
            room.answer(host, answer(repeated, 0));
            assertTrue(room.isFinished());
            assertEquals(1, finished.get());
            Payloads.QuizLeaderboardData finalBoard = Payloads.fromJson(
                    host.last(MessageType.QUIZ_ROOM_FINISHED).getPayload(),
                    Payloads.QuizLeaderboardData.class);
            assertTrue(finalBoard.finished());
        } finally {
            scheduler.shutdownNow();
        }
    }

    private static QuizRoom room(StubClient host, boolean hostPlays,
                                 ScheduledExecutorService scheduler, AtomicLong time,
                                 AtomicInteger finished) {
        return new QuizRoom("123456", host, "Demo", hostPlays, 180, BANK,
                scheduler, time::get, ignored -> finished.incrementAndGet());
    }

    private static Payloads.QuizQuestionData questionData(StubClient client) {
        return Payloads.fromJson(client.last(MessageType.QUIZ_QUESTION).getPayload(),
                Payloads.QuizQuestionData.class);
    }

    private static Payloads.QuizAnswerData answer(Payloads.QuizQuestionData question, int index) {
        return new Payloads.QuizAnswerData(question.sessionId(), question.attempt(),
                question.questionId(), question.choices().get(index).choiceId());
    }

    private static final class StubClient extends ClientHandler {
        final List<Message> messages = new CopyOnWriteArrayList<>();
        final long id;
        boolean connected = true;

        StubClient(long id) {
            super(new Socket());
            this.id = id;
            setAuthenticatedPlayer(id, "player" + id);
        }

        @Override public boolean isConnected() { return connected; }
        @Override public boolean isAuthenticated() { return true; }
        @Override public void send(Message message) { messages.add(message); }

        Message first(MessageType type) {
            return messages.stream().filter(message -> message.getType() == type)
                    .findFirst().orElseThrow();
        }

        Message firstOrNull(MessageType type) {
            return messages.stream().filter(message -> message.getType() == type)
                    .findFirst().orElse(null);
        }

        Message last(MessageType type) {
            return messages.stream().filter(message -> message.getType() == type)
                    .reduce((first, second) -> second).orElseThrow();
        }
    }
}
