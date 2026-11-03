package com.nihongoquest.client.quiz;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.layout.NavigationGuard;
import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.Payloads;
import javafx.application.Platform;
import javafx.collections.FXCollections;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Alert;
import javafx.scene.control.ButtonType;
import javafx.scene.control.Label;
import javafx.scene.control.ListCell;
import javafx.scene.control.ListView;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import java.io.ByteArrayInputStream;

import java.util.Optional;
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

    private ClientApp app;
    private GameClient gameClient;
    private boolean host;
    private boolean startRequestPending;
    private Payloads.QuizLobbyData currentLobby;

    @FXML
    private void initialize() {
        Label empty = new Label("Đang chờ người chơi tham gia bằng mã PIN...");
        empty.getStyleClass().add("empty-state");
        playerList.setPlaceholder(empty);
        playerList.setCellFactory(ignored -> new ListCell<>() {
            @Override
            protected void updateItem(Payloads.QuizLobbyPlayer item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || item == null) setText(null);
                else setText((item.host() ? "★ " : "") + item.username()
                        + (item.playing() ? " • Người chơi" : " • Điều khiển")
                        + (item.connected() ? " • Online" : " • Mất kết nối")
                        + cameraText(item));
            }
        });
    }

    public void setSession(ClientApp app, GameClient gameClient, Payloads.QuizLobbyData lobby) {
        this.app = app;
        this.gameClient = gameClient;
        gameClient.setMessageHandler(message -> Platform.runLater(() -> handleMessage(message)));
        gameClient.setConnectionErrorHandler(error -> Platform.runLater(() -> showError(error)));
        updateLobby(lobby);
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
        app.showMatchmaking();
    }

    @FXML
    private void onRetryCamera() {
        app.getProctoringCoordinator().requestCameraConsent(true);
    }

    private void handleMessage(Message message) {
        switch (message.getType()) {
            case QUIZ_LOBBY_UPDATE -> updateLobby(Payloads.fromJson(
                    message.getPayload(), Payloads.QuizLobbyData.class));
            case QUIZ_ROOM_START -> app.showQuizBattle(Payloads.fromJson(
                    message.getPayload(), Payloads.QuizRoomStarted.class));
            case QUIZ_QUESTION, QUIZ_LEADERBOARD -> gameClient.redispatch(message);
            case QUIZ_ROOM_CANCEL -> { app.getProctoringCoordinator().stopRoom(); app.showMatchmaking(); }
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

    private String cameraText(Payloads.QuizLobbyPlayer item) {
        if (item.cameraStatus() == null || item.cameraStatus() == Payloads.CameraStatus.NOT_REQUIRED
                || item.cameraStatus() == Payloads.CameraStatus.NOT_APPLICABLE) return "";
        return " • Camera: " + switch (item.cameraStatus()) {
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
