package com.nihongoquest.client.quiz;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.client.proctor.EvidenceRecorder;
import com.nihongoquest.client.proctor.EvidenceViewer;
import com.nihongoquest.client.proctor.ProctorMediaSubscriber;
import com.nihongoquest.client.proctor.VideoCanvas;
import com.nihongoquest.common.media.MediaProtocol;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.Payloads;
import javafx.animation.KeyFrame;
import javafx.animation.Timeline;
import javafx.application.Platform;
import javafx.collections.FXCollections;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.ComboBox;
import javafx.scene.control.Label;
import javafx.scene.control.ListCell;
import javafx.scene.control.ListView;
import javafx.scene.control.TextField;
import javafx.scene.image.Image;
import javafx.scene.input.KeyCode;
import javafx.scene.input.KeyEvent;
import javafx.event.EventHandler;
import javafx.stage.DirectoryChooser;
import javafx.scene.layout.TilePane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.VBox;
import javafx.util.Duration;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Path;
import java.time.ZoneId;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ConcurrentHashMap;

/** Host dashboard keeps decoding off FX and each Canvas paints the newest frame at display rate. */
public final class ProctorDashboardController {
    @FXML private Label titleLabel, timeLabel, onlineLabel, warningsLabel, errorLabel;
    @FXML private ComboBox<String> filterBox;
    @FXML private TextField searchField;
    @FXML private Button finishButton;
    @FXML private TilePane cameraGrid;
    @FXML private ListView<Payloads.ProctorEventData> eventList;
    private final ProctorMediaSubscriber subscriber = new ProctorMediaSubscriber();
    private final EvidenceViewer evidenceViewer = new EvidenceViewer(
            error -> Platform.runLater(() -> showError(error)));
    private final Map<Long, MediaProtocol.RelayedFrame> latest = new ConcurrentHashMap<>();
    private final Map<Long, Tile> tiles = new HashMap<>();
    private volatile EvidenceRecorder evidence;
    private final List<EvidenceRecorder> previousEvidence = new CopyOnWriteArrayList<>();
    private Timeline refresh;
    private ClientApp app;
    private GameClient client;
    private Payloads.QuizRoomStarted room;
    private long endAt;
    private long expanded = -1;
    private boolean monitoringStopped;
    private final EventHandler<KeyEvent> escapeHandler = event -> {
        if (event.getCode() == KeyCode.ESCAPE && expanded >= 0) {
            expanded = -1; renderTiles(); event.consume();
        }
    };

    @FXML private void initialize() {
        eventList.setCellFactory(ignored -> new ListCell<>() {
            @Override protected void updateItem(Payloads.ProctorEventData event, boolean empty) {
                super.updateItem(event, empty);
                if (empty || event == null) { setGraphic(null); return; }
                Label label = new Label(LocalDateTime.ofInstant(
                        Instant.ofEpochMilli(event.serverReceivedAtEpochMillis()),
                        ZoneId.systemDefault()).toLocalTime().withNano(0)
                        + " • " + event.username() + " • " + event.type()
                        + " • " + Math.round(event.confidence() * 100) + "%");
                Button image = new Button("Xem ảnh");
                image.setOnAction(action -> evidenceViewer.showImage(
                        findEvidenceFile(event.eventId(), false), ownerWindow()));
                Button clip = new Button("Mở clip");
                clip.setOnAction(action -> evidenceViewer.showVideo(
                        findEvidenceFile(event.eventId(), true), ownerWindow()));
                setGraphic(new HBox(8, label, image, clip));
            }
        });
        filterBox.setItems(FXCollections.observableArrayList("Tất cả", "Đang cảnh báo",
                "Mất camera", "Từ chối camera"));
        filterBox.getSelectionModel().selectFirst();
        filterBox.valueProperty().addListener((obs, old, value) -> renderTiles());
        searchField.textProperty().addListener((obs, old, value) -> renderTiles());
    }

    public void setSession(ClientApp app, GameClient client, Payloads.QuizRoomStarted room) {
        this.app = app;
        this.client = client;
        this.room = room;
        endAt = System.currentTimeMillis() + room.durationSeconds() * 1000L;
        titleLabel.setText(room.title() + " • PIN " + room.pin());
        try { evidence = new EvidenceRecorder(room.pin(), EvidenceRecorder.defaultBase(),
                error -> Platform.runLater(() -> showError(error))); }
        catch (IOException error) { showError("Không thể tạo thư mục bằng chứng: " + error.getMessage()); }
        Payloads.QuizLobbyData lobby = app.getProctoringCoordinator().getLobby();
        if (lobby != null) updateLobby(lobby);
        app.getProctoringCoordinator().setMediaSessionListener(session -> {
            if (session.pin().equals(room.pin())) subscriber.connect(client.getServerHost(),
                    session, this::onFrame,
                    error -> Platform.runLater(() -> showError(error)));
        });
        app.getProctoringCoordinator().setStatusListener(update -> Platform.runLater(() -> updateStatus(update)));
        app.getProctoringCoordinator().setEventListener(event -> Platform.runLater(() -> updateEvent(event)));
        client.setMessageHandler(message -> Platform.runLater(() -> handleMessage(message)));
        client.setConnectionErrorHandler(error -> Platform.runLater(() -> showError(error)));
        refresh = new Timeline(new KeyFrame(Duration.millis(22), ignored -> paint()));
        refresh.setCycleCount(Timeline.INDEFINITE);
        refresh.play();
        Platform.runLater(() -> {
            if (cameraGrid.getScene() != null)
                cameraGrid.getScene().addEventFilter(KeyEvent.KEY_PRESSED, escapeHandler);
        });
    }

    private void updateLobby(Payloads.QuizLobbyData lobby) {
        for (Payloads.QuizLobbyPlayer player : lobby.members()) {
            if (!player.playing()) continue;
            Tile tile = tiles.computeIfAbsent(player.userId(), id -> new Tile(id, player.username()));
            tile.camera = player.cameraStatus();
            tile.count = player.warningCount();
        }
        renderTiles();
    }

    private void updateStatus(Payloads.ProctorStatusUpdate update) {
        Tile tile = tiles.computeIfAbsent(update.userId(), id -> new Tile(id, update.username()));
        tile.camera = update.cameraStatus();
        tile.count = update.warningCount();
        if (evidence != null && (update.cameraStatus() == Payloads.CameraStatus.LOST
                || update.cameraStatus() == Payloads.CameraStatus.FAILED
                || update.cameraStatus() == Payloads.CameraStatus.STOPPED))
            evidence.finishUser(update.userId());
        renderTiles();
    }

    private void updateEvent(Payloads.ProctorEventData event) {
        Tile tile = tiles.computeIfAbsent(event.userId(), id -> new Tile(id, event.username()));
        tile.count = event.warningCount();
        eventList.getItems().add(0, event);
        if (evidence != null) evidence.addEvent(event);
        renderTiles();
    }

    private void onFrame(MediaProtocol.RelayedFrame frame) {
        latest.put(frame.userId(), frame);
        EvidenceRecorder recorder = evidence;
        if (recorder != null) recorder.addFrame(frame);
    }

    private void paint() {
        timeLabel.setText("Còn " + Math.max(0, (endAt - System.currentTimeMillis() + 999) / 1000) + "s");
        for (Tile tile : tiles.values()) {
            MediaProtocol.RelayedFrame frame = latest.get(tile.id);
            if (frame == null || frame.sequence() == tile.sequence) continue;
            try {
                Image image = new Image(new ByteArrayInputStream(frame.jpeg()));
                tile.video.setFrame(image);
                tile.video.setVision(frame.vision());
                tile.sequence = frame.sequence();
                tile.recordFrame();
            } catch (RuntimeException ignored) { }
        }
    }

    private void renderTiles() {
        String filter = filterBox.getValue();
        String search = searchField.getText().toLowerCase();
        cameraGrid.getChildren().clear();
        cameraGrid.setPrefTileWidth(expanded < 0 ? 250 : 800);
        cameraGrid.setPrefTileHeight(expanded < 0 ? 220 : 620);
        int online = 0, warnings = 0;
        for (Tile tile : tiles.values()) {
            tile.video.setPrefSize(expanded == tile.id ? 780 : 230,
                    expanded == tile.id ? 585 : 172);
            tile.label.setText(tile.username + " • " + tile.camera + " • " + tile.count + " cảnh báo");
            tile.video.setHud(tile.username + " • " + tile.camera + " • "
                    + tile.sourceFps + " nguồn • " + tile.count + " cảnh báo");
            tile.box.setStyle("-fx-border-color: " + (tile.camera == Payloads.CameraStatus.READY
                    ? tile.count > 0 ? "#f9a825" : "#2e7d32" : "#c62828")
                    + "; -fx-border-width: 2; -fx-padding: 8;");
            if (tile.camera == Payloads.CameraStatus.READY
                    || tile.camera == Payloads.CameraStatus.BLOCKED) online++;
            warnings += tile.count;
            boolean visible = switch (filter == null ? "Tất cả" : filter) {
                case "Đang cảnh báo" -> tile.count > 0;
                case "Mất camera" -> tile.camera == Payloads.CameraStatus.LOST
                        || tile.camera == Payloads.CameraStatus.FAILED
                        || tile.camera == Payloads.CameraStatus.NOT_FOUND;
                case "Từ chối camera" -> tile.camera == Payloads.CameraStatus.DENIED;
                default -> true;
            };
            if (visible && tile.username.toLowerCase().contains(search)
                    && (expanded < 0 || expanded == tile.id)) cameraGrid.getChildren().add(tile.box);
        }
        onlineLabel.setText("Camera online: " + online);
        warningsLabel.setText("Tổng cảnh báo: " + warnings);
    }

    private void handleMessage(Message message) {
        switch (message.getType()) {
            case QUIZ_LOBBY_UPDATE -> updateLobby(Payloads.fromJson(message.getPayload(), Payloads.QuizLobbyData.class));
            case QUIZ_ROOM_FINISHED -> {
                stopMonitoring();
                finishButton.setText("Về trang chủ");
            }
            case QUIZ_ROOM_CANCEL -> { close(); app.showMatchmaking(); }
            case QUIZ_ERROR -> showError(message.payloadText());
            default -> { }
        }
    }

    private Path findEvidenceFile(String eventId, boolean clip) {
        EvidenceRecorder current = evidence;
        if (current != null) {
            Path found = clip ? current.clipFor(eventId) : current.imageFor(eventId);
            if (found != null) return found;
        }
        for (EvidenceRecorder prior : previousEvidence) {
            Path found = clip ? prior.clipFor(eventId) : prior.imageFor(eventId);
            if (found != null) return found;
        }
        return null;
    }

    private javafx.stage.Window ownerWindow() {
        return cameraGrid.getScene() == null ? null : cameraGrid.getScene().getWindow();
    }

    @FXML private void chooseEvidence() {
        DirectoryChooser chooser = new DirectoryChooser();
        chooser.setTitle("Chọn thư mục lưu bằng chứng");
        java.io.File selected = chooser.showDialog(cameraGrid.getScene().getWindow());
        if (selected == null) return;
        try {
            EvidenceRecorder replacement = new EvidenceRecorder(room.pin(), selected.toPath(),
                    error -> Platform.runLater(() -> showError(error)));
            EvidenceRecorder old = evidence;
            evidence = replacement;
            if (old != null) { old.close(); previousEvidence.add(old); }
            errorLabel.setVisible(false); errorLabel.setManaged(false);
        } catch (IOException error) { showError(error.getMessage()); }
    }

    @FXML private void openEvidence() {
        EvidenceRecorder current = evidence;
        if (current == null && !previousEvidence.isEmpty()) {
            current = previousEvidence.get(previousEvidence.size() - 1);
        }
        if (current != null) evidenceViewer.openDirectory(current.directory());
    }

    @FXML private void finishRoom() {
        if ("Về trang chủ".equals(finishButton.getText())) {
            close();
            app.showMatchmaking();
            return;
        }
        client.cancelQuizRoom();
        close();
        app.showMatchmaking();
    }

    private void showError(String error) {
        errorLabel.setText(error);
        errorLabel.setVisible(true);
        errorLabel.setManaged(true);
    }

    public void close() {
        stopMonitoring();
        evidenceViewer.close();
    }

    private void stopMonitoring() {
        if (monitoringStopped) return;
        monitoringStopped = true;
        if (refresh != null) refresh.stop();
        if (cameraGrid.getScene() != null)
            cameraGrid.getScene().removeEventFilter(KeyEvent.KEY_PRESSED, escapeHandler);
        subscriber.close();
        if (evidence != null) {
            evidence.close();
            previousEvidence.add(evidence);
            evidence = null;
        }
        app.getProctoringCoordinator().setMediaSessionListener(ignored -> { });
        app.getProctoringCoordinator().setStatusListener(ignored -> { });
        app.getProctoringCoordinator().setEventListener(ignored -> { });
        app.getProctoringCoordinator().stopRoom();
    }

    private final class Tile {
        final long id;
        final String username;
        final VBox box = new VBox(6);
        final Label label = new Label();
        final VideoCanvas video = new VideoCanvas(230, 172);
        Payloads.CameraStatus camera = Payloads.CameraStatus.INITIALIZING;
        int count;
        long sequence = -1;
        long fpsWindowMillis;
        int framesInWindow;
        int sourceFps;
        Tile(long id, String username) {
            this.id = id; this.username = username;
            box.getChildren().addAll(video, label);
            box.setOnMouseClicked(ignored -> { expanded = expanded == id ? -1 : id; renderTiles(); });
        }
        void recordFrame() {
            long now = System.currentTimeMillis();
            if (fpsWindowMillis == 0) fpsWindowMillis = now;
            framesInWindow++;
            if (now - fpsWindowMillis >= 1_000) {
                sourceFps = framesInWindow;
                framesInWindow = 0;
                fpsWindowMillis = now;
            }
        }
    }
}
