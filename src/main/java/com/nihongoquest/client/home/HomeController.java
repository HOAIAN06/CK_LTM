package com.nihongoquest.client.home;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.profile.Player;
import com.nihongoquest.ui.Icons;
import javafx.fxml.FXML;
import javafx.scene.control.Label;
import javafx.scene.layout.StackPane;

import java.util.Locale;

/**
 * Trang chủ sau đăng nhập: tóm tắt tiến độ thật của người chơi và mở các chế độ chơi.
 * Không tạo Socket, không tự tính điểm và không gọi database.
 */
public class HomeController {
    @FXML
    private Label greetingLabel;
    @FXML
    private Label accuracyValueLabel;
    @FXML
    private Label winsValueLabel;
    @FXML
    private Label scoreValueLabel;
    @FXML
    private Label homeHintLabel;
    @FXML
    private StackPane matchModeIcon;
    @FXML
    private StackPane quizModeIcon;
    @FXML
    private StackPane setsModeIcon;

    private ClientApp app;

    @FXML
    private void initialize() {
        matchModeIcon.getChildren().setAll(Icons.icon(Icons.SWORDS));
        quizModeIcon.getChildren().setAll(Icons.icon(Icons.GAMEPAD));
        setsModeIcon.getChildren().setAll(Icons.icon(Icons.LAYERS));
    }

    public void setSession(ClientApp app, Player player) {
        this.app = app;
        renderProgress(player);
    }

    private void renderProgress(Player player) {
        greetingLabel.setText("XIN CHÀO, " + player.username().toUpperCase(Locale.ROOT));
        int answered = player.questionsAnswered();
        int accuracy = answered == 0
                ? 0
                : (int) Math.round(player.correctAnswers() * 100.0 / answered);
        accuracyValueLabel.setText(accuracy + "%");
        winsValueLabel.setText(Integer.toString(player.wins()));
        scoreValueLabel.setText(Integer.toString(player.totalScore()));
        homeHintLabel.setText(answered == 0
                ? "Chưa có câu trả lời nào. Hãy bắt đầu bằng một trận 1v1!"
                : "Bạn đã trả lời " + answered + " câu và đúng "
                        + player.correctAnswers() + " câu. Giữ nhịp nhé!");
    }

    @FXML
    private void onFindMatch() {
        app.showMatchmaking();
    }

    @FXML
    private void onQuizRoom() {
        app.showQuizRoomMenu();
    }

    @FXML
    private void onQuizSets() {
        app.showQuizSets();
    }

    @FXML
    private void onHistory() {
        app.showMatchHistory();
    }
}
