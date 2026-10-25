package com.nihongoquest.client;

import com.nihongoquest.client.auth.LoginController;
import com.nihongoquest.client.friend.FriendsController;
import com.nihongoquest.client.history.MatchHistoryController;
import com.nihongoquest.client.layout.AuthenticatedRoute;
import com.nihongoquest.client.layout.AuthenticatedShellController;
import com.nihongoquest.client.layout.NavigationGuard;
import com.nihongoquest.client.leaderboard.LeaderboardController;
import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.client.profile.Player;
import com.nihongoquest.client.profile.ProfileController;
import com.nihongoquest.client.quiz.QuizBattleController;
import com.nihongoquest.client.quiz.QuizLobbyController;
import com.nihongoquest.client.quiz.QuizRoomMenuController;
import com.nihongoquest.client.quiz.QuizSetEditorController;
import com.nihongoquest.client.quiz.QuizSetListController;
import com.nihongoquest.client.ranked.battle.BattleController;
import com.nihongoquest.client.ranked.battle.ResultController;
import com.nihongoquest.client.ranked.matchmaking.MatchmakingController;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.Alert;
import javafx.scene.control.ButtonType;
import javafx.scene.layout.BorderPane;
import javafx.stage.Stage;

import java.io.IOException;
import java.util.Optional;

/** Entry point và bộ điều phối điều hướng duy nhất của client JavaFX. */
public class ClientApp extends Application {

    private static final double AUTHENTICATED_WIDTH = 1180;
    private static final double AUTHENTICATED_HEIGHT = 760;
    private static final double AUTHENTICATED_MIN_WIDTH = 1024;
    private static final double AUTHENTICATED_MIN_HEIGHT = 680;

    private Stage primaryStage;
    private final GameClient gameClient = new GameClient();
    private Player currentPlayer;
    private volatile String pendingInviteType;
    private Parent authenticatedRoot;
    private AuthenticatedShellController shellController;
    private Object currentController;
    private AuthenticatedRoute currentRoute;

    @Override
    public void start(Stage primaryStage) throws IOException {
        this.primaryStage = primaryStage;
        primaryStage.setTitle("NihongoQuest");
        gameClient.setGlobalMessageHandler(this::handleGlobalMessage);
        showLogin();
        primaryStage.show();
    }

    public void showLogin() throws IOException {
        authenticatedRoot = null;
        shellController = null;
        currentController = null;
        currentRoute = null;
        FXMLLoader loader = new FXMLLoader(getClass().getResource("/client/auth/login.fxml"));
        Parent root = loader.load();
        LoginController controller = loader.getController();
        controller.setApp(this, gameClient);
        primaryStage.setMinWidth(880);
        primaryStage.setMinHeight(600);
        setStandaloneScene(root, 980, 650);
    }

    public void showMatchmaking(Player player) {
        currentPlayer = player;
        showMatchmaking();
    }

    public void showProfile() {
        requirePlayer();
        try {
            FXMLLoader loader = loader("/client/profile/profile.fxml");
            Parent root = loader.load();
            ProfileController controller = loader.getController();
            controller.setSession(this, gameClient, currentPlayer);
            showInShell(root, controller, "Hồ sơ",
                    "Thành tích và tiến độ học tập của bạn",
                    AuthenticatedRoute.PROFILE, true, true);
        } catch (IOException e) {
            throw screenError("Hồ sơ", e);
        }
    }

    public void updateCurrentPlayer(Player player) {
        currentPlayer = player;
    }

    public void showLeaderboard() {
        try {
            FXMLLoader loader = loader("/client/leaderboard/leaderboard.fxml");
            Parent root = loader.load();
            LeaderboardController controller = loader.getController();
            controller.setSession(this, gameClient);
            showInShell(root, controller, "Bảng xếp hạng",
                    "Top 10 thành tích Ranked toàn hệ thống",
                    AuthenticatedRoute.LEADERBOARD, true, true);
        } catch (IOException e) {
            throw screenError("Bảng xếp hạng", e);
        }
    }

    public void showMatchHistory() {
        try {
            FXMLLoader loader = loader("/client/history/match-history.fxml");
            Parent root = loader.load();
            MatchHistoryController controller = loader.getController();
            controller.setSession(this, gameClient);
            showInShell(root, controller, "Lịch sử thi đấu",
                    "Tối đa 100 trận Ranked mới nhất",
                    AuthenticatedRoute.HISTORY, true, true);
        } catch (IOException e) {
            throw screenError("Lịch sử thi đấu", e);
        }
    }

    public void showFriends() {
        try {
            FXMLLoader loader = loader("/client/friend/friends.fxml");
            Parent root = loader.load();
            FriendsController controller = loader.getController();
            controller.setSession(this, gameClient);
            showInShell(root, controller, "Bạn bè",
                    "Tìm người chơi, theo dõi trạng thái và gửi lời mời",
                    AuthenticatedRoute.FRIENDS, true, true);
        } catch (IOException e) {
            throw screenError("Bạn bè", e);
        }
    }

    public void showMatchmaking() {
        requirePlayer();
        try {
            FXMLLoader loader = loader("/client/ranked/matchmaking/matchmaking.fxml");
            Parent root = loader.load();
            MatchmakingController controller = loader.getController();
            controller.setSession(this, gameClient, currentPlayer);
            showInShell(root, controller, "Đấu hạng 1v1",
                    "Chọn thời lượng và tìm đối thủ phù hợp",
                    AuthenticatedRoute.MATCHMAKING, true, true);
        } catch (IOException e) {
            throw screenError("Tìm trận", e);
        }
    }

    public void showBattle(String roomId, String opponentUsername, int durationSeconds) {
        try {
            FXMLLoader loader = loader("/client/ranked/battle/battle.fxml");
            Parent root = loader.load();
            BattleController controller = loader.getController();
            controller.setSession(this, gameClient, currentPlayer,
                    roomId, opponentUsername, durationSeconds);
            showInShell(root, controller, "Đấu trường 1v1", null,
                    AuthenticatedRoute.BATTLE, false, true);
        } catch (IOException e) {
            throw screenError("Battle", e);
        }
    }

    public void showResult(String result, int myScore, int opponentScore,
                           String opponentUsername) {
        try {
            FXMLLoader loader = loader("/client/ranked/battle/result.fxml");
            Parent root = loader.load();
            ResultController controller = loader.getController();
            controller.setResult(result, myScore,
                    opponentScore, opponentUsername);
            showInShell(root, controller, "Kết quả trận đấu",
                    "Tổng kết trận Ranked vừa hoàn thành",
                    AuthenticatedRoute.MATCHMAKING, true, true);
        } catch (IOException e) {
            throw screenError("Kết quả trận đấu", e);
        }
    }

    public void showQuizSets() {
        try {
            FXMLLoader loader = loader("/client/quiz/quiz-set-list.fxml");
            Parent root = loader.load();
            QuizSetListController controller = loader.getController();
            controller.setSession(this, gameClient);
            showInShell(root, controller, "Quản lý bộ đề",
                    "Tạo, chỉnh sửa và xuất bản bộ câu hỏi",
                    AuthenticatedRoute.QUIZ_SETS, true, true);
        } catch (IOException e) {
            throw screenError("Quản lý bộ đề", e);
        }
    }

    public void showQuizSetEditor(Payloads.QuizSetEdit quizSet, boolean editable) {
        try {
            FXMLLoader loader = loader("/client/quiz/quiz-set-editor.fxml");
            Parent root = loader.load();
            QuizSetEditorController controller = loader.getController();
            controller.setSession(this, gameClient, quizSet, editable);
            String title = editable ? (quizSet.id() == null ? "Tạo bộ đề" : "Sửa bộ đề")
                    : "Xem bộ đề công khai";
            showInShell(root, controller, title,
                    editable ? "Lưu thay đổi dưới dạng bản nháp" : "Nội dung chỉ đọc",
                    AuthenticatedRoute.QUIZ_SETS, true, true);
        } catch (IOException e) {
            throw screenError("Trình soạn bộ đề", e);
        }
    }

    public void showQuizRoomMenu() {
        try {
            FXMLLoader loader = loader("/client/quiz/quiz-room-menu.fxml");
            Parent root = loader.load();
            QuizRoomMenuController controller = loader.getController();
            controller.setSession(this, gameClient);
            showInShell(root, controller, "Phòng Quiz",
                    "Tạo phòng mới hoặc tham gia bằng mã PIN",
                    AuthenticatedRoute.QUIZ_ROOM, true, true);
        } catch (IOException e) {
            throw screenError("Phòng Quiz", e);
        }
    }

    public void showQuizLobby(Payloads.QuizLobbyData lobby) {
        try {
            FXMLLoader loader = loader("/client/quiz/quiz-lobby.fxml");
            Parent root = loader.load();
            QuizLobbyController controller = loader.getController();
            controller.setSession(this, gameClient, lobby);
            showInShell(root, controller, "Sảnh chờ Quiz",
                    "PIN " + lobby.pin() + " • " + lobby.title(),
                    AuthenticatedRoute.QUIZ_ROOM, true, true);
        } catch (IOException e) {
            throw screenError("Sảnh chờ Quiz", e);
        }
    }

    public void showQuizBattle(Payloads.QuizRoomStarted room) {
        try {
            FXMLLoader loader = loader("/client/quiz/quiz-battle.fxml");
            Parent root = loader.load();
            QuizBattleController controller = loader.getController();
            controller.setSession(this, gameClient, currentPlayer, room);
            showInShell(root, controller, room.title(), "PIN " + room.pin(),
                    AuthenticatedRoute.QUIZ_BATTLE, false, false);
        } catch (IOException e) {
            throw screenError("Thi Quiz", e);
        }
    }

    public void navigateFromSidebar(AuthenticatedRoute target) {
        if (target == currentRoute) return;
        if (currentController instanceof NavigationGuard guard
                && !guard.requestNavigationAway()) {
            return;
        }
        switch (target) {
            case MATCHMAKING -> showMatchmaking();
            case QUIZ_ROOM -> showQuizRoomMenu();
            case QUIZ_SETS -> showQuizSets();
            case LEADERBOARD -> showLeaderboard();
            case HISTORY -> showMatchHistory();
            case FRIENDS -> showFriends();
            case PROFILE -> showProfile();
            case BATTLE, QUIZ_BATTLE -> throw new IllegalArgumentException(
                    "Không thể mở màn thi đấu trực tiếp từ sidebar");
        }
    }

    public void updatePageHeader(String title, String subtitle) {
        if (shellController != null) shellController.updateHeader(title, subtitle);
    }

    public void confirmAndLogout() {
        Alert alert = new Alert(Alert.AlertType.CONFIRMATION);
        alert.setTitle("Đăng xuất");
        alert.setHeaderText("Bạn muốn đăng xuất khỏi NihongoQuest?");
        alert.setContentText("Kết nối tới server sẽ bị đóng và mọi thay đổi chưa lưu sẽ mất.");
        Optional<ButtonType> choice = alert.showAndWait();
        if (choice.isEmpty() || choice.get() != ButtonType.OK) return;
        gameClient.disconnect();
        currentPlayer = null;
        pendingInviteType = null;
        try {
            showLogin();
        } catch (IOException e) {
            throw screenError("Đăng nhập", e);
        }
    }

    private void showInShell(Parent content, Object controller, String title, String subtitle,
                             AuthenticatedRoute route, boolean chromeVisible,
                             boolean removeEmbeddedHeader) throws IOException {
        ensureAuthenticatedShell();
        if (removeEmbeddedHeader && content instanceof BorderPane pane) pane.setTop(null);
        currentController = controller;
        currentRoute = route;
        shellController.showContent(content, title, subtitle, route, chromeVisible);
    }

    private void ensureAuthenticatedShell() throws IOException {
        if (authenticatedRoot == null) {
            FXMLLoader loader = loader("/client/layout/authenticated-shell.fxml");
            authenticatedRoot = loader.load();
            shellController = loader.getController();
            shellController.setApp(this);
        }
        if (primaryStage.getScene() == null || primaryStage.getScene().getRoot() != authenticatedRoot) {
            primaryStage.setMinWidth(AUTHENTICATED_MIN_WIDTH);
            primaryStage.setMinHeight(AUTHENTICATED_MIN_HEIGHT);
            setStandaloneScene(authenticatedRoot, AUTHENTICATED_WIDTH, AUTHENTICATED_HEIGHT);
        }
    }

    private FXMLLoader loader(String resource) {
        return new FXMLLoader(getClass().getResource(resource));
    }

    private void requirePlayer() {
        if (currentPlayer == null) throw new IllegalStateException("Chưa có người chơi đăng nhập");
    }

    private IllegalStateException screenError(String screen, IOException error) {
        return new IllegalStateException("Không thể mở màn hình " + screen, error);
    }

    private void setStandaloneScene(Parent root, double width, double height) {
        Scene scene = new Scene(root, width, height);
        scene.getStylesheets().add(
                getClass().getResource("/client/shared/style.css").toExternalForm());
        primaryStage.setScene(scene);
    }

    /** Ghi nhận client đang chờ chuyển màn hình từ một lời mời đã gửi hoặc chấp nhận. */
    public void expectInviteTransition(String inviteType) {
        pendingInviteType = inviteType;
    }

    private void handleGlobalMessage(Message message) {
        if (message.getType() == MessageType.GAME_INVITE_RECEIVED) {
            Payloads.GameInviteReceived invite = Payloads.fromJson(
                    message.getPayload(), Payloads.GameInviteReceived.class);
            Platform.runLater(() -> showInvite(invite));
            return;
        }
        String inviteType = pendingInviteType;
        if (inviteType != null && message.getType() == MessageType.SOCIAL_ERROR) {
            pendingInviteType = null;
            Platform.runLater(() -> {
                Alert alert = new Alert(Alert.AlertType.ERROR);
                alert.setTitle("Không thể vào trận");
                alert.setHeaderText("Lời mời không còn hợp lệ");
                alert.setContentText(message.payloadText());
                alert.showAndWait();
            });
            return;
        }
        if (inviteType != null && message.getType() == MessageType.GAME_INVITE_STATUS) {
            String status = Payloads.fromJson(message.getPayload(),
                    Payloads.GameInviteStatus.class).status();
            if ("REJECTED".equals(status) || "EXPIRED".equals(status)
                    || "CANCELLED".equals(status)) {
                pendingInviteType = null;
            }
            return;
        }
        if ("RANKED".equals(inviteType) && message.getType() == MessageType.MATCH_FOUND) {
            Payloads.MatchFound match = Payloads.parseMatchFound(message.getPayload());
            Platform.runLater(() -> {
                showBattle(match.roomId(), match.opponent(), match.durationSeconds());
                pendingInviteType = null;
            });
        } else if ("RANKED".equals(inviteType) && message.getType() == MessageType.QUESTION) {
            Platform.runLater(() -> gameClient.redispatch(message));
        } else if ("QUIZ".equals(inviteType)
                && message.getType() == MessageType.QUIZ_LOBBY_UPDATE) {
            Payloads.QuizLobbyData lobby = Payloads.fromJson(
                    message.getPayload(), Payloads.QuizLobbyData.class);
            Platform.runLater(() -> {
                showQuizLobby(lobby);
                pendingInviteType = null;
            });
        }
    }

    private void showInvite(Payloads.GameInviteReceived invite) {
        String detail = "RANKED".equals(invite.type())
                ? "Ranked " + (invite.durationSeconds() / 60) + " phút"
                : "phòng Quiz PIN " + invite.roomPin();
        Alert alert = new Alert(Alert.AlertType.CONFIRMATION);
        alert.setTitle("Lời mời chơi");
        alert.setHeaderText(invite.fromUsername() + " mời bạn vào " + detail);
        alert.setContentText("Lời mời có hiệu lực trong 60 giây.");
        Optional<ButtonType> choice = alert.showAndWait();
        boolean accept = choice.isPresent() && choice.get() == ButtonType.OK;
        if (accept) expectInviteTransition(invite.type());
        gameClient.respondGameInvite(invite.inviteId(), accept);
    }

    @Override
    public void stop() {
        gameClient.disconnect();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
