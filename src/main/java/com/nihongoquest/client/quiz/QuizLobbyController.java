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

import java.util.Optional;

/** Sảnh chờ hiển thị PIN, host và trạng thái kết nối thành viên. */
public class QuizLobbyController implements NavigationGuard {
    @FXML private Label pinLabel;
    @FXML private Label titleLabel;
    @FXML private Label countLabel;
    @FXML private Label statusLabel;
    @FXML private ListView<Payloads.QuizLobbyPlayer> playerList;
    @FXML private Button startButton;
    @FXML private Button leaveButton;
    @FXML private Button retryCameraButton;
    @FXML private Label proctoringLabel;

    private ClientApp app;
    private GameClient gameClient;
    private boolean host;

    @FXML
    private void initialize() {
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
        startButton.setDisable(true);
        statusLabel.setText("Đang bắt đầu phòng...");
        gameClient.startQuizRoom();
    }

    @FXML
    private void onLeave() {
        leaveButton.setDisable(true);
        if (host) gameClient.cancelQuizRoom();
        else gameClient.leaveQuizRoom();
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
            case QUIZ_ROOM_CANCEL -> app.showMatchmaking();
            case QUIZ_ERROR -> {
                startButton.setDisable(false);
                showError(QuizRoomUi.errorText(message.payloadText()));
            }
            default -> { }
        }
    }

    private void updateLobby(Payloads.QuizLobbyData lobby) {
        host = lobby.currentUserHost();
        app.getProctoringCoordinator().enterLobby(lobby);
        pinLabel.setText(lobby.pin());
        titleLabel.setText(lobby.title());
        countLabel.setText(lobby.playerCount() + "/20 người chơi");
        playerList.setItems(FXCollections.observableArrayList(lobby.members()));
        startButton.setVisible(host);
        startButton.setManaged(host);
        startButton.setDisable(!host || lobby.playerCount() < 2);
        leaveButton.setText(host ? "Hủy phòng" : "Rời phòng");
        boolean monitored = lobby.proctoringEnabled();
        proctoringLabel.setVisible(monitored);
        proctoringLabel.setManaged(monitored);
        proctoringLabel.setText(monitored
                ? "Phòng này đang bật giám sát camera. Không thu microphone; cảnh báo có thể được lưu trên máy host."
                : "");
        retryCameraButton.setVisible(monitored && !host);
        retryCameraButton.setManaged(monitored && !host);
        statusLabel.setText(host && lobby.playerCount() < 2
                ? "Cần ít nhất 2 người chơi để bắt đầu."
                : "Đang chờ host bắt đầu...");
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
