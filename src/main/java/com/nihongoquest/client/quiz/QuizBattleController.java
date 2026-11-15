package com.nihongoquest.client.quiz;

import com.nihongoquest.client.ui.UiMotion;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.client.profile.Player;
import com.nihongoquest.client.proctor.VideoCanvas;
import com.nihongoquest.common.media.VisionMetadata;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.ui.Icons;
import javafx.animation.KeyFrame;
import javafx.animation.PauseTransition;
import javafx.animation.Timeline;
import javafx.application.Platform;
import javafx.collections.FXCollections;
import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.geometry.Pos;
import javafx.scene.control.Button;
import javafx.scene.control.ContentDisplay;
import javafx.scene.control.Label;
import javafx.scene.control.ListCell;
import javafx.scene.control.ListView;
import javafx.scene.control.ProgressBar;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.Region;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;
import javafx.util.Duration;

import java.util.List;

/** Màn hình rapid quiz và leaderboard trực tiếp; không tự tính điểm. */
public class QuizBattleController {
    @FXML private Label titleLabel;
    @FXML private Label pinLabel;
    @FXML private Label roomTimeLabel;
    @FXML private Label scoreLabel;
    @FXML private Label questionLabel;
    @FXML private Label questionTimeLabel;
    @FXML private Label statusLabel;
    @FXML private Label cameraBanner;
    @FXML private Label toastLabel;
    @FXML private ProgressBar questionProgress;
    @FXML private Button answerAButton;
    @FXML private Button answerBButton;
    @FXML private Button answerCButton;
    @FXML private Button answerDButton;
    @FXML private Button leaveButton;
    @FXML private ListView<Payloads.QuizLeaderboardEntry> leaderboardList;
    @FXML private StackPane cameraPreviewHolder;
    @FXML private VBox cameraSection;
    @FXML private Label cameraCaption;

    private ClientApp app;
    private GameClient gameClient;
    private Player player;
    private Payloads.QuizRoomStarted room;
    private Payloads.QuizQuestionData currentQuestion;
    private List<Button> answerButtons;
    private Timeline countdown;
    private long countdownStartedNanos;
    private long questionDurationMillis;
    private long roomDurationMillis;
    private long lastCountdownSecond = -1;
    private boolean finished;

    @FXML
    private void initialize() {
        answerButtons = List.of(answerAButton, answerBButton, answerCButton, answerDButton);
        decorateAnswerButtons();
        cameraCaption.setGraphic(Icons.icon(Icons.CAMERA));
        leaderboardList.setCellFactory(ignored -> new LeaderboardCell());
    }

    private void decorateAnswerButtons() {
        char[] letters = {'A', 'B', 'C', 'D'};
        for (int index = 0; index < answerButtons.size(); index++) {
            Label letter = new Label(String.valueOf(letters[index]));
            letter.getStyleClass().add("answer-letter");
            Button button = answerButtons.get(index);
            button.setGraphic(letter);
            button.setContentDisplay(ContentDisplay.LEFT);
            button.setAlignment(Pos.CENTER_LEFT);
            button.setGraphicTextGap(12);
        }
    }

    public void setSession(ClientApp app, GameClient gameClient, Player player,
                           Payloads.QuizRoomStarted room) {
        this.app = app;
        this.gameClient = gameClient;
        this.player = player;
        this.room = room;
        if (room.proctoringEnabled() && room.playing()) {
            app.getProctoringCoordinator().setToastListener(this::showToast);
            app.getProctoringCoordinator().setCameraStatusListener(status -> Platform.runLater(() -> {
                boolean problem = status != Payloads.CameraStatus.READY
                        && status != Payloads.CameraStatus.INITIALIZING;
                cameraBanner.setVisible(problem); cameraBanner.setManaged(problem);
                cameraBanner.setText(problem ? "Camera: " + status : "");
                // Phản hồi theo trạng thái camera (chỉ animation, không phát âm thanh).
                if (status == Payloads.CameraStatus.READY) {
                    UiMotion.fadeIn(cameraPreviewHolder);
                }
            }));
            if (!room.host()) {
                VideoCanvas preview = new VideoCanvas(298, 168);
                cameraPreviewHolder.getChildren().setAll(preview);
                cameraPreviewHolder.setVisible(true);
                cameraPreviewHolder.setManaged(true);
                cameraSection.setVisible(true);
                cameraSection.setManaged(true);
                app.getProctoringCoordinator().setPreviewListener(frame -> preview.setFrame(frame.image()));
                app.getProctoringCoordinator().setVisionListener(preview::setVision);
                preview.setHud("Camera của bạn • 640×480 / 15 FPS");
            }
        }
        titleLabel.setText(room.title());
        pinLabel.setText(room.pin());
        roomTimeLabel.setText(formatSeconds(room.durationSeconds()));
        scoreLabel.setText("0 điểm");
        leaveButton.setText(room.host() ? "Hủy phòng" : "Rời phòng");
        if (!room.playing()) {
            questionLabel.setText("Bạn đang điều khiển phòng. Theo dõi bảng xếp hạng trực tiếp.");
            setAnswersDisabled(true);
        }
        gameClient.setMessageHandler(message -> Platform.runLater(() -> handleMessage(message)));
        gameClient.setConnectionErrorHandler(error -> Platform.runLater(() -> {
            stopCountdown();
            setAnswersDisabled(true);
            showError("Mất kết nối. Đăng nhập lại trước khi hết giờ để tiếp tục.");
        }));
    }

    private void showToast(String text) {
        toastLabel.setText(text);
        toastLabel.setVisible(true);
        toastLabel.setManaged(true);
        PauseTransition hide = new PauseTransition(Duration.seconds(4));
        hide.setOnFinished(ignored -> { toastLabel.setVisible(false); toastLabel.setManaged(false); });
        hide.play();
    }

    @FXML
    private void onAnswer(ActionEvent event) {
        int index = answerButtons.indexOf(event.getSource());
        if (index < 0 || currentQuestion == null) return;
        setAnswersDisabled(true);
        Payloads.ChoiceData choice = currentQuestion.choices().get(index);
        gameClient.sendQuizAnswer(new Payloads.QuizAnswerData(
                currentQuestion.sessionId(), currentQuestion.attempt(),
                currentQuestion.questionId(), choice.choiceId()));
    }

    @FXML
    private void onLeave() {
        if (finished) {
            app.showHome();
            return;
        }
        if (room.host()) gameClient.cancelQuizRoom();
        else gameClient.leaveQuizRoom();
        app.getProctoringCoordinator().stopRoom();
        app.showHome();
    }

    private void handleMessage(Message message) {
        switch (message.getType()) {
            case QUIZ_QUESTION -> showQuestion(Payloads.fromJson(
                    message.getPayload(), Payloads.QuizQuestionData.class));
            case QUIZ_ANSWER_RESULT -> showResult(Payloads.fromJson(
                    message.getPayload(), Payloads.QuizAnswerResult.class));
            case QUIZ_LEADERBOARD -> showLeaderboard(Payloads.fromJson(
                    message.getPayload(), Payloads.QuizLeaderboardData.class));
            case QUIZ_ROOM_FINISHED -> showFinished(Payloads.fromJson(
                    message.getPayload(), Payloads.QuizLeaderboardData.class));
            case QUIZ_ROOM_CANCEL -> { app.getProctoringCoordinator().stopRoom(); app.showHome(); }
            case QUIZ_ERROR -> showError(QuizRoomUi.errorText(message.payloadText()));
            default -> { }
        }
    }

    private void showQuestion(Payloads.QuizQuestionData question) {
        if (!room.pin().equals(question.pin()) || !room.pin().equals(question.sessionId())
                || question.choices() == null || question.choices().size() != 4) {
            showError("Dữ liệu câu hỏi không hợp lệ.");
            return;
        }
        currentQuestion = question;
        questionLabel.setText("Lượt " + question.attempt() + ": " + question.content());
        for (int index = 0; index < 4; index++) {
            answerButtons.get(index).setText(question.choices().get(index).content());
        }
        clearAnswerStyles();
        setAnswersDisabled(false);
        statusLabel.setText("Chọn đáp án đúng nhanh nhất có thể.");
        startCountdown(question.questionDurationSeconds(), question.roomRemainingSeconds());
        UiMotion.fadeIn(questionLabel);
    }

    private void showResult(Payloads.QuizAnswerResult result) {
        if (currentQuestion == null || result.attempt() != currentQuestion.attempt()
                || result.questionId() != currentQuestion.questionId()) return;
        stopCountdown();
        setAnswersDisabled(true);
        int correctIndex = choiceIndex(result.correctChoiceId());
        int chosenIndex = choiceIndex(result.chosenChoiceId());
        if (correctIndex >= 0) {
            answerButtons.get(correctIndex).getStyleClass().add("answer-correct");
            UiMotion.pulse(answerButtons.get(correctIndex));
        }
        if (!result.correct() && chosenIndex >= 0) {
            answerButtons.get(chosenIndex).getStyleClass().add("answer-wrong");
            UiMotion.shake(answerButtons.get(chosenIndex));
        }
        // Phản hồi theo trạng thái nghiệp vụ (chỉ animation): đúng pulse, sai shake.
        scoreLabel.setText(result.totalScore() + " điểm");
        statusLabel.setText(result.chosenChoiceId() == null ? "Hết giờ"
                : result.correct() ? "Đúng! +" + result.scoreAwarded() + " điểm" : "Chưa đúng");
    }

    private void showLeaderboard(Payloads.QuizLeaderboardData board) {
        leaderboardList.setItems(FXCollections.observableArrayList(board.entries()));
        board.entries().stream().filter(entry -> entry.userId() == player.id())
                .findFirst().ifPresent(entry -> scoreLabel.setText(entry.score() + " điểm"));
    }

    private void showFinished(Payloads.QuizLeaderboardData board) {
        finished = true;
        app.getProctoringCoordinator().stopRoom();
        stopCountdown();
        setAnswersDisabled(true);
        showLeaderboard(board);
        roomTimeLabel.setText("0:00");
        questionLabel.setText("Phòng Quiz đã kết thúc");
        statusLabel.setText("Bảng xếp hạng cuối cùng");
        leaveButton.setText("Về trang chủ");
        UiMotion.rankUp(leaderboardList);
    }

    private void startCountdown(int questionSeconds, int roomSeconds) {
        stopCountdown();
        lastCountdownSecond = -1;
        countdownStartedNanos = System.nanoTime();
        questionDurationMillis = questionSeconds * 1_000L;
        roomDurationMillis = roomSeconds * 1_000L;
        questionProgress.setProgress(1);
        questionTimeLabel.setText(questionSeconds + "s");
        questionTimeLabel.getStyleClass().remove("countdown-critical");
        roomTimeLabel.setText(formatSeconds(roomSeconds));
        countdown = new Timeline(new KeyFrame(Duration.millis(100), ignored -> updateCountdown()));
        countdown.setCycleCount(Timeline.INDEFINITE);
        countdown.play();
    }

    private void updateCountdown() {
        long elapsed = (System.nanoTime() - countdownStartedNanos) / 1_000_000L;
        long questionRemaining = Math.max(0, questionDurationMillis - elapsed);
        long roomRemaining = Math.max(0, roomDurationMillis - elapsed);
        questionProgress.setProgress(questionDurationMillis == 0
                ? 0 : (double) questionRemaining / questionDurationMillis);
        long secondsLeft = (questionRemaining + 999) / 1_000;
        questionTimeLabel.setText(secondsLeft + "s");
        roomTimeLabel.setText(formatSeconds((int) ((roomRemaining + 999) / 1_000)));
        // Countdown gấp: chỉ pulse ở mốc giây thay đổi và khi còn <= 5 giây.
        if (secondsLeft <= 5 && !questionTimeLabel.getStyleClass().contains("countdown-critical")) {
            questionTimeLabel.getStyleClass().add("countdown-critical");
        } else if (secondsLeft > 5) {
            questionTimeLabel.getStyleClass().remove("countdown-critical");
        }
        if (secondsLeft <= 5 && secondsLeft != lastCountdownSecond) {
            lastCountdownSecond = secondsLeft;
            UiMotion.countdown(questionTimeLabel);
        }
        if (questionRemaining == 0) {
            stopCountdown();
            setAnswersDisabled(true);
            statusLabel.setText("Đang chờ server xử lý timeout...");
        }
    }

    private int choiceIndex(Long choiceId) {
        if (choiceId == null || currentQuestion == null) return -1;
        for (int index = 0; index < currentQuestion.choices().size(); index++) {
            if (currentQuestion.choices().get(index).choiceId() == choiceId) return index;
        }
        return -1;
    }

    private void clearAnswerStyles() {
        answerButtons.forEach(button ->
                button.getStyleClass().removeAll("answer-correct", "answer-wrong"));
    }

    private void setAnswersDisabled(boolean disabled) {
        answerButtons.forEach(button -> button.setDisable(disabled));
    }

    private void stopCountdown() {
        if (countdown != null) {
            countdown.stop();
            countdown = null;
        }
    }

    /** Row bảng xếp hạng: hạng, tên, số câu đúng và điểm; highlight chính người chơi. */
    private final class LeaderboardCell extends ListCell<Payloads.QuizLeaderboardEntry> {
        private final Label rankLabel = new Label();
        private final Label nameLabel = new Label();
        private final Label detailLabel = new Label();
        private final Label scoreLabel = new Label();
        private final Region spacer = new Region();
        private final VBox identity = new VBox(2, nameLabel, detailLabel);
        private final HBox layout = new HBox(10, rankLabel, identity, spacer, scoreLabel);

        private LeaderboardCell() {
            layout.getStyleClass().add("leaderboard-row");
            layout.prefWidthProperty().bind(leaderboardList.widthProperty().subtract(22));
            rankLabel.getStyleClass().add("leaderboard-rank");
            nameLabel.getStyleClass().add("leaderboard-name");
            detailLabel.getStyleClass().add("leaderboard-detail");
            scoreLabel.getStyleClass().add("leaderboard-score");
            layout.setAlignment(Pos.CENTER_LEFT);
            HBox.setHgrow(identity, Priority.ALWAYS);
            HBox.setHgrow(spacer, Priority.ALWAYS);
        }

        @Override
        protected void updateItem(Payloads.QuizLeaderboardEntry item, boolean empty) {
            super.updateItem(item, empty);
            layout.getStyleClass().remove("leaderboard-me");
            rankLabel.getStyleClass().remove("leaderboard-rank-top");
            if (empty || item == null) {
                setText(null);
                setGraphic(null);
                return;
            }
            setText(null);
            rankLabel.setText("#" + item.rank());
            if (item.rank() <= 3) {
                rankLabel.getStyleClass().add("leaderboard-rank-top");
            }
            nameLabel.setText(item.username());
            detailLabel.setText(item.correctAnswers() + " câu đúng"
                    + (item.connected() ? "" : " • Offline"));
            scoreLabel.setText(item.score() + " đ");
            if (player != null && item.userId() == player.id()) {
                layout.getStyleClass().add("leaderboard-me");
            }
            setGraphic(layout);
        }
    }

    private void showError(String text) {
        statusLabel.setText(text);
        statusLabel.getStyleClass().removeAll("status-success", "status-error");
        statusLabel.getStyleClass().add("status-error");
    }

    private String formatSeconds(int seconds) {
        return String.format("%d:%02d", seconds / 60, seconds % 60);
    }
}
