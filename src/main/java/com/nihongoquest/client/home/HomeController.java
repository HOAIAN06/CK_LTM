package com.nihongoquest.client.home;

import com.nihongoquest.client.profile.ProfilePresenter;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.profile.Player;
import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import javafx.application.Platform;
import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Label;

/**
 * HomeController xử lý màn hình chính (home.fxml).
 * Sau này nhận username, xử lý nút "Tìm trận" và gọi GameClient gửi FIND_MATCH.
 * Không tạo Socket trực tiếp trong Controller.
 */
public class HomeController {

    @FXML
    private Label usernameLabel;
    @FXML
    private Label profileAvatarLabel;
    @FXML
    private Label profileUsernameLabel;
    @FXML
    private Label profileStatsLabel;
    @FXML
    private Label winsLabel;
    @FXML
    private Label lossesLabel;
    @FXML
    private Label questionsLabel;
    @FXML
    private Label correctAnswersLabel;
    @FXML
    private Button findMatchButton;

    private GameClient gameClient;
    private Player player;
    private ClientApp app;

    public void setSession(ClientApp app, GameClient gameClient, Player player) {
        this.app = app;
        this.gameClient = gameClient;
        this.player = player;
        gameClient.setMessageHandler(message ->
                Platform.runLater(() -> handleServerMessage(message)));
        showPlayer(player);
        gameClient.getProfile();
    }

    private void handleServerMessage(Message message) {
        if (message.getType() != MessageType.PROFILE_DATA) return;
        Payloads.PlayerStats values = Payloads.parsePlayer(message.getPayload());
        player = new Player(values.id(), values.username(), values.wins(), values.losses(),
                values.draws(), values.totalScore(), values.questionsAnswered(),
                values.correctAnswers());
        app.updateCurrentPlayer(player);
        showPlayer(player);
    }

    private void showPlayer(Player player) {
        ProfilePresenter.populate(player, profileAvatarLabel,
                profileUsernameLabel, profileStatsLabel);
        usernameLabel.setText("Xin chào, " + player.getUsername() + "!");
        winsLabel.setText(Integer.toString(player.getWins()));
        lossesLabel.setText(Integer.toString(player.getLosses()));
        questionsLabel.setText(Integer.toString(player.getQuestionsAnswered()));
        correctAnswersLabel.setText(Integer.toString(player.getCorrectAnswers()));
    }

    /**
     * Xử lý khi người dùng bấm "TÌM TRẬN".
     */
    @FXML
    private void onFindMatch(ActionEvent event) {
        findMatchButton.setDisable(true);
        app.showMatchmaking();
    }

    @FXML
    private void onManageQuizSets(ActionEvent event) {
        app.showQuizSets();
    }

    @FXML
    private void onQuizRoom(ActionEvent event) {
        app.showQuizRoomMenu();
    }

    @FXML
    private void onLeaderboard(ActionEvent event) {
        app.showLeaderboard();
    }

    @FXML
    private void onMatchHistory(ActionEvent event) {
        app.showMatchHistory();
    }
}
