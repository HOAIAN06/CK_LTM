package com.nihongoquest.server;

import com.nihongoquest.common.Message;
import com.nihongoquest.common.MessageType;
import com.nihongoquest.common.Payloads;
import com.nihongoquest.server.db.PlayerRepository;

import java.sql.SQLException;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.logging.Logger;

/** Một phòng đấu 1v1; toàn bộ chấm điểm diễn ra trên server. */
public class GameRoom {

    private static final Logger LOGGER = Logger.getLogger(GameRoom.class.getName());
    private static final int QUESTION_SECONDS = 30;
    private static final int NEXT_QUESTION_DELAY_MILLIS = 1_500;

    private final String roomId;
    private final ClientHandler[] players;
    private final List<Question> questions;
    private final PlayerRepository repository;
    private final ScheduledExecutorService scheduler;
    private final int[] scores = new int[2];
    private final int[] answeredCount = new int[2];
    private final int[] correctCount = new int[2];
    private final boolean[] answered = new boolean[2];

    private int round;
    private long deadlineNanos;
    private boolean advancing;
    private boolean finished;
    private ScheduledFuture<?> timeoutTask;

    public GameRoom(String roomId, ClientHandler player1, ClientHandler player2,
                    List<Question> questions, PlayerRepository repository) {
        this.roomId = roomId;
        this.players = new ClientHandler[] {player1, player2};
        this.questions = List.copyOf(questions);
        this.repository = repository;
        this.scheduler = Executors.newSingleThreadScheduledExecutor(task -> {
            Thread thread = new Thread(task, "game-room-" + roomId);
            thread.setDaemon(true);
            return thread;
        });
        player1.setCurrentRoom(this);
        player2.setCurrentRoom(this);
    }

    public synchronized void start() {
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

    public synchronized void handleAnswer(ClientHandler player, int answerIndex) {
        int index = indexOf(player);
        if (finished || index < 0 || answered[index] || answerIndex < 0 || answerIndex > 3) {
            return;
        }
        if (System.nanoTime() >= deadlineNanos) {
            resolveMissingAnswers();
            scheduleNextQuestion();
            return;
        }
        resolveAnswer(index, answerIndex);
        if (answered[0] && answered[1]) {
            timeoutTask.cancel(false);
            scheduleNextQuestion();
        }
    }

    public synchronized void playerDisconnected(ClientHandler disconnected) {
        if (finished) {
            return;
        }
        finished = true;
        int disconnectedIndex = indexOf(disconnected);
        int opponentIndex = 1 - disconnectedIndex;
        clearRoom();
        scheduler.shutdownNow();
        if (players[opponentIndex].isConnected()) {
            players[opponentIndex].send(new Message(
                    MessageType.MATCH_ERROR, "OPPONENT_DISCONNECTED"));
        }
        log("Trận " + roomId + " kết thúc do "
                + disconnected.getDisplayName() + " mất kết nối");
        saveStats(disconnectedIndex);
    }

    private void sendQuestion() {
        answered[0] = false;
        answered[1] = false;
        Question question = questions.get(round);
        String payload = Payloads.question(round, questions.size(), QUESTION_SECONDS,
                question.getQuestionText(), question.getAnswers());
        sendBoth(MessageType.QUESTION, payload);
        deadlineNanos = System.nanoTime() + TimeUnit.SECONDS.toNanos(QUESTION_SECONDS);
        timeoutTask = scheduler.schedule(this::onTimeout, QUESTION_SECONDS, TimeUnit.SECONDS);
    }

    private synchronized void onTimeout() {
        if (finished) {
            return;
        }
        resolveMissingAnswers();
        scheduleNextQuestion();
    }

    private void resolveMissingAnswers() {
        for (int i = 0; i < players.length; i++) {
            if (!answered[i]) {
                resolveAnswer(i, -1);
            }
        }
    }

    private void resolveAnswer(int index, int choice) {
        Question question = questions.get(round);
        boolean correct = choice == question.getCorrectAnswer();
        answered[index] = true;
        answeredCount[index]++;
        if (correct) {
            scores[index]++;
            correctCount[index]++;
        }
        players[index].send(new Message(MessageType.ANSWER_RESULT,
                Payloads.answerResult(correct, choice, question.getCorrectAnswer())));
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
        sendGameOver(0);
        sendGameOver(1);
        clearRoom();
        log("Trận " + roomId + " kết thúc: " + players[0].getDisplayName() + " "
                + scores[0] + " - " + scores[1] + " " + players[1].getDisplayName());
        saveStats(-1);
        scheduler.shutdownNow();
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

    private void saveStats(int disconnectedIndex) {
        try {
            for (int i = 0; i < players.length; i++) {
                boolean won = disconnectedIndex >= 0 ? i != disconnectedIndex
                        : scores[i] > scores[1 - i];
                boolean lost = disconnectedIndex >= 0 ? i == disconnectedIndex
                        : scores[i] < scores[1 - i];
                repository.recordMatchResult(players[i].getPlayerId(), won, lost,
                        answeredCount[i], correctCount[i]);
            }
        } catch (SQLException e) {
            LOGGER.warning("Không thể lưu thống kê room=" + roomId + ": " + e.getMessage());
        }
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

    public boolean isFinished() {
        return finished;
    }
}
