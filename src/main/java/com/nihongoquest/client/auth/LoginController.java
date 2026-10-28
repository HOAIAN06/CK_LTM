package com.nihongoquest.client.auth;

import com.nihongoquest.client.config.ClientConfig;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.profile.Player;
import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.Payloads;
import com.fasterxml.jackson.databind.JsonNode;
import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Hyperlink;
import javafx.scene.control.Label;
import javafx.scene.control.PasswordField;
import javafx.scene.control.TextField;

import java.io.IOException;

public class LoginController {

    @FXML
    private Label authTitle;
    @FXML
    private Label authSubtitle;
    @FXML
    private TextField serverHostField;
    @FXML
    private TextField serverPortField;
    @FXML
    private Button connectButton;
    @FXML
    private Label connectionStatusLabel;
    @FXML
    private TextField usernameField;
    @FXML
    private PasswordField passwordField;
    @FXML
    private PasswordField confirmPasswordField;
    @FXML
    private Button submitButton;
    @FXML
    private Label statusLabel;
    @FXML
    private Label modePromptLabel;
    @FXML
    private Hyperlink modeLink;

    private ClientApp app;
    private GameClient gameClient;
    private boolean loginMode = true;

    public void setApp(ClientApp app, GameClient gameClient) {
        this.app = app;
        this.gameClient = gameClient;
        gameClient.setMessageHandler(message ->
                Platform.runLater(() -> handleServerMessage(message)));
        gameClient.setConnectionErrorHandler(error ->
                Platform.runLater(() -> {
                    showConnectionError(error);
                    setConnectionControlsDisabled(false);
                    connectButton.setText("KẾT NỐI");
                    setSubmitDisabled(true);
                }));
        serverHostField.setText(ClientConfig.serverHost());
        serverPortField.setText(Integer.toString(ClientConfig.serverPort()));
        showConnectionStatus("Chưa kết nối tới server", null);
        showStatus("Hãy kết nối server trước khi đăng nhập");
        setSubmitDisabled(true);
    }
    
    @FXML
    private void onConnect() {
        String host = serverHostField.getText().trim();
        int port;
        if (host.isEmpty()) {
            showConnectionError("Địa chỉ server không được để trống");
            serverHostField.requestFocus();
            return;
        }
        try {
            port = Integer.parseInt(serverPortField.getText().trim());
            if (port < 1 || port > 65_535) {
                throw new NumberFormatException();
            }
        } catch (NumberFormatException e) {
            showConnectionError("Cổng phải là số từ 1 đến 65535");
            serverPortField.requestFocus();
            return;
        }

        showConnectionStatus("Đang kết nối tới " + host + ":" + port + "...", null);
        setConnectionControlsDisabled(true);
        setSubmitDisabled(true);
        Thread connector = new Thread(() -> {
            try {
                if (gameClient.isConnected()) {
                    gameClient.disconnect();
                }
                gameClient.connect(host, port);
                Platform.runLater(() -> {
                    showConnectionSuccess("Đã kết nối tới " + host + ":" + port);
                    showStatus("Bạn có thể đăng nhập hoặc đăng ký");
                    setConnectionControlsDisabled(false);
                    connectButton.setText("KẾT NỐI LẠI");
                    setSubmitDisabled(false);
                });
            } catch (IOException | RuntimeException e) {
                Platform.runLater(() -> {
                    showConnectionError("Không thể kết nối tới " + host + ":" + port);
                    setConnectionControlsDisabled(false);
                    connectButton.setText("KẾT NỐI");
                });
            }
        }, "server-connector");
        connector.setDaemon(true); //Đảm bảo thread kết nối server sẽ tự động kết thúc khi chương trình kết thúc
        connector.start();
    }

    @FXML
    private void onSubmit() {
        if (!gameClient.isConnected()) {
            showError("Hãy kết nối tới server trước");
            return;
        }
        if (!validateInput()) {
            return;
        }
        String username = usernameField.getText().trim();
        String password = passwordField.getText();
        setWaiting(loginMode ? "Đang đăng nhập..." : "Đang tạo tài khoản...");
        if (loginMode) {
            gameClient.login(username, password);
        } else {
            gameClient.register(username, password);
        }
    }

    @FXML
    private void onToggleMode() {
        setMode(!loginMode);
        passwordField.clear();
        confirmPasswordField.clear();
        showStatus(gameClient.isConnected()
                ? "Bạn có thể đăng nhập hoặc đăng ký"
                : "Hãy kết nối server trước khi đăng nhập");
    }

    private boolean validateInput() {
        String username = usernameField.getText().trim();
        String password = passwordField.getText();
        if (!username.matches("[a-zA-Z0-9_]{3,20}")) {
            showError("Username gồm 3-20 chữ, số hoặc dấu gạch dưới");
            return false;
        }
        if (password.length() < 4) {
            showError("Mật khẩu phải có ít nhất 4 ký tự");
            return false;
        }
        if (!loginMode && !password.equals(confirmPasswordField.getText())) {
            showError("Mật khẩu xác nhận không khớp");
            return false;
        }
        return true;
    }

    private void handleServerMessage(Message message) {
        switch (message.getType()) {
            case LOGIN_OK -> app.showMatchmaking(parsePlayer(message.getPayload()));
            case REGISTER_OK -> {
                setMode(true);
                passwordField.clear();
                confirmPasswordField.clear();
                showSuccess("Đăng ký thành công. Hãy đăng nhập tài khoản mới.");
                setSubmitDisabled(false);
            }
            case LOGIN_FAIL, REGISTER_FAIL -> {
                showError(toVietnameseError(message.payloadText()));
                setSubmitDisabled(false);
            }
            case QUIZ_REJOINED -> {
                Payloads.QuizRejoinData rejoin = Payloads.fromJson(
                        message.getPayload(), Payloads.QuizRejoinData.class);
                if (rejoin.running()) {
                    app.showQuizBattle(new Payloads.QuizRoomStarted(
                            rejoin.lobby().pin(), rejoin.lobby().title(),
                            rejoin.remainingSeconds(), rejoin.playing(),
                            rejoin.lobby().currentUserHost(), rejoin.proctoringEnabled()));
                } else {
                    app.showQuizLobby(rejoin.lobby());
                }
            }
            case QUIZ_QUESTION, QUIZ_LEADERBOARD, QUIZ_ROOM_FINISHED ->
                    gameClient.redispatch(message);
            default -> {
                // Auth screen không xử lý message gameplay.
            }
        }
    }

    private Player parsePlayer(JsonNode payload) {
        Payloads.PlayerStats values = Payloads.parsePlayer(payload);
        return new Player(
                values.id(), values.username(), values.wins(), values.losses(),
                values.draws(), values.totalScore(),
                values.questionsAnswered(), values.correctAnswers()
        );
    }

    private String toVietnameseError(String reason) {
        return switch (reason) {
            case "USERNAME_TAKEN" -> "Username đã được sử dụng";
            case "INVALID_CREDENTIALS" -> "Sai username hoặc mật khẩu";
            case "BAD_REQUEST" -> "Thông tin đăng nhập không hợp lệ";
            case "DATABASE_ERROR" -> "Server không thể truy cập database";
            default -> "Đăng nhập/đăng ký thất bại";
        };
    }

    private void setWaiting(String message) {
        showStatus(message);
        setSubmitDisabled(true);
    }

    private void setMode(boolean loginMode) {
        this.loginMode = loginMode;
        authTitle.setText(loginMode ? "ĐĂNG NHẬP" : "TẠO TÀI KHOẢN");
        authSubtitle.setText(loginMode
                ? "Chào mừng bạn quay lại"
                : "Đăng ký tài khoản NihongoQuest mới");
        submitButton.setText(loginMode ? "ĐĂNG NHẬP" : "ĐĂNG KÝ");
        modePromptLabel.setText(loginMode ? "Chưa có tài khoản?" : "Đã có tài khoản?");
        modeLink.setText(loginMode ? "Đăng ký" : "Đăng nhập");
        confirmPasswordField.setVisible(!loginMode);
        confirmPasswordField.setManaged(!loginMode);
    }

    private void setSubmitDisabled(boolean disabled) {
        submitButton.setDisable(disabled);
    }

    private void setConnectionControlsDisabled(boolean disabled) {
        serverHostField.setDisable(disabled);
        serverPortField.setDisable(disabled);
        connectButton.setDisable(disabled);
    }

    private void showConnectionSuccess(String message) {
        showConnectionStatus(message, "status-success");
    }

    private void showConnectionError(String message) {
        showConnectionStatus(message, "status-error");
    }

    private void showConnectionStatus(String message, String styleClass) {
        connectionStatusLabel.setText(message);
        connectionStatusLabel.getStyleClass().removeAll("status-success", "status-error");
        if (styleClass != null) {
            connectionStatusLabel.getStyleClass().add(styleClass);
        }
    }

    private void showStatus(String message) {
        setStatus(message, null);
    }

    private void showSuccess(String message) {
        setStatus(message, "status-success");
    }

    private void showError(String message) {
        setStatus(message, "status-error");
    }

    private void setStatus(String message, String styleClass) {
        statusLabel.setText(message);
        statusLabel.getStyleClass().removeAll("status-success", "status-error");
        if (styleClass != null) {
            statusLabel.getStyleClass().add(styleClass);
        }
    }
}
