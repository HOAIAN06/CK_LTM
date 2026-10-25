package com.nihongoquest.client.home;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.network.GameClient;
import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.scene.control.Button;

/**
 * HomeController xử lý CTA duy nhất trên màn hình chính.
 * Không tạo Socket trực tiếp trong Controller.
 */
public class HomeController {
    @FXML
    private Button findMatchButton;

    private GameClient gameClient;
    private ClientApp app;

    public void setSession(ClientApp app, GameClient gameClient) {
        this.app = app;
        this.gameClient = gameClient;
        gameClient.setMessageHandler(message -> { });
    }

    /**
     * Xử lý khi người dùng bấm "TÌM TRẬN".
     */
    @FXML
    private void onFindMatch(ActionEvent event) {
        findMatchButton.setDisable(true);
        app.showMatchmaking();
    }

}
