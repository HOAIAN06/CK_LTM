package com.nihongoquest.client.quiz;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import javafx.application.Platform;
import javafx.collections.FXCollections;
import javafx.fxml.FXML;
import javafx.scene.control.Alert;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.ListCell;
import javafx.scene.control.ListView;

/** Danh sách bộ đề cá nhân và bộ đề đã xuất bản. */
public class QuizSetListController {
    @FXML private ListView<Payloads.QuizSetSummary> quizSetList;
    @FXML private Label statusLabel;
    @FXML private Button viewButton;
    @FXML private Button editButton;
    @FXML private Button publishButton;
    @FXML private Button deleteButton;

    private ClientApp app;
    private GameClient gameClient;
    private String scope = "OWN";
    private boolean pendingEditable;

    @FXML
    private void initialize() {
        quizSetList.setCellFactory(ignored -> new ListCell<>() {
            @Override
            protected void updateItem(Payloads.QuizSetSummary item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || item == null) {
                    setText(null);
                } else {
                    String state = item.published() ? "Đã xuất bản" : "Bản nháp";
                    setText(item.title() + "  •  " + item.level() + "  •  "
                            + item.questionCount() + " câu  •  " + state
                            + "\nTác giả: " + item.ownerUsername());
                }
            }
        });
        quizSetList.getSelectionModel().selectedItemProperty()
                .addListener((ignored, oldValue, selected) -> updateButtons(selected));
        updateButtons(null);
    }

    public void setSession(ClientApp app, GameClient gameClient) {
        this.app = app;
        this.gameClient = gameClient;
        gameClient.setMessageHandler(message -> Platform.runLater(() -> handleMessage(message)));
        gameClient.setConnectionErrorHandler(error -> Platform.runLater(() -> showError(error)));
        load("OWN");
    }

    @FXML
    private void onOwned() {
        load("OWN");
    }

    @FXML
    private void onPublished() {
        load("PUBLISHED");
    }

    @FXML
    private void onCreate() {
        app.showQuizSetEditor(new Payloads.QuizSetEdit(
                null, "", "", "N5", java.util.List.of()), true);
    }

    @FXML
    private void onView() {
        requestSelected(false);
    }

    @FXML
    private void onEdit() {
        requestSelected(true);
    }

    private void requestSelected(boolean editable) {
        Payloads.QuizSetSummary selected = quizSetList.getSelectionModel().getSelectedItem();
        if (selected == null || (editable && !selected.ownedByMe())) return;
        pendingEditable = editable;
        statusLabel.setText("Đang tải bộ đề...");
        gameClient.getQuizSet(selected.id());
    }

    @FXML
    private void onPublish() {
        Payloads.QuizSetSummary selected = ownedSelection();
        if (selected == null) return;
        statusLabel.setText(selected.published() ? "Đang chuyển về bản nháp..." : "Đang xuất bản...");
        gameClient.publishQuizSet(selected.id(), !selected.published());
    }

    @FXML
    private void onDelete() {
        Payloads.QuizSetSummary selected = ownedSelection();
        if (selected == null) return;
        Alert confirmation = new Alert(Alert.AlertType.CONFIRMATION,
                "Xóa bộ đề ‘" + selected.title() + "’? Câu hỏi và lựa chọn cũng sẽ bị xóa.");
        confirmation.setHeaderText("Xác nhận xóa bộ đề");
        confirmation.showAndWait().ifPresent(button -> {
            if (button == javafx.scene.control.ButtonType.OK) {
                statusLabel.setText("Đang xóa...");
                gameClient.deleteQuizSet(selected.id());
            }
        });
    }

    private void load(String requestedScope) {
        scope = requestedScope;
        statusLabel.setText("Đang tải danh sách...");
        gameClient.listQuizSets(scope);
    }

    private void handleMessage(Message message) {
        if (message.getType() == MessageType.QUIZ_SET_LIST_RESULT) {
            Payloads.QuizSetListData data = Payloads.fromJson(
                    message.getPayload(), Payloads.QuizSetListData.class);
            quizSetList.setItems(FXCollections.observableArrayList(data.items()));
            statusLabel.setText(data.items().isEmpty()
                    ? "Chưa có bộ đề nào trong danh sách này."
                    : "Có " + data.items().size() + " bộ đề.");
        } else if (message.getType() == MessageType.QUIZ_SET_DETAIL) {
            Payloads.QuizSetEdit data = Payloads.fromJson(
                    message.getPayload(), Payloads.QuizSetEdit.class);
            app.showQuizSetEditor(data, pendingEditable);
        } else if (message.getType() == MessageType.QUIZ_SET_PUBLISHED
                || message.getType() == MessageType.QUIZ_SET_DELETED) {
            load(scope);
        } else if (message.getType() == MessageType.QUIZ_SET_ERROR) {
            showError(errorText(message.payloadText()));
        }
    }

    private Payloads.QuizSetSummary ownedSelection() {
        Payloads.QuizSetSummary selected = quizSetList.getSelectionModel().getSelectedItem();
        return selected != null && selected.ownedByMe() ? selected : null;
    }

    private void updateButtons(Payloads.QuizSetSummary selected) {
        boolean none = selected == null;
        boolean owned = !none && selected.ownedByMe();
        viewButton.setDisable(none);
        editButton.setDisable(!owned);
        publishButton.setDisable(!owned);
        deleteButton.setDisable(!owned);
        publishButton.setText(owned && selected.published() ? "Bỏ xuất bản" : "Xuất bản");
    }

    private void showError(String text) {
        statusLabel.setText(text);
        statusLabel.getStyleClass().remove("status-success");
        if (!statusLabel.getStyleClass().contains("status-error")) {
            statusLabel.getStyleClass().add("status-error");
        }
    }

    static String errorText(String code) {
        return switch (code) {
            case "INVALID_QUIZ" -> "Muốn xuất bản cần tên, cấp độ và ít nhất 3 câu hợp lệ.";
            case "NOT_OWNER" -> "Bạn không có quyền thay đổi bộ đề này.";
            case "NOT_FOUND" -> "Bộ đề không còn tồn tại.";
            case "NOT_AUTHENTICATED" -> "Phiên đăng nhập không hợp lệ.";
            case "DATABASE_ERROR" -> "Không thể truy cập cơ sở dữ liệu.";
            case "BAD_REQUEST" -> "Dữ liệu gửi lên không hợp lệ.";
            default -> code == null || code.isBlank() ? "Có lỗi xảy ra." : code;
        };
    }
}
