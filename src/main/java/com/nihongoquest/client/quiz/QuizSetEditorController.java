package com.nihongoquest.client.quiz;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.layout.NavigationGuard;
import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import javafx.application.Platform;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.collections.ListChangeListener;
import javafx.fxml.FXML;
import javafx.scene.Node;
import javafx.scene.control.Button;
import javafx.scene.control.Alert;
import javafx.scene.control.ButtonType;
import javafx.scene.control.ComboBox;
import javafx.scene.control.Label;
import javafx.scene.control.ListCell;
import javafx.scene.control.ListView;
import javafx.scene.control.RadioButton;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.control.ToggleGroup;
import javafx.scene.layout.VBox;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** Form dễ học để sửa metadata và từng câu hỏi của một bộ đề. */
public class QuizSetEditorController implements NavigationGuard {
    @FXML private TextField titleField;
    @FXML private TextArea descriptionArea;
    @FXML private ComboBox<String> levelCombo;
    @FXML private ListView<Payloads.QuizQuestionEdit> questionList;
    @FXML private TextArea questionArea;
    @FXML private TextArea explanationArea;
    @FXML private TextField choice1Field;
    @FXML private TextField choice2Field;
    @FXML private TextField choice3Field;
    @FXML private TextField choice4Field;
    @FXML private RadioButton correct1;
    @FXML private RadioButton correct2;
    @FXML private RadioButton correct3;
    @FXML private RadioButton correct4;
    @FXML private VBox editorBox;
    @FXML private Button newQuestionButton;
    @FXML private Button applyQuestionButton;
    @FXML private Button removeQuestionButton;
    @FXML private Button saveButton;
    @FXML private Label statusLabel;

    private final ObservableList<Payloads.QuizQuestionEdit> questions =
            FXCollections.observableArrayList();
    private final ToggleGroup correctGroup = new ToggleGroup();
    private ClientApp app;
    private GameClient gameClient;
    private Long quizSetId;
    private boolean editable;
    private boolean dirty;
    private boolean dirtyTrackingReady;
    private boolean updatingForm;

    @FXML
    private void initialize() {
        levelCombo.setItems(FXCollections.observableArrayList("N5", "N4", "N3", "N2", "N1"));
        correct1.setToggleGroup(correctGroup);
        correct2.setToggleGroup(correctGroup);
        correct3.setToggleGroup(correctGroup);
        correct4.setToggleGroup(correctGroup);
        questionList.setItems(questions);
        questionList.setCellFactory(ignored -> new ListCell<>() {
            @Override
            protected void updateItem(Payloads.QuizQuestionEdit item, boolean empty) {
                super.updateItem(item, empty);
                setText(empty || item == null ? null
                        : (getIndex() + 1) + ". " + item.content());
            }
        });
        questionList.getSelectionModel().selectedItemProperty()
                .addListener((ignored, oldValue, selected) -> showQuestion(selected));
        titleField.textProperty().addListener((ignored, oldValue, value) -> markDirty());
        descriptionArea.textProperty().addListener((ignored, oldValue, value) -> markDirty());
        levelCombo.valueProperty().addListener((ignored, oldValue, value) -> markDirty());
        questionArea.textProperty().addListener((ignored, oldValue, value) -> markDirty());
        explanationArea.textProperty().addListener((ignored, oldValue, value) -> markDirty());
        List.of(choice1Field, choice2Field, choice3Field, choice4Field).forEach(field ->
                field.textProperty().addListener((ignored, oldValue, value) -> markDirty()));
        correctGroup.selectedToggleProperty()
                .addListener((ignored, oldValue, value) -> markDirty());
        questions.addListener((ListChangeListener<Payloads.QuizQuestionEdit>) change -> markDirty());
    }

    public void setSession(ClientApp app, GameClient gameClient,
                           Payloads.QuizSetEdit data, boolean editable) {
        this.app = app;
        this.gameClient = gameClient;
        this.editable = editable;
        this.quizSetId = data.id();
        titleField.setText(data.title());
        descriptionArea.setText(data.description());
        levelCombo.setValue(data.level());
        questions.setAll(data.questions() == null ? List.of() : data.questions());
        setEditable(editorBox, editable);
        newQuestionButton.setDisable(!editable);
        removeQuestionButton.setDisable(true);
        saveButton.setVisible(editable);
        saveButton.setManaged(editable);
        dirty = false;
        dirtyTrackingReady = true;
        gameClient.setMessageHandler(message -> Platform.runLater(() -> handleMessage(message)));
        gameClient.setConnectionErrorHandler(error -> Platform.runLater(() -> showError(error)));
    }

    private void setEditable(Node node, boolean enabled) {
        node.setDisable(!enabled);
    }

    @FXML
    private void onNewQuestion() {
        questionList.getSelectionModel().clearSelection();
        clearQuestionForm();
        questionArea.requestFocus();
    }

    @FXML
    private void onApplyQuestion() {
        try {
            Payloads.QuizQuestionEdit question = readQuestionForm();
            int selectedIndex = questionList.getSelectionModel().getSelectedIndex();
            if (selectedIndex >= 0) {
                Payloads.QuizQuestionEdit old = questions.get(selectedIndex);
                questions.set(selectedIndex, new Payloads.QuizQuestionEdit(
                        old.id(), question.content(), question.explanation(), question.choices()));
            } else {
                questions.add(question);
            }
            questionList.getSelectionModel().clearSelection();
            clearQuestionForm();
            statusLabel.setText("Đã cập nhật câu hỏi trong form. Hãy lưu bộ đề để gửi lên server.");
        } catch (IllegalArgumentException e) {
            showError(e.getMessage());
        }
    }

    @FXML
    private void onRemoveQuestion() {
        int index = questionList.getSelectionModel().getSelectedIndex();
        if (index >= 0) {
            questions.remove(index);
            clearQuestionForm();
            statusLabel.setText("Đã bỏ câu hỏi khỏi form.");
        }
    }

    @FXML
    private void onSave() {
        if (!editable) return;
        String title = titleField.getText() == null ? "" : titleField.getText().trim();
        if (title.isEmpty() || title.length() > 100 || levelCombo.getValue() == null) {
            showError("Tên bộ đề phải có từ 1–100 ký tự và cần chọn cấp độ JLPT.");
            return;
        }
        saveButton.setDisable(true);
        statusLabel.setText("Đang lưu bản nháp...");
        gameClient.saveQuizSet(new Payloads.QuizSetEdit(
                quizSetId, title, descriptionArea.getText(), levelCombo.getValue(),
                List.copyOf(questions)));
    }

    @FXML
    private void onCancel() {
        if (requestNavigationAway()) app.showQuizSets();
    }

    private Payloads.QuizQuestionEdit readQuestionForm() {
        String content = clean(questionArea.getText());
        List<TextField> fields = List.of(choice1Field, choice2Field, choice3Field, choice4Field);
        List<RadioButton> radios = List.of(correct1, correct2, correct3, correct4);
        if (content.isEmpty() || fields.stream().anyMatch(field -> clean(field.getText()).isEmpty())
                || correctGroup.getSelectedToggle() == null) {
            throw new IllegalArgumentException(
                    "Câu hỏi cần nội dung, đủ 4 lựa chọn và đúng 1 đáp án chính xác.");
        }
        List<Payloads.QuizChoiceEdit> choices = new ArrayList<>();
        for (int index = 0; index < fields.size(); index++) {
            choices.add(new Payloads.QuizChoiceEdit(null, clean(fields.get(index).getText()),
                    index + 1, radios.get(index).isSelected()));
        }
        return new Payloads.QuizQuestionEdit(
                null, content, clean(explanationArea.getText()), List.copyOf(choices));
    }

    private void showQuestion(Payloads.QuizQuestionEdit question) {
        removeQuestionButton.setDisable(!editable || question == null);
        if (question == null) return;
        updatingForm = true;
        try {
            questionArea.setText(question.content());
            explanationArea.setText(question.explanation());
            List<TextField> fields = List.of(choice1Field, choice2Field, choice3Field, choice4Field);
            List<RadioButton> radios = List.of(correct1, correct2, correct3, correct4);
            correctGroup.selectToggle(null);
            for (Payloads.QuizChoiceEdit choice : question.choices()) {
                int index = choice.position() - 1;
                if (index >= 0 && index < 4) {
                    fields.get(index).setText(choice.content());
                    if (choice.correct()) radios.get(index).setSelected(true);
                }
            }
            applyQuestionButton.setText("Cập nhật câu hỏi");
        } finally {
            updatingForm = false;
        }
    }

    private void clearQuestionForm() {
        updatingForm = true;
        try {
            questionArea.clear();
            explanationArea.clear();
            choice1Field.clear();
            choice2Field.clear();
            choice3Field.clear();
            choice4Field.clear();
            correctGroup.selectToggle(null);
            applyQuestionButton.setText("Thêm câu hỏi");
            removeQuestionButton.setDisable(true);
        } finally {
            updatingForm = false;
        }
    }

    private void handleMessage(Message message) {
        if (message.getType() == MessageType.QUIZ_SET_SAVED) {
            Payloads.QuizSetSaved saved = Payloads.fromJson(
                    message.getPayload(), Payloads.QuizSetSaved.class);
            quizSetId = saved.quizSetId();
            dirty = false;
            app.showQuizSets();
        } else if (message.getType() == MessageType.QUIZ_SET_ERROR) {
            saveButton.setDisable(false);
            showError(QuizSetListController.errorText(message.payloadText()));
        }
    }

    private void showError(String text) {
        statusLabel.setText(text);
        if (!statusLabel.getStyleClass().contains("status-error")) {
            statusLabel.getStyleClass().add("status-error");
        }
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private void markDirty() {
        if (editable && dirtyTrackingReady && !updatingForm) dirty = true;
    }

    @Override
    public boolean requestNavigationAway() {
        if (!dirty) return true;
        Alert alert = new Alert(Alert.AlertType.CONFIRMATION);
        alert.setTitle("Thay đổi chưa lưu");
        alert.setHeaderText("Bộ đề có thay đổi chưa được lưu");
        alert.setContentText("Nếu rời màn hình, các thay đổi hiện tại sẽ bị mất.");
        Optional<ButtonType> choice = alert.showAndWait();
        return choice.isPresent() && choice.get() == ButtonType.OK;
    }
}
