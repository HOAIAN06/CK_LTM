package com.nihongoquest.client.controller;

import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Label;

/**
 * BattleController xử lý màn hình thi đấu (battle.fxml).
 * Chỉ hiển thị player, câu hỏi, đáp án và điểm nhận từ Server.
 * Controller không được tự tính kết quả trận đấu — Server quyết định đúng/sai và điểm.
 */
public class BattleController {

    @FXML
    private Label player1Label;

    @FXML
    private Label player2Label;

    @FXML
    private Label scoreLabel;

    @FXML
    private Label questionLabel;

    @FXML
    private Button answerAButton;

    @FXML
    private Button answerBButton;

    @FXML
    private Button answerCButton;

    @FXML
    private Button answerDButton;

    /**
     * Người chơi chọn một đáp án.
     * TODO: Gửi ANSWER qua GameClient; chờ ANSWER_RESULT / SCORE_UPDATE từ Server.
     */
    @FXML
    private void onAnswerSelected(ActionEvent event) {
        Object source = event.getSource();
        System.out.println("TODO: Gửi đáp án từ " + source);
        // TODO: Không tự chấm điểm tại Client.
    }
}
