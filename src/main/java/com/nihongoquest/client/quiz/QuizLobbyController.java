package com.nihongoquest.client.quiz;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.layout.NavigationGuard;
import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.client.proctor.CapturedFrame;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.ui.Icons;
import javafx.animation.PauseTransition;
import javafx.application.Platform;
import javafx.collections.FXCollections;
import javafx.embed.swing.SwingFXUtils;
import javafx.fxml.FXML;
import javafx.geometry.Pos;
import javafx.scene.control.Button;
import javafx.scene.control.Alert;
import javafx.scene.control.ButtonType;
import javafx.scene.control.Label;
import javafx.scene.control.ListCell;
import javafx.scene.control.ListView;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.input.Clipboard;
import javafx.scene.input.ClipboardContent;
import javafx.scene.layout.FlowPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.Region;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;
import javafx.util.Duration;

import java.util.Locale;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import java.util.logging.Logger;

import static com.nihongoquest.common.logging.RuntimeLog.maskPin;

/** Sảnh chờ hiển thị PIN, host và trạng thái kết nối thành viên. */
public class QuizLobbyController implements NavigationGuard {
    private static final Logger LOGGER = Logger.getLogger(QuizLobbyController.class.getName());
    @FXML private Label pinLabel;
    @FXML private Label titleLabel;
    @FXML private Label countLabel;
    @FXML private Label statusLabel;
    @FXML private ListView<Payloads.QuizLobbyPlayer> playerList;
    @FXML private Button startButton;
    @FXML private Button leaveButton;
    @FXML private Button retryCameraButton;
    @FXML private Label proctoringLabel;
    @FXML private ImageView cameraPreview;
    @FXML private VBox cameraPanel;
    @FXML private Button copyPinButton;

    private ClientApp app;
    private GameClient gameClient;
    private boolean host;
    private boolean startRequestPending;
    private Payloads.QuizLobbyData currentLobby;
    private final AtomicReference<Image> latestPreview = new AtomicReference<>();
    private final AtomicBoolean previewPaintPending = new AtomicBoolean();

    @FXML
    private void initialize() {
        Label empty = new Label("Đang chờ người chơi tham gia bằng mã PIN...");
        empty.getStyleClass().add("empty-state");
        playerList.setPlaceholder(empty);
        playerList.setCellFactory(ignored -> new PlayerCell());
        copyPinButton.setGraphic(Icons.icon(Icons.COPY));
    }

    public void setSession(ClientApp app, GameClient gameClient, Payloads.QuizLobbyData lobby) {
        this.app = app;
        this.gameClient = gameClient;
        gameClient.setMessageHandler(message -> Platform.runLater(() -> handleMessage(message)));
        gameClient.setConnectionErrorHandler(error -> Platform.runLater(() -> showError(error)));
        updateLobby(lobby);
        configureCameraPreview(lobby);
    }

    @FXML
    private void onStart() {
        if (currentLobby == null || !QuizRoomUi.canHostStart(currentLobby, startRequestPending)) {
            return;
        }
        startRequestPending = true;
        startButton.setDisable(true);
        statusLabel.setText("Đang bắt đầu phòng...");
        LOGGER.info(() -> "quiz_start_requested pin=" + maskPin(currentLobby.pin())
                + " connectedPlayers=" + QuizRoomUi.connectedPlayerCount(currentLobby.members()));
        try {
            gameClient.startQuizRoom();
        } catch (IllegalStateException error) {
            startRequestPending = false;
            startButton.setDisable(!QuizRoomUi.canHostStart(currentLobby, false));
            LOGGER.log(java.util.logging.Level.WARNING,
                    "quiz_start_send_failed pin=" + maskPin(currentLobby.pin()), error);
            showError("Không thể gửi yêu cầu bắt đầu phòng. Hãy kiểm tra kết nối.");
        }
    }

    @FXML
    private void onLeave() {
        leaveButton.setDisable(true);
        if (host) gameClient.cancelQuizRoom();
        else gameClient.leaveQuizRoom();
        app.getProctoringCoordinator().stopRoom();
        app.showHome();
    }

    @FXML
    private void onRetryCamera() {
        app.getProctoringCoordinator().requestCameraConsent(true);
    }

    @FXML
    private void onCopyPin() {
        if (currentLobby == null) {
            return;
        }
        ClipboardContent content = new ClipboardContent();
        content.putString(currentLobby.pin());
        Clipboard.getSystemClipboard().setContent(content);
        copyPinButton.setText("Đã sao chép");
        PauseTransition reset = new PauseTransition(Duration.seconds(1.5));
        reset.setOnFinished(ignored -> copyPinButton.setText("Sao chép PIN"));
        reset.play();
    }

    private void handleMessage(Message message) {
        switch (message.getType()) {
            case QUIZ_LOBBY_UPDATE -> updateLobby(Payloads.fromJson(
                    message.getPayload(), Payloads.QuizLobbyData.class));
            case QUIZ_ROOM_START -> app.showQuizBattle(Payloads.fromJson(
                    message.getPayload(), Payloads.QuizRoomStarted.class));
            case QUIZ_QUESTION, QUIZ_LEADERBOARD -> gameClient.redispatch(message);
            case QUIZ_ROOM_CANCEL -> { app.getProctoringCoordinator().stopRoom(); app.showHome(); }
            case QUIZ_ERROR -> {
                startRequestPending = false;
                if (currentLobby != null) {
                    startButton.setDisable(!QuizRoomUi.canHostStart(currentLobby, false));
                }
                LOGGER.warning(() -> "quiz_start_failed pin="
                        + maskPin(currentLobby == null ? null : currentLobby.pin())
                        + " code=" + message.payloadText());
                showError(QuizRoomUi.errorText(message.payloadText()));
            }
            default -> { }
        }
    }

    private void updateLobby(Payloads.QuizLobbyData lobby) {
        currentLobby = lobby;
        host = lobby.currentUserHost();
        app.getProctoringCoordinator().enterLobby(lobby);
        pinLabel.setText(lobby.pin());
        titleLabel.setText(lobby.title());
        boolean monitored = lobby.proctoringEnabled();
        countLabel.setText(lobby.playerCount() + (monitored ? "/6" : "/20") + " người chơi");
        playerList.setItems(FXCollections.observableArrayList(lobby.members()));
        startButton.setVisible(host);
        startButton.setManaged(host);
        startButton.setDisable(!QuizRoomUi.canHostStart(lobby, startRequestPending));
        leaveButton.setText(host ? "Hủy phòng" : "Rời phòng");
        proctoringLabel.setVisible(monitored);
        proctoringLabel.setManaged(monitored);
        proctoringLabel.setText(monitored
                ? "Phòng này đang bật giám sát camera. Không thu microphone; cảnh báo có thể được lưu trên máy host."
                : "");
        retryCameraButton.setVisible(monitored && !host);
        retryCameraButton.setManaged(monitored && !host);
        statusLabel.setText(QuizRoomUi.lobbyStatus(lobby, startRequestPending));
        LOGGER.info(() -> "quiz_lobby_updated pin=" + maskPin(lobby.pin())
                + " host=" + host
                + " connectedPlayers=" + QuizRoomUi.connectedPlayerCount(lobby.members())
                + " proctoring=" + monitored);
    }

    private void configureCameraPreview(Payloads.QuizLobbyData lobby) {
        boolean showLocalCamera = lobby.proctoringEnabled() && !lobby.currentUserHost();
        cameraPanel.setVisible(showLocalCamera);
        cameraPanel.setManaged(showLocalCamera);
        cameraPreview.setVisible(showLocalCamera);
        cameraPreview.setManaged(showLocalCamera);
        if (!showLocalCamera) {
            cameraPreview.setImage(null);
            return;
        }
        app.getProctoringCoordinator().setPreviewListener(this::onPreviewFrame);
        CapturedFrame current = app.getProctoringCoordinator().getLatestFrame();
        if (current != null) onPreviewFrame(current);
    }

    /** Convert off the JavaFX thread and only queue the newest image for painting. */
    private void onPreviewFrame(CapturedFrame frame) {
        latestPreview.set(SwingFXUtils.toFXImage(frame.image(), null));
        schedulePreviewPaint();
    }

    private void schedulePreviewPaint() {
        if (previewPaintPending.compareAndSet(false, true)) {
            Platform.runLater(this::paintLatestPreview);
        }
    }

    private void paintLatestPreview() {
        Image image = latestPreview.getAndSet(null);
        if (image != null) cameraPreview.setImage(image);
        previewPaintPending.set(false);
        if (latestPreview.get() != null) schedulePreviewPaint();
    }

    private String cameraStatusText(Payloads.QuizLobbyPlayer item) {
        if (item.cameraStatus() == null || item.cameraStatus() == Payloads.CameraStatus.NOT_REQUIRED
                || item.cameraStatus() == Payloads.CameraStatus.NOT_APPLICABLE) return "";
        return "Camera: " + switch (item.cameraStatus()) {
            case READY -> "Sẵn sàng";
            case INITIALIZING -> "Đang mở";
            case DENIED -> "Từ chối";
            case NOT_FOUND -> "Không tìm thấy";
            case LOST -> "Mất tín hiệu";
            case BLOCKED -> "Bị che";
            case FAILED -> "Lỗi";
            case STOPPED -> "Đã dừng";
            default -> item.cameraStatus().name();
        };
    }

    private static Label chip(String text) {
        Label label = new Label(text);
        label.getStyleClass().add("player-chip");
        return label;
    }

    private static void setChipStyle(Label label, String styleClass) {
        label.getStyleClass().removeAll("chip-role-player", "chip-role-controller",
                "chip-online", "chip-offline", "chip-camera-ok", "chip-camera-warn");
        label.getStyleClass().add(styleClass);
    }

    private static String initial(String username) {
        return username == null || username.isBlank()
                ? "?" : username.substring(0, 1).toUpperCase(Locale.ROOT);
    }

    /** Render mỗi thành viên thành player card có avatar, vai trò và chip camera. */
    private final class PlayerCell extends ListCell<Payloads.QuizLobbyPlayer> {
        private final Label avatarLabel = new Label();
        private final StackPane avatar = new StackPane(avatarLabel);
        private final Label nameLabel = new Label();
        private final Label hostChip = chip("HOST");
        private final Label roleChip = chip("");
        private final Label onlineChip = chip("");
        private final Label cameraChip = chip("");
        private final FlowPane chips = new FlowPane(6, 4, hostChip, roleChip,
                onlineChip, cameraChip);
        private final VBox identity = new VBox(4, nameLabel, chips);
        private final HBox layout = new HBox(12, avatar, identity);

        private PlayerCell() {
            getStyleClass().add("lobby-player-cell");
            avatar.getStyleClass().add("player-avatar");
            avatarLabel.getStyleClass().add("player-avatar-text");
            avatar.setMinSize(42, 42);
            avatar.setPrefSize(42, 42);
            avatar.setMaxSize(42, 42);
            nameLabel.getStyleClass().add("lobby-player-name");
            layout.getStyleClass().add("lobby-player-card");
            layout.prefWidthProperty().bind(playerList.widthProperty().subtract(26));
            chips.setAlignment(Pos.CENTER_LEFT);
            chips.setMaxWidth(Double.MAX_VALUE);
            layout.setAlignment(Pos.CENTER_LEFT);
            HBox.setHgrow(identity, Priority.ALWAYS);
        }

        @Override
        protected void updateItem(Payloads.QuizLobbyPlayer item, boolean empty) {
            super.updateItem(item, empty);
            getStyleClass().removeAll("player-cell-host", "player-cell-offline");
            if (empty || item == null) {
                setText(null);
                setGraphic(null);
                return;
            }
            setText(null);
            if (item.host()) getStyleClass().add("player-cell-host");
            if (!item.connected()) getStyleClass().add("player-cell-offline");
            avatar.getStyleClass().removeAll("player-avatar-host", "player-avatar-player");
            avatar.getStyleClass().add(item.host() ? "player-avatar-host" : "player-avatar-player");
            avatarLabel.setText(initial(item.username()));
            nameLabel.setText(item.username());
            hostChip.setVisible(item.host());
            hostChip.setManaged(item.host());
            roleChip.setText(item.playing() ? "Người chơi" : "Điều khiển");
            setChipStyle(roleChip, item.playing() ? "chip-role-player" : "chip-role-controller");
            onlineChip.setText(item.connected() ? "Trực tuyến" : "Mất kết nối");
            setChipStyle(onlineChip, item.connected() ? "chip-online" : "chip-offline");
            String camera = cameraStatusText(item);
            boolean showCamera = !camera.isEmpty();
            cameraChip.setVisible(showCamera);
            cameraChip.setManaged(showCamera);
            if (showCamera) {
                cameraChip.setText(camera);
                setChipStyle(cameraChip, item.cameraStatus() == Payloads.CameraStatus.READY
                        ? "chip-camera-ok" : "chip-camera-warn");
            }
            setGraphic(layout);
        }
    }

    private void showError(String text) {
        statusLabel.setText(text);
        statusLabel.getStyleClass().removeAll("status-success", "status-error");
        statusLabel.getStyleClass().add("status-error");
    }

    @Override
    public boolean requestNavigationAway() {
        Alert alert = new Alert(Alert.AlertType.CONFIRMATION);
        alert.setTitle(host ? "Hủy phòng Quiz" : "Rời phòng Quiz");
        alert.setHeaderText(host ? "Bạn đang là host của phòng" : "Bạn đang ở trong sảnh chờ");
        alert.setContentText(host
                ? "Rời màn hình sẽ hủy phòng đối với tất cả thành viên."
                : "Bạn sẽ rời khỏi phòng Quiz hiện tại.");
        Optional<ButtonType> choice = alert.showAndWait();
        if (choice.isEmpty() || choice.get() != ButtonType.OK) return false;
        if (host) gameClient.cancelQuizRoom();
        else gameClient.leaveQuizRoom();
        return true;
    }
}
