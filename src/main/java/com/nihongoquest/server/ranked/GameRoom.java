package com.nihongoquest.server.ranked;

import com.nihongoquest.server.network.ClientHandler;
import com.nihongoquest.server.question.Question;

import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;

import java.sql.SQLException;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.logging.Logger;
import java.util.function.LongSupplier;

/** Một phòng đấu 1v1; toàn bộ chấm điểm diễn ra trên server. */
public class GameRoom {

    private static final Logger LOGGER = Logger.getLogger(GameRoom.class.getName());
    static final int QUESTION_SECONDS = 30;
    // The previous demo bank contained three rounds.
    static final int RANKED_QUESTION_COUNT = 3;
    private static final int NEXT_QUESTION_DELAY_MILLIS = 1_500;

    private final String roomId;
    private final long matchId;
    private final long[] userIds;
    private final int[] ratingsBefore;
    private final ClientHandler[] players;
    private final List<Question> questions;
    private final RankedMatchRepository repository;
    private final RankedResultService resultService;
    private final LongSupplier nanoTime;
    private final ScheduledExecutorService scheduler;
    private final int[] scores = new int[2];
    private final int[] answeredCount = new int[2];
    private final int[] correctCount = new int[2];
    private final boolean[] answered = new boolean[2];

    private int round;
    private long deadlineNanos;
    private long questionStartedNanos;
    private boolean started;
    private boolean advancing;
    private boolean finished;
    private ScheduledFuture<?> timeoutTask;

    public GameRoom(String roomId, RankedMatchService.CreatedMatch match,
                    ClientHandler player1, ClientHandler player2, List<Question> questions,
                    RankedMatchRepository repository, RankedResultService resultService) {
        this(roomId, match, player1, player2, questions, repository, resultService, System::nanoTime);
    }

    GameRoom(String roomId, RankedMatchService.CreatedMatch match,
             ClientHandler player1, ClientHandler player2, List<Question> questions,
             RankedMatchRepository repository, RankedResultService resultService, LongSupplier nanoTime) {
        this.roomId = roomId;
        this.matchId = match.matchId();
        this.players = new ClientHandler[] {player1, player2};
        this.userIds = new long[] {player1.getPlayerId(), player2.getPlayerId()};
        this.ratingsBefore = new int[] {match.firstRating(), match.secondRating()};
        // Match, participants and this entire immutable question list are already committed.
        this.questions = List.copyOf(questions);
        this.repository = repository;
        this.resultService = resultService;
        this.nanoTime = nanoTime;
        this.scheduler = Executors.newSingleThreadScheduledExecutor(task -> {
            Thread thread = new Thread(task, "game-room-" + roomId);
            thread.setDaemon(true);
            return thread;
        });
        player1.setCurrentRoom(this);
        player2.setCurrentRoom(this);
    }
    public synchronized void start() {
        if (started || finished) return;
        started = true;
        for (ClientHandler player : players) {
            if (!player.isConnected()) {
                playerDisconnected(player);
                return;
            }
        }
        log("Bắt đầu trận " + roomId + ": " + players[0].getDisplayName()
                + " vs " + players[1].getDisplayName());
        players[0].send(new Message(MessageType.MATCH_FOUND,
                Payloads.matchFound(roomId, players[1].getUsername())));
        players[1].send(new Message(MessageType.MATCH_FOUND,
                Payloads.matchFound(roomId, players[0].getUsername())));
        if (questions.isEmpty()) {
            endGame();
        } else {
            sendQuestion();
        }
    }

    public synchronized void handleAnswer(ClientHandler player, long questionId, long choiceId) {
        int index = indexOf(player);
        if (!started || finished || advancing || index < 0 || answered[index]) {
            return;
        }
        Question question = questions.get(round);
        if (question.getId() != questionId) {
            return;
        }
        int answerIndex = question.indexOfChoice(choiceId);
        if (answerIndex < 0) {
            return;
        }
        if (nanoTime.getAsLong() >= deadlineNanos) {
            resolveMissingAnswers();
            scheduleNextQuestion();
            return;
        }
        resolveAnswer(index, answerIndex);
        if (!finished && answered[0] && answered[1]) {
            timeoutTask.cancel(false);
            scheduleNextQuestion();
        }
    }

    public synchronized void playerDisconnected(ClientHandler disconnected) {
        int disconnectedIndex = indexOf(disconnected);
        if (finished || disconnectedIndex < 0) {
            return;
        }
        finished = true;
        int opponentIndex = 1 - disconnectedIndex;
        clearRoom();
        stopScheduler();
        boolean saved = saveResult(userIds[disconnectedIndex]);
        if (saved && players[opponentIndex].isConnected()) {
            players[opponentIndex].send(new Message(
                    MessageType.MATCH_ERROR, "OPPONENT_DISCONNECTED"));
        }
        log("Trận " + roomId + " kết thúc do "
                + disconnected.getDisplayName() + " mất kết nối");
    }

    private void sendQuestion() {
        answered[0] = false;
        answered[1] = false;
        Question question = questions.get(round);
        String payload = Payloads.question(round, questions.size(), QUESTION_SECONDS,
                question.getId(), question.getContent(), question.getChoices().stream()
                        .map(choice -> new Payloads.ChoiceData(choice.id(), choice.content(), choice.position()))
                        .toList());
        questionStartedNanos = nanoTime.getAsLong();
        deadlineNanos = questionStartedNanos + TimeUnit.SECONDS.toNanos(QUESTION_SECONDS);
        int expectedRound = round;
        timeoutTask = scheduler.schedule(() -> onTimeout(expectedRound), QUESTION_SECONDS, TimeUnit.SECONDS);
        sendBoth(MessageType.QUESTION, payload);
    }

    private synchronized void onTimeout(int expectedRound) {
        if (finished || advancing || round != expectedRound) {
            return;
        }
        resolveMissingAnswers();
        scheduleNextQuestion();
    }

    private void resolveMissingAnswers() {
        for (int i = 0; i < players.length; i++) {
            if (!finished && !answered[i]) {
                resolveAnswer(i, -1);
            }
        }
    }

    private void resolveAnswer(int index, int choice) {
        Question question = questions.get(round);
        boolean correct = choice >= 0 && question.getChoices().get(choice).correct();
        Long choiceId = choice < 0 ? null : question.getChoices().get(choice).id();
        long elapsedMs = choice < 0 ? TimeUnit.SECONDS.toMillis(QUESTION_SECONDS)
                : Math.max(0, Math.min(TimeUnit.SECONDS.toMillis(QUESTION_SECONDS),
                    TimeUnit.NANOSECONDS.toMillis(nanoTime.getAsLong() - questionStartedNanos)));
        try {
            repository.saveAnswer(matchId, userIds[index], question.getId(), choiceId,
                    correct, elapsedMs, correct ? 1 : 0);
        } catch (SQLException e) {
            LOGGER.warning("Failed to save ranked answer: matchId=" + matchId + " userId="
                    + userIds[index] + " questionId=" + question.getId() + " (SQLState=" + e.getSQLState() + ")");
            failPersistence();
            return;
        }
        answered[index] = true;
        answeredCount[index]++;
        if (correct) {
            scores[index]++;
            correctCount[index]++;
        }
        players[index].send(new Message(MessageType.ANSWER_RESULT,
                Payloads.answerResult(correct, choice, question.getCorrectAnswerIndex())));
        sendScores();
    }

    private void scheduleNextQuestion() {
        if (advancing || finished) {
            return;
        }
        advancing = true;
        scheduler.schedule(this::advanceRound,
                NEXT_QUESTION_DELAY_MILLIS, TimeUnit.MILLISECONDS);
    }

    private synchronized void advanceRound() {
        advancing = false;
        if (finished) {
            return;
        }
        round++;
        if (round == questions.size()) {
            endGame();
        } else {
            sendQuestion();
        }
    }

    public synchronized void endGame() {
        if (finished) {
            return;
        }
        finished = true;
        stopScheduler();
        boolean saved = saveResult(null);
        if (saved) {
            sendGameOver(0);
            sendGameOver(1);
        }
        clearRoom();
        log("Trận " + roomId + " kết thúc: " + players[0].getDisplayName() + " "
                + scores[0] + " - " + scores[1] + " " + players[1].getDisplayName());
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

    private boolean saveResult(Long forfeitingUserId) {
        try {
            resultService.finishMatch(matchId, result(0), result(1), forfeitingUserId);
            return true;
        } catch (SQLException e) {
            LOGGER.warning("Failed to finish ranked match: matchId=" + matchId
                    + " (SQLState=" + e.getSQLState() + ")");
            failPersistence();
            return false;
        }
    }

    private RankedResultService.PlayerResult result(int index) {
        return new RankedResultService.PlayerResult(userIds[index], scores[index],
                answeredCount[index], correctCount[index], ratingsBefore[index]);
    }

    private void failPersistence() {
        finished = true;
        stopScheduler();
        clearRoom();
        // A failed write never earns in-memory points or a successful GAME_OVER.
        // Conditional cancellation cannot overwrite an already committed FINISHED result.
        try {
            repository.cancelMatch(matchId);
        } catch (SQLException e) {
            LOGGER.warning("Failed to cancel ranked match: matchId=" + matchId
                    + " (SQLState=" + e.getSQLState() + "); reconciliation required");
        }
        sendBoth(MessageType.MATCH_ERROR, "DATABASE_ERROR");
    }

    private void stopScheduler() {
        if (timeoutTask != null) timeoutTask.cancel(false);
        // Do not interrupt the timer thread while it commits the match result.
        scheduler.shutdown();
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

    private void log(String message) {
        players[0].reportActivity(message);
    }

    public String getRoomId() {
        return roomId;
    }

    public long getMatchId() {
        return matchId;
    }

    public synchronized boolean isFinished() {
        return finished;
    }
}
