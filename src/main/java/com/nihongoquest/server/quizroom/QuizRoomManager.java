package com.nihongoquest.server.quizroom;

import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.server.network.ClientHandler;
import com.nihongoquest.server.question.Choice;
import com.nihongoquest.server.question.Question;
import com.nihongoquest.server.quiz.QuizSetException;
import com.nihongoquest.server.quiz.QuizSetService;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.IntSupplier;

/** Quản lý PIN và ánh xạ tài khoản vào phòng Quiz đang hoạt động. */
public class QuizRoomManager {
    private final QuizSetService quizSets;
    private final ScheduledExecutorService scheduler;
    private final IntSupplier pinSupplier;
    private final Map<String, QuizRoom> rooms = new ConcurrentHashMap<>();
    private final Map<Long, QuizRoom> userRooms = new ConcurrentHashMap<>();

    public QuizRoomManager(QuizSetService quizSets, ScheduledExecutorService scheduler) {
        this(quizSets, scheduler,
                () -> ThreadLocalRandom.current().nextInt(100_000, 1_000_000));
    }

    QuizRoomManager(QuizSetService quizSets, ScheduledExecutorService scheduler,
                    IntSupplier pinSupplier) {
        this.quizSets = quizSets;
        this.scheduler = scheduler;
        this.pinSupplier = pinSupplier;
    }

    public synchronized void create(ClientHandler host, Payloads.QuizRoomCreateRequest request)
            throws SQLException {
        requireAvailable(host);
        if (request == null || request.durationMinutes() < 1 || request.durationMinutes() > 15) {
            throw new QuizRoomException("INVALID_DURATION");
        }
        if (request.proctoringEnabled() && request.hostPlays()) {
            throw new QuizRoomException("PROCTORING_HOST_CANNOT_PLAY");
        }
        Payloads.QuizSetEdit quizSet;
        try {
            quizSet = quizSets.getPublishedForRoom(request.quizSetId());
        } catch (QuizSetException e) {
            throw new QuizRoomException(e.getCode());
        }
        List<Question> questions = snapshot(quizSet);
        String pin = uniquePin();
        QuizRoom room = new QuizRoom(pin, host, quizSet.title(), request.hostPlays(),
                request.proctoringEnabled(),
                request.durationMinutes() * 60, questions, scheduler, System::nanoTime,
                this::scheduleCleanup);
        rooms.put(pin, room);
        userRooms.put(host.getPlayerId(), room);
        host.send(new Message(MessageType.QUIZ_ROOM_CREATED,
                Payloads.toJson(new Payloads.QuizRoomCreated(
                        room.lobbyFor(host.getPlayerId())))));
    }

    public synchronized void join(ClientHandler client, String rawPin) {
        requireAvailable(client);
        String pin = normalizePin(rawPin);
        QuizRoom room = rooms.get(pin);
        if (room == null || room.isFinished()) throw new QuizRoomException("ROOM_NOT_FOUND");
        room.join(client);
        userRooms.put(client.getPlayerId(), room);
    }

    public void start(ClientHandler client) {
        requireCurrent(client).start(client);
    }

    public void answer(ClientHandler client, Payloads.QuizAnswerData answer) {
        requireCurrent(client).answer(client, answer);
    }

    public void reportProctorStatus(ClientHandler client, Payloads.ProctorStatusReport report) {
        requireCurrent(client).reportProctorStatus(client, report);
    }

    public void reportProctorEvent(ClientHandler client, Payloads.ProctorEventReport report) {
        requireCurrent(client).reportProctorEvent(client, report);
    }

    public synchronized void leave(ClientHandler client) {
        QuizRoom room = requireCurrent(client);
        room.leave(client);
        userRooms.remove(client.getPlayerId(), room);
    }

    public void cancel(ClientHandler client) {
        requireCurrent(client).cancelByHost(client);
    }

    public void disconnected(ClientHandler client) {
        QuizRoom room = userRooms.get(client.getPlayerId());
        if (room != null) room.disconnected(client);
    }

    /** Gọi sau LOGIN_OK; room tự gửi snapshot lobby hoặc câu hiện tại. */
    public boolean reconnect(ClientHandler client) {
        QuizRoom room = userRooms.get(client.getPlayerId());
        if (room == null) return false;
        if (room.reconnect(client)) return true;
        userRooms.remove(client.getPlayerId(), room);
        return false;
    }

    public boolean isHostOfLobby(ClientHandler client, String rawPin) {
        String pin;
        try {
            pin = normalizePin(rawPin);
        } catch (QuizRoomException e) {
            return false;
        }
        QuizRoom room = rooms.get(pin);
        return room != null && room == client.getCurrentQuizRoom()
                && room.isLobby() && room.isHost(client.getPlayerId());
    }

    public void joinFromInvite(ClientHandler client, String pin) {
        join(client, pin);
    }

    private void requireAvailable(ClientHandler client) {
        if (!client.isAuthenticated()) throw new QuizRoomException("NOT_AUTHENTICATED");
        if (client.getCurrentRoom() != null || client.isQueued()
                || client.getCurrentQuizRoom() != null
                || userRooms.containsKey(client.getPlayerId())) {
            throw new QuizRoomException("BUSY");
        }
    }

    private QuizRoom requireCurrent(ClientHandler client) {
        QuizRoom room = client.getCurrentQuizRoom();
        if (room == null) throw new QuizRoomException("NOT_IN_ROOM");
        return room;
    }

    private List<Question> snapshot(Payloads.QuizSetEdit quizSet) {
        List<Question> questions = new ArrayList<>();
        for (Payloads.QuizQuestionEdit source : quizSet.questions()) {
            if (source.id() == null || source.id() <= 0) {
                throw new QuizRoomException("INVALID_QUIZ");
            }
            List<Choice> choices = new ArrayList<>();
            for (Payloads.QuizChoiceEdit choice : source.choices()) {
                if (choice.id() == null || choice.id() <= 0) {
                    throw new QuizRoomException("INVALID_QUIZ");
                }
                choices.add(new Choice(choice.id(), source.id(), choice.content(),
                        choice.correct(), choice.position()));
            }
            questions.add(new Question(source.id(), source.content(), quizSet.title(),
                    quizSet.level(), source.explanation(), choices));
        }
        if (questions.size() < 3) throw new QuizRoomException("INVALID_QUIZ");
        return List.copyOf(questions);
    }

    private String uniquePin() {
        for (int attempts = 0; attempts < 100; attempts++) {
            String pin = String.format("%06d", pinSupplier.getAsInt());
            if (!rooms.containsKey(pin)) return pin;
        }
        throw new QuizRoomException("PIN_UNAVAILABLE");
    }

    private String normalizePin(String rawPin) {
        String pin = rawPin == null ? "" : rawPin.trim();
        if (!pin.matches("\\d{6}")) throw new QuizRoomException("INVALID_PIN");
        return pin;
    }

    private void scheduleCleanup(QuizRoom room) {
        scheduler.execute(() -> cleanup(room));
    }

    private synchronized void cleanup(QuizRoom room) {
        rooms.remove(room.getPin(), room);
        for (long userId : room.memberIds()) userRooms.remove(userId, room);
    }

    public int activeRoomCount() { return rooms.size(); }

    public void shutdown() {
        List<QuizRoom> active = List.copyOf(rooms.values());
        active.forEach(QuizRoom::shutdown);
        rooms.clear();
        userRooms.clear();
    }
}
