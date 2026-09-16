package com.nihongoquest.client.controller;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.model.Player;
import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.common.Message;
import com.nihongoquest.common.Protocol;
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
                    showError(error);
                    setSubmitDisabled(true);
                }));
        connectToServer();
    }

    private void connectToServer() {
        showStatus("Đang kết nối tới server...");
        setSubmitDisabled(true);
        Thread connector = new Thread(() -> {
            try {
                gameClient.connect("localhost", Protocol.DEFAULT_PORT);
                Platform.runLater(() -> {
                    showSuccess("Đã kết nối tới server");
                    setSubmitDisabled(false);
                });
            } catch (IOException e) {
                Platform.runLater(() -> showError(
                        "Không thể kết nối server tại cổng " + Protocol.DEFAULT_PORT));
            }
        }, "server-connector");
        connector.setDaemon(true);
        connector.start();
    }

    @FXML
    private void onSubmit() {
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
        showStatus(gameClient.isConnected() ? "Đã kết nối tới server" : "Chưa kết nối tới server");
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
            case LOGIN_OK -> app.showHome(parsePlayer(message.getPayload()));
            case REGISTER_OK -> {
                setMode(true);
                passwordField.clear();
                confirmPasswordField.clear();
                showSuccess("Đăng ký thành công. Hãy đăng nhập tài khoản mới.");
                setSubmitDisabled(false);
            }
            case LOGIN_FAIL, REGISTER_FAIL -> {
                showError(toVietnameseError(message.getPayload()));
                setSubmitDisabled(false);
            }
            default -> {
                // Auth screen không xử lý message gameplay.
            }
        }
    }

    private Player parsePlayer(String payload) {
        String[] values = payload.split("\\|");
        if (values.length != 6) {
            throw new IllegalArgumentException("Dữ liệu người chơi không hợp lệ");
        }
        return new Player(
                Long.parseLong(values[0]),
                values[1],
                Integer.parseInt(values[2]),
                Integer.parseInt(values[3]),
                Integer.parseInt(values[4]),
                Integer.parseInt(values[5])
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
