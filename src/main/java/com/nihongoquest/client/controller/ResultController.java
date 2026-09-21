package com.nihongoquest.client.controller;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.model.Player;
import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Label;

/**
 * ResultController xử lý màn hình kết quả (result.fxml).
 * Hiển thị thắng/thua, điểm và tên đối thủ theo dữ liệu Server gửi về.
 */
public class ResultController {

    private ClientApp app;

    @FXML
    private Label resultLabel;

    @FXML
    private Label scoreLabel;

    @FXML
    private Label opponentLabel;

    @FXML
    private Label profileAvatarLabel;

    @FXML
    private Label profileUsernameLabel;

    @FXML
    private Label profileStatsLabel;

    @FXML
    private Button homeButton;

    @FXML
    private void onBackHome(ActionEvent event) {
        app.showHome();
    }

    public void setResult(ClientApp app, Player player, String result, int myScore,
                          int opponentScore, String opponentName) {
        this.app = app;
        ProfilePresenter.populate(player, profileAvatarLabel,
                profileUsernameLabel, profileStatsLabel);
        resultLabel.getStyleClass().removeAll("result-win", "result-lose", "result-draw");
        resultLabel.setText(switch (result) {
            case "WIN" -> "CHIẾN THẮNG";
            case "LOSE" -> "THẤT BẠI";
            case "DRAW" -> "HÒA";
            default -> "KẾT THÚC TRẬN";
        });
        resultLabel.getStyleClass().add(switch (result) {
            case "WIN" -> "result-win";
            case "LOSE" -> "result-lose";
            default -> "result-draw";
        });
        scoreLabel.setText(myScore + " - " + opponentScore);
        opponentLabel.setText("Đối thủ: " + opponentName);
    }
}
