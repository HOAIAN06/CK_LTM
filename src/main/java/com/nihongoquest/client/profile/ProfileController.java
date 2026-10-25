package com.nihongoquest.client.profile;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.scene.control.Label;

import java.util.Locale;

/** Hiển thị toàn bộ thông tin người dùng tại một nơi duy nhất. */
public class ProfileController {
    @FXML private Label avatarLabel;
    @FXML private Label usernameLabel;
    @FXML private Label winsLabel;
    @FXML private Label lossesLabel;
    @FXML private Label drawsLabel;
    @FXML private Label totalScoreLabel;
    @FXML private Label questionsLabel;
    @FXML private Label correctAnswersLabel;
    @FXML private Label accuracyLabel;
    @FXML private Label statusLabel;

    private ClientApp app;
    private GameClient gameClient;

    public void setSession(ClientApp app, GameClient gameClient, Player player) {
        this.app = app;
        this.gameClient = gameClient;
        showPlayer(player);
        gameClient.setMessageHandler(message -> Platform.runLater(() -> handleMessage(message)));
        gameClient.setConnectionErrorHandler(error -> Platform.runLater(() -> showError(error)));
        statusLabel.setText("Đang cập nhật dữ liệu hồ sơ...");
        gameClient.getProfile();
    }

    private void handleMessage(Message message) {
        if (message.getType() == MessageType.QUERY_ERROR) {
            showError("Không thể tải dữ liệu hồ sơ từ máy chủ.");
            return;
        }
        if (message.getType() != MessageType.PROFILE_DATA) return;
        Payloads.PlayerStats values = Payloads.parsePlayer(message.getPayload());
        Player player = new Player(values.id(), values.username(), values.wins(), values.losses(),
                values.draws(), values.totalScore(), values.questionsAnswered(),
                values.correctAnswers());
        app.updateCurrentPlayer(player);
        showPlayer(player);
        statusLabel.setText("Hồ sơ đã được cập nhật.");
        statusLabel.getStyleClass().removeAll("status-error");
    }

    private void showPlayer(Player player) {
        String username = player.getUsername();
        avatarLabel.setText(username.isBlank() ? "?"
                : username.substring(0, 1).toUpperCase(Locale.ROOT));
        usernameLabel.setText(username);
        winsLabel.setText(Integer.toString(player.getWins()));
        lossesLabel.setText(Integer.toString(player.getLosses()));
        drawsLabel.setText(Integer.toString(player.getDraws()));
        totalScoreLabel.setText(Integer.toString(player.getTotalScore()));
        questionsLabel.setText(Integer.toString(player.getQuestionsAnswered()));
        correctAnswersLabel.setText(Integer.toString(player.getCorrectAnswers()));
        accuracyLabel.setText(ProfilePresenter.accuracy(player) + "%");
    }

    private void showError(String error) {
        statusLabel.setText(error);
        if (!statusLabel.getStyleClass().contains("status-error")) {
            statusLabel.getStyleClass().add("status-error");
        }
    }
}
