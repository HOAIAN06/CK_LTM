package com.nihongoquest.server.ranked;

import com.fasterxml.jackson.databind.JsonNode;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.server.network.ClientHandler;
import com.nihongoquest.server.question.Question;
import com.nihongoquest.server.ranked.MatchRepository.EndReason;
import com.nihongoquest.server.ranked.MatchRepository.MatchResult;

import java.sql.SQLException;
import java.util.List;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.LongSupplier;
import java.util.logging.Logger;

/** Phòng Ranked hiện tại; timer dùng scheduler chung của GameServer. */
public class GameRoom {
    private static final Logger LOGGER = Logger.getLogger(GameRoom.class.getName());
    static final int QUESTION_SECONDS = 30;
    static final int RANKED_QUESTION_COUNT = 3;
    static final int DEFAULT_MATCH_SECONDS = 180;
    private static final int NEXT_QUESTION_DELAY_MILLIS = 1_500;

    private final String roomId;
    private final ClientHandler[] players;
    private final long[] userIds;
    private final List<Question> questions;
    private final MatchRepository matches;
    private final ScheduledExecutorService scheduler;
    private final LongSupplier nanoTime;
    private final int[] scores = new int[2];
    private final int[] answeredCount = new int[2];
    private final int[] correctCount = new int[2];
    private final boolean[] answered = new boolean[2];

    private int round;
    private long deadlineNanos;
    private boolean started;
    private boolean advancing;
    private boolean finished;
    private ScheduledFuture<?> timeoutTask;

    public GameRoom(String roomId, ClientHandler player1, ClientHandler player2,
                    List<Question> questions, MatchRepository matches,
                    ScheduledExecutorService scheduler) {
        this(roomId, player1, player2, questions, matches, scheduler, System::nanoTime);
    }

    GameRoom(String roomId, ClientHandler player1, ClientHandler player2,
             List<Question> questions, MatchRepository matches,
             ScheduledExecutorService scheduler, LongSupplier nanoTime) {
        this.roomId = roomId;
        this.players = new ClientHandler[]{player1, player2};
        this.userIds = new long[]{player1.getPlayerId(), player2.getPlayerId()};
        this.questions = List.copyOf(questions);
        this.matches = matches;
        this.scheduler = scheduler;
        this.nanoTime = nanoTime;
        player1.setCurrentRoom(this);
        player2.setCurrentRoom(this);
    }

    public synchronized void start() {
        if (started || finished) return;
        started = true;
        if (!players[0].isConnected() || !players[1].isConnected()) {
            playerDisconnected(!players[0].isConnected() ? players[0] : players[1]);
            return;
        }
        players[0].send(new Message(MessageType.MATCH_FOUND,
                Payloads.matchFound(roomId, players[1].getUsername())));
        players[1].send(new Message(MessageType.MATCH_FOUND,
                Payloads.matchFound(roomId, players[0].getUsername())));
        sendQuestion();
    }

    public synchronized void handleAnswer(ClientHandler player, long questionId, long choiceId) {
        int index = indexOf(player);
        if (!started || finished || advancing || index < 0 || answered[index]) return;
        Question question = questions.get(round);
        if (question.getId() != questionId) return;
        int choiceIndex = question.indexOfChoice(choiceId);
        if (choiceIndex < 0) return;
        if (nanoTime.getAsLong() >= deadlineNanos) {
            resolveMissingAnswers();
            scheduleNextQuestion();
            return;
        }
        resolveAnswer(index, choiceIndex);
        if (answered[0] && answered[1]) {
            cancelTimeout();
            scheduleNextQuestion();
        }
    }

    public synchronized void playerDisconnected(ClientHandler disconnected) {
        int disconnectedIndex = indexOf(disconnected);
        if (finished || disconnectedIndex < 0) return;
        finished = true;
        cancelTimeout();
        clearRoom();
        boolean saved = saveResult(EndReason.DISCONNECT, userIds[disconnectedIndex]);
        int opponent = 1 - disconnectedIndex;
        if (saved && players[opponent].isConnected()) {
            players[opponent].send(new Message(MessageType.MATCH_ERROR, "OPPONENT_DISCONNECTED"));
        }
    }

    private void sendQuestion() {
        answered[0] = false;
        answered[1] = false;
        Question question = questions.get(round);
        JsonNode payload = Payloads.question(round, questions.size(), QUESTION_SECONDS,
                question.getId(), question.getContent(), question.getChoices().stream()
                        .map(choice -> new Payloads.ChoiceData(
                                choice.id(), choice.content(), choice.position()))
                        .toList());
        deadlineNanos = nanoTime.getAsLong() + TimeUnit.SECONDS.toNanos(QUESTION_SECONDS);
        int expectedRound = round;
        timeoutTask = scheduler.schedule(
                () -> onTimeout(expectedRound), QUESTION_SECONDS, TimeUnit.SECONDS);
        sendBoth(MessageType.QUESTION, payload);
    }

    private synchronized void onTimeout(int expectedRound) {
        if (finished || advancing || round != expectedRound) return;
        resolveMissingAnswers();
        scheduleNextQuestion();
    }

    private void resolveMissingAnswers() {
        for (int i = 0; i < players.length; i++) {
            if (!answered[i]) resolveAnswer(i, -1);
        }
    }

    private void resolveAnswer(int playerIndex, int choiceIndex) {
        Question question = questions.get(round);
        boolean correct = choiceIndex >= 0 && question.getChoices().get(choiceIndex).correct();
        answered[playerIndex] = true;
        answeredCount[playerIndex]++;
        if (correct) {
            scores[playerIndex]++;
            correctCount[playerIndex]++;
        }
        players[playerIndex].send(new Message(MessageType.ANSWER_RESULT,
                Payloads.answerResult(correct, choiceIndex, question.getCorrectAnswerIndex())));
        sendScores();
    }

    private void scheduleNextQuestion() {
        if (advancing || finished) return;
        advancing = true;
        scheduler.schedule(this::advanceRound,
                NEXT_QUESTION_DELAY_MILLIS, TimeUnit.MILLISECONDS);
    }

    private synchronized void advanceRound() {
        advancing = false;
        if (finished) return;
        round++;
        if (round >= questions.size()) endGame();
        else sendQuestion();
    }

    public synchronized void endGame() {
        if (finished) return;
        finished = true;
        cancelTimeout();
        boolean saved = saveResult(EndReason.NORMAL, null);
        if (saved) {
            sendGameOver(0);
            sendGameOver(1);
        }
        clearRoom();
    }

    private boolean saveResult(EndReason reason, Long forfeitingUserId) {
        try {
            matches.saveResult(result(0), result(1), DEFAULT_MATCH_SECONDS, reason, forfeitingUserId);
            return true;
        } catch (SQLException e) {
            LOGGER.warning("Không thể lưu kết quả phòng " + roomId + ": " + e.getMessage());
            sendBoth(MessageType.MATCH_ERROR, "DATABASE_ERROR");
            return false;
        }
    }

    private MatchResult result(int index) {
        return new MatchResult(userIds[index], scores[index],
                answeredCount[index], correctCount[index]);
    }

    private void sendScores() {
        players[0].send(new Message(MessageType.SCORE_UPDATE,
                Payloads.scores(scores[0], scores[1])));
        players[1].send(new Message(MessageType.SCORE_UPDATE,
                Payloads.scores(scores[1], scores[0])));
    }

    private void sendGameOver(int index) {
        int opponent = 1 - index;
        String result = scores[index] > scores[opponent] ? "WIN"
                : scores[index] < scores[opponent] ? "LOSE" : "DRAW";
        players[index].send(new Message(MessageType.GAME_OVER,
                Payloads.gameOver(result, scores[index], scores[opponent])));
    }

    private void cancelTimeout() {
        if (timeoutTask != null) timeoutTask.cancel(false);
    }

    private int indexOf(ClientHandler player) {
        return player == players[0] ? 0 : player == players[1] ? 1 : -1;
    }

    private void clearRoom() {
        players[0].clearCurrentRoom(this);
        players[1].clearCurrentRoom(this);
    }

    private void sendBoth(MessageType type, JsonNode payload) {
        players[0].send(new Message(type, payload));
        players[1].send(new Message(type, payload));
    }

    private void sendBoth(MessageType type, String payload) {
        players[0].send(new Message(type, payload));
        players[1].send(new Message(type, payload));
    }

    public String getRoomId() { return roomId; }
    public synchronized boolean isFinished() { return finished; }
}
