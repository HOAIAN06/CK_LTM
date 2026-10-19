package com.nihongoquest.client;

import java.io.IOException;

import com.nihongoquest.client.ranked.battle.BattleController;
import com.nihongoquest.client.home.HomeController;
import com.nihongoquest.client.auth.LoginController;
import com.nihongoquest.client.ranked.matchmaking.MatchmakingController;
import com.nihongoquest.client.ranked.battle.ResultController;
import com.nihongoquest.client.profile.Player;
import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.client.quiz.QuizSetEditorController;
import com.nihongoquest.client.quiz.QuizSetListController;
import com.nihongoquest.client.quiz.QuizRoomMenuController;
import com.nihongoquest.client.quiz.QuizLobbyController;
import com.nihongoquest.client.quiz.QuizBattleController;
import com.nihongoquest.client.leaderboard.LeaderboardController;
import com.nihongoquest.client.history.MatchHistoryController;
import com.nihongoquest.client.friend.FriendsController;
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
import javafx.stage.Stage;

import java.util.Optional;

/**
 * ClientApp là entry point của ứng dụng JavaFX phía Client.
 * Nhiệm vụ: khởi động JavaFX, tạo Stage chính và load màn hình home.fxml.
 * Sau này có thể bổ sung hàm chuyển đổi giữa các màn hình.
 */
public class ClientApp extends Application {

    private Stage primaryStage;
    private final GameClient gameClient = new GameClient();
    private Player currentPlayer;
    private volatile String acceptedInviteType;

    @Override
    public void start(Stage primaryStage) throws IOException {
        this.primaryStage = primaryStage;
        primaryStage.setTitle("NihongoQuest");
        gameClient.setGlobalMessageHandler(this::handleGlobalMessage);
        showLogin();
        primaryStage.show();
    }

    public void showLogin() throws IOException {
        FXMLLoader loader = new FXMLLoader(getClass().getResource("/client/auth/login.fxml"));
        Parent root = loader.load();
        LoginController controller = loader.getController();
        controller.setApp(this, gameClient);
        setScene(root, 980, 650);
    }

    public void showHome(Player player) {
        currentPlayer = player;
        try {
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/client/home/home.fxml"));
            Parent root = loader.load();
            HomeController controller = loader.getController();
            controller.setSession(this, gameClient, player);
            setScene(root);
        } catch (IOException e) {
            throw new IllegalStateException("Không thể mở màn hình Home", e);
        }
    }

    public void showHome() {
        if (currentPlayer == null) {
            throw new IllegalStateException("Chưa có người chơi đăng nhập");
        }
        showHome(currentPlayer);
    }

    public void updateCurrentPlayer(Player player) {
        currentPlayer = player;
    }

    public void showLeaderboard() {
        try {
            FXMLLoader loader = new FXMLLoader(
                    getClass().getResource("/client/leaderboard/leaderboard.fxml"));
            Parent root = loader.load();
            LeaderboardController controller = loader.getController();
            controller.setSession(this, gameClient);
            setScene(root, 980, 700);
        } catch (IOException e) {
            throw new IllegalStateException("Khong the mo bang xep hang", e);
        }
    }

    public void showMatchHistory() {
        try {
            FXMLLoader loader = new FXMLLoader(
                    getClass().getResource("/client/history/match-history.fxml"));
            Parent root = loader.load();
            MatchHistoryController controller = loader.getController();
            controller.setSession(this, gameClient);
            setScene(root, 1120, 720);
        } catch (IOException e) {
            throw new IllegalStateException("Khong the mo lich su thi dau", e);
        }
    }

    public void showFriends() {
        try {
            FXMLLoader loader = new FXMLLoader(
                    getClass().getResource("/client/friend/friends.fxml"));
            Parent root = loader.load();
            FriendsController controller = loader.getController();
            controller.setSession(this, gameClient);
            setScene(root, 1080, 740);
        } catch (IOException e) {
            throw new IllegalStateException("Khong the mo man hinh ban be", e);
        }
    }

    private void handleGlobalMessage(Message message) {
        if (message.getType() == MessageType.GAME_INVITE_RECEIVED) {
            Payloads.GameInviteReceived invite = Payloads.fromJson(
                    message.getPayload(), Payloads.GameInviteReceived.class);
            Platform.runLater(() -> showInvite(invite));
            return;
        }
        String inviteType = acceptedInviteType;
        if (inviteType != null && message.getType() == MessageType.SOCIAL_ERROR) {
            acceptedInviteType = null;
            Platform.runLater(() -> {
                Alert alert = new Alert(Alert.AlertType.ERROR);
                alert.setTitle("Không thể vào trận");
                alert.setHeaderText("Lời mời không còn hợp lệ");
                alert.setContentText(message.payloadText());
                alert.showAndWait();
            });
            return;
        }
        if ("RANKED".equals(inviteType) && message.getType() == MessageType.MATCH_FOUND) {
            Payloads.MatchFound match = Payloads.parseMatchFound(message.getPayload());
            Platform.runLater(() -> {
                showBattle(match.roomId(), match.opponent(), match.durationSeconds());
                acceptedInviteType = null;
            });
        } else if ("RANKED".equals(inviteType)
                && message.getType() == MessageType.QUESTION) {
            Platform.runLater(() -> gameClient.redispatch(message));
        } else if ("QUIZ".equals(inviteType)
                && message.getType() == MessageType.QUIZ_LOBBY_UPDATE) {
            Payloads.QuizLobbyData lobby = Payloads.fromJson(
                    message.getPayload(), Payloads.QuizLobbyData.class);
            Platform.runLater(() -> {
                showQuizLobby(lobby);
                acceptedInviteType = null;
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
        if (accept) acceptedInviteType = invite.type();
        gameClient.respondGameInvite(invite.inviteId(), accept);
    }

    public void showMatchmaking() {
        try {
            FXMLLoader loader = new FXMLLoader(
                    getClass().getResource("/client/ranked/matchmaking/matchmaking.fxml"));
            Parent root = loader.load();
            MatchmakingController controller = loader.getController();
            controller.setSession(this, gameClient, currentPlayer);
            setScene(root);
        } catch (IOException e) {
            throw new IllegalStateException("Không thể mở màn hình tìm trận", e);
        }
    }

    public void showBattle(String roomId, String opponentUsername, int durationSeconds) {
        try {
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/client/ranked/battle/battle.fxml"));
            Parent root = loader.load();
            BattleController controller = loader.getController();
            controller.setSession(this, gameClient, currentPlayer,
                    roomId, opponentUsername, durationSeconds);
            setScene(root);
        } catch (IOException e) {
            throw new IllegalStateException("Không thể mở màn hình Battle", e);
        }
    }

    public void showResult(String result, int myScore, int opponentScore,
                           String opponentUsername) {
        try {
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/client/ranked/battle/result.fxml"));
            Parent root = loader.load();
            ResultController controller = loader.getController();
            controller.setResult(
                    this, currentPlayer, result, myScore, opponentScore, opponentUsername);
            setScene(root);
        } catch (IOException e) {
            throw new IllegalStateException("Không thể mở màn hình Result", e);
        }
    }

    public void showQuizSets() {
        try {
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/client/quiz/quiz-set-list.fxml"));
            Parent root = loader.load();
            QuizSetListController controller = loader.getController();
            controller.setSession(this, gameClient);
            setScene(root, 1080, 720);
        } catch (IOException e) {
            throw new IllegalStateException("Không thể mở màn hình quản lý bộ đề", e);
        }
    }

    public void showQuizSetEditor(Payloads.QuizSetEdit quizSet, boolean editable) {
        try {
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/client/quiz/quiz-set-editor.fxml"));
            Parent root = loader.load();
            QuizSetEditorController controller = loader.getController();
            controller.setSession(this, gameClient, quizSet, editable);
            setScene(root, 1180, 780);
        } catch (IOException e) {
            throw new IllegalStateException("Không thể mở trình soạn bộ đề", e);
        }
    }

    public void showQuizRoomMenu() {
        try {
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/client/quiz/quiz-room-menu.fxml"));
            Parent root = loader.load();
            QuizRoomMenuController controller = loader.getController();
            controller.setSession(this, gameClient);
            setScene(root, 1040, 720);
        } catch (IOException e) {
            throw new IllegalStateException("Không thể mở menu phòng Quiz", e);
        }
    }

    public void showQuizLobby(Payloads.QuizLobbyData lobby) {
        try {
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/client/quiz/quiz-lobby.fxml"));
            Parent root = loader.load();
            QuizLobbyController controller = loader.getController();
            controller.setSession(this, gameClient, lobby);
            setScene(root, 980, 700);
        } catch (IOException e) {
            throw new IllegalStateException("Không thể mở sảnh chờ Quiz", e);
        }
    }

    public void showQuizBattle(Payloads.QuizRoomStarted room) {
        try {
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/client/quiz/quiz-battle.fxml"));
            Parent root = loader.load();
            QuizBattleController controller = loader.getController();
            controller.setSession(this, gameClient, currentPlayer, room);
            setScene(root, 1180, 760);
        } catch (IOException e) {
            throw new IllegalStateException("Không thể mở màn hình thi Quiz", e);
        }
    }

    private void setScene(Parent root) {
        setScene(root, 980, 680);
    }

    private void setScene(Parent root, double width, double height) {
        Scene scene = new Scene(root, width, height);
        scene.getStylesheets().add(
                getClass().getResource("/client/shared/style.css").toExternalForm()
        );
        primaryStage.setScene(scene);
    }

    @Override
    public void stop() {
        gameClient.disconnect();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
