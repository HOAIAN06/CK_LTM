package com.nihongoquest.client.controller;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.model.Player;
import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.common.Message;
import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.ProgressIndicator;

/**
 * MatchmakingController xử lý màn hình đang tìm đối thủ (matchmaking.fxml).
 * Hiển thị trạng thái chờ; sau này nhận MATCH_FOUND từ Server rồi chuyển sang Battle.
 */
public class MatchmakingController {

    @FXML
    private Label statusLabel;
    @FXML
    private Button cancelButton;
    @FXML
    private Label usernameLabel;
    @FXML
    private ProgressIndicator searchSpinner;

    private ClientApp app;
    private GameClient gameClient;

    public void setSession(ClientApp app, GameClient gameClient, Player player) {
        this.app = app;
        this.gameClient = gameClient;
        usernameLabel.setText("Đang tìm cho: " + player.getUsername());
        gameClient.setMessageHandler(message ->
                Platform.runLater(() -> handleMessage(message)));
        gameClient.setConnectionErrorHandler(error ->
                Platform.runLater(() -> {
                    showError(error);
                    searchSpinner.setVisible(false);
                    cancelButton.setDisable(true);
                }));
    }

    public void startSearch() {
        try {
            gameClient.findMatch();
        } catch (IllegalStateException e) {
            showError(e.getMessage());
            searchSpinner.setVisible(false);
            cancelButton.setDisable(true);
        }
    }

    /**
     * Xử lý nút hủy tìm trận.
     * TODO: Gửi CANCEL_MATCH qua GameClient và quay về Home.
     */
    @FXML
    private void onCancel() {
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
                searchSpinner.setVisible(false);
                app.showHome();
            }
            case MATCH_FOUND -> handleMatchFound(message.getPayload());
            case MATCH_ERROR -> handleMatchError(message.getPayload());
            case QUESTION, ANSWER_RESULT, SCORE_UPDATE, PLAYER_FINISHED, GAME_OVER ->
                    gameClient.redispatch(message);
            default -> {
                // Màn tìm trận chỉ xử lý các message matchmaking.
            }
        }
    }

    private void handleMatchFound(String payload) {
        String[] values = payload.split("\\|", 2);
        if (values.length != 2 || values[0].isBlank() || values[1].isBlank()) {
            showError("Dữ liệu trận đấu không hợp lệ");
            cancelButton.setDisable(false);
            return;
        }
        searchSpinner.setVisible(false);
        statusLabel.setText("Đã tìm thấy " + values[1]);
        app.showBattle(values[0], values[1]);
    }

    private void handleMatchError(String reason) {
        String message = switch (reason) {
            case "NOT_AUTHENTICATED" -> "Bạn cần đăng nhập trước khi tìm trận";
            case "ALREADY_WAITING" -> "Bạn đang ở trong hàng chờ";
            case "ALREADY_MATCHED" -> "Bạn đã được ghép trận";
            case "OPPONENT_DISCONNECTED" -> "Đối thủ đã ngắt kết nối";
            default -> "Không thể tìm trận";
        };
        showError(message);
        if (!"ALREADY_MATCHED".equals(reason)) {
            cancelButton.setDisable(false);
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
}
