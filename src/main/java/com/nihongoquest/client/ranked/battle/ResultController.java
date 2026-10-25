package com.nihongoquest.client.ranked.battle;

import javafx.fxml.FXML;
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

    public void setResult(String result, int myScore,
                          int opponentScore, String opponentName) {
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
