package com.nihongoquest.client.leaderboard;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import javafx.application.Platform;
import javafx.beans.property.ReadOnlyIntegerWrapper;
import javafx.beans.property.SimpleStringProperty;
import javafx.fxml.FXML;
import javafx.scene.control.Label;
import javafx.scene.control.TableColumn;
import javafx.scene.control.TableView;

/** Hiển thị Top 10 Ranked do server truy vấn từ Supabase. */
public class LeaderboardController {
    @FXML private TableView<Payloads.LeaderboardEntry> leaderboardTable;
    @FXML private TableColumn<Payloads.LeaderboardEntry, Number> rankColumn;
    @FXML private TableColumn<Payloads.LeaderboardEntry, String> usernameColumn;
    @FXML private TableColumn<Payloads.LeaderboardEntry, Number> winsColumn;
    @FXML private TableColumn<Payloads.LeaderboardEntry, Number> drawsColumn;
    @FXML private TableColumn<Payloads.LeaderboardEntry, Number> scoreColumn;
    @FXML private Label statusLabel;

    private ClientApp app;
    private GameClient gameClient;

    @FXML
    private void initialize() {
        rankColumn.setCellValueFactory(row -> new ReadOnlyIntegerWrapper(row.getValue().rank()));
        usernameColumn.setCellValueFactory(row -> new SimpleStringProperty(row.getValue().username()));
        winsColumn.setCellValueFactory(row -> new ReadOnlyIntegerWrapper(row.getValue().wins()));
        drawsColumn.setCellValueFactory(row -> new ReadOnlyIntegerWrapper(row.getValue().draws()));
        scoreColumn.setCellValueFactory(row -> new ReadOnlyIntegerWrapper(row.getValue().totalScore()));
        leaderboardTable.setPlaceholder(new Label("Chưa có dữ liệu xếp hạng"));
    }

    public void setSession(ClientApp app, GameClient gameClient) {
        this.app = app;
        this.gameClient = gameClient;
        gameClient.setMessageHandler(message ->
                Platform.runLater(() -> handleServerMessage(message)));
        statusLabel.setText("Đang tải Top 10...");
        gameClient.getLeaderboard();
    }

    @FXML
    private void onRefresh() {
        statusLabel.setText("Đang làm mới...");
        gameClient.getLeaderboard();
    }

    @FXML
    private void onBack() {
        app.showHome();
    }

    private void handleServerMessage(Message message) {
        if (message.getType() == MessageType.LEADERBOARD_DATA) {
            Payloads.LeaderboardData data = Payloads.fromJson(
                    message.getPayload(), Payloads.LeaderboardData.class);
            leaderboardTable.getItems().setAll(data.players());
            statusLabel.setText("Top " + data.players().size()
                    + " người chơi theo số trận thắng và tổng điểm Ranked");
        } else if (message.getType() == MessageType.QUERY_ERROR) {
            statusLabel.setText("Không thể tải bảng xếp hạng: " + message.payloadText());
        }
    }
}
