package com.nihongoquest.client.controller;

import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Label;

/**
 * MatchmakingController xử lý màn hình đang tìm đối thủ (matchmaking.fxml).
 * Hiển thị trạng thái chờ; sau này nhận MATCH_FOUND từ Server rồi chuyển sang Battle.
 */
public class MatchmakingController {

    @FXML
    private Label statusLabel;

    @FXML
    private Button cancelButton;

    /**
     * Xử lý nút hủy tìm trận.
     * TODO: Gửi CANCEL_MATCH qua GameClient và quay về Home.
     */
    @FXML
    private void onCancel(ActionEvent event) {
        System.out.println("TODO: Hủy tìm trận");
    }

    /**
     * Được gọi khi Server báo đã tìm thấy đối thủ.
     * TODO: Chuyển sang battle.fxml.
     */
    public void onMatchFound() {
        System.out.println("TODO: MATCH_FOUND → chuyển sang Battle");
    }
}
