package com.nihongoquest.client.controller;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.model.Player;
import com.nihongoquest.client.network.GameClient;
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
        gameClient.setMessageHandler(message -> { });
        usernameLabel.setText("Người chơi: " + player.getUsername());
        winsLabel.setText("Số trận thắng: " + player.getWins());
        lossesLabel.setText("Số trận thua: " + player.getLosses());
        questionsLabel.setText("Số câu đã trả lời: " + player.getQuestionsAnswered());
        correctAnswersLabel.setText("Số câu trả lời đúng: " + player.getCorrectAnswers());
    }

    /**
     * Xử lý khi người dùng bấm "TÌM TRẬN".
     * TODO: Lấy username, gọi GameClient gửi yêu cầu tìm trận, chuyển sang matchmaking.fxml.
     */
    @FXML
    private void onFindMatch(ActionEvent event) {
        findMatchButton.setDisable(true);
        app.showMatchmaking();
    }
}
