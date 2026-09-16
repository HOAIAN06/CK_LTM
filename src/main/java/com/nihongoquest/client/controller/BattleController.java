package com.nihongoquest.client.controller;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.model.Player;
import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.common.Message;
import javafx.animation.KeyFrame;
import javafx.animation.Timeline;
import javafx.application.Platform;
import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.ProgressBar;
import javafx.util.Duration;

import java.util.List;

/**
 * BattleController xử lý màn hình thi đấu (battle.fxml).
 * Chỉ hiển thị player, câu hỏi, đáp án và điểm nhận từ Server.
 * Controller không được tự tính kết quả trận đấu — Server quyết định đúng/sai và điểm.
 */
public class BattleController {

    @FXML
    private Label player1Label;

    @FXML
    private Label player2Label;

    @FXML
    private Label scoreLabel;

    @FXML
    private Label questionLabel;

    @FXML
    private ProgressBar timeProgressBar;

    @FXML
    private Label timeLabel;

    @FXML
    private Button answerAButton;

    @FXML
    private Button answerBButton;

    @FXML
    private Button answerCButton;

    @FXML
    private Button answerDButton;

    private ClientApp app;
    private GameClient gameClient;
    private String opponentUsername;
    private List<Button> answerButtons;
    private Timeline countdownTimeline;
    private long countdownStartedNanos;
    private long countdownDurationMillis;

    public void setSession(ClientApp app, GameClient gameClient, Player player,
                           String roomId, String opponentUsername) {
        this.app = app;
        this.gameClient = gameClient;
        this.opponentUsername = opponentUsername;
        this.answerButtons = List.of(
                answerAButton, answerBButton, answerCButton, answerDButton);
        player1Label.setText(player.getUsername());
        player2Label.setText(opponentUsername);
        scoreLabel.setText("Score: 0 - 0");
        questionLabel.setText("Đã ghép trận thành công - đang chuẩn bị câu hỏi");
        timeProgressBar.setProgress(0);
        timeLabel.setText("--");
        setAnswersDisabled(true);

        gameClient.setMessageHandler(message ->
                Platform.runLater(() -> handleMessage(message)));
        gameClient.setConnectionErrorHandler(error ->
                Platform.runLater(() -> {
                    stopCountdown();
                    questionLabel.setText(error);
                    timeProgressBar.setProgress(0);
                    timeLabel.setText("--");
                    setAnswersDisabled(true);
                }));
    }

    private void setAnswersDisabled(boolean disabled) {
        answerAButton.setDisable(disabled);
        answerBButton.setDisable(disabled);
        answerCButton.setDisable(disabled);
        answerDButton.setDisable(disabled);
    }

    @FXML
    private void onAnswerSelected(ActionEvent event) {
        int answerIndex = answerButtons.indexOf(event.getSource());
        if (answerIndex < 0) {
            return;
        }
        setAnswersDisabled(true);
        try {
            gameClient.sendAnswer(answerIndex);
        } catch (IllegalStateException | IllegalArgumentException e) {
            questionLabel.setText(e.getMessage());
        }
    }

    private void handleMessage(Message message) {
        switch (message.getType()) {
            case QUESTION -> showQuestion(message.getPayload());
            case ANSWER_RESULT -> showAnswerResult(message.getPayload());
            case SCORE_UPDATE -> showScore(message.getPayload());
            case PLAYER_FINISHED -> showPlayerFinished();
            case GAME_OVER -> showGameOver(message.getPayload());
            case MATCH_ERROR -> {
                stopCountdown();
                questionLabel.setText("Đối thủ đã ngắt kết nối");
                timeProgressBar.setProgress(0);
                timeLabel.setText("--");
                setAnswersDisabled(true);
            }
            default -> {
                // Màn Battle chỉ xử lý message gameplay.
            }
        }
    }

    private void showQuestion(String payload) {
        String[] values = payload.split("\\|", -1);
        if (values.length != 8) {
            showProtocolError();
            return;
        }
        try {
            int round = Integer.parseInt(values[0]);
            int totalQuestions = Integer.parseInt(values[1]);
            int durationSeconds = Integer.parseInt(values[2]);
            if (round < 0 || totalQuestions <= 0 || round >= totalQuestions
                    || durationSeconds <= 0) {
                showProtocolError();
                return;
            }
            questionLabel.setText("Câu " + (round + 1) + "/" + totalQuestions
                    + ": " + values[3]);
            for (int i = 0; i < answerButtons.size(); i++) {
                answerButtons.get(i).setText(values[i + 4]);
            }
            clearAnswerStyles();
            setAnswersDisabled(false);
            startCountdown(durationSeconds);
        } catch (NumberFormatException e) {
            showProtocolError();
        }
    }

    private void showAnswerResult(String payload) {
        String[] values = payload.split("\\|", -1);
        if (values.length != 3) {
            showProtocolError();
            return;
        }
        try {
            if (!"true".equals(values[0]) && !"false".equals(values[0])) {
                showProtocolError();
                return;
            }
            boolean correct = Boolean.parseBoolean(values[0]);
            int chosenIndex = Integer.parseInt(values[1]);
            int correctIndex = Integer.parseInt(values[2]);
            if ((chosenIndex != -1 && !isAnswerIndex(chosenIndex))
                    || !isAnswerIndex(correctIndex)) {
                showProtocolError();
                return;
            }
            stopCountdown();
            setAnswersDisabled(true);
            if (chosenIndex == -1) {
                timeProgressBar.setProgress(0);
                timeLabel.setText("Hết giờ");
            } else if (!correct) {
                answerButtons.get(chosenIndex).getStyleClass().add("answer-wrong");
                timeLabel.setText("Sai");
            } else {
                timeLabel.setText("Đúng");
            }
            answerButtons.get(correctIndex).getStyleClass().add("answer-correct");
        } catch (NumberFormatException e) {
            showProtocolError();
        }
    }

    private void showScore(String payload) {
        String[] values = payload.split("\\|", -1);
        if (values.length != 2) {
            showProtocolError();
            return;
        }
        try {
            int myScore = Integer.parseInt(values[0]);
            int opponentScore = Integer.parseInt(values[1]);
            scoreLabel.setText("Score: " + myScore + " - " + opponentScore);
        } catch (NumberFormatException e) {
            showProtocolError();
        }
    }

    private void showGameOver(String payload) {
        String[] values = payload.split("\\|", -1);
        if (values.length != 3) {
            showProtocolError();
            return;
        }
        try {
            stopCountdown();
            int myScore = Integer.parseInt(values[1]);
            int opponentScore = Integer.parseInt(values[2]);
            app.showResult(values[0], myScore, opponentScore, opponentUsername);
        } catch (NumberFormatException e) {
            showProtocolError();
        }
    }

    private void showPlayerFinished() {
        stopCountdown();
        clearAnswerStyles();
        setAnswersDisabled(true);
        timeProgressBar.setProgress(0);
        timeLabel.setText("Hoàn thành");
        questionLabel.setText("Đang chờ đối thủ hoàn thành");
    }

    private void startCountdown(int durationSeconds) {
        stopCountdown();
        countdownDurationMillis = durationSeconds * 1_000L;
        countdownStartedNanos = System.nanoTime();
        timeProgressBar.setProgress(1);
        timeLabel.setText(durationSeconds + "s");

        countdownTimeline = new Timeline(new KeyFrame(
                Duration.millis(100), event -> updateCountdown()));
        countdownTimeline.setCycleCount(Timeline.INDEFINITE);
        countdownTimeline.play();
    }

    private void updateCountdown() {
        long elapsedMillis = (System.nanoTime() - countdownStartedNanos) / 1_000_000L;
        long remainingMillis = Math.max(0, countdownDurationMillis - elapsedMillis);
        timeProgressBar.setProgress((double) remainingMillis / countdownDurationMillis);
        timeLabel.setText(((remainingMillis + 999) / 1_000) + "s");
        if (remainingMillis == 0) {
            stopCountdown();
            setAnswersDisabled(true);
            timeLabel.setText("Chờ Server");
        }
    }

    private void stopCountdown() {
        if (countdownTimeline != null) {
            countdownTimeline.stop();
            countdownTimeline = null;
        }
    }

    private void clearAnswerStyles() {
        for (Button button : answerButtons) {
            button.getStyleClass().removeAll("answer-correct", "answer-wrong");
        }
    }

    private boolean isAnswerIndex(int index) {
        return index >= 0 && index < answerButtons.size();
    }

    private void showProtocolError() {
        stopCountdown();
        questionLabel.setText("Dữ liệu trận đấu không hợp lệ");
        timeProgressBar.setProgress(0);
        timeLabel.setText("--");
        setAnswersDisabled(true);
    }
}
