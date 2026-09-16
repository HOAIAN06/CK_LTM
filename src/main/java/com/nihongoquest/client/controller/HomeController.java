package com.nihongoquest.client.controller;

import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.TextField;

/**
 * HomeController xử lý màn hình chính (home.fxml).
 * Sau này nhận username, xử lý nút "Tìm trận" và gọi GameClient gửi FIND_MATCH.
 * Không tạo Socket trực tiếp trong Controller.
 */
public class HomeController {

    @FXML
    private TextField usernameField;

    @FXML
    private Button findMatchButton;

    /**
     * Xử lý khi người dùng bấm "TÌM TRẬN".
     * TODO: Lấy username, gọi GameClient gửi yêu cầu tìm trận, chuyển sang matchmaking.fxml.
     */
    @FXML
    private void onFindMatch(ActionEvent event) {
        String username = usernameField != null ? usernameField.getText() : "";
        System.out.println("TODO: Tìm trận với username = " + username);
        // TODO: Không viết new Socket(...) tại đây — phải gọi GameClient.
    }
}
