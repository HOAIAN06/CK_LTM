package com.nihongoquest.client.ranked.matchmaking;

import com.nihongoquest.client.layout.NavigationGuard;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.profile.Player;
import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.Payloads;
import com.fasterxml.jackson.databind.JsonNode;
import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Alert;
import javafx.scene.control.ButtonType;
import javafx.scene.control.Label;
import javafx.scene.control.ProgressIndicator;
import javafx.scene.control.RadioButton;

import java.util.Optional;

/**
 * MatchmakingController xử lý màn hình đang tìm đối thủ (matchmaking.fxml).
 * Hiển thị trạng thái chờ; sau này nhận MATCH_FOUND từ Server rồi chuyển sang Battle.
 */
public class MatchmakingController implements NavigationGuard {

    @FXML
    private Label statusLabel;
    @FXML
    private Button cancelButton;
    @FXML
    private Label usernameLabel;
    @FXML
    private ProgressIndicator searchSpinner;
    @FXML
    private RadioButton threeMinutesRadio;
    @FXML
    private RadioButton fiveMinutesRadio;
    @FXML
    private Button searchButton;

    private ClientApp app;
    private GameClient gameClient;
    private boolean searching;

    public void setSession(ClientApp app, GameClient gameClient, Player player) {
        this.app = app;
        this.gameClient = gameClient;
        usernameLabel.setText("Đang tìm cho: " + player.getUsername());
        searchSpinner.setVisible(false);
        gameClient.setMessageHandler(message ->
                Platform.runLater(() -> handleMessage(message)));
        gameClient.setConnectionErrorHandler(error ->
                Platform.runLater(() -> {
                    showError(error);
                    searchSpinner.setVisible(false);
                    cancelButton.setDisable(true);
                }));
    }

    @FXML
    private void startSearch() {
        int duration = fiveMinutesRadio.isSelected() ? 300 : 180;
        try {
            searching = true;
            threeMinutesRadio.setDisable(true);
            fiveMinutesRadio.setDisable(true);
            searchButton.setDisable(true);
            searchSpinner.setVisible(true);
            cancelButton.setManaged(true);
            cancelButton.setVisible(true);
            cancelButton.setText("HỦY TÌM TRẬN");
            showStatus("Đang gửi yêu cầu tìm trận " + (duration / 60) + " phút...");
            gameClient.findMatch(duration);
        } catch (IllegalStateException e) {
            searching = false;
            showError(e.getMessage());
            searchSpinner.setVisible(false);
            searchButton.setDisable(false);
        }
    }

    /**
     * Xử lý nút hủy tìm trận.
     */
    @FXML
    private void onCancel() {
        if (!searching) {
            return;
        }
        cancelButton.setDisable(true);
        showStatus("Đang hủy tìm trận...");
        try {
            gameClient.cancelMatch();
        } catch (IllegalStateException e) {
            showError(e.getMessage());
        }
    }

    private void handleMessage(Message message) {
        switch (message.getType()) {
            case WAITING -> showStatus("Đang tìm đối thủ...");
            case MATCH_CANCELLED -> {
                searching = false;
                searchSpinner.setVisible(false);
                app.showMatchmaking();
            }
            case MATCH_FOUND -> handleMatchFound(message.getPayload());
            case MATCH_ERROR -> handleMatchError(message.payloadText());
            case QUESTION, ANSWER_RESULT, SCORE_UPDATE, GAME_OVER ->
                    gameClient.redispatch(message);
            default -> {
                // Màn tìm trận chỉ xử lý các message matchmaking.
            }
        }
    }

    private void handleMatchFound(JsonNode payload) {
        try {
            Payloads.MatchFound match = Payloads.parseMatchFound(payload);
            if (match.roomId().isBlank() || match.opponent().isBlank()) {
                throw new IllegalArgumentException("Empty match");
            }
            searchSpinner.setVisible(false);
            statusLabel.setText("Đã tìm thấy " + match.opponent());
            if (match.durationSeconds() != 180 && match.durationSeconds() != 300) {
                throw new IllegalArgumentException("Invalid duration");
            }
            app.showBattle(match.roomId(), match.opponent(), match.durationSeconds());
        } catch (RuntimeException e) {
            showError("Dữ liệu trận đấu không hợp lệ");
            cancelButton.setDisable(false);
        }
    }

    private void handleMatchError(String reason) {
        String message = switch (reason) {
            case "NOT_AUTHENTICATED" -> "Bạn cần đăng nhập trước khi tìm trận";
            case "ALREADY_WAITING" -> "Bạn đang ở trong hàng chờ";
            case "ALREADY_MATCHED" -> "Bạn đã được ghép trận";
            case "OPPONENT_DISCONNECTED" -> "Đối thủ đã ngắt kết nối";
            case "QUESTIONS_UNAVAILABLE" -> "Chưa thể tạo trận: không tải được đủ câu hỏi hợp lệ";
            case "INVALID_DURATION" -> "Chế độ trận đấu phải là 3 hoặc 5 phút";
            default -> "Không thể tìm trận";
        };
        showError(message);
        if (!"ALREADY_MATCHED".equals(reason)) {
            searching = false;
            searchSpinner.setVisible(false);
            searchButton.setDisable(false);
            threeMinutesRadio.setDisable(false);
            fiveMinutesRadio.setDisable(false);
            cancelButton.setDisable(false);
            cancelButton.setManaged(false);
            cancelButton.setVisible(false);
        }
    }

    private void showStatus(String message) {
        statusLabel.getStyleClass().remove("status-error");
        statusLabel.setText(message);
    }

    private void showError(String message) {
        if (!statusLabel.getStyleClass().contains("status-error")) {
            statusLabel.getStyleClass().add("status-error");
        }
        statusLabel.setText(message);
    }

    @Override
    public boolean requestNavigationAway() {
        if (!searching) return true;
        Alert alert = new Alert(Alert.AlertType.CONFIRMATION);
        alert.setTitle("Hủy tìm trận");
        alert.setHeaderText("Bạn đang trong hàng chờ ghép trận");
        alert.setContentText("Rời màn hình sẽ hủy yêu cầu tìm đối thủ hiện tại.");
        Optional<ButtonType> choice = alert.showAndWait();
        if (choice.isEmpty() || choice.get() != ButtonType.OK) return false;
        gameClient.cancelMatch();
        searching = false;
        return true;
    }
}
