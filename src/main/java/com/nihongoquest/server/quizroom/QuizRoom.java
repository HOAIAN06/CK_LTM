package com.nihongoquest.server.quizroom;

import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.server.network.ClientHandler;
import com.nihongoquest.server.question.Choice;
import com.nihongoquest.server.question.Question;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.LongSupplier;
import java.util.function.Consumer;

/** Phòng Quiz trong RAM: lobby chung, tiến độ câu hỏi riêng cho từng người chơi. */
public class QuizRoom {
    static final int MIN_PLAYERS = 2;
    static final int MAX_PLAYERS = 20;
    static final int QUESTION_SECONDS = 30;

    private enum State { LOBBY, RUNNING, FINISHED }

    private final String pin;
    private final long hostId;
    private final String title;
    private final boolean hostPlays;
    private final int durationSeconds;
    private final List<Question> questions;
    private final ScheduledExecutorService scheduler;
    private final LongSupplier nanoTime;
    private final Consumer<QuizRoom> finishedCallback;
    private final Map<Long, PlayerState> members = new LinkedHashMap<>();

    private State state = State.LOBBY;
    private long roomDeadlineNanos;
    private ScheduledFuture<?> roomTimeout;

    QuizRoom(String pin, ClientHandler host, String title, boolean hostPlays,
             int durationSeconds, List<Question> questions,
             ScheduledExecutorService scheduler, LongSupplier nanoTime,
             Consumer<QuizRoom> finishedCallback) {
        this.pin = pin;
        this.hostId = host.getPlayerId();
        this.title = title;
        this.hostPlays = hostPlays;
        this.durationSeconds = durationSeconds;
        this.questions = List.copyOf(questions);
        this.scheduler = scheduler;
        this.nanoTime = nanoTime;
        this.finishedCallback = finishedCallback;
        PlayerState hostState = new PlayerState(hostId, host.getUsername(), true, hostPlays, host);
        members.put(hostId, hostState);
        host.setCurrentQuizRoom(this);
    }

    synchronized void join(ClientHandler client) {
        PlayerState existing = members.get(client.getPlayerId());
        if (existing != null && !existing.left) {
            existing.client = client;
            client.setCurrentQuizRoom(this);
            sendLobbyToAll();
            return;
        }
        if (state != State.LOBBY) throw new QuizRoomException("ROOM_STARTED");
        if (playerCount() >= MAX_PLAYERS) throw new QuizRoomException("ROOM_FULL");
        PlayerState joined = new PlayerState(client.getPlayerId(), client.getUsername(),
                false, true, client);
        members.put(joined.userId, joined);
        client.setCurrentQuizRoom(this);
        sendLobbyToAll();
    }

    synchronized void start(ClientHandler requester) {
        requireHost(requester);
        if (state != State.LOBBY) throw new QuizRoomException("ROOM_STARTED");
        if (connectedPlayerCount() < MIN_PLAYERS) {
            throw new QuizRoomException("NOT_ENOUGH_PLAYERS");
        }
        state = State.RUNNING;
        roomDeadlineNanos = nanoTime.getAsLong() + TimeUnit.SECONDS.toNanos(durationSeconds);
        roomTimeout = scheduler.schedule(this::finishNormally, durationSeconds, TimeUnit.SECONDS);

        for (PlayerState member : members.values()) {
            if (member.client != null) {
                member.client.send(new Message(MessageType.QUIZ_ROOM_START,
                        Payloads.toJson(new Payloads.QuizRoomStarted(
                                pin, title, durationSeconds, member.playing, member.host))));
            }
        }
        broadcastLeaderboard(false, MessageType.QUIZ_LEADERBOARD);
        for (PlayerState member : members.values()) {
            if (member.playing && !member.left) sendNextQuestion(member);
        }
    }

    synchronized void answer(ClientHandler client, Payloads.QuizAnswerData answer) {
        if (state != State.RUNNING || answer == null) return;
        PlayerState player = members.get(client.getPlayerId());
        if (player == null || player.left || !player.playing || player.client != client
                || !player.awaitingAnswer) return;
        Question question = currentQuestion(player);
        if (!pin.equals(answer.sessionId()) || answer.attempt() != player.attempt
                || answer.questionId() != question.getId()) return;
        long now = nanoTime.getAsLong();
        if (now >= roomDeadlineNanos) {
            finishNormally();
            return;
        }
        if (now >= player.questionDeadlineNanos) {
            onQuestionTimeout(player.userId, player.attempt);
            return;
        }
        int choiceIndex = question.indexOfChoice(answer.choiceId());
        if (choiceIndex < 0) return;
        cancelQuestionTimer(player);
        resolveAnswer(player, question.getChoices().get(choiceIndex), now);
        broadcastLeaderboard(false, MessageType.QUIZ_LEADERBOARD);
        advance(player);
    }

    synchronized void leave(ClientHandler client) {
        PlayerState player = members.get(client.getPlayerId());
        if (player == null || player.left) return;
        if (player.host) {
            cancel("HOST_CANCELLED");
            return;
        }
        player.left = true;
        player.awaitingAnswer = false;
        cancelQuestionTimer(player);
        player.client = null;
        client.clearCurrentQuizRoom(this);
        if (state == State.LOBBY) members.remove(player.userId);
        sendLobbyToAll();
        if (state == State.RUNNING) broadcastLeaderboard(false, MessageType.QUIZ_LEADERBOARD);
    }

    synchronized void cancelByHost(ClientHandler client) {
        requireHost(client);
        cancel("HOST_CANCELLED");
    }

    synchronized void shutdown() {
        cancel("SERVER_STOPPED");
    }

    synchronized void disconnected(ClientHandler client) {
        PlayerState player = members.get(client.getPlayerId());
        if (player == null || player.client != client) return;
        player.client = null;
        client.clearCurrentQuizRoom(this);
        if (state == State.LOBBY) sendLobbyToAll();
        if (state == State.RUNNING) broadcastLeaderboard(false, MessageType.QUIZ_LEADERBOARD);
    }

    synchronized boolean reconnect(ClientHandler client) {
        PlayerState player = members.get(client.getPlayerId());
        if (state == State.FINISHED || player == null || player.left) return false;
        player.client = client;
        client.setCurrentQuizRoom(this);
        boolean running = state == State.RUNNING;
        client.send(new Message(MessageType.QUIZ_REJOINED,
                Payloads.toJson(new Payloads.QuizRejoinData(
                        lobbyData(player.userId), running, player.playing,
                        running ? roomRemainingSeconds() : 0))));
        if (!running) {
            sendLobbyToAll();
            return true;
        }
        client.send(new Message(MessageType.QUIZ_LEADERBOARD,
                Payloads.toJson(leaderboard(false))));
        if (player.playing) {
            long now = nanoTime.getAsLong();
            if (now >= roomDeadlineNanos) finishNormally();
            else if (!player.awaitingAnswer || now >= player.questionDeadlineNanos) {
                if (player.awaitingAnswer) onQuestionTimeout(player.userId, player.attempt);
                else sendNextQuestion(player);
            } else {
                sendCurrentQuestion(player, now);
            }
        }
        return true;
    }

    private void sendNextQuestion(PlayerState player) {
        if (state != State.RUNNING || player.left) return;
        long now = nanoTime.getAsLong();
        long roomRemaining = roomDeadlineNanos - now;
        if (roomRemaining <= 0) {
            finishNormally();
            return;
        }
        player.attempt++;
        player.awaitingAnswer = true;
        player.questionDeadlineNanos = now + Math.min(
                TimeUnit.SECONDS.toNanos(QUESTION_SECONDS), roomRemaining);
        int expectedAttempt = player.attempt;
        long delay = player.questionDeadlineNanos - now;
        player.questionTimeout = scheduler.schedule(
                () -> onQuestionTimeout(player.userId, expectedAttempt), delay, TimeUnit.NANOSECONDS);
        sendCurrentQuestion(player, now);
    }

    private void sendCurrentQuestion(PlayerState player, long now) {
        if (player.client == null || !player.client.isConnected()) return;
        Question question = currentQuestion(player);
        int questionSeconds = ceilSeconds(player.questionDeadlineNanos - now);
        player.client.send(new Message(MessageType.QUIZ_QUESTION,
                Payloads.toJson(new Payloads.QuizQuestionData(
                        pin, pin, player.attempt, question.getId(), question.getContent(),
                        question.getChoices().stream().map(choice -> new Payloads.ChoiceData(
                                choice.id(), choice.content(), choice.position())).toList(),
                        questionSeconds, roomRemainingSeconds()))));
    }

    private synchronized void onQuestionTimeout(long userId, int expectedAttempt) {
        if (state != State.RUNNING) return;
        PlayerState player = members.get(userId);
        if (player == null || player.left || !player.awaitingAnswer
                || player.attempt != expectedAttempt) return;
        if (nanoTime.getAsLong() >= roomDeadlineNanos) {
            finishNormally();
            return;
        }
        resolveAnswer(player, null, nanoTime.getAsLong());
        broadcastLeaderboard(false, MessageType.QUIZ_LEADERBOARD);
        advance(player);
    }

    private void resolveAnswer(PlayerState player, Choice chosen, long now) {
        Question question = currentQuestion(player);
        player.awaitingAnswer = false;
        boolean correct = chosen != null && chosen.correct();
        int earned = 0;
        if (correct) {
            long remaining = Math.max(0, player.questionDeadlineNanos - now);
            earned = 500 + (int) Math.floor(500.0 * remaining
                    / TimeUnit.SECONDS.toNanos(QUESTION_SECONDS));
            earned = Math.max(500, Math.min(1000, earned));
            player.score += earned;
            player.correctAnswers++;
        }
        long correctId = question.getChoices().get(question.getCorrectAnswerIndex()).id();
        if (player.client != null && player.client.isConnected()) {
            player.client.send(new Message(MessageType.QUIZ_ANSWER_RESULT,
                    Payloads.toJson(new Payloads.QuizAnswerResult(
                            pin, player.attempt, question.getId(), correct,
                            chosen == null ? null : chosen.id(), correctId, earned, player.score))));
        }
    }

    private void advance(PlayerState player) {
        player.position = (player.position + 1) % questions.size();
        sendNextQuestion(player);
    }

    private synchronized void finishNormally() {
        if (state == State.FINISHED) return;
        state = State.FINISHED;
        cancelTimers();
        broadcastLeaderboard(true, MessageType.QUIZ_ROOM_FINISHED);
        clearClients();
        finishedCallback.accept(this);
    }

    private void cancel(String reason) {
        if (state == State.FINISHED) return;
        state = State.FINISHED;
        cancelTimers();
        for (PlayerState member : members.values()) {
            if (member.client != null && member.client.isConnected()) {
                member.client.send(new Message(MessageType.QUIZ_ROOM_CANCEL, reason));
            }
        }
        clearClients();
        finishedCallback.accept(this);
    }

    private void cancelTimers() {
        if (roomTimeout != null) roomTimeout.cancel(false);
        members.values().forEach(this::cancelQuestionTimer);
    }

    private void cancelQuestionTimer(PlayerState player) {
        if (player.questionTimeout != null) player.questionTimeout.cancel(false);
        player.questionTimeout = null;
    }

    private void clearClients() {
        for (PlayerState member : members.values()) {
            if (member.client != null) member.client.clearCurrentQuizRoom(this);
        }
    }

    private void sendLobbyToAll() {
        for (PlayerState member : members.values()) {
            if (!member.left && member.client != null && member.client.isConnected()) {
                member.client.send(new Message(MessageType.QUIZ_LOBBY_UPDATE,
                        Payloads.toJson(lobbyData(member.userId))));
            }
        }
    }

    private Payloads.QuizLobbyData lobbyData(long viewerId) {
        List<Payloads.QuizLobbyPlayer> data = members.values().stream()
                .filter(member -> !member.left)
                .map(member -> new Payloads.QuizLobbyPlayer(
                        member.userId, member.username, member.host, member.playing,
                        member.client != null && member.client.isConnected()))
                .toList();
        return new Payloads.QuizLobbyData(pin, title, hostUsername(), viewerId == hostId,
                hostPlays, state != State.LOBBY, playerCount(), data);
    }

    private Payloads.QuizLeaderboardData leaderboard(boolean finished) {
        List<PlayerState> ordered = members.values().stream()
                .filter(member -> member.playing)
                .sorted(Comparator.comparingInt((PlayerState member) -> member.score).reversed()
                        .thenComparing(Comparator.comparingInt(
                                (PlayerState member) -> member.correctAnswers).reversed())
                        .thenComparing(member -> member.username, String.CASE_INSENSITIVE_ORDER))
                .toList();
        List<Payloads.QuizLeaderboardEntry> entries = new ArrayList<>();
        int rank = 0;
        int previousScore = -1;
        int previousCorrect = -1;
        for (int index = 0; index < ordered.size(); index++) {
            PlayerState player = ordered.get(index);
            if (index == 0 || player.score != previousScore
                    || player.correctAnswers != previousCorrect) rank = index + 1;
            entries.add(new Payloads.QuizLeaderboardEntry(rank, player.userId, player.username,
                    player.score, player.correctAnswers,
                    player.client != null && player.client.isConnected()));
            previousScore = player.score;
            previousCorrect = player.correctAnswers;
        }
        return new Payloads.QuizLeaderboardData(pin, finished, List.copyOf(entries));
    }

    private void broadcastLeaderboard(boolean finished, MessageType type) {
        Payloads.QuizLeaderboardData payload = leaderboard(finished);
        for (PlayerState member : members.values()) {
            if (member.client != null && member.client.isConnected()) {
                member.client.send(new Message(type, Payloads.toJson(payload)));
            }
        }
    }

    private Question currentQuestion(PlayerState player) {
        return questions.get(player.position);
    }

    private int playerCount() {
        return (int) members.values().stream()
                .filter(member -> member.playing && !member.left).count();
    }

    private int connectedPlayerCount() {
        return (int) members.values().stream()
                .filter(member -> member.playing && !member.left
                        && member.client != null && member.client.isConnected()).count();
    }

    private int roomRemainingSeconds() {
        if (state != State.RUNNING) return durationSeconds;
        return ceilSeconds(roomDeadlineNanos - nanoTime.getAsLong());
    }

    private String hostUsername() {
        return members.get(hostId).username;
    }

    private void requireHost(ClientHandler client) {
        if (client.getPlayerId() != hostId) throw new QuizRoomException("NOT_HOST");
    }

    private static int ceilSeconds(long nanos) {
        return (int) Math.max(0, (nanos + TimeUnit.SECONDS.toNanos(1) - 1)
                / TimeUnit.SECONDS.toNanos(1));
    }

    public String getPin() { return pin; }
    synchronized Payloads.QuizLobbyData lobbyFor(long viewerId) { return lobbyData(viewerId); }
    public synchronized boolean isRunning() { return state == State.RUNNING; }
    public synchronized boolean isLobby() { return state == State.LOBBY; }
    public boolean isHost(long userId) { return hostId == userId; }
    public synchronized boolean isFinished() { return state == State.FINISHED; }
    public synchronized List<Long> memberIds() { return List.copyOf(members.keySet()); }

    private static final class PlayerState {
        final long userId;
        final String username;
        final boolean host;
        final boolean playing;
        ClientHandler client;
        int position;
        int attempt;
        int score;
        int correctAnswers;
        boolean awaitingAnswer;
        boolean left;
        long questionDeadlineNanos;
        ScheduledFuture<?> questionTimeout;

        PlayerState(long userId, String username, boolean host,
                    boolean playing, ClientHandler client) {
            this.userId = userId;
            this.username = username;
            this.host = host;
            this.playing = playing;
            this.client = client;
        }
    }
}
