package com.nihongoquest.client.friend;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.scene.control.ComboBox;
import javafx.scene.control.Label;
import javafx.scene.control.ListCell;
import javafx.scene.control.ListView;
import javafx.scene.control.TextField;
import javafx.util.StringConverter;

/** Màn hình social cơ bản: tìm user, request, presence và game invite. */
public class FriendsController {
    @FXML private TextField searchField;
    @FXML private ListView<Payloads.UserSearchItem> searchResults;
    @FXML private ListView<Payloads.FriendRequestItem> requestList;
    @FXML private ListView<Payloads.FriendItem> friendList;
    @FXML private ComboBox<Integer> rankedDurationBox;
    @FXML private TextField quizPinField;
    @FXML private Label statusLabel;

    private ClientApp app;
    private GameClient gameClient;

    @FXML
    private void initialize() {
        searchResults.setCellFactory(ignored -> textCell(item -> item.username()
                + (item.online() ? "  •  Trực tuyến" : "  •  Ngoại tuyến")));
        requestList.setCellFactory(ignored -> textCell(Payloads.FriendRequestItem::username));
        friendList.setCellFactory(ignored -> textCell(item -> item.username() + "  •  "
                + (!item.online() ? "Ngoại tuyến" : item.busy() ? "Đang bận" : "Trực tuyến")));
        rankedDurationBox.getItems().setAll(180, 300);
        rankedDurationBox.setValue(180);
        rankedDurationBox.setConverter(new StringConverter<>() {
            @Override public String toString(Integer seconds) {
                return seconds == null ? "" : seconds / 60 + " phút";
            }
            @Override public Integer fromString(String value) { return Integer.valueOf(value); }
        });
    }

    public void setSession(ClientApp app, GameClient gameClient) {
        this.app = app;
        this.gameClient = gameClient;
        gameClient.setMessageHandler(message ->
                Platform.runLater(() -> handleServerMessage(message)));
        refresh();
    }

    @FXML
    private void onSearch() {
        String query = searchField.getText().trim();
        if (query.isEmpty()) {
            showStatus("Nhập một phần username cần tìm");
            return;
        }
        gameClient.searchUsers(query);
        showStatus("Đang tìm người chơi...");
    }

    @FXML
    private void onAddFriend() {
        Payloads.UserSearchItem selected = searchResults.getSelectionModel().getSelectedItem();
        if (selected == null) {
            showStatus("Chọn một người chơi trong kết quả tìm kiếm");
            return;
        }
        gameClient.sendFriendRequest(selected.userId());
    }

    @FXML private void onAccept() { respondRequest(true); }
    @FXML private void onReject() { respondRequest(false); }

    private void respondRequest(boolean accept) {
        Payloads.FriendRequestItem selected = requestList.getSelectionModel().getSelectedItem();
        if (selected == null) {
            showStatus("Chọn một lời mời kết bạn");
            return;
        }
        gameClient.respondFriendRequest(selected.userId(), accept);
    }

    @FXML
    private void onRemoveFriend() {
        Payloads.FriendItem selected = selectedFriend();
        if (selected != null) gameClient.removeFriend(selected.userId());
    }

    @FXML
    private void onInviteRanked() {
        Payloads.FriendItem selected = selectedFriend();
        if (selected == null) return;
        gameClient.inviteRanked(selected.userId(), rankedDurationBox.getValue());
        showStatus("Đang gửi lời mời Ranked...");
    }

    @FXML
    private void onInviteQuiz() {
        Payloads.FriendItem selected = selectedFriend();
        if (selected == null) return;
        String pin = quizPinField.getText().trim();
        if (!pin.matches("\\d{6}")) {
            showStatus("PIN phòng Quiz phải gồm đúng 6 số");
            return;
        }
        gameClient.inviteQuiz(selected.userId(), pin);
        showStatus("Đang gửi lời mời phòng Quiz...");
    }

    @FXML
    private void onRefresh() {
        refresh();
    }

    @FXML
    private void onBack() {
        app.showHome();
    }

    private void refresh() {
        gameClient.listFriends();
        gameClient.listFriendRequests();
        showStatus("Đang tải danh sách bạn bè...");
    }

    private Payloads.FriendItem selectedFriend() {
        Payloads.FriendItem selected = friendList.getSelectionModel().getSelectedItem();
        if (selected == null) showStatus("Chọn một người bạn trước");
        return selected;
    }

    private void handleServerMessage(Message message) {
        switch (message.getType()) {
            case USER_SEARCH_RESULT -> {
                Payloads.UserSearchData data = Payloads.fromJson(
                        message.getPayload(), Payloads.UserSearchData.class);
                searchResults.getItems().setAll(data.users());
                showStatus("Tìm thấy " + data.users().size() + " người chơi");
            }
            case FRIEND_REQUEST_LIST -> requestList.getItems().setAll(Payloads.fromJson(
                    message.getPayload(), Payloads.FriendRequestListData.class).requests());
            case FRIEND_LIST -> friendList.getItems().setAll(Payloads.fromJson(
                    message.getPayload(), Payloads.FriendListData.class).friends());
            case FRIEND_REQUEST_SENT -> showStatus("Đã gửi lời mời kết bạn");
            case FRIEND_REQUEST_RESPOND, FRIEND_REMOVED -> {
                refresh();
                showStatus("Danh sách bạn bè đã được cập nhật");
            }
            case PRESENCE_UPDATE -> gameClient.listFriends();
            case GAME_INVITE_STATUS -> {
                Payloads.GameInviteStatus status = Payloads.fromJson(
                        message.getPayload(), Payloads.GameInviteStatus.class);
                showStatus(inviteStatusText(status.status()));
            }
            case SOCIAL_ERROR -> showStatus(errorText(message.payloadText()));
            default -> { }
        }
    }

    private void showStatus(String text) {
        statusLabel.setText(text);
    }

    private static <T> ListCell<T> textCell(java.util.function.Function<T, String> text) {
        return new ListCell<>() {
            @Override protected void updateItem(T item, boolean empty) {
                super.updateItem(item, empty);
                setText(empty || item == null ? null : text.apply(item));
            }
        };
    }

    private static String inviteStatusText(String status) {
        return switch (status) {
            case "SENT" -> "Đã gửi lời mời chơi (hết hạn sau 60 giây)";
            case "ACCEPTED" -> "Lời mời đã được chấp nhận";
            case "REJECTED" -> "Lời mời đã bị từ chối";
            case "EXPIRED" -> "Lời mời đã hết hạn";
            default -> "Lời mời đã bị hủy";
        };
    }

    private static String errorText(String code) {
        return switch (code) {
            case "REQUEST_EXISTS" -> "Hai tài khoản đã có lời mời hoặc đã là bạn bè";
            case "REQUEST_NOT_FOUND" -> "Lời mời kết bạn không còn tồn tại";
            case "TARGET_OFFLINE" -> "Người bạn này đang ngoại tuyến";
            case "TARGET_BUSY", "SENDER_BUSY" -> "Một trong hai người đang bận";
            case "NOT_FRIENDS" -> "Hai tài khoản không còn là bạn bè";
            case "NOT_QUIZ_HOST" -> "Bạn phải là host của lobby có PIN này";
            case "INVITE_EXPIRED" -> "Lời mời chơi đã hết hạn";
            case "ROOM_STARTED", "ROOM_FULL" -> "Phòng Quiz đã bắt đầu hoặc đã đầy";
            case "QUESTIONS_UNAVAILABLE" -> "Chưa đủ câu hỏi Ranked hợp lệ";
            case "DATABASE_ERROR" -> "Không thể truy cập database";
            default -> "Thao tác không thành công: " + code;
        };
    }
}
