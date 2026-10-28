package com.nihongoquest.client.ranked.battle;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.profile.Player;
import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.Payloads;
import com.fasterxml.jackson.databind.JsonNode;
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
    private Label matchTimeLabel;

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
    private Payloads.QuestionData currentQuestion;
    private Timeline countdownTimeline;
    private long countdownStartedNanos;
    private long countdownDurationMillis;
    private long matchCountdownDurationMillis;
    private long matchCountdownStartedNanos;
    private String roomId;

    public void setSession(ClientApp app, GameClient gameClient, Player player,
                           String roomId, String opponentUsername, int durationSeconds) {
        this.app = app;
        this.gameClient = gameClient;
        this.opponentUsername = opponentUsername;
        this.roomId = roomId;
        this.answerButtons = List.of(
                answerAButton, answerBButton, answerCButton, answerDButton);
        player1Label.setText(player.getUsername());
        player2Label.setText(opponentUsername);
        scoreLabel.setText("0  :  0");
        questionLabel.setText("Đã ghép trận thành công - đang chuẩn bị câu hỏi");
        timeProgressBar.setProgress(0);
        timeLabel.setText("--");
        matchTimeLabel.setText(formatSeconds(durationSeconds));
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
            gameClient.sendAnswer(currentQuestion.sessionId(), currentQuestion.attempt(),
                    currentQuestion.questionId(), currentQuestion.choices().get(answerIndex).choiceId());
        } catch (IllegalStateException | IllegalArgumentException e) {
            questionLabel.setText(e.getMessage());
        }
    }

    private void handleMessage(Message message) {
        switch (message.getType()) {
            case QUESTION -> showQuestion(message.getPayload());
            case ANSWER_RESULT -> showAnswerResult(message.getPayload());
            case SCORE_UPDATE -> showScore(message.getPayload());
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

    private void showQuestion(JsonNode payload) {
        try {
            Payloads.QuestionData question = Payloads.parseQuestion(payload);
            if (!roomId.equals(question.sessionId()) || question.attempt() <= 0
                    || question.questionDurationSeconds() <= 0
                    || question.matchRemainingSeconds() <= 0
                    || question.choices() == null || question.choices().size() != 4) {
                showProtocolError();
                return;
            }
            currentQuestion = question;
            questionLabel.setText("Lượt " + question.attempt() + ": " + question.content());
            for (int i = 0; i < answerButtons.size(); i++) {
                answerButtons.get(i).setText(question.choices().get(i).content());
            }
            clearAnswerStyles();
            setAnswersDisabled(false);
            startCountdown(question.questionDurationSeconds(), question.matchRemainingSeconds());
        } catch (RuntimeException e) {
            showProtocolError();
        }
    }

    private void showAnswerResult(JsonNode payload) {
        try {
            Payloads.AnswerResult result = Payloads.parseAnswerResult(payload);
            if (currentQuestion == null || !roomId.equals(result.sessionId())
                    || result.attempt() != currentQuestion.attempt()
                    || result.questionId() != currentQuestion.questionId()) {
                return;
            }
            boolean correct = result.correct();
            int chosenIndex = choiceIndex(result.chosenChoiceId());
            int correctIndex = choiceIndex(result.correctChoiceId());
            if ((result.chosenChoiceId() != null && chosenIndex < 0) || correctIndex < 0) {
                showProtocolError();
                return;
            }
            stopCountdown();
            setAnswersDisabled(true);
            if (result.chosenChoiceId() == null) {
                timeProgressBar.setProgress(0);
                timeLabel.setText("Hết giờ");
            } else if (!correct) {
                answerButtons.get(chosenIndex).getStyleClass().add("answer-wrong");
                timeLabel.setText("Sai");
            } else {
                timeLabel.setText("Đúng");
            }
            answerButtons.get(correctIndex).getStyleClass().add("answer-correct");
        } catch (RuntimeException e) {
            showProtocolError();
        }
    }

    private void showScore(JsonNode payload) {
        try {
            Payloads.Scores scores = Payloads.parseScores(payload);
            scoreLabel.setText(scores.myScore() + "  :  " + scores.opponentScore());
        } catch (RuntimeException e) {
            showProtocolError();
        }
    }

    private void showGameOver(JsonNode payload) {
        try {
            stopCountdown();
            Payloads.GameOver result = Payloads.parseGameOver(payload);
            app.showResult(result.result(), result.myScore(), result.opponentScore(),
                    opponentUsername);
        } catch (RuntimeException e) {
            showProtocolError();
        }
    }

    private void startCountdown(int questionSeconds, int matchSeconds) {
        stopCountdown();
        countdownDurationMillis = questionSeconds * 1_000L;
        countdownStartedNanos = System.nanoTime();
        matchCountdownDurationMillis = matchSeconds * 1_000L;
        matchCountdownStartedNanos = countdownStartedNanos;
        timeProgressBar.setProgress(1);
        timeLabel.setText(questionSeconds + "s");
        matchTimeLabel.setText(formatSeconds(matchSeconds));

        countdownTimeline = new Timeline(new KeyFrame(
                Duration.millis(100), event -> updateCountdown()));
        countdownTimeline.setCycleCount(Timeline.INDEFINITE);
        countdownTimeline.play();
    }

    private void updateCountdown() {
        long elapsedMillis = (System.nanoTime() - countdownStartedNanos) / 1_000_000L;
        long remainingMillis = Math.max(0, countdownDurationMillis - elapsedMillis);
        long matchElapsedMillis = (System.nanoTime() - matchCountdownStartedNanos) / 1_000_000L;
        long matchRemainingMillis = Math.max(0, matchCountdownDurationMillis - matchElapsedMillis);
        timeProgressBar.setProgress((double) remainingMillis / countdownDurationMillis);
        timeLabel.setText(((remainingMillis + 999) / 1_000) + "s");
        matchTimeLabel.setText(formatSeconds((int) ((matchRemainingMillis + 999) / 1_000)));
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

    private int choiceIndex(Long choiceId) {
        if (choiceId == null || currentQuestion == null) return -1;
        for (int index = 0; index < currentQuestion.choices().size(); index++) {
            if (currentQuestion.choices().get(index).choiceId() == choiceId) return index;
        }
        return -1;
    }

    private String formatSeconds(int seconds) {
        return String.format("%d:%02d", seconds / 60, seconds % 60);
    }

    private void showProtocolError() {
        stopCountdown();
        questionLabel.setText("Dữ liệu trận đấu không hợp lệ");
        timeProgressBar.setProgress(0);
        timeLabel.setText("--");
        setAnswersDisabled(true);
    }
}
