package com.nihongoquest.server;

import com.nihongoquest.common.Message;
import com.nihongoquest.common.MessageType;

import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

/**
 * GameRoom đại diện một trận đấu 1v1 trên Server.
 * Quản lý Player 1, Player 2, câu hỏi, điểm, vòng hiện tại và kết quả trận.
 *
 * Server là bên quyết định câu hỏi, đáp án đúng, điểm và người thắng.
 * Client chỉ nhận dữ liệu và hiển thị.
 */
public class GameRoom {

    private static final int QUESTION_DURATION_SECONDS = 30;
    private static final long RESULT_DISPLAY_MILLIS = 1_500;

    private final String roomId;
    private final ClientHandler player1;
    private final ClientHandler player2;
    private final List<Question> questions;
    private final PlayerState player1State;
    private final PlayerState player2State;
    private final ScheduledExecutorService scheduler;
    private boolean finished;

    public GameRoom(String roomId, ClientHandler player1, ClientHandler player2) {
        this(roomId, player1, player2, List.of());
    }

    public GameRoom(String roomId, ClientHandler player1, ClientHandler player2,
                    List<Question> questions) {
        this.roomId = roomId;
        this.player1 = player1;
        this.player2 = player2;
        this.questions = List.copyOf(questions);
        this.player1State = new PlayerState(player1);
        this.player2State = new PlayerState(player2);
        this.scheduler = Executors.newSingleThreadScheduledExecutor(task -> {
            Thread thread = new Thread(task, "game-room-" + roomId);
            thread.setDaemon(true);
            return thread;
        });
        this.finished = false;
        player1.setCurrentRoom(this);
        player2.setCurrentRoom(this);
    }

    public synchronized void start() {
        player1.send(new Message(
                MessageType.MATCH_FOUND, roomId + "|" + player2.getUsername()));
        player2.send(new Message(
                MessageType.MATCH_FOUND, roomId + "|" + player1.getUsername()));
        if (questions.isEmpty()) {
            endGame();
            return;
        }
        sendQuestion(player1State);
        sendQuestion(player2State);
    }

    public synchronized void playerDisconnected(ClientHandler disconnectedPlayer) {
        if (finished) {
            return;
        }
        finished = true;
        ClientHandler opponent = disconnectedPlayer == player1 ? player2 : player1;
        disconnectedPlayer.clearCurrentRoom(this);
        opponent.clearCurrentRoom(this);
        scheduler.shutdownNow();
        if (opponent.isConnected()) {
            opponent.send(new Message(MessageType.MATCH_ERROR, "OPPONENT_DISCONNECTED"));
        }
    }

    public synchronized void handleAnswer(ClientHandler from, int answerIndex) {
        if (finished || answerIndex < 0 || answerIndex > 3) {
            return;
        }

        PlayerState state = stateFor(from);
        if (state == null || !state.acceptingAnswer || state.completed) {
            return;
        }

        if (System.nanoTime() >= state.deadlineNanos) {
            resolveAnswer(state, -1);
            return;
        }
        resolveAnswer(state, answerIndex);
    }

    private void resolveAnswer(PlayerState state, int answerIndex) {
        if (!state.acceptingAnswer || state.completed || finished) {
            return;
        }
        state.acceptingAnswer = false;
        if (state.timeoutTask != null) {
            state.timeoutTask.cancel(false);
        }

        Question question = questions.get(state.round);
        boolean correct = answerIndex == question.getCorrectAnswer();
        if (correct) {
            state.score++;
        }
        state.player.send(new Message(MessageType.ANSWER_RESULT,
                correct + "|" + answerIndex + "|" + question.getCorrectAnswer()));
        sendScores();

        int answeredRound = state.round;
        scheduler.schedule(() -> advancePlayer(state, answeredRound),
                RESULT_DISPLAY_MILLIS, TimeUnit.MILLISECONDS);
    }

    public synchronized void endGame() {
        if (finished) {
            return;
        }
        finished = true;
        sendGameOver(player1, player1State.score, player2State.score);
        sendGameOver(player2, player2State.score, player1State.score);
        player1.clearCurrentRoom(this);
        player2.clearCurrentRoom(this);
        scheduler.shutdownNow();
    }

    private void sendQuestion(PlayerState state) {
        Question question = questions.get(state.round);
        state.acceptingAnswer = true;
        state.deadlineNanos = System.nanoTime()
                + TimeUnit.SECONDS.toNanos(QUESTION_DURATION_SECONDS);
        String payload = state.round + "|" + questions.size()
                + "|" + QUESTION_DURATION_SECONDS + "|" + question.getQuestionText()
                + "|" + String.join("|", question.getAnswers());
        state.player.send(new Message(MessageType.QUESTION, payload));

        int expectedRound = state.round;
        state.timeoutTask = scheduler.schedule(
                () -> handleTimeout(state, expectedRound),
                QUESTION_DURATION_SECONDS, TimeUnit.SECONDS);
    }

    private void sendScores() {
        player1.send(new Message(MessageType.SCORE_UPDATE,
                player1State.score + "|" + player2State.score));
        player2.send(new Message(MessageType.SCORE_UPDATE,
                player2State.score + "|" + player1State.score));
    }

    private synchronized void handleTimeout(PlayerState state, int expectedRound) {
        if (!finished && state.round == expectedRound && state.acceptingAnswer) {
            resolveAnswer(state, -1);
        }
    }

    private synchronized void advancePlayer(PlayerState state, int answeredRound) {
        if (finished || state.completed || state.round != answeredRound) {
            return;
        }
        state.round++;
        if (state.round >= questions.size()) {
            state.completed = true;
            state.player.send(new Message(MessageType.PLAYER_FINISHED, ""));
            if (player1State.completed && player2State.completed) {
                endGame();
            }
        } else {
            sendQuestion(state);
        }
    }

    private PlayerState stateFor(ClientHandler player) {
        if (player == player1) {
            return player1State;
        }
        if (player == player2) {
            return player2State;
        }
        return null;
    }

    private static final class PlayerState {
        private final ClientHandler player;
        private int round;
        private int score;
        private long deadlineNanos;
        private boolean acceptingAnswer;
        private boolean completed;
        private ScheduledFuture<?> timeoutTask;

        private PlayerState(ClientHandler player) {
            this.player = player;
        }
    }

    private void sendGameOver(ClientHandler player, int myScore, int opponentScore) {
        String result;
        if (myScore > opponentScore) {
            result = "WIN";
        } else if (myScore < opponentScore) {
            result = "LOSE";
        } else {
            result = "DRAW";
        }
        player.send(new Message(MessageType.GAME_OVER,
                result + "|" + myScore + "|" + opponentScore));
    }

    public String getRoomId() {
        return roomId;
    }

    public ClientHandler getPlayer1() {
        return player1;
    }

    public ClientHandler getPlayer2() {
        return player2;
    }

    public int getPlayer1Score() {
        return player1State.score;
    }

    public int getPlayer2Score() {
        return player2State.score;
    }

    public int getCurrentRound() {
        return Math.min(player1State.round, player2State.round);
    }

    public boolean isFinished() {
        return finished;
    }
}
