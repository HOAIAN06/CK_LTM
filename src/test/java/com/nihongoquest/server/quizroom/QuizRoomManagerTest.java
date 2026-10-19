package com.nihongoquest.server.quizroom;

import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.server.network.ClientHandler;
import com.nihongoquest.server.quiz.QuizSetRepository;
import com.nihongoquest.server.quiz.QuizSetService;
import org.junit.jupiter.api.Test;

import java.net.Socket;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class QuizRoomManagerTest {
    @Test
    void generatesUniqueSixDigitPinsAndRejectsUnknownPin() throws Exception {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        int[] pins = {123456, 123456, 654321};
        AtomicInteger index = new AtomicInteger();
        QuizRoomManager manager = new QuizRoomManager(
                new FakeQuizSets(), scheduler, () -> pins[index.getAndIncrement()]);
        StubClient first = new StubClient(1);
        StubClient second = new StubClient(2);
        try {
            manager.create(first, new Payloads.QuizRoomCreateRequest(5, 3, true));
            manager.create(second, new Payloads.QuizRoomCreateRequest(5, 5, false));

            String firstPin = created(first).lobby().pin();
            String secondPin = created(second).lobby().pin();
            assertEquals("123456", firstPin);
            assertEquals("654321", secondPin);
            assertNotEquals(firstPin, secondPin);
            assertEquals(2, manager.activeRoomCount());

            StubClient stranger = new StubClient(3);
            assertEquals("INVALID_PIN", assertThrows(QuizRoomException.class,
                    () -> manager.join(stranger, "123")).getCode());
            assertEquals("ROOM_NOT_FOUND", assertThrows(QuizRoomException.class,
                    () -> manager.join(stranger, "999999")).getCode());
        } finally {
            manager.cancel(first);
            manager.cancel(second);
            scheduler.shutdownNow();
        }
    }

    private static Payloads.QuizRoomCreated created(StubClient client) {
        Message message = client.messages.stream()
                .filter(item -> item.getType() == MessageType.QUIZ_ROOM_CREATED)
                .findFirst().orElseThrow();
        return Payloads.fromJson(message.getPayload(), Payloads.QuizRoomCreated.class);
    }

    private static final class FakeQuizSets extends QuizSetService {
        FakeQuizSets() {
            super(new QuizSetRepository(null));
        }

        @Override
        public Payloads.QuizSetEdit getPublishedForRoom(long quizSetId) {
            return new Payloads.QuizSetEdit(quizSetId, "Demo", "", "N5",
                    List.of(question(1), question(2), question(3)));
        }

        private Payloads.QuizQuestionEdit question(long id) {
            return new Payloads.QuizQuestionEdit(id, "Question " + id, "", List.of(
                    new Payloads.QuizChoiceEdit(id * 10 + 1, "A", 1, true),
                    new Payloads.QuizChoiceEdit(id * 10 + 2, "B", 2, false),
                    new Payloads.QuizChoiceEdit(id * 10 + 3, "C", 3, false),
                    new Payloads.QuizChoiceEdit(id * 10 + 4, "D", 4, false)));
        }
    }

    private static final class StubClient extends ClientHandler {
        final List<Message> messages = new CopyOnWriteArrayList<>();

        StubClient(long id) {
            super(new Socket());
            setAuthenticatedPlayer(id, "player" + id);
        }

        @Override public boolean isConnected() { return true; }
        @Override public void send(Message message) { messages.add(message); }
    }
}
