package com.nihongoquest.server.ranked;

import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.server.network.ClientHandler;
import com.nihongoquest.server.question.Choice;
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

/** Trận Ranked có deadline chung nhưng mỗi người tự tiến qua các câu hỏi. */
public class GameRoom {
    private static final Logger LOGGER = Logger.getLogger(GameRoom.class.getName());

    static final int QUESTION_SECONDS = 30;
    static final int MIN_QUESTION_POOL = 3;
    static final int MAX_QUESTION_POOL = 10;
    public static final int THREE_MINUTES = 180;
    public static final int FIVE_MINUTES = 300;

    private final String roomId;
    private final ClientHandler[] players;
    private final long[] userIds;
    private final List<Question> questions;
    private final int durationSeconds;
    private final MatchRepository matches;
    private final ScheduledExecutorService scheduler;
    private final LongSupplier nanoTime;

    private final int[] questionPositions = new int[2];
    private final int[] attempts = new int[2];
    private final int[] scores = new int[2];
    private final int[] answeredCount = new int[2];
    private final int[] correctCount = new int[2];
    private final boolean[] awaitingAnswer = new boolean[2];
    private final long[] questionDeadlines = new long[2];
    private final ScheduledFuture<?>[] questionTimeouts = new ScheduledFuture<?>[2];

    private long matchDeadlineNanos;
    private boolean started;
    private boolean finished;
    private ScheduledFuture<?> matchTimeout;

    public GameRoom(String roomId, ClientHandler player1, ClientHandler player2,
                    List<Question> questions, int durationSeconds,
                    MatchRepository matches, ScheduledExecutorService scheduler) {
        this(roomId, player1, player2, questions, durationSeconds,
                matches, scheduler, System::nanoTime);
    }

    GameRoom(String roomId, ClientHandler player1, ClientHandler player2,
             List<Question> questions, int durationSeconds, MatchRepository matches,
             ScheduledExecutorService scheduler, LongSupplier nanoTime) {
        if (durationSeconds != THREE_MINUTES && durationSeconds != FIVE_MINUTES) {
            throw new IllegalArgumentException("Ranked duration must be 180 or 300 seconds");
        }
        if (questions == null || questions.size() < MIN_QUESTION_POOL) {
            throw new IllegalArgumentException("Ranked needs at least three questions");
        }
        this.roomId = roomId;
        this.players = new ClientHandler[]{player1, player2};
        this.userIds = new long[]{player1.getPlayerId(), player2.getPlayerId()};
        this.questions = List.copyOf(questions);
        this.durationSeconds = durationSeconds;
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

        long now = nanoTime.getAsLong();
        matchDeadlineNanos = now + TimeUnit.SECONDS.toNanos(durationSeconds);
        matchTimeout = scheduler.schedule(this::endGame, durationSeconds, TimeUnit.SECONDS);
        players[0].send(new Message(MessageType.MATCH_FOUND,
                Payloads.matchFound(roomId, players[1].getUsername(), durationSeconds)));
        players[1].send(new Message(MessageType.MATCH_FOUND,
                Payloads.matchFound(roomId, players[0].getUsername(), durationSeconds)));
        sendQuestion(0);
        sendQuestion(1);
    }

    public synchronized void handleAnswer(ClientHandler player, Payloads.AnswerData answer) {
        int index = indexOf(player);
        if (!started || finished || index < 0 || answer == null || !awaitingAnswer[index]) return;
        Question question = currentQuestion(index);
        if (!roomId.equals(answer.sessionId()) || answer.attempt() != attempts[index]
                || answer.questionId() != question.getId()) {
            return;
        }

        long now = nanoTime.getAsLong();
        if (now >= matchDeadlineNanos) {
            endGame();
            return;
        }
        if (now >= questionDeadlines[index]) {
            onQuestionTimeout(index, attempts[index]);
            return;
        }
        int choiceIndex = question.indexOfChoice(answer.choiceId());
        if (choiceIndex < 0) return;

        cancelQuestionTimeout(index);
        resolveAnswer(index, question.getChoices().get(choiceIndex));
        advancePlayer(index);
    }

    private void sendQuestion(int playerIndex) {
        if (finished) return;
        long now = nanoTime.getAsLong();
        long matchRemainingNanos = matchDeadlineNanos - now;
        if (matchRemainingNanos <= 0) {
            endGame();
            return;
        }

        Question question = currentQuestion(playerIndex);
        attempts[playerIndex]++;
        awaitingAnswer[playerIndex] = true;
        long questionNanos = Math.min(TimeUnit.SECONDS.toNanos(QUESTION_SECONDS), matchRemainingNanos);
        questionDeadlines[playerIndex] = now + questionNanos;
        int questionSeconds = ceilSeconds(questionNanos);
        int matchSeconds = ceilSeconds(matchRemainingNanos);
        int expectedAttempt = attempts[playerIndex];
        questionTimeouts[playerIndex] = scheduler.schedule(
                () -> onQuestionTimeout(playerIndex, expectedAttempt),
                questionNanos, TimeUnit.NANOSECONDS);

        players[playerIndex].send(new Message(MessageType.QUESTION,
                Payloads.question(roomId, attempts[playerIndex], questionSeconds, matchSeconds,
                        question.getId(), question.getContent(), question.getChoices().stream()
                                .map(choice -> new Payloads.ChoiceData(
                                        choice.id(), choice.content(), choice.position()))
                                .toList())));
    }

    private synchronized void onQuestionTimeout(int playerIndex, int expectedAttempt) {
        if (finished || !awaitingAnswer[playerIndex] || attempts[playerIndex] != expectedAttempt) return;
        if (nanoTime.getAsLong() >= matchDeadlineNanos) {
            endGame();
            return;
        }
        resolveAnswer(playerIndex, null);
        advancePlayer(playerIndex);
    }

    private void resolveAnswer(int playerIndex, Choice chosenChoice) {
        Question question = currentQuestion(playerIndex);
        awaitingAnswer[playerIndex] = false;
        answeredCount[playerIndex]++;
        boolean correct = chosenChoice != null && chosenChoice.correct();
        int awarded = correct ? 1 : 0;
        if (correct) {
            scores[playerIndex]++;
            correctCount[playerIndex]++;
        }
        long correctChoiceId = question.getChoices().get(question.getCorrectAnswerIndex()).id();
        players[playerIndex].send(new Message(MessageType.ANSWER_RESULT,
                Payloads.answerResult(roomId, attempts[playerIndex], question.getId(), correct,
                        chosenChoice == null ? null : chosenChoice.id(), correctChoiceId, awarded)));
        sendScores();
    }

    private void advancePlayer(int playerIndex) {
        questionPositions[playerIndex] = (questionPositions[playerIndex] + 1) % questions.size();
        sendQuestion(playerIndex);
    }

    public synchronized void playerDisconnected(ClientHandler disconnected) {
        int disconnectedIndex = indexOf(disconnected);
        if (finished || disconnectedIndex < 0) return;
        finished = true;
        cancelAllTimers();
        clearRoom();
        boolean saved = saveResult(EndReason.DISCONNECT, userIds[disconnectedIndex]);
        int opponent = 1 - disconnectedIndex;
        if (saved && players[opponent].isConnected()) {
            sendGameOver(opponent, "WIN");
        }
    }

    /** Được gọi bởi deadline chung; public để test và dashboard có thể kết thúc an toàn. */
    public synchronized void endGame() {
        if (finished) return;
        finished = true;
        cancelAllTimers();
        boolean saved = saveResult(EndReason.NORMAL, null);
        if (saved) {
            sendGameOver(0, resultText(0));
            sendGameOver(1, resultText(1));
        }
        clearRoom();
    }

    private boolean saveResult(EndReason reason, Long forfeitingUserId) {
        try {
            matches.saveResult(result(0), result(1), durationSeconds, reason, forfeitingUserId);
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

    private Question currentQuestion(int playerIndex) {
        return questions.get(questionPositions[playerIndex]);
    }

    private void sendScores() {
        players[0].send(new Message(MessageType.SCORE_UPDATE,
                Payloads.scores(scores[0], scores[1])));
        players[1].send(new Message(MessageType.SCORE_UPDATE,
                Payloads.scores(scores[1], scores[0])));
    }

    private String resultText(int index) {
        int opponent = 1 - index;
        return scores[index] > scores[opponent] ? "WIN"
                : scores[index] < scores[opponent] ? "LOSE" : "DRAW";
    }

    private void sendGameOver(int index, String result) {
        int opponent = 1 - index;
        players[index].send(new Message(MessageType.GAME_OVER,
                Payloads.gameOver(result, scores[index], scores[opponent])));
    }

    private void cancelAllTimers() {
        if (matchTimeout != null) matchTimeout.cancel(false);
        cancelQuestionTimeout(0);
        cancelQuestionTimeout(1);
    }

    private void cancelQuestionTimeout(int index) {
        if (questionTimeouts[index] != null) questionTimeouts[index].cancel(false);
        questionTimeouts[index] = null;
    }

    private int indexOf(ClientHandler player) {
        return player == players[0] ? 0 : player == players[1] ? 1 : -1;
    }

    private void clearRoom() {
        players[0].clearCurrentRoom(this);
        players[1].clearCurrentRoom(this);
    }

    private void sendBoth(MessageType type, String payload) {
        players[0].send(new Message(type, payload));
        players[1].send(new Message(type, payload));
    }

    private static int ceilSeconds(long nanos) {
        return (int) Math.max(1, (nanos + TimeUnit.SECONDS.toNanos(1) - 1)
                / TimeUnit.SECONDS.toNanos(1));
    }

    public String getRoomId() { return roomId; }
    public int getDurationSeconds() { return durationSeconds; }
    public synchronized boolean isFinished() { return finished; }
}
