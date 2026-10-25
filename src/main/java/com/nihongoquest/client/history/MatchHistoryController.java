package com.nihongoquest.client.history;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import javafx.application.Platform;
import javafx.beans.property.SimpleStringProperty;
import javafx.fxml.FXML;
import javafx.scene.control.Label;
import javafx.scene.control.TableColumn;
import javafx.scene.control.TableView;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/** Hiển thị tối đa 100 trận Ranked mới nhất của tài khoản hiện tại. */
public class MatchHistoryController {
    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(ZoneId.systemDefault());

    @FXML private TableView<Payloads.MatchHistoryEntry> historyTable;
    @FXML private TableColumn<Payloads.MatchHistoryEntry, String> timeColumn;
    @FXML private TableColumn<Payloads.MatchHistoryEntry, String> opponentColumn;
    @FXML private TableColumn<Payloads.MatchHistoryEntry, String> scoreColumn;
    @FXML private TableColumn<Payloads.MatchHistoryEntry, String> resultColumn;
    @FXML private TableColumn<Payloads.MatchHistoryEntry, String> modeColumn;
    @FXML private TableColumn<Payloads.MatchHistoryEntry, String> reasonColumn;
    @FXML private Label statusLabel;

    private GameClient gameClient;

    @FXML
    private void initialize() {
        timeColumn.setCellValueFactory(row -> new SimpleStringProperty(formatTime(row.getValue().playedAt())));
        opponentColumn.setCellValueFactory(row -> new SimpleStringProperty(row.getValue().opponentUsername()));
        scoreColumn.setCellValueFactory(row -> new SimpleStringProperty(
                row.getValue().myScore() + " - " + row.getValue().opponentScore()));
        resultColumn.setCellValueFactory(row -> new SimpleStringProperty(resultText(row.getValue().result())));
        modeColumn.setCellValueFactory(row -> new SimpleStringProperty(
                row.getValue().durationSeconds() == 180 ? "3 phút" : "5 phút"));
        reasonColumn.setCellValueFactory(row -> new SimpleStringProperty(
                "DISCONNECT".equals(row.getValue().endReason()) ? "Mất kết nối" : "Bình thường"));
        historyTable.setColumnResizePolicy(
                TableView.CONSTRAINED_RESIZE_POLICY_FLEX_LAST_COLUMN);
        historyTable.setPlaceholder(new Label("Bạn chưa có trận Ranked nào"));
    }

    public void setSession(ClientApp app, GameClient gameClient) {
        this.gameClient = gameClient;
        gameClient.setMessageHandler(message ->
                Platform.runLater(() -> handleServerMessage(message)));
        statusLabel.setText("Đang tải lịch sử...");
        gameClient.getMatchHistory();
    }

    @FXML
    private void onRefresh() {
        statusLabel.setText("Đang làm mới...");
        gameClient.getMatchHistory();
    }

    private void handleServerMessage(Message message) {
        if (message.getType() == MessageType.MATCH_HISTORY_DATA) {
            Payloads.MatchHistoryData data = Payloads.fromJson(
                    message.getPayload(), Payloads.MatchHistoryData.class);
            historyTable.getItems().setAll(data.matches());
            statusLabel.setText("Hiển thị " + data.matches().size() + " trận Ranked gần nhất");
        } else if (message.getType() == MessageType.QUERY_ERROR) {
            statusLabel.setText("Không thể tải lịch sử: " + message.payloadText());
        }
    }

    static String formatTime(String value) {
        try {
            return DATE_FORMAT.format(Instant.parse(value));
        } catch (RuntimeException e) {
            return value;
        }
    }

    static String resultText(String result) {
        return switch (result) {
            case "WIN" -> "Thắng";
            case "LOSS" -> "Thua";
            default -> "Hòa";
        };
    }
}
