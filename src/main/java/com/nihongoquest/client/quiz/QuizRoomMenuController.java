package com.nihongoquest.client.quiz;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.Payloads;
import javafx.application.Platform;
import javafx.collections.FXCollections;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.CheckBox;
import javafx.scene.control.ComboBox;
import javafx.scene.control.Label;
import javafx.scene.control.ListCell;
import javafx.scene.control.Spinner;
import javafx.scene.control.SpinnerValueFactory;
import javafx.scene.control.TextField;

/** Màn hình chọn bộ đề để tạo phòng hoặc nhập PIN để tham gia. */
public class QuizRoomMenuController {
    @FXML private ComboBox<Payloads.QuizSetSummary> quizSetCombo;
    @FXML private Spinner<Integer> durationSpinner;
    @FXML private CheckBox hostPlaysCheck;
    @FXML private CheckBox proctoringCheck;
    @FXML private TextField pinField;
    @FXML private Label statusLabel;
    @FXML private Button createButton;
    @FXML private Button joinButton;

    private ClientApp app;
    private GameClient gameClient;

    @FXML
    private void initialize() {
        durationSpinner.setValueFactory(
                new SpinnerValueFactory.IntegerSpinnerValueFactory(1, 15, 3));
        quizSetCombo.setCellFactory(ignored -> summaryCell());
        quizSetCombo.setButtonCell(summaryCell());
        proctoringCheck.selectedProperty().addListener((ignored, oldValue, enabled) -> {
            if (enabled) hostPlaysCheck.setSelected(false);
            hostPlaysCheck.setDisable(enabled);
        });
    }

    public void setSession(ClientApp app, GameClient gameClient) {
        this.app = app;
        this.gameClient = gameClient;
        gameClient.setMessageHandler(message -> Platform.runLater(() -> handleMessage(message)));
        gameClient.setConnectionErrorHandler(error -> Platform.runLater(() -> showError(error)));
        statusLabel.setText("Đang tải bộ đề công khai...");
        gameClient.listQuizSets("PUBLISHED");
    }

    @FXML
    private void onCreate() {
        Payloads.QuizSetSummary selected = quizSetCombo.getValue();
        if (selected == null) {
            showError("Hãy chọn một bộ đề đã xuất bản.");
            return;
        }
        createButton.setDisable(true);
        statusLabel.setText("Đang tạo phòng...");
        gameClient.createQuizRoom(
                selected.id(), durationSpinner.getValue(), hostPlaysCheck.isSelected(),
                proctoringCheck.isSelected());
    }

    @FXML
    private void onJoin() {
        String pin = pinField.getText() == null ? "" : pinField.getText().trim();
        if (!pin.matches("\\d{6}")) {
            showError("PIN phải gồm đúng 6 chữ số.");
            return;
        }
        joinButton.setDisable(true);
        statusLabel.setText("Đang vào phòng " + pin + "...");
        gameClient.joinQuizRoom(pin);
    }

    private void handleMessage(Message message) {
        switch (message.getType()) {
            case QUIZ_SET_LIST_RESULT -> {
                Payloads.QuizSetListData data = Payloads.fromJson(
                        message.getPayload(), Payloads.QuizSetListData.class);
                quizSetCombo.setItems(FXCollections.observableArrayList(data.items()));
                if (!data.items().isEmpty()) quizSetCombo.getSelectionModel().selectFirst();
                statusLabel.setText(data.items().isEmpty()
                        ? "Chưa có bộ đề published để tạo phòng."
                        : "Sẵn sàng tạo hoặc vào phòng.");
            }
            case QUIZ_ROOM_CREATED -> {
                Payloads.QuizRoomCreated created = Payloads.fromJson(
                        message.getPayload(), Payloads.QuizRoomCreated.class);
                app.showQuizLobby(created.lobby());
            }
            case QUIZ_LOBBY_UPDATE -> app.showQuizLobby(Payloads.fromJson(
                    message.getPayload(), Payloads.QuizLobbyData.class));
            case QUIZ_ERROR -> {
                createButton.setDisable(false);
                joinButton.setDisable(false);
                showError(QuizRoomUi.errorText(message.payloadText()));
            }
            case QUIZ_SET_ERROR -> {
                createButton.setDisable(false);
                showError("Không thể tải danh sách bộ đề công khai.");
            }
            default -> { }
        }
    }

    private ListCell<Payloads.QuizSetSummary> summaryCell() {
        return new ListCell<>() {
            @Override
            protected void updateItem(Payloads.QuizSetSummary item, boolean empty) {
                super.updateItem(item, empty);
                setText(empty || item == null ? null
                        : item.title() + " • " + item.level() + " • "
                        + item.questionCount() + " câu");
            }
        };
    }

    private void showError(String text) {
        statusLabel.setText(text);
        statusLabel.getStyleClass().removeAll("status-success", "status-error");
        statusLabel.getStyleClass().add("status-error");
    }
}
