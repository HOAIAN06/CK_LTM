package com.nihongoquest.client.controller;

import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Label;

/**
 * ResultController xử lý màn hình kết quả (result.fxml).
 * Hiển thị thắng/thua, điểm và tên đối thủ theo dữ liệu Server gửi về.
 */
public class ResultController {

    @FXML
    private Label resultLabel;

    @FXML
    private Label scoreLabel;

    @FXML
    private Label opponentLabel;

    @FXML
    private Button homeButton;

    /**
     * Quay lại màn hình Home.
     * TODO: Load home.fxml.
     */
    @FXML
    private void onBackHome(ActionEvent event) {
        System.out.println("TODO: Về trang chủ");
    }

    /**
     * Cập nhật UI kết quả từ dữ liệu Server.
     * TODO: Gọi sau khi nhận GAME_OVER.
     */
    public void showResult(String resultText, int myScore, int opponentScore, String opponentName) {
        if (resultLabel != null) {
            resultLabel.setText(resultText);
        }
        if (scoreLabel != null) {
            scoreLabel.setText(myScore + " - " + opponentScore);
        }
        if (opponentLabel != null) {
            opponentLabel.setText(opponentName);
        }
    }
}
