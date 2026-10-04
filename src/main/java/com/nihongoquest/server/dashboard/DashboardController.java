package com.nihongoquest.server.dashboard;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.nihongoquest.common.protocol.Protocol;
import com.nihongoquest.server.network.ClientHandler;
import com.nihongoquest.server.GameServer;
import com.nihongoquest.server.GameServer.ClientSnapshot;
import com.nihongoquest.server.network.TrafficEvent;
import javafx.animation.KeyFrame;
import javafx.animation.Timeline;
import javafx.application.Platform;
import javafx.beans.property.ReadOnlyStringWrapper;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.ListView;
import javafx.scene.control.TableColumn;
import javafx.scene.control.TableView;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.input.Clipboard;
import javafx.scene.input.ClipboardContent;
import javafx.util.Duration;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayDeque;
import java.util.Deque;

/** Đồng bộ trạng thái GameServer lên dashboard JavaFX. */
public class DashboardController {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final DateTimeFormatter TIME_FORMAT =
            DateTimeFormatter.ofPattern("HH:mm:ss").withZone(ZoneId.systemDefault());
    private static final int MAX_LOG_LINES = 300;
    private static final int MAX_TRAFFIC_ENTRIES = 300;

    @FXML private Label serverStatusLabel;
    @FXML private Label connectionCountLabel;
    @FXML private Label authenticatedCountLabel;
    @FXML private Label waitingCountLabel;
    @FXML private Label roomCountLabel;
    @FXML private TextField serverIpField;
    @FXML private TextField portField;
    @FXML private Button copyIpButton;
    @FXML private Button startButton;
    @FXML private Button stopButton;
    @FXML private Button disconnectButton;
    @FXML private TableView<ClientSnapshot> clientTable;
    @FXML private TableColumn<ClientSnapshot, String> usernameColumn;
    @FXML private TableColumn<ClientSnapshot, String> addressColumn;
    @FXML private TableColumn<ClientSnapshot, String> statusColumn;
    @FXML private TableColumn<ClientSnapshot, String> connectedAtColumn;
    @FXML private TableColumn<ClientSnapshot, String> lastActivityColumn;
    @FXML private ListView<String> activityList;
    @FXML private TextArea receivedJsonArea;
    @FXML private TextArea sentJsonArea;

    private final GameServer server = new GameServer();
    private final ObservableList<String> activities = FXCollections.observableArrayList();
    private final Deque<String> receivedTraffic = new ArrayDeque<>();
    private final Deque<String> sentTraffic = new ArrayDeque<>();
    private Timeline refreshTimer;
    private Thread serverThread;

    @FXML
    private void initialize() {
        String serverIp = ServerAddressResolver.resolveIpv4();
        serverIpField.setText(serverIp);
        copyIpButton.setDisable("Không xác định".equals(serverIp));
        portField.setText(Integer.toString(Protocol.DEFAULT_PORT));
        activityList.setItems(activities);

        usernameColumn.setCellValueFactory(data ->
                new ReadOnlyStringWrapper(data.getValue().username()));
        addressColumn.setCellValueFactory(data ->
                new ReadOnlyStringWrapper(data.getValue().address()));
        statusColumn.setCellValueFactory(data ->
                new ReadOnlyStringWrapper(data.getValue().status()));
        connectedAtColumn.setCellValueFactory(data ->
                new ReadOnlyStringWrapper(TIME_FORMAT.format(data.getValue().connectedAt())));
        lastActivityColumn.setCellValueFactory(data ->
                new ReadOnlyStringWrapper(TIME_FORMAT.format(data.getValue().lastActivity())));

        clientTable.getSelectionModel().selectedItemProperty().addListener(
                (observable, oldValue, newValue) ->
                        disconnectButton.setDisable(newValue == null));
        server.addActivityListener(message -> Platform.runLater(() -> addActivity(message)));
        server.addTrafficListener(event -> Platform.runLater(() -> addTraffic(event)));

        refreshTimer = new Timeline(new KeyFrame(Duration.seconds(1), event -> refresh()));
        refreshTimer.setCycleCount(Timeline.INDEFINITE);
        refreshTimer.play();
        refresh();
        addActivity("Dashboard sẵn sàng. Nhấn “Khởi động” để mở server.");
    }

    @FXML
    private void startServer() {
        int port;
        try {
            port = Integer.parseInt(portField.getText().trim());
            if (port < 1 || port > 65_535) {
                throw new NumberFormatException();
            }
        } catch (NumberFormatException e) {
            addActivity("Cổng không hợp lệ. Hãy nhập số từ 1 đến 65535.");
            portField.requestFocus();
            return;
        }

        startButton.setDisable(true);
        portField.setDisable(true);
        serverStatusLabel.setText("ĐANG KHỞI ĐỘNG");
        serverStatusLabel.getStyleClass().setAll("server-status", "status-starting");

        serverThread = new Thread(() -> {
            try {
                server.start(port);
            } catch (RuntimeException e) {
                Platform.runLater(() -> addActivity("Không thể khởi động server: "
                        + rootMessage(e)));
            } finally {
                Platform.runLater(() -> {
                    refresh();
                    startButton.setDisable(false);
                    portField.setDisable(false);
                });
            }
        }, "game-server-main");
        serverThread.setDaemon(true);
        serverThread.start();
    }

    @FXML
    private void stopServer() {
        stopButton.setDisable(true);
        server.stop();
        refresh();
    }

    @FXML
    private void copyServerIp() {
        ClipboardContent content = new ClipboardContent();
        content.putString(serverIpField.getText());
        Clipboard.getSystemClipboard().setContent(content);
        addActivity("Đã sao chép IP máy chủ: " + serverIpField.getText());
    }

    @FXML
    private void disconnectSelectedClient() {
        ClientSnapshot selected = clientTable.getSelectionModel().getSelectedItem();
        if (selected != null) {
            server.disconnectClient(selected.handler());
            refresh();
        }
    }

    @FXML
    private void clearActivity() {
        activities.clear();
    }

    @FXML
    private void clearTraffic() {
        receivedTraffic.clear();
        sentTraffic.clear();
        receivedJsonArea.clear();
        sentJsonArea.clear();
    }

    private void refresh() {
        ClientHandler selected = clientTable.getSelectionModel().getSelectedItem() == null
                ? null : clientTable.getSelectionModel().getSelectedItem().handler();
        clientTable.getItems().setAll(server.getClientSnapshots());
        if (selected != null) {
            clientTable.getItems().stream()
                    .filter(item -> item.handler() == selected)
                    .findFirst()
                    .ifPresent(item -> clientTable.getSelectionModel().select(item));
        }

        int connections = clientTable.getItems().size();
        connectionCountLabel.setText(Integer.toString(connections));
        authenticatedCountLabel.setText(Integer.toString(server.getAuthenticatedCount()));
        waitingCountLabel.setText(Integer.toString(
                server.getMatchmakingManager().getWaitingCount()));
        roomCountLabel.setText(Integer.toString(server.getActiveRoomCount()));

        boolean running = server.isRunning();
        serverStatusLabel.setText(running ? "ĐANG CHẠY" : "ĐÃ DỪNG");
        serverStatusLabel.getStyleClass().setAll(
                "server-status", running ? "status-running" : "status-stopped");
        startButton.setDisable(running || (serverThread != null && serverThread.isAlive()));
        stopButton.setDisable(!running);
        portField.setDisable(running);
        disconnectButton.setDisable(clientTable.getSelectionModel().getSelectedItem() == null);
    }

    private void addActivity(String message) {
        activities.add(TIME_FORMAT.format(java.time.Instant.now()) + "  " + message);
        while (activities.size() > MAX_LOG_LINES) {
            activities.remove(0);
        }
        activityList.scrollTo(activities.size() - 1);
    }

    private void addTraffic(TrafficEvent event) {
        Deque<String> entries = event.direction() == TrafficEvent.Direction.RECEIVED
                ? receivedTraffic : sentTraffic;
        TextArea area = event.direction() == TrafficEvent.Direction.RECEIVED
                ? receivedJsonArea : sentJsonArea;

        entries.addLast(formatTraffic(event));
        while (entries.size() > MAX_TRAFFIC_ENTRIES) {
            entries.removeFirst();
        }
        area.setText(String.join(System.lineSeparator() + System.lineSeparator(), entries));
        area.positionCaret(area.getLength());
    }

    static String formatTraffic(TrafficEvent event) {
        ObjectNode entry = MAPPER.createObjectNode();
        entry.put("time", TIME_FORMAT.format(event.timestamp()));
        entry.put("client", event.client());
        try {
            JsonNode message = MAPPER.readTree(event.json());
            entry.set("message", message);
        } catch (JsonProcessingException e) {
            entry.put("validJson", false);
            entry.put("raw", event.json());
        }
        try {
            return MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(entry);
        } catch (JsonProcessingException e) {
            return event.json();
        }
    }

    private String rootMessage(Throwable error) {
        Throwable current = error;
        while (current.getCause() != null) {
            current = current.getCause();
        }
        return current.getMessage() == null ? current.getClass().getSimpleName()
                : current.getMessage();
    }

    public void shutdown() {
        if (refreshTimer != null) {
            refreshTimer.stop();
        }
        server.stop();
    }
}
