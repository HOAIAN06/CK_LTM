This file is a merged representation of the entire codebase, combined into a single document by Repomix.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
.cursor/
  rules/
    nihongoquest.mdc
    ui-design-system.mdc
.mvn/
  wrapper/
    maven-wrapper.jar
    maven-wrapper.properties
docs/
  architecture.md
  database.md
  protocol.md
  roadmap.md
sql/
  seed_demo.sql
  supabase_schema.sql
  verify_schema.sql
src/
  main/
    java/
      com/
        nihongoquest/
          client/
            auth/
              LoginController.java
            config/
              ClientConfig.java
            friend/
              FriendsController.java
            history/
              MatchHistoryController.java
            home/
              HomeController.java
            layout/
              AuthenticatedRoute.java
              AuthenticatedShellController.java
              NavigationGuard.java
            leaderboard/
              LeaderboardController.java
            network/
              GameClient.java
              ServerListener.java
            profile/
              Player.java
              ProfileController.java
              ProfilePresenter.java
            quiz/
              .gitkeep
              QuizBattleController.java
              QuizLobbyController.java
              QuizRoomMenuController.java
              QuizRoomUi.java
              QuizSetEditorController.java
              QuizSetListController.java
            ranked/
              battle/
                BattleController.java
                ResultController.java
              matchmaking/
                MatchmakingController.java
            ClientApp.java
            ClientLauncher.java
          common/
            protocol/
              Message.java
              MessageType.java
              Payloads.java
              Protocol.java
          server/
            dashboard/
              DashboardController.java
              ServerAddressResolver.java
              ServerDashboardApp.java
            database/
              Database.java
            friend/
              FriendshipRepository.java
              SocialException.java
              SocialService.java
            network/
              ClientHandler.java
              OnlineUserRegistry.java
              ServerRequestRouter.java
              TrafficEvent.java
            player/
              PlayerRepository.java
            question/
              Choice.java
              Question.java
              QuestionRepository.java
              QuestionService.java
            quiz/
              .gitkeep
              QuizSetException.java
              QuizSetRepository.java
              QuizSetService.java
            quizroom/
              QuizRoom.java
              QuizRoomException.java
              QuizRoomManager.java
            ranked/
              GameRoom.java
              MatchmakingManager.java
              MatchRepository.java
            GameServer.java
            ServerLauncher.java
    resources/
      client/
        auth/
          login.fxml
        friend/
          friends.fxml
        history/
          match-history.fxml
        home/
          home.fxml
        layout/
          authenticated-shell.fxml
        leaderboard/
          leaderboard.fxml
        profile/
          .gitkeep
          profile.fxml
        quiz/
          .gitkeep
          quiz-battle.fxml
          quiz-lobby.fxml
          quiz-room-menu.fxml
          quiz-set-editor.fxml
          quiz-set-list.fxml
        ranked/
          battle/
            battle.fxml
            result.fxml
          matchmaking/
            matchmaking.fxml
        shared/
          style.css
      server/
        dashboard/
          server-dashboard.css
          server-dashboard.fxml
      client.properties
      client.properties.example
      db.properties.example
  test/
    java/
      com/
        nihongoquest/
          client/
            profile/
              ProfilePresenterTest.java
            ClientFxmlTest.java
          common/
            protocol/
              MessageTest.java
              PayloadsTest.java
          server/
            dashboard/
              DashboardControllerTest.java
              ServerAddressResolverTest.java
            friend/
              FriendshipRepositoryTest.java
              SocialServiceTest.java
            network/
              OnlineUserRegistryTest.java
            player/
              PlayerRepositoryQueryTest.java
            question/
              QuestionFixtures.java
              QuestionRepositoryTest.java
              QuestionServiceTest.java
            quiz/
              QuizSetRepositoryTest.java
              QuizSetServiceTest.java
            quizroom/
              QuizRoomManagerTest.java
              QuizRoomTest.java
            ranked/
              GameRoomTest.java
              MatchRepositoryHistoryTest.java
              MatchRepositoryTest.java
    resources/
      db.properties
.gitignore
mvnw
mvnw.cmd
pom.xml
README.md
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path=".cursor/rules/ui-design-system.mdc">
---
description: Quy chuẩn giao diện client NihongoQuest thống nhất
globs: "{src/main/resources/client/**/*.fxml,src/main/resources/client/**/*.css,src/main/java/com/nihongoquest/client/**/*.java}"
alwaysApply: false
---

# NihongoQuest UI Design System

- Mọi màn hình đã đăng nhập phải dùng authenticated shell; không tự tạo sidebar/header riêng.
- Sidebar rộng 232px, nền navy `#0F2747`; nội dung nền sáng, primary blue `#3182CE`.
- Dùng thang spacing 8/12/16/24/32px, bo góc 8–12px và font `Segoe UI`.
- Không dùng inline `style` trong FXML; tạo semantic style class trong `client/shared/style.css`.
- Home không hiển thị username, avatar hay thống kê cá nhân; dữ liệu này chỉ xuất hiện ở Hồ sơ.
- Sidebar luôn theo thứ tự: Trang chủ, Đấu hạng 1v1, Phòng Quiz, Quản lý bộ đề,
  Bảng xếp hạng, Lịch sử thi đấu, Bạn bè; cuối thanh là Hồ sơ và Đăng xuất.
- Màn hình thi đấu 1v1/Quiz phải ẩn sidebar và shared header để giữ tập trung.
- Nút điều hướng phải có trạng thái hover, active, focus và disabled rõ ràng.
- Nội dung phải co giãn an toàn từ cửa sổ tối thiểu 1024x680; tránh kích thước tuyệt đối không cần thiết.
- Text UI dùng tiếng Việt nhất quán; controller chỉ xử lý trạng thái và điều hướng, không tạo style inline.

Ví dụ: dùng `styleClass="sidebar-button"`, không dùng `style="-fx-background-color: ..."`.
</file>

<file path="sql/seed_demo.sql">
-- Chay sau supabase_schema.sql. Mat khau cua ba tai khoan demo la: 1234
-- BCrypt hash duoc tao san; server van dung BCrypt.checkpw khi dang nhap.
INSERT INTO users (username, password_hash) VALUES
('demo_host', '$2a$10$0LYMg2WQDxwPnSuG3FbMg./dVzrMH4DwD/WpvBqmPiNOiLUbVtiWK'),
('demo_player1', '$2a$10$0LYMg2WQDxwPnSuG3FbMg./dVzrMH4DwD/WpvBqmPiNOiLUbVtiWK'),
('demo_player2', '$2a$10$0LYMg2WQDxwPnSuG3FbMg./dVzrMH4DwD/WpvBqmPiNOiLUbVtiWK');

WITH new_set AS (
    INSERT INTO quiz_sets (owner_id, title, description, level, is_published)
    SELECT id, 'Tu vung N5 co ban', 'Bo cau hoi demo cho Ranked va Quiz Room', 'N5', TRUE
    FROM users WHERE username = 'demo_host'
    RETURNING id
), inserted_questions AS (
    INSERT INTO questions (quiz_set_id, content, explanation, position)
    SELECT id, 'たべる co nghia la gi?', 'たべる: an', 1 FROM new_set
    UNION ALL SELECT id, 'みず co nghia la gi?', 'みず: nuoc', 2 FROM new_set
    UNION ALL SELECT id, 'こんにちは dung de lam gi?', 'Loi chao ban ngay', 3 FROM new_set
    RETURNING id, position
)
INSERT INTO choices (question_id, content, position, is_correct)
SELECT id, value.content, value.position, value.correct
FROM inserted_questions
CROSS JOIN LATERAL (
    VALUES
      (CASE inserted_questions.position WHEN 1 THEN 'An' WHEN 2 THEN 'Lua' ELSE 'Chao buoi sang' END, 1, inserted_questions.position = 1),
      (CASE inserted_questions.position WHEN 1 THEN 'Uong' WHEN 2 THEN 'Nuoc' ELSE 'Chao buoi toi' END, 2, inserted_questions.position = 2),
      (CASE inserted_questions.position WHEN 1 THEN 'Ngu' WHEN 2 THEN 'Gio' ELSE 'Xin chao ban ngay' END, 3, inserted_questions.position = 3),
      (CASE inserted_questions.position WHEN 1 THEN 'Di' WHEN 2 THEN 'Dat' ELSE 'Tam biet' END, 4, FALSE)
) AS value(content, position, correct);
</file>

<file path="sql/verify_schema.sql">
-- Cac truy van read-only dung de kiem tra sau khi reset schema.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'quiz_sets', 'questions', 'choices', 'matches', 'friendships')
ORDER BY table_name;

SELECT qs.id, qs.title, qs.level, qs.is_published, count(q.id) AS question_count
FROM quiz_sets qs
LEFT JOIN questions q ON q.quiz_set_id = qs.id
GROUP BY qs.id, qs.title, qs.level, qs.is_published
ORDER BY qs.id;

SELECT q.id, q.content, count(c.id) AS choice_count,
       count(c.id) FILTER (WHERE c.is_correct) AS correct_count
FROM questions q
LEFT JOIN choices c ON c.question_id = q.id
GROUP BY q.id, q.content
ORDER BY q.id;
</file>

<file path="src/main/java/com/nihongoquest/client/config/ClientConfig.java">
package com.nihongoquest.client.config;

import com.nihongoquest.common.protocol.Protocol;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

public final class ClientConfig {

    private static final Properties PROPERTIES = load();

    private ClientConfig() {
    }

    public static String serverHost() {
        return environmentOrProperty("NIHONGO_SERVER_HOST", "server.host", "localhost");
    }

    public static int serverPort() {
        String value = environmentOrProperty("NIHONGO_SERVER_PORT", "server.port",
                Integer.toString(Protocol.DEFAULT_PORT));
        try {
            int port = Integer.parseInt(value);
            if (port < 1 || port > 65535) {
                throw new NumberFormatException("port range");
            }
            return port;
        } catch (NumberFormatException e) {
            throw new IllegalStateException("server.port không hợp lệ: " + value, e);
        }
    }

    private static String environmentOrProperty(String environment, String property,
                                                 String fallback) {
        String environmentValue = System.getenv(environment);
        if (environmentValue != null && !environmentValue.isBlank()) {
            return environmentValue.trim();
        }
        return PROPERTIES.getProperty(property, fallback).trim();
    }

    private static Properties load() {
        Properties properties = new Properties();
        try (InputStream input = ClientConfig.class.getResourceAsStream("/client.properties")) {
            if (input != null) {
                properties.load(input);
            }
            return properties;
        } catch (IOException e) {
            throw new IllegalStateException("Không thể đọc client.properties", e);
        }
    }
}
</file>

<file path="src/main/java/com/nihongoquest/client/layout/AuthenticatedRoute.java">
package com.nihongoquest.client.layout;

/** Các đích điều hướng chính trong khu vực đã đăng nhập. */
public enum AuthenticatedRoute {
    MATCHMAKING,
    QUIZ_ROOM,
    QUIZ_SETS,
    LEADERBOARD,
    HISTORY,
    FRIENDS,
    PROFILE,
    BATTLE,
    QUIZ_BATTLE
}
</file>

<file path="src/main/java/com/nihongoquest/client/layout/AuthenticatedShellController.java">
package com.nihongoquest.client.layout;

import com.nihongoquest.client.ClientApp;
import javafx.fxml.FXML;
import javafx.scene.Node;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.layout.HBox;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;

import java.util.EnumMap;
import java.util.Map;

/** Khung điều hướng duy nhất cho toàn bộ khu vực đã đăng nhập. */
public class AuthenticatedShellController {

    @FXML private HBox shellRoot;
    @FXML private VBox sidebar;
    @FXML private VBox sharedHeader;
    @FXML private StackPane contentHost;
    @FXML private Label pageTitleLabel;
    @FXML private Label pageSubtitleLabel;
    @FXML private Button matchmakingButton;
    @FXML private Button quizRoomButton;
    @FXML private Button quizSetsButton;
    @FXML private Button leaderboardButton;
    @FXML private Button historyButton;
    @FXML private Button friendsButton;
    @FXML private Button profileButton;

    private final Map<AuthenticatedRoute, Button> routeButtons =
            new EnumMap<>(AuthenticatedRoute.class);
    private ClientApp app;

    @FXML
    private void initialize() {
        routeButtons.put(AuthenticatedRoute.MATCHMAKING, matchmakingButton);
        routeButtons.put(AuthenticatedRoute.QUIZ_ROOM, quizRoomButton);
        routeButtons.put(AuthenticatedRoute.QUIZ_SETS, quizSetsButton);
        routeButtons.put(AuthenticatedRoute.LEADERBOARD, leaderboardButton);
        routeButtons.put(AuthenticatedRoute.HISTORY, historyButton);
        routeButtons.put(AuthenticatedRoute.FRIENDS, friendsButton);
        routeButtons.put(AuthenticatedRoute.PROFILE, profileButton);
    }

    public void setApp(ClientApp app) {
        this.app = app;
    }

    public void showContent(Node content, String title, String subtitle,
                            AuthenticatedRoute route, boolean chromeVisible) {
        contentHost.getChildren().setAll(content);
        pageTitleLabel.setText(title);
        pageSubtitleLabel.setText(subtitle == null ? "" : subtitle);
        pageSubtitleLabel.setManaged(subtitle != null && !subtitle.isBlank());
        pageSubtitleLabel.setVisible(pageSubtitleLabel.isManaged());
        setChromeVisible(chromeVisible);
        setActiveRoute(route);
    }

    public void updateHeader(String title, String subtitle) {
        pageTitleLabel.setText(title);
        pageSubtitleLabel.setText(subtitle == null ? "" : subtitle);
        pageSubtitleLabel.setManaged(subtitle != null && !subtitle.isBlank());
        pageSubtitleLabel.setVisible(pageSubtitleLabel.isManaged());
    }

    private void setChromeVisible(boolean visible) {
        sidebar.setManaged(visible);
        sidebar.setVisible(visible);
        sharedHeader.setManaged(visible);
        sharedHeader.setVisible(visible);
        shellRoot.getStyleClass().removeAll("authenticated-shell", "gameplay-shell");
        shellRoot.getStyleClass().add(visible ? "authenticated-shell" : "gameplay-shell");
    }

    private void setActiveRoute(AuthenticatedRoute activeRoute) {
        routeButtons.values().forEach(button -> button.getStyleClass().remove("active"));
        Button active = routeButtons.get(activeRoute);
        if (active != null && !active.getStyleClass().contains("active")) {
            active.getStyleClass().add("active");
        }
    }

    @FXML private void onMatchmaking() { app.navigateFromSidebar(AuthenticatedRoute.MATCHMAKING); }
    @FXML private void onQuizRoom() { app.navigateFromSidebar(AuthenticatedRoute.QUIZ_ROOM); }
    @FXML private void onQuizSets() { app.navigateFromSidebar(AuthenticatedRoute.QUIZ_SETS); }
    @FXML private void onLeaderboard() { app.navigateFromSidebar(AuthenticatedRoute.LEADERBOARD); }
    @FXML private void onHistory() { app.navigateFromSidebar(AuthenticatedRoute.HISTORY); }
    @FXML private void onFriends() { app.navigateFromSidebar(AuthenticatedRoute.FRIENDS); }
    @FXML private void onProfile() { app.navigateFromSidebar(AuthenticatedRoute.PROFILE); }
    @FXML private void onLogout() { app.confirmAndLogout(); }
}
</file>

<file path="src/main/java/com/nihongoquest/client/layout/NavigationGuard.java">
package com.nihongoquest.client.layout;

/** Cho phép màn hình hiện tại xác nhận và dọn trạng thái trước khi sidebar điều hướng đi. */
public interface NavigationGuard {
    boolean requestNavigationAway();
}
</file>

<file path="src/main/java/com/nihongoquest/client/profile/ProfileController.java">
package com.nihongoquest.client.profile;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.scene.control.Label;

import java.util.Locale;

/** Hiển thị toàn bộ thông tin người dùng tại một nơi duy nhất. */
public class ProfileController {
    @FXML private Label avatarLabel;
    @FXML private Label usernameLabel;
    @FXML private Label winsLabel;
    @FXML private Label lossesLabel;
    @FXML private Label drawsLabel;
    @FXML private Label totalScoreLabel;
    @FXML private Label questionsLabel;
    @FXML private Label correctAnswersLabel;
    @FXML private Label accuracyLabel;
    @FXML private Label statusLabel;

    private ClientApp app;
    private GameClient gameClient;

    public void setSession(ClientApp app, GameClient gameClient, Player player) {
        this.app = app;
        this.gameClient = gameClient;
        showPlayer(player);
        gameClient.setMessageHandler(message -> Platform.runLater(() -> handleMessage(message)));
        gameClient.setConnectionErrorHandler(error -> Platform.runLater(() -> showError(error)));
        statusLabel.setText("Đang cập nhật dữ liệu hồ sơ...");
        gameClient.getProfile();
    }

    private void handleMessage(Message message) {
        if (message.getType() == MessageType.QUERY_ERROR) {
            showError("Không thể tải dữ liệu hồ sơ từ máy chủ.");
            return;
        }
        if (message.getType() != MessageType.PROFILE_DATA) return;
        Payloads.PlayerStats values = Payloads.parsePlayer(message.getPayload());
        Player player = new Player(values.id(), values.username(), values.wins(), values.losses(),
                values.draws(), values.totalScore(), values.questionsAnswered(),
                values.correctAnswers());
        app.updateCurrentPlayer(player);
        showPlayer(player);
        statusLabel.setText("Hồ sơ đã được cập nhật.");
        statusLabel.getStyleClass().removeAll("status-error");
    }

    private void showPlayer(Player player) {
        String username = player.getUsername();
        avatarLabel.setText(username.isBlank() ? "?"
                : username.substring(0, 1).toUpperCase(Locale.ROOT));
        usernameLabel.setText(username);
        winsLabel.setText(Integer.toString(player.getWins()));
        lossesLabel.setText(Integer.toString(player.getLosses()));
        drawsLabel.setText(Integer.toString(player.getDraws()));
        totalScoreLabel.setText(Integer.toString(player.getTotalScore()));
        questionsLabel.setText(Integer.toString(player.getQuestionsAnswered()));
        correctAnswersLabel.setText(Integer.toString(player.getCorrectAnswers()));
        accuracyLabel.setText(ProfilePresenter.accuracy(player) + "%");
    }

    private void showError(String error) {
        statusLabel.setText(error);
        if (!statusLabel.getStyleClass().contains("status-error")) {
            statusLabel.getStyleClass().add("status-error");
        }
    }
}
</file>

<file path="src/main/java/com/nihongoquest/client/quiz/.gitkeep">

</file>

<file path="src/main/java/com/nihongoquest/client/quiz/QuizRoomUi.java">
package com.nihongoquest.client.quiz;

final class QuizRoomUi {
    private QuizRoomUi() { }

    static String errorText(String code) {
        return switch (code) {
            case "ROOM_NOT_FOUND", "INVALID_PIN" -> "Không tìm thấy phòng với PIN này.";
            case "ROOM_STARTED" -> "Phòng đã bắt đầu, không thể tham gia mới.";
            case "ROOM_FULL" -> "Phòng đã đủ 20 người chơi.";
            case "NOT_ENOUGH_PLAYERS" -> "Cần ít nhất 2 người chơi để bắt đầu.";
            case "NOT_HOST" -> "Chỉ host mới được thực hiện thao tác này.";
            case "QUIZ_NOT_PUBLISHED" -> "Bộ đề chưa được xuất bản.";
            case "INVALID_DURATION" -> "Thời lượng phải từ 1 đến 15 phút.";
            case "BUSY" -> "Bạn đang ở hàng chờ hoặc một phòng khác.";
            case "DATABASE_ERROR" -> "Không thể tải bộ đề từ database.";
            case "NOT_IN_ROOM" -> "Bạn không còn ở trong phòng này.";
            default -> "Không thể thực hiện thao tác phòng Quiz.";
        };
    }
}
</file>

<file path="src/main/java/com/nihongoquest/client/ClientLauncher.java">
package com.nihongoquest.client;

import javafx.application.Application;

/** Plain Java entry point for IDE runs with JavaFX dependencies on the classpath. */
public final class ClientLauncher {
    private ClientLauncher() { }

    public static void main(String[] args) {
        Application.launch(ClientApp.class, args);
    }
}
</file>

<file path="src/main/java/com/nihongoquest/common/protocol/Protocol.java">
package com.nihongoquest.common.protocol;

/**
 * Protocol chứa các quy ước giao tiếp Client ↔ Server qua TCP Socket.
 * Quy định cổng mặc định và encoding của bản tin.
 */
public final class Protocol {

    /** Cổng TCP mặc định mà Server lắng nghe và Client kết nối tới. */
    public static final int DEFAULT_PORT = 5000;

    /** Mỗi bản tin là một dòng JSON mã hóa UTF-8. */
    public static final String ENCODING = "UTF-8";

    private Protocol() {
        // Không tạo instance.
    }
}
</file>

<file path="src/main/java/com/nihongoquest/server/dashboard/ServerAddressResolver.java">
package com.nihongoquest.server.dashboard;

import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.DatagramSocket;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.net.UnknownHostException;
import java.util.Comparator;

/** Tìm địa chỉ IPv4 phù hợp để các client khác trong mạng LAN kết nối tới server. */
final class ServerAddressResolver {

    private ServerAddressResolver() {
    }

    static String resolveIpv4() {
        String routedAddress = defaultRouteAddress();
        if (routedAddress != null) {
            return routedAddress;
        }
        try {
            return NetworkInterface.networkInterfaces()
                    .filter(ServerAddressResolver::isUsable)
                    .flatMap(NetworkInterface::inetAddresses)
                    .filter(Inet4Address.class::isInstance)
                    .map(Inet4Address.class::cast)
                    .filter(address -> !address.isLoopbackAddress())
                    .sorted(Comparator.comparing(address -> !address.isSiteLocalAddress()))
                    .map(InetAddress::getHostAddress)
                    .findFirst()
                    .orElseGet(ServerAddressResolver::localHostAddress);
        } catch (SocketException e) {
            return localHostAddress();
        }
    }

    private static String defaultRouteAddress() {
        try (DatagramSocket socket = new DatagramSocket()) {
            // connect() chỉ chọn route/interface cục bộ, không gửi dữ liệu ra Internet.
            socket.connect(InetAddress.getByName("8.8.8.8"), 53);
            InetAddress address = socket.getLocalAddress();
            if (address instanceof Inet4Address
                    && !address.isAnyLocalAddress()
                    && !address.isLoopbackAddress()) {
                return address.getHostAddress();
            }
        } catch (Exception ignored) {
            // Mạng cô lập không có default route sẽ dùng danh sách interface bên dưới.
        }
        return null;
    }

    private static boolean isUsable(NetworkInterface networkInterface) {
        try {
            return networkInterface.isUp()
                    && !networkInterface.isLoopback()
                    && !networkInterface.isVirtual();
        } catch (SocketException e) {
            return false;
        }
    }

    private static String localHostAddress() {
        try {
            InetAddress address = InetAddress.getLocalHost();
            if (address instanceof Inet4Address && !address.isLoopbackAddress()) {
                return address.getHostAddress();
            }
        } catch (UnknownHostException ignored) {
            // Dashboard vẫn hoạt động nếu máy không có địa chỉ mạng khả dụng.
        }
        return "Không xác định";
    }
}
</file>

<file path="src/main/java/com/nihongoquest/server/database/Database.java">
package com.nihongoquest.server.database;

import java.io.IOException;
import java.io.InputStream;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Properties;

/** Mở kết nối JDBC tới PostgreSQL từ cấu hình cục bộ db.properties. */
public class Database {

    private final String url;
    private final String user;
    private final String password;

    public Database() {
        Properties properties = loadProperties();
        String host = require(properties, "db.host");
        String port = properties.getProperty("db.port", "5432");
        String name = properties.getProperty("db.name", "postgres");
        boolean ssl = Boolean.parseBoolean(properties.getProperty("db.ssl", "true"));
        url = "jdbc:postgresql://" + host + ":" + port + "/" + name
                + "?sslmode=" + (ssl ? "require" : "disable");
        user = require(properties, "db.user");
        password = require(properties, "db.password");
    }

    /** Constructor dành cho test hoặc cấu hình được truyền rõ ràng. */
    public Database(String url, String user, String password) {
        this.url = url;
        this.user = user;
        this.password = password;
    }

    public Connection getConnection() throws SQLException {
        return DriverManager.getConnection(url, user, password);
    }

    private Properties loadProperties() {
        Properties properties = new Properties();
        try (InputStream input = Database.class.getResourceAsStream("/db.properties")) {
            if (input == null) {
                throw new IllegalStateException(
                        "Thiếu db.properties. Hãy sao chép db.properties.example và điền cấu hình Supabase.");
            }
            properties.load(input);
            return properties;
        } catch (IOException e) {
            throw new IllegalStateException("Không thể đọc db.properties", e);
        }
    }

    private String require(Properties properties, String key) {
        String value = properties.getProperty(key);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Thiếu cấu hình " + key);
        }
        return value.trim();
    }
}
</file>

<file path="src/main/java/com/nihongoquest/server/friend/FriendshipRepository.java">
package com.nihongoquest.server.friend;

import com.nihongoquest.server.database.Database;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/** JDBC đơn giản cho tìm user và bảng friendships đã chuẩn hóa low/high. */
public class FriendshipRepository {
    private final Database database;

    public FriendshipRepository(Database database) {
        this.database = Objects.requireNonNull(database);
    }

    public List<UserRow> searchUsers(long currentUserId, String query) throws SQLException {
        String sql = """
                SELECT id, username
                FROM users
                WHERE id <> ? AND username ILIKE ?
                ORDER BY username ASC
                LIMIT 20
                """;
        List<UserRow> users = new ArrayList<>();
        try (Connection connection = database.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, currentUserId);
            statement.setString(2, "%" + query + "%");
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) users.add(readUser(result));
            }
        }
        return List.copyOf(users);
    }

    public boolean sendRequest(long fromUserId, long toUserId) throws SQLException {
        long low = Math.min(fromUserId, toUserId);
        long high = Math.max(fromUserId, toUserId);
        String sql = """
                INSERT INTO friendships
                    (user_low_id, user_high_id, requested_by_id, status)
                VALUES (?, ?, ?, 'PENDING')
                ON CONFLICT (user_low_id, user_high_id) DO NOTHING
                """;
        try (Connection connection = database.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, low);
            statement.setLong(2, high);
            statement.setLong(3, fromUserId);
            return statement.executeUpdate() == 1;
        }
    }

    public List<UserRow> findIncomingRequests(long userId) throws SQLException {
        String sql = """
                SELECT requester.id, requester.username
                FROM friendships friendship
                JOIN users requester ON requester.id = friendship.requested_by_id
                WHERE friendship.status = 'PENDING'
                  AND friendship.requested_by_id <> ?
                  AND (friendship.user_low_id = ? OR friendship.user_high_id = ?)
                ORDER BY friendship.created_at ASC
                """;
        return findUsers(sql, userId, userId, userId);
    }

    public List<UserRow> findFriends(long userId) throws SQLException {
        String sql = """
                SELECT friend.id, friend.username
                FROM friendships friendship
                JOIN users friend ON friend.id = CASE
                    WHEN friendship.user_low_id = ? THEN friendship.user_high_id
                    ELSE friendship.user_low_id
                END
                WHERE friendship.status = 'ACCEPTED'
                  AND (friendship.user_low_id = ? OR friendship.user_high_id = ?)
                ORDER BY friend.username ASC
                """;
        return findUsers(sql, userId, userId, userId);
    }

    public boolean respond(long currentUserId, long requesterId, boolean accept) throws SQLException {
        long low = Math.min(currentUserId, requesterId);
        long high = Math.max(currentUserId, requesterId);
        String sql = accept ? """
                UPDATE friendships
                SET status = 'ACCEPTED', updated_at = now()
                WHERE user_low_id = ? AND user_high_id = ?
                  AND status = 'PENDING' AND requested_by_id = ?
                """ : """
                DELETE FROM friendships
                WHERE user_low_id = ? AND user_high_id = ?
                  AND status = 'PENDING' AND requested_by_id = ?
                """;
        try (Connection connection = database.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, low);
            statement.setLong(2, high);
            statement.setLong(3, requesterId);
            return statement.executeUpdate() == 1;
        }
    }

    public boolean remove(long userId, long friendId) throws SQLException {
        long low = Math.min(userId, friendId);
        long high = Math.max(userId, friendId);
        String sql = """
                DELETE FROM friendships
                WHERE user_low_id = ? AND user_high_id = ? AND status = 'ACCEPTED'
                """;
        try (Connection connection = database.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, low);
            statement.setLong(2, high);
            return statement.executeUpdate() == 1;
        }
    }

    public boolean areFriends(long firstUserId, long secondUserId) throws SQLException {
        long low = Math.min(firstUserId, secondUserId);
        long high = Math.max(firstUserId, secondUserId);
        String sql = """
                SELECT 1 FROM friendships
                WHERE user_low_id = ? AND user_high_id = ? AND status = 'ACCEPTED'
                """;
        try (Connection connection = database.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, low);
            statement.setLong(2, high);
            try (ResultSet result = statement.executeQuery()) {
                return result.next();
            }
        }
    }

    private List<UserRow> findUsers(String sql, long... parameters) throws SQLException {
        List<UserRow> users = new ArrayList<>();
        try (Connection connection = database.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            for (int i = 0; i < parameters.length; i++) statement.setLong(i + 1, parameters[i]);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) users.add(readUser(result));
            }
        }
        return List.copyOf(users);
    }

    private static UserRow readUser(ResultSet result) throws SQLException {
        return new UserRow(result.getLong("id"), result.getString("username"));
    }

    public record UserRow(long userId, String username) { }
}
</file>

<file path="src/main/java/com/nihongoquest/server/friend/SocialException.java">
package com.nihongoquest.server.friend;

public class SocialException extends RuntimeException {
    private final String code;

    public SocialException(String code) {
        super(code);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
</file>

<file path="src/main/java/com/nihongoquest/server/friend/SocialService.java">
package com.nihongoquest.server.friend;

import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.server.network.ClientHandler;
import com.nihongoquest.server.network.OnlineUserRegistry;
import com.nihongoquest.server.quizroom.QuizRoomException;
import com.nihongoquest.server.quizroom.QuizRoomManager;
import com.nihongoquest.server.ranked.GameRoom;
import com.nihongoquest.server.ranked.MatchmakingManager;

import java.sql.SQLException;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/** Nghiệp vụ bạn bè và lời mời tạm thời trong RAM. */
public class SocialService {
    static final int INVITE_SECONDS = 60;

    private final FriendshipRepository friendships;
    private final OnlineUserRegistry onlineUsers;
    private final MatchmakingManager matchmaking;
    private final QuizRoomManager quizRooms;
    private final ScheduledExecutorService scheduler;
    private final Map<String, GameInvite> invites = new ConcurrentHashMap<>();

    public SocialService(FriendshipRepository friendships, OnlineUserRegistry onlineUsers,
                         MatchmakingManager matchmaking, QuizRoomManager quizRooms,
                         ScheduledExecutorService scheduler) {
        this.friendships = friendships;
        this.onlineUsers = onlineUsers;
        this.matchmaking = matchmaking;
        this.quizRooms = quizRooms;
        this.scheduler = scheduler;
    }

    public void search(ClientHandler client, Payloads.UserSearchRequest request) throws SQLException {
        String query = request == null || request.query() == null ? "" : request.query().trim();
        if (query.isEmpty() || query.length() > 20) throw new SocialException("INVALID_QUERY");
        var users = friendships.searchUsers(client.getPlayerId(), query).stream()
                .map(user -> new Payloads.UserSearchItem(user.userId(), user.username(),
                        onlineUsers.isOnline(user.userId()), onlineUsers.isBusy(user.userId())))
                .toList();
        client.send(new Message(MessageType.USER_SEARCH_RESULT,
                Payloads.toJson(new Payloads.UserSearchData(users))));
    }

    public void sendFriendRequest(ClientHandler client, long targetUserId) throws SQLException {
        requireOtherUser(client, targetUserId);
        if (!friendships.sendRequest(client.getPlayerId(), targetUserId)) {
            throw new SocialException("REQUEST_EXISTS");
        }
        client.send(new Message(MessageType.FRIEND_REQUEST_SENT,
                Payloads.toJson(new Payloads.FriendTarget(targetUserId))));
        ClientHandler target = onlineUsers.find(targetUserId);
        if (target != null && target.isConnected()) sendRequests(target);
    }

    public void sendRequests(ClientHandler client) throws SQLException {
        var requests = friendships.findIncomingRequests(client.getPlayerId()).stream()
                .map(user -> new Payloads.FriendRequestItem(user.userId(), user.username()))
                .toList();
        client.send(new Message(MessageType.FRIEND_REQUEST_LIST,
                Payloads.toJson(new Payloads.FriendRequestListData(requests))));
    }

    public void respondRequest(ClientHandler client, Payloads.FriendRequestReply reply)
            throws SQLException {
        requireOtherUser(client, reply.userId());
        if (!friendships.respond(client.getPlayerId(), reply.userId(), reply.accept())) {
            throw new SocialException("REQUEST_NOT_FOUND");
        }
        client.send(new Message(MessageType.FRIEND_REQUEST_RESPOND,
                Payloads.toJson(reply)));
        sendRequests(client);
        if (reply.accept()) sendFriendList(client);
        ClientHandler requester = onlineUsers.find(reply.userId());
        if (requester != null && requester.isConnected()) {
            if (reply.accept()) sendFriendList(requester);
            else requester.send(new Message(MessageType.FRIEND_REQUEST_RESPOND,
                    Payloads.toJson(reply)));
        }
    }

    public void sendFriendList(ClientHandler client) throws SQLException {
        var friends = friendships.findFriends(client.getPlayerId()).stream()
                .map(friend -> new Payloads.FriendItem(friend.userId(), friend.username(),
                        onlineUsers.isOnline(friend.userId()), onlineUsers.isBusy(friend.userId())))
                .toList();
        client.send(new Message(MessageType.FRIEND_LIST,
                Payloads.toJson(new Payloads.FriendListData(friends))));
    }

    public void removeFriend(ClientHandler client, long friendId) throws SQLException {
        requireOtherUser(client, friendId);
        if (!friendships.remove(client.getPlayerId(), friendId)) {
            throw new SocialException("FRIEND_NOT_FOUND");
        }
        client.send(new Message(MessageType.FRIEND_REMOVED,
                Payloads.toJson(new Payloads.FriendTarget(friendId))));
        ClientHandler friend = onlineUsers.find(friendId);
        if (friend != null && friend.isConnected()) sendFriendList(friend);
    }

    public void sendGameInvite(ClientHandler sender, Payloads.GameInviteSend request)
            throws SQLException {
        requireOtherUser(sender, request.targetUserId());
        if (!friendships.areFriends(sender.getPlayerId(), request.targetUserId())) {
            throw new SocialException("NOT_FRIENDS");
        }
        ClientHandler target = onlineUsers.find(request.targetUserId());
        if (target == null || !target.isConnected()) throw new SocialException("TARGET_OFFLINE");
        if (onlineUsers.isBusy(request.targetUserId()) || hasPendingInvite(request.targetUserId())) {
            throw new SocialException("TARGET_BUSY");
        }

        String type = request.type() == null ? "" : request.type().trim().toUpperCase();
        if ("RANKED".equals(type)) {
            if (onlineUsers.isBusy(sender.getPlayerId())) throw new SocialException("SENDER_BUSY");
            if (request.durationSeconds() != GameRoom.THREE_MINUTES
                    && request.durationSeconds() != GameRoom.FIVE_MINUTES) {
                throw new SocialException("INVALID_DURATION");
            }
        } else if ("QUIZ".equals(type)) {
            if (!quizRooms.isHostOfLobby(sender, request.roomPin())) {
                throw new SocialException("NOT_QUIZ_HOST");
            }
        } else {
            throw new SocialException("INVALID_INVITE_TYPE");
        }

        long expiresAt = Instant.now().plusSeconds(INVITE_SECONDS).toEpochMilli();
        GameInvite invite = new GameInvite(UUID.randomUUID().toString(), sender.getPlayerId(),
                sender.getUsername(), target.getPlayerId(), type, request.durationSeconds(),
                request.roomPin(), expiresAt);
        invites.put(invite.id(), invite);
        scheduler.schedule(() -> expire(invite.id()), INVITE_SECONDS, TimeUnit.SECONDS);
        target.send(new Message(MessageType.GAME_INVITE_RECEIVED,
                Payloads.toJson(invite.toPayload())));
        sendInviteStatus(sender, invite.id(), "SENT");
    }

    public void respondGameInvite(ClientHandler target, Payloads.GameInviteRespond response)
            throws SQLException {
        GameInvite invite = invites.remove(response.inviteId());
        if (invite == null || invite.targetUserId() != target.getPlayerId()
                || invite.expiresAtEpochMillis() <= System.currentTimeMillis()) {
            throw new SocialException("INVITE_EXPIRED");
        }
        ClientHandler sender = onlineUsers.find(invite.senderUserId());
        if (!response.accept()) {
            sendInviteStatus(target, invite.id(), "REJECTED");
            if (sender != null) sendInviteStatus(sender, invite.id(), "REJECTED");
            return;
        }
        if (sender == null || !sender.isConnected()) throw new SocialException("SENDER_OFFLINE");
        if (!friendships.areFriends(sender.getPlayerId(), target.getPlayerId())) {
            throw new SocialException("NOT_FRIENDS");
        }
        try {
            if ("RANKED".equals(invite.type())) {
                matchmaking.createDirectMatch(sender, target, invite.durationSeconds());
            } else {
                if (!quizRooms.isHostOfLobby(sender, invite.roomPin())) {
                    throw new SocialException("ROOM_STARTED");
                }
                quizRooms.joinFromInvite(target, invite.roomPin());
            }
        } catch (QuizRoomException e) {
            throw new SocialException(e.getCode());
        } catch (IllegalStateException e) {
            throw new SocialException(e.getMessage());
        }
        sendInviteStatus(target, invite.id(), "ACCEPTED");
        sendInviteStatus(sender, invite.id(), "ACCEPTED");
    }

    public void onLogin(ClientHandler client) {
        broadcastPresence(client.getPlayerId(), true);
    }

    public void onLogout(ClientHandler client) {
        Long userId = client.getPlayerId();
        if (userId == null) return;
        broadcastPresence(userId, false);
        invites.values().stream()
                .filter(invite -> invite.senderUserId() == userId || invite.targetUserId() == userId)
                .toList()
                .forEach(invite -> cancelForDisconnect(invite, userId));
    }

    private void broadcastPresence(long userId, boolean online) {
        try {
            for (FriendshipRepository.UserRow friend : friendships.findFriends(userId)) {
                ClientHandler target = onlineUsers.find(friend.userId());
                if (target != null && target.isConnected()) {
                    target.send(new Message(MessageType.PRESENCE_UPDATE,
                            Payloads.toJson(new Payloads.PresenceData(
                                    userId, online, online && onlineUsers.isBusy(userId)))));
                }
            }
        } catch (SQLException ignored) {
            // Presence là dữ liệu phụ; lỗi DB không làm ngắt phiên đăng nhập.
        }
    }

    private void expire(String inviteId) {
        GameInvite invite = invites.remove(inviteId);
        if (invite == null) return;
        sendInviteStatus(onlineUsers.find(invite.senderUserId()), invite.id(), "EXPIRED");
        sendInviteStatus(onlineUsers.find(invite.targetUserId()), invite.id(), "EXPIRED");
    }

    private void cancelForDisconnect(GameInvite invite, long disconnectedUserId) {
        if (!invites.remove(invite.id(), invite)) return;
        long otherId = invite.senderUserId() == disconnectedUserId
                ? invite.targetUserId() : invite.senderUserId();
        sendInviteStatus(onlineUsers.find(otherId), invite.id(), "CANCELLED");
    }

    private boolean hasPendingInvite(long targetUserId) {
        long now = System.currentTimeMillis();
        return invites.values().stream().anyMatch(invite ->
                invite.targetUserId() == targetUserId && invite.expiresAtEpochMillis() > now);
    }

    private void sendInviteStatus(ClientHandler client, String inviteId, String status) {
        if (client != null && client.isConnected()) {
            client.send(new Message(MessageType.GAME_INVITE_STATUS,
                    Payloads.toJson(new Payloads.GameInviteStatus(inviteId, status))));
        }
    }

    private void requireOtherUser(ClientHandler client, long userId) {
        if (!client.isAuthenticated()) throw new SocialException("NOT_AUTHENTICATED");
        if (userId <= 0 || userId == client.getPlayerId()) {
            throw new SocialException("INVALID_USER");
        }
    }

    record GameInvite(String id, long senderUserId, String senderUsername,
                      long targetUserId, String type, int durationSeconds,
                      String roomPin, long expiresAtEpochMillis) {
        Payloads.GameInviteReceived toPayload() {
            return new Payloads.GameInviteReceived(id, senderUserId, senderUsername,
                    type, durationSeconds, roomPin, expiresAtEpochMillis);
        }
    }
}
</file>

<file path="src/main/java/com/nihongoquest/server/network/TrafficEvent.java">
package com.nihongoquest.server.network;

import java.time.Instant;

/** Một JSON frame được trao đổi giữa server và client. */
public record TrafficEvent(
        Instant timestamp,
        Direction direction,
        String client,
        String json) {

    public enum Direction {
        RECEIVED,
        SENT
    }
}
</file>

<file path="src/main/java/com/nihongoquest/server/question/Choice.java">
package com.nihongoquest.server.question;

/** Database-independent, server-only choice including its answer key. */
public record Choice(long id, long questionId, String content, boolean correct, int position) { }
</file>

<file path="src/main/java/com/nihongoquest/server/question/Question.java">
package com.nihongoquest.server.question;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

/** Server-only snapshot; never serialize this model directly to a client. */
public final class Question {
    private final long id;
    private final String content;
    private final String category;
    private final String level;
    private final String explanation;
    private final List<Choice> choices;

    public Question(long id, String content, String category, String level,
                    String explanation, List<Choice> choices) {
        this.id = id;
        this.content = content;
        this.category = category;
        this.level = level;
        this.explanation = explanation;
        // Keep malformed data inspectable by the service, which logs its question ID.
        List<Choice> ordered = new ArrayList<>(choices == null ? List.of() : choices);
        ordered.sort(Comparator.nullsLast(Comparator.comparingInt(Choice::position)));
        this.choices = Collections.unmodifiableList(ordered);
    }

    public long getId() { return id; }
    public String getContent() { return content; }
    public String getCategory() { return category; }
    public String getLevel() { return level; }
    public String getExplanation() { return explanation; }
    public List<Choice> getChoices() { return choices; }

    public int indexOfChoice(long choiceId) {
        for (int i = 0; i < choices.size(); i++) {
            if (choices.get(i).id() == choiceId) {
                return i;
            }
        }
        return -1;
    }

    /** Used only for the existing post-answer feedback payload. */
    public int getCorrectAnswerIndex() {
        for (int i = 0; i < choices.size(); i++) {
            if (choices.get(i).correct()) {
                return i;
            }
        }
        throw new IllegalStateException("Question id=" + id + " has no correct answer");
    }
}
</file>

<file path="src/main/java/com/nihongoquest/server/quiz/.gitkeep">

</file>

<file path="src/main/java/com/nihongoquest/server/quiz/QuizSetException.java">
package com.nihongoquest.server.quiz;

/** Lỗi nghiệp vụ ngắn gọn để client có thể hiển thị thông báo phù hợp. */
public class QuizSetException extends RuntimeException {
    private final String code;

    public QuizSetException(String code) {
        super(code);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
</file>

<file path="src/main/java/com/nihongoquest/server/quizroom/QuizRoomException.java">
package com.nihongoquest.server.quizroom;

/** Mã lỗi nghiệp vụ của phòng Quiz. */
public class QuizRoomException extends RuntimeException {
    private final String code;

    public QuizRoomException(String code) {
        super(code);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
</file>

<file path="src/main/java/com/nihongoquest/server/ServerLauncher.java">
package com.nihongoquest.server;

import com.nihongoquest.server.dashboard.ServerDashboardApp;
import javafx.application.Application;

/** Plain Java entry point for IDE runs with JavaFX dependencies on the classpath. */
public final class ServerLauncher {
    private ServerLauncher() { }

    public static void main(String[] args) {
        Application.launch(ServerDashboardApp.class, args);
    }
}
</file>

<file path="src/main/resources/client/auth/login.fxml">
<?xml version="1.0" encoding="UTF-8"?>

<?import javafx.geometry.Insets?>
<?import javafx.scene.control.Button?>
<?import javafx.scene.control.Hyperlink?>
<?import javafx.scene.control.Label?>
<?import javafx.scene.control.PasswordField?>
<?import javafx.scene.control.TextField?>
<?import javafx.scene.layout.HBox?>
<?import javafx.scene.layout.StackPane?>
<?import javafx.scene.layout.VBox?>

<StackPane styleClass="root"
           xmlns="http://javafx.com/javafx/21"
           xmlns:fx="http://javafx.com/fxml/1"
           fx:controller="com.nihongoquest.client.auth.LoginController">
    <padding>
        <Insets top="40" right="40" bottom="40" left="40"/>
    </padding>

    <HBox alignment="CENTER" spacing="24">
        <VBox alignment="CENTER_LEFT" spacing="14" styleClass="connection-card" maxWidth="300">
            <Label text="KẾT NỐI SERVER" styleClass="connection-title"/>
            <Label text="Nhập địa chỉ của máy đang chạy Server Dashboard"
                   styleClass="connection-subtitle" wrapText="true" maxWidth="240"/>

            <Label text="Địa chỉ IP hoặc hostname" styleClass="field-caption"/>
            <TextField fx:id="serverHostField" promptText="Ví dụ: 192.168.1.100"
                       prefWidth="240" maxWidth="240"/>
            <Label text="Cổng" styleClass="field-caption"/>
            <TextField fx:id="serverPortField" promptText="5000"
                       prefWidth="240" maxWidth="240" onAction="#onConnect"/>

            <Button fx:id="connectButton" text="KẾT NỐI" onAction="#onConnect"
                    prefWidth="240" styleClass="primary-button"/>
            <Label fx:id="connectionStatusLabel" text="Chưa kết nối tới server"
                   styleClass="connection-status-label" wrapText="true" maxWidth="240"/>
        </VBox>

        <VBox alignment="CENTER" spacing="14" styleClass="auth-card" maxWidth="420">
            <Label text="NIHONGO QUEST" styleClass="brand-title"/>
            <Label fx:id="authTitle" text="ĐĂNG NHẬP" styleClass="auth-title"/>
            <Label fx:id="authSubtitle" text="Chào mừng bạn quay lại"
                   styleClass="auth-subtitle"/>

            <TextField fx:id="usernameField" promptText="Username" maxWidth="320"/>
            <PasswordField fx:id="passwordField" promptText="Mật khẩu" maxWidth="320"
                           onAction="#onSubmit"/>
            <PasswordField fx:id="confirmPasswordField" promptText="Xác nhận mật khẩu"
                           maxWidth="320" onAction="#onSubmit"
                           visible="false" managed="false"/>

            <Button fx:id="submitButton" text="ĐĂNG NHẬP" onAction="#onSubmit"
                    prefWidth="320" styleClass="primary-button" disable="true"/>

            <Label fx:id="statusLabel" text="Hãy kết nối server trước khi đăng nhập"
                   styleClass="status-label" wrapText="true" maxWidth="320"/>

            <HBox alignment="CENTER" spacing="4">
                <Label fx:id="modePromptLabel" text="Chưa có tài khoản?"/>
                <Hyperlink fx:id="modeLink" text="Đăng ký"
                           onAction="#onToggleMode" styleClass="mode-link"/>
            </HBox>
        </VBox>
    </HBox>
</StackPane>
</file>

<file path="src/main/resources/client/layout/authenticated-shell.fxml">
<?xml version="1.0" encoding="UTF-8"?>

<?import javafx.scene.control.*?>
<?import javafx.scene.layout.*?>

<HBox fx:id="shellRoot" styleClass="root,authenticated-shell"
      xmlns="http://javafx.com/javafx/21"
      xmlns:fx="http://javafx.com/fxml/1"
      fx:controller="com.nihongoquest.client.layout.AuthenticatedShellController">
    <VBox fx:id="sidebar" prefWidth="232" minWidth="232" maxWidth="232"
          styleClass="app-sidebar">
        <VBox spacing="4" styleClass="sidebar-brand-block">
            <Label text="NIHONGO" styleClass="sidebar-brand-primary"/>
            <Label text="QUEST" styleClass="sidebar-brand-accent"/>
            <Label text="HỌC • THI ĐẤU • TIẾN BỘ" styleClass="sidebar-tagline"/>
        </VBox>
        <Separator styleClass="sidebar-separator"/>
        <VBox spacing="6" styleClass="sidebar-menu" VBox.vgrow="ALWAYS">
            <Button fx:id="matchmakingButton" text="Đấu hạng 1v1" onAction="#onMatchmaking"
                    maxWidth="Infinity" styleClass="sidebar-button"/>
            <Button fx:id="quizRoomButton" text="Phòng Quiz" onAction="#onQuizRoom"
                    maxWidth="Infinity" styleClass="sidebar-button"/>
            <Button fx:id="quizSetsButton" text="Quản lý bộ đề" onAction="#onQuizSets"
                    maxWidth="Infinity" styleClass="sidebar-button"/>
            <Button fx:id="leaderboardButton" text="Bảng xếp hạng" onAction="#onLeaderboard"
                    maxWidth="Infinity" styleClass="sidebar-button"/>
            <Button fx:id="historyButton" text="Lịch sử thi đấu" onAction="#onHistory"
                    maxWidth="Infinity" styleClass="sidebar-button"/>
            <Button fx:id="friendsButton" text="Bạn bè" onAction="#onFriends"
                    maxWidth="Infinity" styleClass="sidebar-button"/>
        </VBox>
        <Separator styleClass="sidebar-separator"/>
        <VBox spacing="6" styleClass="sidebar-footer">
            <Button fx:id="profileButton" text="Hồ sơ" onAction="#onProfile"
                    maxWidth="Infinity" styleClass="sidebar-button"/>
            <Button text="Đăng xuất" onAction="#onLogout"
                    maxWidth="Infinity" styleClass="sidebar-button,sidebar-logout-button"/>
        </VBox>
    </VBox>
    <BorderPane HBox.hgrow="ALWAYS" styleClass="authenticated-main">
        <top>
            <VBox fx:id="sharedHeader" spacing="3" styleClass="shared-page-header">
                <Label fx:id="pageTitleLabel" text="Đấu hạng 1v1" styleClass="shared-page-title"/>
                <Label fx:id="pageSubtitleLabel" text="" styleClass="shared-page-subtitle"/>
            </VBox>
        </top>
        <center>
            <StackPane fx:id="contentHost" styleClass="authenticated-content"/>
        </center>
    </BorderPane>
</HBox>
</file>

<file path="src/main/resources/client/profile/.gitkeep">

</file>

<file path="src/main/resources/client/profile/profile.fxml">
<?xml version="1.0" encoding="UTF-8"?>

<?import javafx.scene.control.*?>
<?import javafx.scene.layout.*?>

<VBox alignment="TOP_CENTER" spacing="24" styleClass="profile-page"
      xmlns="http://javafx.com/javafx/21"
      xmlns:fx="http://javafx.com/fxml/1"
      fx:controller="com.nihongoquest.client.profile.ProfileController">
    <HBox alignment="CENTER_LEFT" spacing="18" styleClass="profile-hero">
        <StackPane styleClass="profile-page-avatar">
            <Label fx:id="avatarLabel" text="N" styleClass="profile-page-avatar-text"/>
        </StackPane>
        <VBox spacing="5">
            <Label text="NGƯỜI CHƠI" styleClass="profile-eyebrow"/>
            <Label fx:id="usernameLabel" text="Username" styleClass="profile-page-username"/>
            <Label text="Thành tích được đồng bộ trực tiếp từ máy chủ"
                   styleClass="shared-page-subtitle"/>
        </VBox>
    </HBox>
    <GridPane hgap="16" vgap="16" styleClass="profile-stats-grid">
        <columnConstraints>
            <ColumnConstraints percentWidth="33.333" hgrow="ALWAYS"/>
            <ColumnConstraints percentWidth="33.333" hgrow="ALWAYS"/>
            <ColumnConstraints percentWidth="33.333" hgrow="ALWAYS"/>
        </columnConstraints>
        <VBox alignment="CENTER" spacing="6" styleClass="profile-stat-card" GridPane.columnIndex="0" GridPane.rowIndex="0">
            <Label fx:id="winsLabel" text="0" styleClass="profile-stat-value,stat-win"/>
            <Label text="TRẬN THẮNG" styleClass="stat-caption"/>
        </VBox>
        <VBox alignment="CENTER" spacing="6" styleClass="profile-stat-card" GridPane.columnIndex="1" GridPane.rowIndex="0">
            <Label fx:id="lossesLabel" text="0" styleClass="profile-stat-value,stat-loss"/>
            <Label text="TRẬN THUA" styleClass="stat-caption"/>
        </VBox>
        <VBox alignment="CENTER" spacing="6" styleClass="profile-stat-card" GridPane.columnIndex="2" GridPane.rowIndex="0">
            <Label fx:id="drawsLabel" text="0" styleClass="profile-stat-value"/>
            <Label text="TRẬN HÒA" styleClass="stat-caption"/>
        </VBox>
        <VBox alignment="CENTER" spacing="6" styleClass="profile-stat-card" GridPane.columnIndex="0" GridPane.rowIndex="1">
            <Label fx:id="totalScoreLabel" text="0" styleClass="profile-stat-value"/>
            <Label text="TỔNG ĐIỂM" styleClass="stat-caption"/>
        </VBox>
        <VBox alignment="CENTER" spacing="6" styleClass="profile-stat-card" GridPane.columnIndex="1" GridPane.rowIndex="1">
            <Label fx:id="questionsLabel" text="0" styleClass="profile-stat-value"/>
            <Label text="CÂU ĐÃ TRẢ LỜI" styleClass="stat-caption"/>
        </VBox>
        <VBox alignment="CENTER" spacing="6" styleClass="profile-stat-card" GridPane.columnIndex="2" GridPane.rowIndex="1">
            <Label fx:id="correctAnswersLabel" text="0" styleClass="profile-stat-value,stat-correct"/>
            <Label text="CÂU TRẢ LỜI ĐÚNG" styleClass="stat-caption"/>
        </VBox>
    </GridPane>
    <HBox alignment="CENTER_LEFT" spacing="16" styleClass="accuracy-card">
        <Label fx:id="accuracyLabel" text="0%" styleClass="accuracy-value"/>
        <VBox spacing="3">
            <Label text="TỶ LỆ CHÍNH XÁC" styleClass="section-title"/>
            <Label text="Tỷ lệ được tính trên tổng số câu đã trả lời"
                   styleClass="shared-page-subtitle"/>
        </VBox>
    </HBox>
    <Label fx:id="statusLabel" text="" styleClass="status-label"/>
</VBox>
</file>

<file path="src/main/resources/client/quiz/.gitkeep">

</file>

<file path="src/main/resources/server/dashboard/server-dashboard.css">
.dashboard-root {
    -fx-font-family: "Segoe UI", Arial, sans-serif;
    -fx-background-color: #f1f5f9;
}

.header {
    -fx-background-color: linear-gradient(to right, #0f172a, #1e3a5f);
}

.brand { -fx-text-fill: #7dd3fc; -fx-font-size: 13px; -fx-font-weight: bold; }
.page-title { -fx-text-fill: white; -fx-font-size: 25px; -fx-font-weight: bold; }
.field-label { -fx-text-fill: #cbd5e1; }

.text-field {
    -fx-background-color: rgba(255,255,255,0.12);
    -fx-text-fill: white;
    -fx-border-color: #475569;
    -fx-border-radius: 7px;
    -fx-background-radius: 7px;
    -fx-padding: 8px 10px;
}

.button {
    -fx-cursor: hand;
    -fx-font-weight: bold;
    -fx-background-radius: 7px;
    -fx-padding: 9px 15px;
}
.primary-button { -fx-background-color: #0284c7; -fx-text-fill: white; }
.primary-button:hover { -fx-background-color: #0369a1; }
.danger-button { -fx-background-color: #dc2626; -fx-text-fill: white; }
.danger-button:hover { -fx-background-color: #b91c1c; }
.secondary-button { -fx-background-color: #e2e8f0; -fx-text-fill: #334155; }
.outline-danger-button {
    -fx-background-color: transparent;
    -fx-border-color: #ef4444;
    -fx-border-radius: 7px;
    -fx-text-fill: #dc2626;
}
.button:disabled { -fx-opacity: 0.48; }

.server-status {
    -fx-padding: 7px 12px;
    -fx-background-radius: 20px;
    -fx-font-size: 12px;
    -fx-font-weight: bold;
}
.status-running { -fx-background-color: #166534; -fx-text-fill: #bbf7d0; }
.status-stopped { -fx-background-color: #475569; -fx-text-fill: #e2e8f0; }
.status-starting { -fx-background-color: #854d0e; -fx-text-fill: #fef08a; }

.metric-card {
    -fx-background-color: rgba(255,255,255,0.08);
    -fx-background-radius: 10px;
    -fx-padding: 13px 16px;
    -fx-min-width: 160px;
}
.metric-title { -fx-text-fill: #94a3b8; -fx-font-size: 11px; -fx-font-weight: bold; }
.metric-value { -fx-text-fill: #ffffff; -fx-font-size: 25px; -fx-font-weight: bold; }

.content-panel { -fx-padding: 18px 28px; -fx-background-color: #f8fafc; }
.log-panel { -fx-background-color: #eef2f7; }
.section-title { -fx-font-size: 17px; -fx-font-weight: bold; -fx-text-fill: #0f172a; }

.table-view {
    -fx-background-color: white;
    -fx-border-color: #dbe3ed;
    -fx-border-radius: 8px;
    -fx-background-radius: 8px;
}
.table-view .column-header-background { -fx-background-color: #eaf0f6; }
.table-view .column-header { -fx-background-color: transparent; -fx-padding: 9px; }
.table-row-cell { -fx-cell-size: 39px; -fx-background-color: white; }
.table-row-cell:odd { -fx-background-color: #f8fafc; }
.table-row-cell:selected { -fx-background-color: #bae6fd; -fx-text-background-color: #0c4a6e; }

.activity-list {
    -fx-background-color: #0f172a;
    -fx-background-radius: 8px;
    -fx-border-radius: 8px;
    -fx-font-family: Consolas, monospace;
    -fx-font-size: 12px;
}
.activity-list .list-cell { -fx-background-color: #0f172a; -fx-text-fill: #cbd5e1; -fx-padding: 5px 10px; }
.activity-list .list-cell:filled:selected { -fx-background-color: #1e3a5f; }
.dashboard-tabs { -fx-background-color: #eef2f7; -fx-tab-min-height: 30px; }
.dashboard-tabs .tab-content-area { -fx-background-color: #eef2f7; }
.json-panel { -fx-background-color: #eef2f7; }
.json-column-title { -fx-text-fill: #334155; -fx-font-size: 12px; -fx-font-weight: bold; }
.json-area {
    -fx-control-inner-background: #0f172a;
    -fx-text-fill: #e2e8f0;
    -fx-highlight-fill: #1e3a5f;
    -fx-highlight-text-fill: white;
    -fx-font-family: Consolas, monospace;
    -fx-font-size: 12px;
    -fx-border-color: #334155;
    -fx-border-radius: 8px;
    -fx-background-radius: 8px;
}
.json-area .content { -fx-background-color: #0f172a; }
.split-pane { -fx-background-color: transparent; -fx-padding: 0; }
.split-pane-divider { -fx-background-color: #cbd5e1; -fx-padding: 1px; }
</file>

<file path="src/main/resources/server/dashboard/server-dashboard.fxml">
<?xml version="1.0" encoding="UTF-8"?>

<?import javafx.geometry.Insets?>
<?import javafx.scene.control.*?>
<?import javafx.scene.layout.*?>

<BorderPane xmlns="http://javafx.com/javafx/21"
            xmlns:fx="http://javafx.com/fxml/1"
            fx:controller="com.nihongoquest.server.dashboard.DashboardController"
            styleClass="dashboard-root">
    <top>
        <VBox spacing="18" styleClass="header">
            <padding><Insets top="22" right="28" bottom="20" left="28"/></padding>
            <HBox alignment="CENTER_LEFT" spacing="14">
                <VBox HBox.hgrow="ALWAYS" spacing="3">
                    <Label text="NihongoQuest" styleClass="brand"/>
                    <Label text="Bảng điều khiển máy chủ" styleClass="page-title"/>
                </VBox>
                <Label fx:id="serverStatusLabel" text="ĐÃ DỪNG"
                       styleClass="server-status,status-stopped"/>
                <Label text="IP máy chủ" styleClass="field-label"/>
                <TextField fx:id="serverIpField" prefWidth="130" editable="false"/>
                <Button fx:id="copyIpButton" text="Sao chép" onAction="#copyServerIp"
                        styleClass="button,secondary-button"/>
                <Label text="Cổng" styleClass="field-label"/>
                <TextField fx:id="portField" prefWidth="88"/>
                <Button fx:id="startButton" text="Khởi động" onAction="#startServer"
                        styleClass="button,primary-button"/>
                <Button fx:id="stopButton" text="Dừng server" onAction="#stopServer"
                        styleClass="button,danger-button" disable="true"/>
            </HBox>
            <HBox spacing="14">
                <VBox styleClass="metric-card" HBox.hgrow="ALWAYS">
                    <Label text="KẾT NỐI" styleClass="metric-title"/>
                    <Label fx:id="connectionCountLabel" text="0" styleClass="metric-value"/>
                </VBox>
                <VBox styleClass="metric-card" HBox.hgrow="ALWAYS">
                    <Label text="ĐÃ ĐĂNG NHẬP" styleClass="metric-title"/>
                    <Label fx:id="authenticatedCountLabel" text="0" styleClass="metric-value"/>
                </VBox>
                <VBox styleClass="metric-card" HBox.hgrow="ALWAYS">
                    <Label text="ĐANG CHỜ" styleClass="metric-title"/>
                    <Label fx:id="waitingCountLabel" text="0" styleClass="metric-value"/>
                </VBox>
                <VBox styleClass="metric-card" HBox.hgrow="ALWAYS">
                    <Label text="TRẬN ĐANG DIỄN RA" styleClass="metric-title"/>
                    <Label fx:id="roomCountLabel" text="0" styleClass="metric-value"/>
                </VBox>
            </HBox>
        </VBox>
    </top>
    <center>
        <SplitPane orientation="VERTICAL" dividerPositions="0.62">
            <VBox spacing="10" styleClass="content-panel">
                <HBox alignment="CENTER_LEFT">
                    <Label text="Người dùng đang kết nối" styleClass="section-title"
                           HBox.hgrow="ALWAYS"/>
                    <Button fx:id="disconnectButton" text="Ngắt kết nối đã chọn"
                            onAction="#disconnectSelectedClient" disable="true"
                            styleClass="button,outline-danger-button"/>
                </HBox>
                <TableView fx:id="clientTable" VBox.vgrow="ALWAYS">
                    <placeholder>
                        <Label text="Chưa có người dùng kết nối"/>
                    </placeholder>
                    <columns>
                        <TableColumn fx:id="usernameColumn" text="Người dùng" prefWidth="180"/>
                        <TableColumn fx:id="addressColumn" text="Địa chỉ" prefWidth="210"/>
                        <TableColumn fx:id="statusColumn" text="Trạng thái" prefWidth="190"/>
                        <TableColumn fx:id="connectedAtColumn" text="Kết nối lúc" prefWidth="150"/>
                        <TableColumn fx:id="lastActivityColumn" text="Hoạt động cuối" prefWidth="160"/>
                    </columns>
                </TableView>
            </VBox>
            <TabPane styleClass="dashboard-tabs" tabClosingPolicy="UNAVAILABLE">
                <tabs>
                    <Tab text="Nhật ký hoạt động">
                        <VBox spacing="10" styleClass="content-panel,log-panel">
                            <HBox alignment="CENTER_LEFT">
                                <Label text="Nhật ký hoạt động" styleClass="section-title"
                                       HBox.hgrow="ALWAYS"/>
                                <Button text="Xóa nhật ký" onAction="#clearActivity"
                                        styleClass="button,secondary-button"/>
                            </HBox>
                            <ListView fx:id="activityList" VBox.vgrow="ALWAYS"
                                      styleClass="activity-list"/>
                        </VBox>
                    </Tab>
                    <Tab text="Dữ liệu JSON">
                        <VBox spacing="10" styleClass="content-panel,json-panel">
                            <HBox alignment="CENTER_LEFT">
                                <Label text="Dữ liệu trao đổi qua socket" styleClass="section-title"
                                       HBox.hgrow="ALWAYS"/>
                                <Button text="Xóa dữ liệu JSON" onAction="#clearTraffic"
                                        styleClass="button,secondary-button"/>
                            </HBox>
                            <HBox spacing="14" VBox.vgrow="ALWAYS">
                                <VBox spacing="6" HBox.hgrow="ALWAYS">
                                    <Label text="SERVER NHẬN" styleClass="json-column-title"/>
                                    <TextArea fx:id="receivedJsonArea" editable="false"
                                              wrapText="false" VBox.vgrow="ALWAYS"
                                              styleClass="json-area"/>
                                </VBox>
                                <VBox spacing="6" HBox.hgrow="ALWAYS">
                                    <Label text="SERVER GỬI" styleClass="json-column-title"/>
                                    <TextArea fx:id="sentJsonArea" editable="false"
                                              wrapText="false" VBox.vgrow="ALWAYS"
                                              styleClass="json-area"/>
                                </VBox>
                            </HBox>
                        </VBox>
                    </Tab>
                </tabs>
            </TabPane>
        </SplitPane>
    </center>
</BorderPane>
</file>

<file path="src/main/resources/client.properties">
server.host=localhost
server.port=5000
</file>

<file path="src/main/resources/client.properties.example">
# Đổi thành địa chỉ LAN của máy chạy GameServer khi demo hai máy.
server.host=192.168.1.100
server.port=5000
</file>

<file path="src/test/java/com/nihongoquest/server/dashboard/ServerAddressResolverTest.java">
package com.nihongoquest.server.dashboard;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class ServerAddressResolverTest {

    @Test
    void returnsIpv4AddressOrExplicitUnavailableMessage() {
        String address = ServerAddressResolver.resolveIpv4();

        assertTrue(address.equals("Không xác định")
                        || address.matches("(?:\\d{1,3}\\.){3}\\d{1,3}"),
                () -> "Địa chỉ server không hợp lệ: " + address);
    }
}
</file>

<file path="src/test/java/com/nihongoquest/server/friend/FriendshipRepositoryTest.java">
package com.nihongoquest.server.friend;

import com.nihongoquest.server.database.Database;
import org.junit.jupiter.api.Test;

import javax.sql.rowset.CachedRowSet;
import javax.sql.rowset.RowSetMetaDataImpl;
import javax.sql.rowset.RowSetProvider;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Types;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FriendshipRepositoryTest {
    @Test
    void normalizesPairForRequestRespondRemoveAndFriendCheck() throws Exception {
        JdbcStub jdbc = new JdbcStub();
        FriendshipRepository repository = new FriendshipRepository(jdbc.database());

        assertTrue(repository.sendRequest(9, 3));
        assertTrue(repository.respond(9, 3, true));
        assertTrue(repository.areFriends(9, 3));
        assertTrue(repository.remove(9, 3));

        assertEquals(Map.of(1, 3L, 2, 9L, 3, 9L), jdbc.parameters.get(0));
        assertEquals(Map.of(1, 3L, 2, 9L, 3, 3L), jdbc.parameters.get(1));
        assertEquals(Map.of(1, 3L, 2, 9L), jdbc.parameters.get(2));
        assertEquals(Map.of(1, 3L, 2, 9L), jdbc.parameters.get(3));
        assertTrue(jdbc.sql.getFirst().contains("ON CONFLICT"));
        assertTrue(jdbc.sql.get(1).contains("status = 'ACCEPTED'"));
    }

    private static final class JdbcStub {
        final List<String> sql = new ArrayList<>();
        final List<Map<Integer, Object>> parameters = new ArrayList<>();

        Database database() {
            return new Database("jdbc:test", "", "") {
                @Override public Connection getConnection() { return connection(); }
            };
        }

        private Connection connection() {
            return (Connection) Proxy.newProxyInstance(getClass().getClassLoader(),
                    new Class<?>[]{Connection.class}, (proxy, method, args) -> switch (method.getName()) {
                        case "prepareStatement" -> statement((String) args[0]);
                        case "close" -> null;
                        default -> throw new AssertionError("Unexpected connection call " + method.getName());
                    });
        }

        private PreparedStatement statement(String query) {
            sql.add(query);
            Map<Integer, Object> values = new HashMap<>();
            parameters.add(values);
            return (PreparedStatement) Proxy.newProxyInstance(getClass().getClassLoader(),
                    new Class<?>[]{PreparedStatement.class}, (proxy, method, args) -> switch (method.getName()) {
                        case "setLong" -> { values.put((Integer) args[0], args[1]); yield null; }
                        case "executeUpdate" -> 1;
                        case "executeQuery" -> oneRow();
                        case "close" -> null;
                        default -> throw new AssertionError("Unexpected statement call " + method.getName());
                    });
        }

        private ResultSet oneRow() throws Exception {
            CachedRowSet rows = RowSetProvider.newFactory().createCachedRowSet();
            RowSetMetaDataImpl metadata = new RowSetMetaDataImpl();
            metadata.setColumnCount(1);
            metadata.setColumnName(1, "exists");
            metadata.setColumnType(1, Types.INTEGER);
            rows.setMetaData(metadata);
            rows.moveToInsertRow();
            rows.updateInt(1, 1);
            rows.insertRow();
            rows.moveToCurrentRow();
            rows.beforeFirst();
            return rows;
        }
    }
}
</file>

<file path="src/test/java/com/nihongoquest/server/friend/SocialServiceTest.java">
package com.nihongoquest.server.friend;

import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.server.network.ClientHandler;
import com.nihongoquest.server.network.OnlineUserRegistry;
import com.nihongoquest.server.question.QuestionFixtures;
import com.nihongoquest.server.question.QuestionService;
import com.nihongoquest.server.quiz.QuizSetRepository;
import com.nihongoquest.server.quiz.QuizSetService;
import com.nihongoquest.server.quizroom.QuizRoomManager;
import com.nihongoquest.server.ranked.MatchRepository;
import com.nihongoquest.server.ranked.MatchmakingManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.net.Socket;
import java.sql.SQLException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Delayed;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import static com.nihongoquest.server.question.QuestionFixtures.question;
import static org.junit.jupiter.api.Assertions.*;

class SocialServiceTest {
    private RecordingScheduler scheduler;
    private OnlineUserRegistry online;
    private FakeQuizRooms quizRooms;
    private SocialService social;
    private StubClient sender;
    private StubClient target;

    @BeforeEach
    void setUp() {
        scheduler = new RecordingScheduler();
        online = new OnlineUserRegistry();
        MatchmakingManager matchmaking = new MatchmakingManager(
                new QuestionService(new QuestionFixtures.Bank(List.of(
                        question(1, 4, 1), question(2, 4, 1), question(3, 4, 1)))),
                new FakeMatches(), scheduler);
        quizRooms = new FakeQuizRooms(scheduler);
        social = new SocialService(new FakeFriendships(), online, matchmaking, quizRooms, scheduler);
        sender = new StubClient(1);
        target = new StubClient(2);
        assertTrue(online.login(1, sender));
        assertTrue(online.login(2, target));
    }

    @AfterEach
    void tearDown() {
        scheduler.shutdownNow();
    }

    @Test
    void acceptedRankedInviteCreatesDirectMatchWithoutQueue() throws Exception {
        social.sendGameInvite(sender, new Payloads.GameInviteSend(2, "RANKED", 180, null));
        Payloads.GameInviteReceived invite = target.invite();
        assertTrue(invite.expiresAtEpochMillis() > System.currentTimeMillis());
        assertEquals(60, scheduler.firstDelaySeconds);

        social.respondGameInvite(target, new Payloads.GameInviteRespond(invite.inviteId(), true));

        assertNotNull(sender.getCurrentRoom());
        assertSame(sender.getCurrentRoom(), target.getCurrentRoom());
        assertNotNull(sender.first(MessageType.MATCH_FOUND));
        assertEquals("ACCEPTED", target.lastStatus().status());
    }

    @Test
    void quizInviteRequiresHostAndJoinsOnAccept() throws Exception {
        quizRooms.host = false;
        assertEquals("NOT_QUIZ_HOST", assertThrows(SocialException.class,
                () -> social.sendGameInvite(sender,
                        new Payloads.GameInviteSend(2, "QUIZ", 0, "123456"))).getCode());

        quizRooms.host = true;
        social.sendGameInvite(sender, new Payloads.GameInviteSend(2, "QUIZ", 0, "123456"));
        Payloads.GameInviteReceived invite = target.invite();
        social.respondGameInvite(target, new Payloads.GameInviteRespond(invite.inviteId(), true));

        assertSame(target, quizRooms.joined);
        assertEquals("123456", quizRooms.joinedPin);
    }

    @Test
    void rejectsOfflineBusyAndExpiredInvites() throws Exception {
        online.logout(target);
        assertEquals("TARGET_OFFLINE", assertThrows(SocialException.class,
                () -> social.sendGameInvite(sender,
                        new Payloads.GameInviteSend(2, "RANKED", 180, null))).getCode());

        assertTrue(online.login(2, target));
        target.setQueued(true);
        assertEquals("TARGET_BUSY", assertThrows(SocialException.class,
                () -> social.sendGameInvite(sender,
                        new Payloads.GameInviteSend(2, "RANKED", 180, null))).getCode());
        target.setQueued(false);

        social.sendGameInvite(sender, new Payloads.GameInviteSend(2, "RANKED", 180, null));
        String inviteId = target.invite().inviteId();
        scheduler.runFirst();
        assertEquals("EXPIRED", target.lastStatus().status());
        assertEquals("INVITE_EXPIRED", assertThrows(SocialException.class,
                () -> social.respondGameInvite(target,
                        new Payloads.GameInviteRespond(inviteId, true))).getCode());
    }

    private static final class FakeFriendships extends FriendshipRepository {
        FakeFriendships() { super(QuestionFixtures.offlineDatabase()); }
        @Override public boolean areFriends(long first, long second) { return true; }
        @Override public List<UserRow> findFriends(long userId) { return List.of(); }
    }

    private static final class FakeQuizRooms extends QuizRoomManager {
        boolean host = true;
        ClientHandler joined;
        String joinedPin;

        FakeQuizRooms(RecordingScheduler scheduler) {
            super(new QuizSetService(new QuizSetRepository(QuestionFixtures.offlineDatabase())), scheduler);
        }

        @Override public boolean isHostOfLobby(ClientHandler client, String pin) { return host; }
        @Override public void joinFromInvite(ClientHandler client, String pin) {
            joined = client;
            joinedPin = pin;
        }
    }

    private static final class FakeMatches extends MatchRepository {
        FakeMatches() { super(QuestionFixtures.offlineDatabase()); }
        @Override public void saveResult(MatchResult first, MatchResult second, int duration,
                                         EndReason reason, Long forfeiting) throws SQLException { }
    }

    private static final class StubClient extends ClientHandler {
        final List<Message> messages = new CopyOnWriteArrayList<>();
        StubClient(long id) {
            super(new Socket());
            setAuthenticatedPlayer(id, "player" + id);
        }
        @Override public boolean isConnected() { return true; }
        @Override public void send(Message message) { messages.add(message); }
        Message first(MessageType type) {
            return messages.stream().filter(message -> message.getType() == type)
                    .findFirst().orElse(null);
        }
        Payloads.GameInviteReceived invite() {
            Message message = messages.stream()
                    .filter(item -> item.getType() == MessageType.GAME_INVITE_RECEIVED)
                    .reduce((first, second) -> second).orElseThrow();
            return Payloads.fromJson(message.getPayload(), Payloads.GameInviteReceived.class);
        }
        Payloads.GameInviteStatus lastStatus() {
            Message message = messages.stream()
                    .filter(item -> item.getType() == MessageType.GAME_INVITE_STATUS)
                    .reduce((first, second) -> second).orElseThrow();
            return Payloads.fromJson(message.getPayload(), Payloads.GameInviteStatus.class);
        }
    }

    private static final class RecordingScheduler extends ScheduledThreadPoolExecutor {
        Runnable firstTask;
        long firstDelaySeconds;
        RecordingScheduler() { super(1); }
        @Override public ScheduledFuture<?> schedule(Runnable command, long delay, TimeUnit unit) {
            if (firstTask == null) {
                firstTask = command;
                firstDelaySeconds = unit.toSeconds(delay);
            }
            return new NoopFuture();
        }
        void runFirst() { firstTask.run(); }
    }

    private static final class NoopFuture implements ScheduledFuture<Object> {
        @Override public long getDelay(TimeUnit unit) { return 0; }
        @Override public int compareTo(Delayed other) { return 0; }
        @Override public boolean cancel(boolean mayInterruptIfRunning) { return true; }
        @Override public boolean isCancelled() { return false; }
        @Override public boolean isDone() { return false; }
        @Override public Object get() { return null; }
        @Override public Object get(long timeout, TimeUnit unit) { return null; }
    }
}
</file>

<file path="src/test/java/com/nihongoquest/server/player/PlayerRepositoryQueryTest.java">
package com.nihongoquest.server.player;

import com.nihongoquest.server.database.Database;
import org.junit.jupiter.api.Test;

import javax.sql.rowset.CachedRowSet;
import javax.sql.rowset.RowSetMetaDataImpl;
import javax.sql.rowset.RowSetProvider;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PlayerRepositoryQueryTest {
    @Test
    void loadsFreshProfileAndOrderedTopTenWithPreparedStatements() throws Exception {
        JdbcStub jdbc = new JdbcStub();
        PlayerRepository repository = new PlayerRepository(jdbc.database());

        PlayerRepository.PlayerData profile = repository.findProfile(7);
        List<PlayerRepository.LeaderboardPlayer> leaderboard = repository.findLeaderboard(10);

        assertEquals("sakura", profile.username());
        assertEquals(2, profile.draws());
        assertEquals(240, profile.totalScore());
        assertEquals(Map.of(1, 7L), jdbc.parameters.get(0));
        assertEquals(Map.of(1, 10), jdbc.parameters.get(1));
        assertTrue(jdbc.sql.get(1).contains(
                "ORDER BY wins DESC, total_score DESC, username ASC"));
        assertEquals(1, leaderboard.getFirst().rank());
        assertEquals("tanaka", leaderboard.getFirst().username());
        assertEquals(900, leaderboard.getFirst().totalScore());
    }

    @Test
    void rejectsLeaderboardLimitOutsideSimpleProjectBoundary() {
        PlayerRepository repository = new PlayerRepository(new Database("jdbc:test", "", ""));
        org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
                () -> repository.findLeaderboard(101));
    }

    private static final class JdbcStub {
        final List<String> sql = new ArrayList<>();
        final List<Map<Integer, Object>> parameters = new ArrayList<>();

        Database database() {
            return new Database("jdbc:test", "", "") {
                @Override public Connection getConnection() {
                    return connection();
                }
            };
        }

        private Connection connection() {
            return (Connection) Proxy.newProxyInstance(getClass().getClassLoader(),
                    new Class<?>[]{Connection.class}, (proxy, method, args) -> switch (method.getName()) {
                        case "prepareStatement" -> statement((String) args[0]);
                        case "close" -> null;
                        default -> throw new AssertionError("Unexpected connection call " + method.getName());
                    });
        }

        private PreparedStatement statement(String query) {
            sql.add(query);
            Map<Integer, Object> values = new HashMap<>();
            parameters.add(values);
            return (PreparedStatement) Proxy.newProxyInstance(getClass().getClassLoader(),
                    new Class<?>[]{PreparedStatement.class}, (proxy, method, args) -> switch (method.getName()) {
                        case "setLong", "setInt" -> { values.put((Integer) args[0], args[1]); yield null; }
                        case "executeQuery" -> query.contains("WHERE id = ?") ? profileRows() : leaderboardRows();
                        case "close" -> null;
                        default -> throw new AssertionError("Unexpected statement call " + method.getName());
                    });
        }

        private ResultSet profileRows() throws SQLException {
            return row(new String[]{"id", "username", "wins", "losses", "draws", "total_score",
                            "questions_answered", "correct_answers"},
                    new int[]{Types.BIGINT, Types.VARCHAR, Types.INTEGER, Types.INTEGER,
                            Types.INTEGER, Types.INTEGER, Types.INTEGER, Types.INTEGER},
                    new Object[]{7L, "sakura", 4, 1, 2, 240, 20, 12});
        }

        private ResultSet leaderboardRows() throws SQLException {
            return row(new String[]{"id", "username", "wins", "losses", "draws", "total_score"},
                    new int[]{Types.BIGINT, Types.VARCHAR, Types.INTEGER, Types.INTEGER,
                            Types.INTEGER, Types.INTEGER},
                    new Object[]{9L, "tanaka", 8, 2, 1, 900});
        }

        private CachedRowSet row(String[] columns, int[] types, Object[] values) throws SQLException {
            CachedRowSet rows = RowSetProvider.newFactory().createCachedRowSet();
            RowSetMetaDataImpl metadata = new RowSetMetaDataImpl();
            metadata.setColumnCount(columns.length);
            for (int i = 0; i < columns.length; i++) {
                metadata.setColumnName(i + 1, columns[i]);
                metadata.setColumnType(i + 1, types[i]);
            }
            rows.setMetaData(metadata);
            rows.moveToInsertRow();
            for (int i = 0; i < values.length; i++) rows.updateObject(i + 1, values[i]);
            rows.insertRow();
            rows.moveToCurrentRow();
            rows.beforeFirst();
            return rows;
        }
    }
}
</file>

<file path="src/test/java/com/nihongoquest/server/quiz/QuizSetRepositoryTest.java">
package com.nihongoquest.server.quiz;

import com.nihongoquest.server.database.Database;
import org.junit.jupiter.api.Test;

import javax.sql.rowset.CachedRowSet;
import javax.sql.rowset.RowSetMetaDataImpl;
import javax.sql.rowset.RowSetProvider;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class QuizSetRepositoryTest {
    @Test
    void listQueriesKeepSqlClausesSeparatedAndBindOnlyOwnerId() throws Exception {
        JdbcStub jdbc = new JdbcStub();
        QuizSetRepository repository = new QuizSetRepository(jdbc.database());

        repository.listOwned(7L);
        repository.listPublished(7L);

        assertEquals(2, jdbc.sql.size());
        assertTrue(normalize(jdbc.sql.get(0)).contains(
                "WHERE qs.owner_id = ? GROUP BY qs.id, u.username"));
        assertTrue(normalize(jdbc.sql.get(1)).contains(
                "WHERE qs.is_published = TRUE GROUP BY qs.id, u.username"));
        assertEquals(Map.of(1, 7L), jdbc.parameters.get(0));
        assertTrue(jdbc.parameters.get(1).isEmpty());
    }

    private static String normalize(String sql) {
        return sql.replaceAll("\\s+", " ").trim();
    }

    private static final class JdbcStub {
        final List<String> sql = new ArrayList<>();
        final List<Map<Integer, Object>> parameters = new ArrayList<>();

        Database database() {
            return new Database("jdbc:test", "", "") {
                @Override public Connection getConnection() {
                    return connection();
                }
            };
        }

        private Connection connection() {
            return (Connection) Proxy.newProxyInstance(getClass().getClassLoader(),
                    new Class<?>[]{Connection.class}, (proxy, method, args) -> switch (method.getName()) {
                        case "prepareStatement" -> statement((String) args[0]);
                        case "close" -> null;
                        default -> throw new AssertionError("Unexpected connection call " + method.getName());
                    });
        }

        private PreparedStatement statement(String query) {
            sql.add(query);
            Map<Integer, Object> values = new HashMap<>();
            parameters.add(values);
            return (PreparedStatement) Proxy.newProxyInstance(getClass().getClassLoader(),
                    new Class<?>[]{PreparedStatement.class}, (proxy, method, args) -> switch (method.getName()) {
                        case "setLong" -> { values.put((Integer) args[0], args[1]); yield null; }
                        case "setQueryTimeout", "close" -> null;
                        case "executeQuery" -> emptyRows();
                        default -> throw new AssertionError("Unexpected statement call " + method.getName());
                    });
        }

        private ResultSet emptyRows() throws SQLException {
            CachedRowSet rows = RowSetProvider.newFactory().createCachedRowSet();
            RowSetMetaDataImpl metadata = new RowSetMetaDataImpl();
            String[] columns = {"id", "owner_id", "owner_username", "title", "description",
                    "level", "is_published", "question_count"};
            int[] types = {Types.BIGINT, Types.BIGINT, Types.VARCHAR, Types.VARCHAR,
                    Types.VARCHAR, Types.VARCHAR, Types.BOOLEAN, Types.INTEGER};
            metadata.setColumnCount(columns.length);
            for (int i = 0; i < columns.length; i++) {
                metadata.setColumnName(i + 1, columns[i]);
                metadata.setColumnType(i + 1, types[i]);
            }
            rows.setMetaData(metadata);
            return rows;
        }
    }
}
</file>

<file path="src/test/java/com/nihongoquest/server/quiz/QuizSetServiceTest.java">
package com.nihongoquest.server.quiz;

import com.nihongoquest.common.protocol.Payloads;
import org.junit.jupiter.api.Test;

import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class QuizSetServiceTest {

    @Test
    void draftMayBeEmptyButPublishingNeedsThreeValidQuestions() throws SQLException {
        FakeRepository repository = new FakeRepository();
        QuizSetService service = new QuizSetService(repository);
        Payloads.QuizSetEdit emptyDraft = new Payloads.QuizSetEdit(
                null, "  Từ vựng N5  ", null, "n5", List.of());

        long savedId = service.save(7, emptyDraft);

        assertEquals(99, savedId);
        assertEquals("Từ vựng N5", repository.saved.title());
        assertEquals("N5", repository.saved.level());
        repository.stored = new QuizSetRepository.StoredQuizSet(7, false,
                new Payloads.QuizSetEdit(99L, "Từ vựng", "", "N5", List.of(validQuestion())));
        QuizSetException error = assertThrows(QuizSetException.class,
                () -> service.publish(7, 99, true));
        assertEquals("INVALID_QUIZ", error.getCode());
        assertFalse(repository.published);
    }

    @Test
    void publishesThreeValidQuestionsAndRejectsAnotherOwner() throws SQLException {
        FakeRepository repository = new FakeRepository();
        List<Payloads.QuizQuestionEdit> questions = List.of(
                validQuestion(), validQuestion(), validQuestion());
        repository.stored = new QuizSetRepository.StoredQuizSet(7, false,
                new Payloads.QuizSetEdit(5L, "Ngữ pháp", "", "N4", questions));
        QuizSetService service = new QuizSetService(repository);

        service.publish(7, 5, true);
        assertTrue(repository.published);

        QuizSetException error = assertThrows(QuizSetException.class,
                () -> service.publish(8, 5, true));
        assertEquals("NOT_OWNER", error.getCode());
    }

    @Test
    void rejectsMalformedChoicesAndPrivateSetFromAnotherUser() {
        Payloads.QuizQuestionEdit malformed = new Payloads.QuizQuestionEdit(
                null, "Câu hỏi", "", List.of(
                new Payloads.QuizChoiceEdit(null, "A", 1, true),
                new Payloads.QuizChoiceEdit(null, "B", 1, false),
                new Payloads.QuizChoiceEdit(null, "C", 3, false),
                new Payloads.QuizChoiceEdit(null, "D", 4, false)));
        assertEquals("INVALID_QUIZ", assertThrows(QuizSetException.class,
                () -> QuizSetService.validate(new Payloads.QuizSetEdit(
                        null, "Đề", "", "N5", List.of(malformed)), false)).getCode());

        FakeRepository repository = new FakeRepository();
        repository.stored = new QuizSetRepository.StoredQuizSet(7, false,
                new Payloads.QuizSetEdit(5L, "Đề", "", "N5", List.of()));
        QuizSetService service = new QuizSetService(repository);
        assertEquals("NOT_OWNER", assertThrows(QuizSetException.class,
                () -> service.get(8, 5)).getCode());
    }

    private static Payloads.QuizQuestionEdit validQuestion() {
        return new Payloads.QuizQuestionEdit(null, "日本語 là gì?", "Tiếng Nhật", List.of(
                new Payloads.QuizChoiceEdit(null, "Tiếng Nhật", 1, true),
                new Payloads.QuizChoiceEdit(null, "Tiếng Anh", 2, false),
                new Payloads.QuizChoiceEdit(null, "Tiếng Việt", 3, false),
                new Payloads.QuizChoiceEdit(null, "Tiếng Hàn", 4, false)));
    }

    private static class FakeRepository extends QuizSetRepository {
        private Payloads.QuizSetEdit saved;
        private StoredQuizSet stored;
        private boolean published;

        FakeRepository() {
            super(null);
        }

        @Override
        public long save(long ownerId, Payloads.QuizSetEdit quizSet) {
            saved = quizSet;
            return 99;
        }

        @Override
        public Optional<StoredQuizSet> findById(long quizSetId) {
            return Optional.ofNullable(stored);
        }

        @Override
        public void setPublished(long quizSetId, long ownerId, boolean value) {
            published = value;
        }
    }
}
</file>

<file path="src/test/java/com/nihongoquest/server/quizroom/QuizRoomManagerTest.java">
package com.nihongoquest.server.quizroom;

import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.server.network.ClientHandler;
import com.nihongoquest.server.quiz.QuizSetRepository;
import com.nihongoquest.server.quiz.QuizSetService;
import org.junit.jupiter.api.Test;

import java.net.Socket;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class QuizRoomManagerTest {
    @Test
    void generatesUniqueSixDigitPinsAndRejectsUnknownPin() throws Exception {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        int[] pins = {123456, 123456, 654321};
        AtomicInteger index = new AtomicInteger();
        QuizRoomManager manager = new QuizRoomManager(
                new FakeQuizSets(), scheduler, () -> pins[index.getAndIncrement()]);
        StubClient first = new StubClient(1);
        StubClient second = new StubClient(2);
        try {
            manager.create(first, new Payloads.QuizRoomCreateRequest(5, 3, true));
            manager.create(second, new Payloads.QuizRoomCreateRequest(5, 5, false));

            String firstPin = created(first).lobby().pin();
            String secondPin = created(second).lobby().pin();
            assertEquals("123456", firstPin);
            assertEquals("654321", secondPin);
            assertNotEquals(firstPin, secondPin);
            assertEquals(2, manager.activeRoomCount());

            StubClient stranger = new StubClient(3);
            assertEquals("INVALID_PIN", assertThrows(QuizRoomException.class,
                    () -> manager.join(stranger, "123")).getCode());
            assertEquals("ROOM_NOT_FOUND", assertThrows(QuizRoomException.class,
                    () -> manager.join(stranger, "999999")).getCode());
        } finally {
            manager.cancel(first);
            manager.cancel(second);
            scheduler.shutdownNow();
        }
    }

    private static Payloads.QuizRoomCreated created(StubClient client) {
        Message message = client.messages.stream()
                .filter(item -> item.getType() == MessageType.QUIZ_ROOM_CREATED)
                .findFirst().orElseThrow();
        return Payloads.fromJson(message.getPayload(), Payloads.QuizRoomCreated.class);
    }

    private static final class FakeQuizSets extends QuizSetService {
        FakeQuizSets() {
            super(new QuizSetRepository(null));
        }

        @Override
        public Payloads.QuizSetEdit getPublishedForRoom(long quizSetId) {
            return new Payloads.QuizSetEdit(quizSetId, "Demo", "", "N5",
                    List.of(question(1), question(2), question(3)));
        }

        private Payloads.QuizQuestionEdit question(long id) {
            return new Payloads.QuizQuestionEdit(id, "Question " + id, "", List.of(
                    new Payloads.QuizChoiceEdit(id * 10 + 1, "A", 1, true),
                    new Payloads.QuizChoiceEdit(id * 10 + 2, "B", 2, false),
                    new Payloads.QuizChoiceEdit(id * 10 + 3, "C", 3, false),
                    new Payloads.QuizChoiceEdit(id * 10 + 4, "D", 4, false)));
        }
    }

    private static final class StubClient extends ClientHandler {
        final List<Message> messages = new CopyOnWriteArrayList<>();

        StubClient(long id) {
            super(new Socket());
            setAuthenticatedPlayer(id, "player" + id);
        }

        @Override public boolean isConnected() { return true; }
        @Override public void send(Message message) { messages.add(message); }
    }
}
</file>

<file path="src/test/java/com/nihongoquest/server/quizroom/QuizRoomTest.java">
package com.nihongoquest.server.quizroom;

import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.server.network.ClientHandler;
import com.nihongoquest.server.question.Question;
import com.nihongoquest.server.question.QuestionFixtures;
import org.junit.jupiter.api.Test;

import java.net.Socket;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import static com.nihongoquest.server.question.QuestionFixtures.question;
import static org.junit.jupiter.api.Assertions.*;

class QuizRoomTest {
    private static final List<Question> BANK = List.of(
            question(1, 4, 1), question(2, 4, 1), question(3, 4, 1));

    @Test
    void lobbyNeedsTwoPlayersAndLocksAfterStart() {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        StubClient host = new StubClient(1);
        StubClient guest = new StubClient(2);
        QuizRoom room = room(host, true, scheduler, new AtomicLong(), new AtomicInteger());
        try {
            assertEquals("NOT_ENOUGH_PLAYERS", assertThrows(QuizRoomException.class,
                    () -> room.start(host)).getCode());
            room.join(guest);
            room.start(host);
            assertTrue(room.isRunning());
            assertEquals("ROOM_STARTED", assertThrows(QuizRoomException.class,
                    () -> room.join(new StubClient(3))).getCode());
            assertNotNull(host.first(MessageType.QUIZ_QUESTION));
            assertNotNull(guest.first(MessageType.QUIZ_QUESTION));
        } finally {
            room.cancelByHost(host);
            scheduler.shutdownNow();
        }
    }

    @Test
    void roomAllowsAtMostTwentyPlayersAndHostCancelNotifiesEveryone() {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        StubClient host = new StubClient(1);
        StubClient lastGuest = null;
        QuizRoom room = room(host, true, scheduler, new AtomicLong(), new AtomicInteger());
        try {
            for (int id = 2; id <= 20; id++) {
                lastGuest = new StubClient(id);
                room.join(lastGuest);
            }
            StubClient overflow = new StubClient(21);
            assertEquals("ROOM_FULL", assertThrows(QuizRoomException.class,
                    () -> room.join(overflow)).getCode());
            room.cancelByHost(host);
            assertTrue(room.isFinished());
            assertEquals("HOST_CANCELLED",
                    lastGuest.last(MessageType.QUIZ_ROOM_CANCEL).payloadText());
        } finally {
            scheduler.shutdownNow();
        }
    }

    @Test
    void hostMayControlWithoutAppearingInPlayerLeaderboard() {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        StubClient host = new StubClient(1);
        StubClient first = new StubClient(2);
        StubClient second = new StubClient(3);
        QuizRoom room = room(host, false, scheduler, new AtomicLong(), new AtomicInteger());
        try {
            room.join(first);
            room.join(second);
            room.start(host);

            assertNull(host.firstOrNull(MessageType.QUIZ_QUESTION));
            Payloads.QuizLeaderboardData board = Payloads.fromJson(
                    host.last(MessageType.QUIZ_LEADERBOARD).getPayload(),
                    Payloads.QuizLeaderboardData.class);
            assertEquals(2, board.entries().size());
            assertTrue(board.entries().stream().noneMatch(entry -> entry.userId() == 1));
            assertEquals(1, board.entries().get(0).rank());
            assertEquals(1, board.entries().get(1).rank());
        } finally {
            room.cancelByHost(host);
            scheduler.shutdownNow();
        }
    }

    @Test
    void scoresBySpeedAndBuildsLiveLeaderboardWithTiedRanks() {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        AtomicLong time = new AtomicLong();
        StubClient host = new StubClient(1);
        StubClient guest = new StubClient(2);
        QuizRoom room = room(host, true, scheduler, time, new AtomicInteger());
        try {
            room.join(guest);
            room.start(host);
            Payloads.QuizQuestionData hostQuestion = questionData(host);
            Payloads.QuizQuestionData guestQuestion = questionData(guest);

            room.answer(host, answer(hostQuestion, 0));
            Payloads.QuizAnswerResult fast = Payloads.fromJson(
                    host.last(MessageType.QUIZ_ANSWER_RESULT).getPayload(),
                    Payloads.QuizAnswerResult.class);
            assertEquals(1000, fast.scoreAwarded());

            time.set(TimeUnit.SECONDS.toNanos(15));
            room.answer(guest, answer(guestQuestion, 0));
            Payloads.QuizAnswerResult slower = Payloads.fromJson(
                    guest.last(MessageType.QUIZ_ANSWER_RESULT).getPayload(),
                    Payloads.QuizAnswerResult.class);
            assertEquals(750, slower.scoreAwarded());

            Payloads.QuizLeaderboardData board = Payloads.fromJson(
                    host.last(MessageType.QUIZ_LEADERBOARD).getPayload(),
                    Payloads.QuizLeaderboardData.class);
            assertEquals(1, board.entries().getFirst().rank());
            assertEquals("player1", board.entries().getFirst().username());
            assertEquals(1000, board.entries().getFirst().score());
        } finally {
            room.cancelByHost(host);
            scheduler.shutdownNow();
        }
    }

    @Test
    void disconnectRejoinsSameAttemptButExplicitLeaveCannotRejoin() {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        AtomicLong time = new AtomicLong();
        StubClient host = new StubClient(1);
        StubClient guest = new StubClient(2);
        QuizRoom room = room(host, true, scheduler, time, new AtomicInteger());
        try {
            room.join(guest);
            room.start(host);
            Payloads.QuizQuestionData original = questionData(guest);
            guest.connected = false;
            room.disconnected(guest);
            assertTrue(room.isRunning());

            time.set(TimeUnit.SECONDS.toNanos(10));
            StubClient reconnected = new StubClient(2);
            assertTrue(room.reconnect(reconnected));
            Payloads.QuizQuestionData resumed = Payloads.fromJson(
                    reconnected.last(MessageType.QUIZ_QUESTION).getPayload(),
                    Payloads.QuizQuestionData.class);
            assertEquals(original.attempt(), resumed.attempt());
            assertEquals(original.questionId(), resumed.questionId());
            assertEquals(20, resumed.questionDurationSeconds());
            assertNotNull(reconnected.first(MessageType.QUIZ_REJOINED));

            room.leave(reconnected);
            assertFalse(room.reconnect(new StubClient(2)));
        } finally {
            room.cancelByHost(host);
            scheduler.shutdownNow();
        }
    }

    @Test
    void roomRepeatsQuestionsAndFinishesAtSharedDeadline() {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        AtomicLong time = new AtomicLong();
        AtomicInteger finished = new AtomicInteger();
        StubClient host = new StubClient(1);
        StubClient guest = new StubClient(2);
        QuizRoom room = room(host, true, scheduler, time, finished);
        try {
            room.join(guest);
            room.start(host);
            for (int attempt = 1; attempt <= 3; attempt++) {
                Payloads.QuizQuestionData current = Payloads.fromJson(
                        host.last(MessageType.QUIZ_QUESTION).getPayload(),
                        Payloads.QuizQuestionData.class);
                assertEquals(attempt, current.attempt());
                room.answer(host, answer(current, 1));
            }
            Payloads.QuizQuestionData repeated = Payloads.fromJson(
                    host.last(MessageType.QUIZ_QUESTION).getPayload(),
                    Payloads.QuizQuestionData.class);
            assertEquals(4, repeated.attempt());
            assertEquals(1, repeated.questionId());

            time.set(TimeUnit.MINUTES.toNanos(3));
            room.answer(host, answer(repeated, 0));
            assertTrue(room.isFinished());
            assertEquals(1, finished.get());
            Payloads.QuizLeaderboardData finalBoard = Payloads.fromJson(
                    host.last(MessageType.QUIZ_ROOM_FINISHED).getPayload(),
                    Payloads.QuizLeaderboardData.class);
            assertTrue(finalBoard.finished());
        } finally {
            scheduler.shutdownNow();
        }
    }

    private static QuizRoom room(StubClient host, boolean hostPlays,
                                 ScheduledExecutorService scheduler, AtomicLong time,
                                 AtomicInteger finished) {
        return new QuizRoom("123456", host, "Demo", hostPlays, 180, BANK,
                scheduler, time::get, ignored -> finished.incrementAndGet());
    }

    private static Payloads.QuizQuestionData questionData(StubClient client) {
        return Payloads.fromJson(client.last(MessageType.QUIZ_QUESTION).getPayload(),
                Payloads.QuizQuestionData.class);
    }

    private static Payloads.QuizAnswerData answer(Payloads.QuizQuestionData question, int index) {
        return new Payloads.QuizAnswerData(question.sessionId(), question.attempt(),
                question.questionId(), question.choices().get(index).choiceId());
    }

    private static final class StubClient extends ClientHandler {
        final List<Message> messages = new CopyOnWriteArrayList<>();
        final long id;
        boolean connected = true;

        StubClient(long id) {
            super(new Socket());
            this.id = id;
            setAuthenticatedPlayer(id, "player" + id);
        }

        @Override public boolean isConnected() { return connected; }
        @Override public boolean isAuthenticated() { return true; }
        @Override public void send(Message message) { messages.add(message); }

        Message first(MessageType type) {
            return messages.stream().filter(message -> message.getType() == type)
                    .findFirst().orElseThrow();
        }

        Message firstOrNull(MessageType type) {
            return messages.stream().filter(message -> message.getType() == type)
                    .findFirst().orElse(null);
        }

        Message last(MessageType type) {
            return messages.stream().filter(message -> message.getType() == type)
                    .reduce((first, second) -> second).orElseThrow();
        }
    }
}
</file>

<file path="src/test/java/com/nihongoquest/server/ranked/MatchRepositoryHistoryTest.java">
package com.nihongoquest.server.ranked;

import com.nihongoquest.server.database.Database;
import org.junit.jupiter.api.Test;

import javax.sql.rowset.CachedRowSet;
import javax.sql.rowset.RowSetMetaDataImpl;
import javax.sql.rowset.RowSetProvider;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MatchRepositoryHistoryTest {
    @Test
    void returnsNewestMatchesFromCurrentPlayerPerspective() throws Exception {
        JdbcStub jdbc = new JdbcStub();

        List<MatchRepository.MatchHistoryItem> history =
                new MatchRepository(jdbc.database()).findHistory(8, 100);

        MatchRepository.MatchHistoryItem match = history.getFirst();
        assertEquals("sakura", match.opponentUsername());
        assertEquals(5, match.myScore());
        assertEquals(3, match.opponentScore());
        assertEquals("WIN", match.result());
        assertEquals("2026-10-19T05:00:00Z", match.playedAt());
        assertTrue(jdbc.sql.contains("ORDER BY m.played_at DESC"));
        assertEquals(Map.of(1, 8L, 2, 8L, 3, 100), jdbc.parameters);
    }

    private static final class JdbcStub {
        String sql;
        final Map<Integer, Object> parameters = new HashMap<>();

        Database database() {
            return new Database("jdbc:test", "", "") {
                @Override public Connection getConnection() {
                    return connection();
                }
            };
        }

        private Connection connection() {
            return (Connection) Proxy.newProxyInstance(getClass().getClassLoader(),
                    new Class<?>[]{Connection.class}, (proxy, method, args) -> switch (method.getName()) {
                        case "prepareStatement" -> {
                            sql = (String) args[0];
                            yield statement();
                        }
                        case "close" -> null;
                        default -> throw new AssertionError("Unexpected connection call " + method.getName());
                    });
        }

        private PreparedStatement statement() {
            return (PreparedStatement) Proxy.newProxyInstance(getClass().getClassLoader(),
                    new Class<?>[]{PreparedStatement.class}, (proxy, method, args) -> switch (method.getName()) {
                        case "setLong", "setInt" -> { parameters.put((Integer) args[0], args[1]); yield null; }
                        case "setQueryTimeout", "close" -> null;
                        case "executeQuery" -> rows();
                        default -> throw new AssertionError("Unexpected statement call " + method.getName());
                    });
        }

        private ResultSet rows() throws SQLException {
            String[] columns = {"id", "player1_id", "player2_id", "player1_username",
                    "player2_username", "score1", "score2", "winner_id",
                    "duration_seconds", "end_reason", "played_at"};
            int[] types = {Types.BIGINT, Types.BIGINT, Types.BIGINT, Types.VARCHAR,
                    Types.VARCHAR, Types.INTEGER, Types.INTEGER, Types.BIGINT,
                    Types.INTEGER, Types.VARCHAR, Types.TIMESTAMP};
            Object[] values = {21L, 7L, 8L, "sakura", "tanaka", 3, 5, 8L,
                    180, "NORMAL", Timestamp.from(Instant.parse("2026-10-19T05:00:00Z"))};
            CachedRowSet rows = RowSetProvider.newFactory().createCachedRowSet();
            RowSetMetaDataImpl metadata = new RowSetMetaDataImpl();
            metadata.setColumnCount(columns.length);
            for (int i = 0; i < columns.length; i++) {
                metadata.setColumnName(i + 1, columns[i]);
                metadata.setColumnType(i + 1, types[i]);
            }
            rows.setMetaData(metadata);
            rows.moveToInsertRow();
            for (int i = 0; i < values.length; i++) rows.updateObject(i + 1, values[i]);
            rows.insertRow();
            rows.moveToCurrentRow();
            rows.beforeFirst();
            return rows;
        }
    }
}
</file>

<file path="src/test/java/com/nihongoquest/server/ranked/MatchRepositoryTest.java">
package com.nihongoquest.server.ranked;

import com.nihongoquest.server.database.Database;
import com.nihongoquest.server.ranked.MatchRepository.EndReason;
import com.nihongoquest.server.ranked.MatchRepository.MatchResult;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class MatchRepositoryTest {
    @Test
    void savesOneMatchAndBothStatisticsInOneTransaction() throws Exception {
        JdbcStub jdbc = new JdbcStub();
        new MatchRepository(jdbc.database()).saveResult(
                new MatchResult(2, 3, 4, 3), new MatchResult(1, 1, 4, 1),
                180, EndReason.NORMAL, null);

        assertEquals(3, jdbc.writes.size());
        assertTrue(jdbc.writes.getFirst().sql().contains("INSERT INTO matches"));
        assertEquals(2L, jdbc.writes.getFirst().params().get(1));
        assertEquals(1L, jdbc.writes.getFirst().params().get(2));
        assertEquals(2L, jdbc.writes.getFirst().params().get(5));
        assertEquals(180, jdbc.writes.getFirst().params().get(6));
        assertEquals("NORMAL", jdbc.writes.getFirst().params().get(7));
        assertEquals(1L, jdbc.writes.get(1).params().get(7));
        assertEquals(2L, jdbc.writes.get(2).params().get(7));
        assertEquals(1, jdbc.commits);
        assertEquals(0, jdbc.rollbacks);
        assertTrue(jdbc.closed);
    }

    @Test
    void rollsBackWhenAnyWriteFails() {
        JdbcStub jdbc = new JdbcStub();
        jdbc.failAt = 2;
        assertThrows(SQLException.class, () -> new MatchRepository(jdbc.database()).saveResult(
                new MatchResult(1, 0, 0, 0), new MatchResult(2, 0, 0, 0),
                300, EndReason.NORMAL, null));
        assertEquals(0, jdbc.commits);
        assertEquals(1, jdbc.rollbacks);
        assertTrue(jdbc.closed);
    }

    @Test
    void disconnectOverridesScoreWhenChoosingWinner() {
        MatchResult first = new MatchResult(1, 10, 10, 10);
        MatchResult second = new MatchResult(2, 0, 0, 0);
        assertEquals(2L, MatchRepository.winner(first, second, 1L));
        assertNull(MatchRepository.winner(first, new MatchResult(2, 10, 10, 10), null));
    }

    private record Write(String sql, Map<Integer, Object> params) { }

    private static final class JdbcStub {
        final List<Write> writes = new ArrayList<>();
        int commits;
        int rollbacks;
        int writeCount;
        int failAt;
        boolean closed;

        Database database() {
            return new Database("jdbc:test", "", "") {
                @Override public Connection getConnection() {
                    return connection();
                }
            };
        }

        private Connection connection() {
            return (Connection) Proxy.newProxyInstance(getClass().getClassLoader(),
                    new Class<?>[]{Connection.class}, (proxy, method, args) -> switch (method.getName()) {
                        case "setAutoCommit" -> null;
                        case "prepareStatement" -> statement((String) args[0]);
                        case "commit" -> { commits++; yield null; }
                        case "rollback" -> { rollbacks++; yield null; }
                        case "close" -> { closed = true; yield null; }
                        default -> throw new AssertionError("Unexpected connection call " + method.getName());
                    });
        }

        private PreparedStatement statement(String sql) {
            Map<Integer, Object> params = new HashMap<>();
            return (PreparedStatement) Proxy.newProxyInstance(getClass().getClassLoader(),
                    new Class<?>[]{PreparedStatement.class}, (proxy, method, args) -> switch (method.getName()) {
                        case "setLong", "setInt", "setString" -> {
                            params.put((Integer) args[0], args[1]); yield null;
                        }
                        case "setNull" -> { params.put((Integer) args[0], null); yield null; }
                        case "setQueryTimeout", "close" -> null;
                        case "executeUpdate" -> {
                            if (++writeCount == failAt) throw new SQLException("Injected failure");
                            writes.add(new Write(sql, new HashMap<>(params)));
                            yield 1;
                        }
                        default -> throw new AssertionError("Unexpected statement call " + method.getName());
                    });
        }
    }
}
</file>

<file path="src/test/resources/db.properties">
# Test-only placeholders. Unit/FXML tests never connect to Supabase.
db.host=127.0.0.1
db.port=1
db.name=nihongoquest_test
db.user=test_only
db.password=test_only
db.ssl=false
</file>

<file path="src/main/java/com/nihongoquest/client/friend/FriendsController.java">
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
        app.expectInviteTransition("RANKED");
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
</file>

<file path="src/main/java/com/nihongoquest/client/history/MatchHistoryController.java">
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
</file>

<file path="src/main/java/com/nihongoquest/client/leaderboard/LeaderboardController.java">
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

    private GameClient gameClient;

    @FXML
    private void initialize() {
        rankColumn.setCellValueFactory(row -> new ReadOnlyIntegerWrapper(row.getValue().rank()));
        usernameColumn.setCellValueFactory(row -> new SimpleStringProperty(row.getValue().username()));
        winsColumn.setCellValueFactory(row -> new ReadOnlyIntegerWrapper(row.getValue().wins()));
        drawsColumn.setCellValueFactory(row -> new ReadOnlyIntegerWrapper(row.getValue().draws()));
        scoreColumn.setCellValueFactory(row -> new ReadOnlyIntegerWrapper(row.getValue().totalScore()));
        leaderboardTable.setColumnResizePolicy(
                TableView.CONSTRAINED_RESIZE_POLICY_FLEX_LAST_COLUMN);
        leaderboardTable.setPlaceholder(new Label("Chưa có dữ liệu xếp hạng"));
    }

    public void setSession(ClientApp app, GameClient gameClient) {
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
</file>

<file path="src/main/java/com/nihongoquest/client/profile/Player.java">
package com.nihongoquest.client.profile;

/** Hồ sơ chỉ đọc mà client nhận từ server sau khi đăng nhập. */
public record Player(long id, String username, int wins, int losses, int draws,
                     int totalScore, int questionsAnswered, int correctAnswers) {

    public String getUsername() {
        return username;
    }

    public int getWins() {
        return wins;
    }

    public int getLosses() {
        return losses;
    }

    public int getDraws() {
        return draws;
    }

    public int getTotalScore() {
        return totalScore;
    }

    public int getQuestionsAnswered() {
        return questionsAnswered;
    }

    public int getCorrectAnswers() {
        return correctAnswers;
    }
}
</file>

<file path="src/main/java/com/nihongoquest/client/profile/ProfilePresenter.java">
package com.nihongoquest.client.profile;

import javafx.scene.control.Label;

import java.util.Locale;

/** Điền dữ liệu người chơi vào thẻ hồ sơ nhỏ dùng chung trên các màn hình client. */
public final class ProfilePresenter {

    private ProfilePresenter() {
    }

    public static void populate(Player player, Label avatar, Label username, Label summary) {
        avatar.setText(player.getUsername().substring(0, 1).toUpperCase(Locale.ROOT));
        username.setText(player.getUsername());
        summary.setText(player.getWins() + " thắng  •  " + player.getLosses() + " thua  •  "
                + player.getDraws() + " hòa  •  " + player.getTotalScore() + " điểm  •  "
                + accuracy(player) + "% đúng");
    }

    static int accuracy(Player player) {
        if (player.getQuestionsAnswered() == 0) {
            return 0;
        }
        return (int) Math.round(player.getCorrectAnswers() * 100.0
                / player.getQuestionsAnswered());
    }
}
</file>

<file path="src/main/java/com/nihongoquest/client/quiz/QuizBattleController.java">
package com.nihongoquest.client.quiz;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.client.profile.Player;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.Payloads;
import javafx.animation.KeyFrame;
import javafx.animation.Timeline;
import javafx.application.Platform;
import javafx.collections.FXCollections;
import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.ListCell;
import javafx.scene.control.ListView;
import javafx.scene.control.ProgressBar;
import javafx.util.Duration;

import java.util.List;

/** Màn hình rapid quiz và leaderboard trực tiếp; không tự tính điểm. */
public class QuizBattleController {
    @FXML private Label titleLabel;
    @FXML private Label pinLabel;
    @FXML private Label roomTimeLabel;
    @FXML private Label scoreLabel;
    @FXML private Label questionLabel;
    @FXML private Label questionTimeLabel;
    @FXML private Label statusLabel;
    @FXML private ProgressBar questionProgress;
    @FXML private Button answerAButton;
    @FXML private Button answerBButton;
    @FXML private Button answerCButton;
    @FXML private Button answerDButton;
    @FXML private Button leaveButton;
    @FXML private ListView<Payloads.QuizLeaderboardEntry> leaderboardList;

    private ClientApp app;
    private GameClient gameClient;
    private Player player;
    private Payloads.QuizRoomStarted room;
    private Payloads.QuizQuestionData currentQuestion;
    private List<Button> answerButtons;
    private Timeline countdown;
    private long countdownStartedNanos;
    private long questionDurationMillis;
    private long roomDurationMillis;
    private boolean finished;

    @FXML
    private void initialize() {
        answerButtons = List.of(answerAButton, answerBButton, answerCButton, answerDButton);
        leaderboardList.setCellFactory(ignored -> new ListCell<>() {
            @Override
            protected void updateItem(Payloads.QuizLeaderboardEntry item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || item == null) setText(null);
                else setText("#" + item.rank() + "  " + item.username()
                        + "  •  " + item.score() + " điểm  •  "
                        + item.correctAnswers() + " đúng"
                        + (item.connected() ? "" : "  •  Offline"));
            }
        });
    }

    public void setSession(ClientApp app, GameClient gameClient, Player player,
                           Payloads.QuizRoomStarted room) {
        this.app = app;
        this.gameClient = gameClient;
        this.player = player;
        this.room = room;
        titleLabel.setText(room.title());
        pinLabel.setText("PIN " + room.pin());
        roomTimeLabel.setText(formatSeconds(room.durationSeconds()));
        scoreLabel.setText("0 điểm");
        leaveButton.setText(room.host() ? "Hủy phòng" : "Rời phòng");
        if (!room.playing()) {
            questionLabel.setText("Bạn đang điều khiển phòng. Theo dõi bảng xếp hạng trực tiếp.");
            setAnswersDisabled(true);
        }
        gameClient.setMessageHandler(message -> Platform.runLater(() -> handleMessage(message)));
        gameClient.setConnectionErrorHandler(error -> Platform.runLater(() -> {
            stopCountdown();
            setAnswersDisabled(true);
            showError("Mất kết nối. Đăng nhập lại trước khi hết giờ để tiếp tục.");
        }));
    }

    @FXML
    private void onAnswer(ActionEvent event) {
        int index = answerButtons.indexOf(event.getSource());
        if (index < 0 || currentQuestion == null) return;
        setAnswersDisabled(true);
        Payloads.ChoiceData choice = currentQuestion.choices().get(index);
        gameClient.sendQuizAnswer(new Payloads.QuizAnswerData(
                currentQuestion.sessionId(), currentQuestion.attempt(),
                currentQuestion.questionId(), choice.choiceId()));
    }

    @FXML
    private void onLeave() {
        if (finished) {
            app.showMatchmaking();
            return;
        }
        if (room.host()) gameClient.cancelQuizRoom();
        else gameClient.leaveQuizRoom();
        app.showMatchmaking();
    }

    private void handleMessage(Message message) {
        switch (message.getType()) {
            case QUIZ_QUESTION -> showQuestion(Payloads.fromJson(
                    message.getPayload(), Payloads.QuizQuestionData.class));
            case QUIZ_ANSWER_RESULT -> showResult(Payloads.fromJson(
                    message.getPayload(), Payloads.QuizAnswerResult.class));
            case QUIZ_LEADERBOARD -> showLeaderboard(Payloads.fromJson(
                    message.getPayload(), Payloads.QuizLeaderboardData.class));
            case QUIZ_ROOM_FINISHED -> showFinished(Payloads.fromJson(
                    message.getPayload(), Payloads.QuizLeaderboardData.class));
            case QUIZ_ROOM_CANCEL -> app.showMatchmaking();
            case QUIZ_ERROR -> showError(QuizRoomUi.errorText(message.payloadText()));
            default -> { }
        }
    }

    private void showQuestion(Payloads.QuizQuestionData question) {
        if (!room.pin().equals(question.pin()) || !room.pin().equals(question.sessionId())
                || question.choices() == null || question.choices().size() != 4) {
            showError("Dữ liệu câu hỏi không hợp lệ.");
            return;
        }
        currentQuestion = question;
        questionLabel.setText("Lượt " + question.attempt() + ": " + question.content());
        for (int index = 0; index < 4; index++) {
            answerButtons.get(index).setText(question.choices().get(index).content());
        }
        clearAnswerStyles();
        setAnswersDisabled(false);
        statusLabel.setText("Chọn đáp án đúng nhanh nhất có thể.");
        startCountdown(question.questionDurationSeconds(), question.roomRemainingSeconds());
    }

    private void showResult(Payloads.QuizAnswerResult result) {
        if (currentQuestion == null || result.attempt() != currentQuestion.attempt()
                || result.questionId() != currentQuestion.questionId()) return;
        stopCountdown();
        setAnswersDisabled(true);
        int correctIndex = choiceIndex(result.correctChoiceId());
        int chosenIndex = choiceIndex(result.chosenChoiceId());
        if (correctIndex >= 0) answerButtons.get(correctIndex).getStyleClass().add("answer-correct");
        if (!result.correct() && chosenIndex >= 0) {
            answerButtons.get(chosenIndex).getStyleClass().add("answer-wrong");
        }
        scoreLabel.setText(result.totalScore() + " điểm");
        statusLabel.setText(result.chosenChoiceId() == null ? "Hết giờ"
                : result.correct() ? "Đúng! +" + result.scoreAwarded() + " điểm" : "Chưa đúng");
    }

    private void showLeaderboard(Payloads.QuizLeaderboardData board) {
        leaderboardList.setItems(FXCollections.observableArrayList(board.entries()));
        board.entries().stream().filter(entry -> entry.userId() == player.id())
                .findFirst().ifPresent(entry -> scoreLabel.setText(entry.score() + " điểm"));
    }

    private void showFinished(Payloads.QuizLeaderboardData board) {
        finished = true;
        stopCountdown();
        setAnswersDisabled(true);
        showLeaderboard(board);
        roomTimeLabel.setText("0:00");
        questionLabel.setText("Phòng Quiz đã kết thúc");
        statusLabel.setText("Bảng xếp hạng cuối cùng");
        leaveButton.setText("Về trang chủ");
    }

    private void startCountdown(int questionSeconds, int roomSeconds) {
        stopCountdown();
        countdownStartedNanos = System.nanoTime();
        questionDurationMillis = questionSeconds * 1_000L;
        roomDurationMillis = roomSeconds * 1_000L;
        questionProgress.setProgress(1);
        questionTimeLabel.setText(questionSeconds + "s");
        roomTimeLabel.setText(formatSeconds(roomSeconds));
        countdown = new Timeline(new KeyFrame(Duration.millis(100), ignored -> updateCountdown()));
        countdown.setCycleCount(Timeline.INDEFINITE);
        countdown.play();
    }

    private void updateCountdown() {
        long elapsed = (System.nanoTime() - countdownStartedNanos) / 1_000_000L;
        long questionRemaining = Math.max(0, questionDurationMillis - elapsed);
        long roomRemaining = Math.max(0, roomDurationMillis - elapsed);
        questionProgress.setProgress(questionDurationMillis == 0
                ? 0 : (double) questionRemaining / questionDurationMillis);
        questionTimeLabel.setText(((questionRemaining + 999) / 1_000) + "s");
        roomTimeLabel.setText(formatSeconds((int) ((roomRemaining + 999) / 1_000)));
        if (questionRemaining == 0) {
            stopCountdown();
            setAnswersDisabled(true);
            statusLabel.setText("Đang chờ server xử lý timeout...");
        }
    }

    private int choiceIndex(Long choiceId) {
        if (choiceId == null || currentQuestion == null) return -1;
        for (int index = 0; index < currentQuestion.choices().size(); index++) {
            if (currentQuestion.choices().get(index).choiceId() == choiceId) return index;
        }
        return -1;
    }

    private void clearAnswerStyles() {
        answerButtons.forEach(button ->
                button.getStyleClass().removeAll("answer-correct", "answer-wrong"));
    }

    private void setAnswersDisabled(boolean disabled) {
        answerButtons.forEach(button -> button.setDisable(disabled));
    }

    private void stopCountdown() {
        if (countdown != null) {
            countdown.stop();
            countdown = null;
        }
    }

    private void showError(String text) {
        statusLabel.setText(text);
        statusLabel.getStyleClass().removeAll("status-success", "status-error");
        statusLabel.getStyleClass().add("status-error");
    }

    private String formatSeconds(int seconds) {
        return String.format("%d:%02d", seconds / 60, seconds % 60);
    }
}
</file>

<file path="src/main/java/com/nihongoquest/client/quiz/QuizLobbyController.java">
package com.nihongoquest.client.quiz;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.layout.NavigationGuard;
import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.Payloads;
import javafx.application.Platform;
import javafx.collections.FXCollections;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Alert;
import javafx.scene.control.ButtonType;
import javafx.scene.control.Label;
import javafx.scene.control.ListCell;
import javafx.scene.control.ListView;

import java.util.Optional;

/** Sảnh chờ hiển thị PIN, host và trạng thái kết nối thành viên. */
public class QuizLobbyController implements NavigationGuard {
    @FXML private Label pinLabel;
    @FXML private Label titleLabel;
    @FXML private Label countLabel;
    @FXML private Label statusLabel;
    @FXML private ListView<Payloads.QuizLobbyPlayer> playerList;
    @FXML private Button startButton;
    @FXML private Button leaveButton;

    private ClientApp app;
    private GameClient gameClient;
    private boolean host;

    @FXML
    private void initialize() {
        playerList.setCellFactory(ignored -> new ListCell<>() {
            @Override
            protected void updateItem(Payloads.QuizLobbyPlayer item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || item == null) setText(null);
                else setText((item.host() ? "★ " : "") + item.username()
                        + (item.playing() ? " • Người chơi" : " • Điều khiển")
                        + (item.connected() ? " • Online" : " • Mất kết nối"));
            }
        });
    }

    public void setSession(ClientApp app, GameClient gameClient, Payloads.QuizLobbyData lobby) {
        this.app = app;
        this.gameClient = gameClient;
        gameClient.setMessageHandler(message -> Platform.runLater(() -> handleMessage(message)));
        gameClient.setConnectionErrorHandler(error -> Platform.runLater(() -> showError(error)));
        updateLobby(lobby);
    }

    @FXML
    private void onStart() {
        startButton.setDisable(true);
        statusLabel.setText("Đang bắt đầu phòng...");
        gameClient.startQuizRoom();
    }

    @FXML
    private void onLeave() {
        leaveButton.setDisable(true);
        if (host) gameClient.cancelQuizRoom();
        else gameClient.leaveQuizRoom();
        app.showMatchmaking();
    }

    private void handleMessage(Message message) {
        switch (message.getType()) {
            case QUIZ_LOBBY_UPDATE -> updateLobby(Payloads.fromJson(
                    message.getPayload(), Payloads.QuizLobbyData.class));
            case QUIZ_ROOM_START -> app.showQuizBattle(Payloads.fromJson(
                    message.getPayload(), Payloads.QuizRoomStarted.class));
            case QUIZ_QUESTION, QUIZ_LEADERBOARD -> gameClient.redispatch(message);
            case QUIZ_ROOM_CANCEL -> app.showMatchmaking();
            case QUIZ_ERROR -> {
                startButton.setDisable(false);
                showError(QuizRoomUi.errorText(message.payloadText()));
            }
            default -> { }
        }
    }

    private void updateLobby(Payloads.QuizLobbyData lobby) {
        host = lobby.currentUserHost();
        pinLabel.setText(lobby.pin());
        titleLabel.setText(lobby.title());
        countLabel.setText(lobby.playerCount() + "/20 người chơi");
        playerList.setItems(FXCollections.observableArrayList(lobby.members()));
        startButton.setVisible(host);
        startButton.setManaged(host);
        startButton.setDisable(!host || lobby.playerCount() < 2);
        leaveButton.setText(host ? "Hủy phòng" : "Rời phòng");
        statusLabel.setText(host && lobby.playerCount() < 2
                ? "Cần ít nhất 2 người chơi để bắt đầu."
                : "Đang chờ host bắt đầu...");
    }

    private void showError(String text) {
        statusLabel.setText(text);
        statusLabel.getStyleClass().removeAll("status-success", "status-error");
        statusLabel.getStyleClass().add("status-error");
    }

    @Override
    public boolean requestNavigationAway() {
        Alert alert = new Alert(Alert.AlertType.CONFIRMATION);
        alert.setTitle(host ? "Hủy phòng Quiz" : "Rời phòng Quiz");
        alert.setHeaderText(host ? "Bạn đang là host của phòng" : "Bạn đang ở trong sảnh chờ");
        alert.setContentText(host
                ? "Rời màn hình sẽ hủy phòng đối với tất cả thành viên."
                : "Bạn sẽ rời khỏi phòng Quiz hiện tại.");
        Optional<ButtonType> choice = alert.showAndWait();
        if (choice.isEmpty() || choice.get() != ButtonType.OK) return false;
        if (host) gameClient.cancelQuizRoom();
        else gameClient.leaveQuizRoom();
        return true;
    }
}
</file>

<file path="src/main/java/com/nihongoquest/client/quiz/QuizRoomMenuController.java">
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
                selected.id(), durationSpinner.getValue(), hostPlaysCheck.isSelected());
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
</file>

<file path="src/main/java/com/nihongoquest/client/quiz/QuizSetEditorController.java">
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
</file>

<file path="src/main/java/com/nihongoquest/client/quiz/QuizSetListController.java">
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
</file>

<file path="src/main/java/com/nihongoquest/client/ranked/battle/ResultController.java">
package com.nihongoquest.client.ranked.battle;

import javafx.fxml.FXML;
import javafx.scene.control.Label;

/**
 * ResultController xử lý màn hình kết quả (result.fxml).
 * Hiển thị thắng/thua, điểm và tên đối thủ theo dữ liệu Server gửi về.
 */
public class ResultController {

    @FXML
    private Label resultLabel;

    @FXML
    private Label scoreLabel;

    @FXML
    private Label opponentLabel;

    public void setResult(String result, int myScore,
                          int opponentScore, String opponentName) {
        resultLabel.getStyleClass().removeAll("result-win", "result-lose", "result-draw");
        resultLabel.setText(switch (result) {
            case "WIN" -> "CHIẾN THẮNG";
            case "LOSE" -> "THẤT BẠI";
            case "DRAW" -> "HÒA";
            default -> "KẾT THÚC TRẬN";
        });
        resultLabel.getStyleClass().add(switch (result) {
            case "WIN" -> "result-win";
            case "LOSE" -> "result-lose";
            default -> "result-draw";
        });
        scoreLabel.setText(myScore + " - " + opponentScore);
        opponentLabel.setText("Đối thủ: " + opponentName);
    }
}
</file>

<file path="src/main/java/com/nihongoquest/common/protocol/Message.java">
package com.nihongoquest.common.protocol;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.NullNode;
import com.fasterxml.jackson.databind.node.TextNode;

/**
 * Message là model đại diện một gói tin trao đổi giữa Client và Server.
 * Một application frame JSON trao đổi giữa client và server.
 */
public class Message {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private MessageType type;
    private JsonNode payload;

    public Message() {
    }

    public Message(MessageType type, JsonNode payload) {
        this.type = type;
        this.payload = payload == null ? NullNode.getInstance() : payload;
    }

    /** Dùng cho các payload trạng thái ngắn như DATABASE_ERROR. */
    public Message(MessageType type, String payload) {
        this(type, payload == null || payload.isEmpty()
                ? NullNode.getInstance() : TextNode.valueOf(payload));
    }

    public MessageType getType() {
        return type;
    }

    public void setType(MessageType type) {
        this.type = type;
    }

    public JsonNode getPayload() {
        return payload;
    }

    public void setPayload(JsonNode payload) {
        this.payload = payload == null ? NullNode.getInstance() : payload;
    }

    public String payloadText() {
        return payload == null || payload.isNull() ? "" : payload.asText();
    }

    public <T> T payloadAs(Class<T> type) {
        try {
            return MAPPER.treeToValue(payload, type);
        } catch (JsonProcessingException | IllegalArgumentException e) {
            throw new IllegalArgumentException("Payload JSON không hợp lệ", e);
        }
    }

    public String toWire() {
        try {
            return MAPPER.writeValueAsString(this);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Không thể mã hóa message JSON", e);
        }
    }

    public static Message fromWire(String line) {
        if (line == null || line.isBlank()) {
            throw new IllegalArgumentException("Message rỗng");
        }

        try {
            Message message = MAPPER.readValue(line, Message.class);
            if (message.type == null) {
                throw new IllegalArgumentException("Message thiếu type");
            }
            if (message.payload == null) message.payload = NullNode.getInstance();
            return message;
        } catch (JsonProcessingException | IllegalArgumentException e) {
            throw new IllegalArgumentException("Message JSON không hợp lệ", e);
        }
    }
}
</file>

<file path="src/main/java/com/nihongoquest/server/dashboard/DashboardController.java">
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
</file>

<file path="src/main/java/com/nihongoquest/server/dashboard/ServerDashboardApp.java">
package com.nihongoquest.server.dashboard;

import javafx.application.Application;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.stage.Stage;

import java.io.IOException;

/** Giao diện quản trị trực quan cho GameServer. */
public class ServerDashboardApp extends Application {

    private DashboardController controller;

    @Override
    public void start(Stage stage) throws IOException {
        FXMLLoader loader = new FXMLLoader(
                getClass().getResource("/server/dashboard/server-dashboard.fxml"));
        Parent root = loader.load();
        controller = loader.getController();

        Scene scene = new Scene(root, 1180, 760);
        scene.getStylesheets().add(
                getClass().getResource("/server/dashboard/server-dashboard.css").toExternalForm());
        stage.setTitle("NihongoQuest — Server Dashboard");
        stage.setMinWidth(980);
        stage.setMinHeight(680);
        stage.setScene(scene);
        stage.show();
    }

    @Override
    public void stop() {
        if (controller != null) {
            controller.shutdown();
        }
    }

    public static void main(String[] args) {
        launch(args);
    }
}
</file>

<file path="src/main/java/com/nihongoquest/server/network/OnlineUserRegistry.java">
package com.nihongoquest.server.network;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Danh sách user online trong RAM; mỗi tài khoản chỉ có một kết nối. */
public class OnlineUserRegistry {
    private final Map<Long, ClientHandler> users = new ConcurrentHashMap<>();

    public boolean login(long userId, ClientHandler handler) {
        ClientHandler existing = users.putIfAbsent(userId, handler);
        return existing == null || existing == handler;
    }

    public void logout(ClientHandler handler) {
        Long userId = handler.getPlayerId();
        if (userId != null) users.remove(userId, handler);
    }

    public ClientHandler find(long userId) {
        return users.get(userId);
    }

    public boolean isOnline(long userId) {
        ClientHandler handler = users.get(userId);
        return handler != null && handler.isConnected();
    }

    public boolean isBusy(long userId) {
        ClientHandler handler = users.get(userId);
        return handler != null && (handler.isQueued() || handler.getCurrentRoom() != null
                || handler.getCurrentQuizRoom() != null);
    }

    public int size() {
        return users.size();
    }
}
</file>

<file path="src/main/java/com/nihongoquest/server/question/QuestionRepository.java">
package com.nihongoquest.server.question;

import com.nihongoquest.server.database.Database;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** JDBC access only; Ranked eligibility is decided by QuestionService. */
public class QuestionRepository {
    private static final String QUESTION_COLUMNS = "q.id, q.content, qs.title AS category, "
            + "qs.level, q.explanation";
    private static final int QUERY_TIMEOUT_SECONDS = 10;
    private final Database database;

    public QuestionRepository(Database database) {
        this.database = Objects.requireNonNull(database);
    }

    public List<Question> findRandomQuestions(int limit) throws SQLException {
        return findRandomQuestions(null, limit);
    }

    public List<Question> findRandomQuestions(String level, int limit) throws SQLException {
        return findRandomQuestions(level, limit, List.of());
    }

    /** Exclude previously examined IDs so the service can replace invalid candidates. */
    public List<Question> findRandomQuestions(String level, int limit,
                                               Collection<Long> excludedIds) throws SQLException {
        if (limit <= 0) {
            throw new IllegalArgumentException("Question limit must be positive");
        }
        try (Connection connection = database.getConnection()) {
            boolean filterLevel = level != null && !level.isBlank();
            String sql = "SELECT " + QUESTION_COLUMNS
                    + " FROM questions q JOIN quiz_sets qs ON qs.id = q.quiz_set_id"
                    + " WHERE qs.is_published = TRUE"
                    + (filterLevel ? " AND qs.level = ?" : "")
                    + (excludedIds.isEmpty() ? "" : " AND q.id NOT IN (" + placeholders(excludedIds.size()) + ")")
                    + " ORDER BY RANDOM() LIMIT ?";
            List<Question> questions;
            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                statement.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
                int parameter = 1;
                if (filterLevel) {
                    statement.setString(parameter++, level);
                }
                for (long excludedId : excludedIds) {
                    statement.setLong(parameter++, excludedId);
                }
                statement.setInt(parameter, limit);
                try (ResultSet result = statement.executeQuery()) {
                    questions = readQuestions(result);
                }
            }
            return attachChoices(connection, questions);
        }
    }

    /** Chỉ trả câu hỏi thuộc bộ đề đã xuất bản. */
    public Question findById(long questionId) throws SQLException {
        try (Connection connection = database.getConnection()) {
            String sql = "SELECT " + QUESTION_COLUMNS
                    + " FROM questions q JOIN quiz_sets qs ON qs.id = q.quiz_set_id"
                    + " WHERE q.id = ? AND qs.is_published = TRUE";
            List<Question> questions;
            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                statement.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
                statement.setLong(1, questionId);
                try (ResultSet result = statement.executeQuery()) {
                    questions = readQuestions(result);
                }
            }
            List<Question> loaded = attachChoices(connection, questions);
            return loaded.isEmpty() ? null : loaded.getFirst();
        }
    }

    public List<Choice> findChoicesByQuestionId(long questionId) throws SQLException {
        try (Connection connection = database.getConnection();
             PreparedStatement statement = connection.prepareStatement("""
                     SELECT id, question_id, content, is_correct, position
                     FROM choices WHERE question_id = ? ORDER BY position
                     """)) {
            statement.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
            statement.setLong(1, questionId);
            try (ResultSet result = statement.executeQuery()) {
                return readChoices(result);
            }
        }
    }

    private List<Question> attachChoices(Connection connection, List<Question> questions)
            throws SQLException {
        if (questions.isEmpty()) {
            return List.of();
        }
        String sql = "SELECT id, question_id, content, is_correct, position FROM choices"
                + " WHERE question_id IN (" + placeholders(questions.size()) + ")"
                + " ORDER BY question_id, position";
        Map<Long, List<Choice>> choices = new HashMap<>();
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
            for (int i = 0; i < questions.size(); i++) {
                statement.setLong(i + 1, questions.get(i).getId());
            }
            try (ResultSet result = statement.executeQuery()) {
                for (Choice choice : readChoices(result)) {
                    choices.computeIfAbsent(choice.questionId(), ignored -> new ArrayList<>()).add(choice);
                }
            }
        }
        return questions.stream().map(question -> new Question(question.getId(), question.getContent(),
                question.getCategory(), question.getLevel(), question.getExplanation(),
                choices.getOrDefault(question.getId(), List.of()))).toList();
    }

    static List<Question> readQuestions(ResultSet result) throws SQLException {
        List<Question> questions = new ArrayList<>();
        while (result.next()) {
            questions.add(new Question(result.getLong("id"), result.getString("content"),
                    result.getString("category"), result.getString("level"),
                    result.getString("explanation"), List.of()));
        }
        return questions;
    }

    static List<Choice> readChoices(ResultSet result) throws SQLException {
        List<Choice> choices = new ArrayList<>();
        while (result.next()) {
            boolean correct = result.getBoolean("is_correct");
            if (result.wasNull()) {
                throw new SQLException("Invalid choice id=" + result.getLong("id") + ": is_correct is null");
            }
            choices.add(new Choice(result.getLong("id"), result.getLong("question_id"),
                    result.getString("content"), correct, result.getInt("position")));
        }
        return choices;
    }

    private static String placeholders(int count) {
        return String.join(", ", Collections.nCopies(count, "?"));
    }
}
</file>

<file path="src/main/java/com/nihongoquest/server/question/QuestionService.java">
package com.nihongoquest.server.question;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.logging.Logger;

/** Validates database questions before a room can publish them. */
public class QuestionService {
    private static final Logger LOGGER = Logger.getLogger(QuestionService.class.getName());
    private final QuestionRepository repository;

    public QuestionService(QuestionRepository repository) {
        this.repository = Objects.requireNonNull(repository);
    }

    public List<Question> getRankedQuestions(String level, int count) {
        if (count <= 0) {
            throw new IllegalArgumentException("Ranked question count must be positive");
        }
        return getRankedQuestionsUpTo(level, count, count);
    }

    /** Lấy tối đa max câu; vẫn cho tạo trận khi database có ít nhất min câu hợp lệ. */
    public List<Question> getRankedQuestionsUpTo(String level, int max, int min) {
        if (min <= 0 || max < min) {
            throw new IllegalArgumentException("Ranked question limits are invalid");
        }
        List<Question> valid = new ArrayList<>();
        Set<Long> examined = new LinkedHashSet<>();
        try {
            while (valid.size() < max) {
                List<Question> candidates = repository.findRandomQuestions(level, max - valid.size(), examined);
                int previousSize = examined.size();
                for (Question question : candidates) {
                    if (question != null && examined.add(question.getId()) && isValidForRanked(question)) {
                        valid.add(question);
                        if (valid.size() == max) {
                            break;
                        }
                    }
                }
                if (examined.size() == previousSize) {
                    break;
                }
            }
            if (valid.size() < min) {
                throw new IllegalStateException("Not enough valid Ranked questions: minimum="
                        + min + ", found=" + valid.size() + ", level=" + level);
            }
            return List.copyOf(valid);
        } catch (SQLException e) {
            LOGGER.warning("Cannot load Ranked questions from database (SQLState=" + e.getSQLState() + ")");
            throw new IllegalStateException("Không thể tải câu hỏi Ranked từ database", e);
        }
    }

    public Question getQuestion(long questionId) {
        try {
            Question question = repository.findById(questionId);
            if (question == null) {
                throw new IllegalStateException("Question id=" + questionId + " not found or inactive");
            }
            if (!isValidForRanked(question)) {
                throw new IllegalStateException("Question id=" + questionId + " is invalid for Ranked");
            }
            return question;
        } catch (SQLException e) {
            throw new IllegalStateException("Cannot load question id=" + questionId + " from database", e);
        }
    }

    public boolean isValidForRanked(Question question) {
        String error = validationError(question);
        if (error != null) {
            LOGGER.warning("Invalid question id=" + (question == null ? "null" : question.getId()) + ": " + error);
        }
        return error == null;
    }

    private String validationError(Question question) {
        if (question == null || question.getId() <= 0) {
            return "question must exist with a positive ID";
        }
        if (question.getContent() == null || question.getContent().isBlank()) {
            return "content is blank";
        }
        if (question.getChoices().size() != 4) {
            return "expected 4 choices but found " + question.getChoices().size();
        }
        Set<Integer> positions = new HashSet<>();
        Set<Long> ids = new HashSet<>();
        int correct = 0;
        for (Choice choice : question.getChoices()) {
            if (choice == null || choice.id() <= 0 || !ids.add(choice.id())
                    || choice.questionId() != question.getId()) {
                return "choices must have unique positive IDs and belong to this question";
            }
            if (choice.content() == null || choice.content().isBlank()) {
                return "choice content is blank";
            }
            if (choice.position() < 1 || !positions.add(choice.position())) {
                return "choice positions must be positive and unique";
            }
            if (choice.correct()) {
                correct++;
            }
        }
        return correct == 1 ? null : "expected exactly 1 correct answer but found " + correct;
    }
}
</file>

<file path="src/main/java/com/nihongoquest/server/quiz/QuizSetRepository.java">
package com.nihongoquest.server.quiz;

import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.server.database.Database;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** Các truy vấn JDBC đơn giản cho bộ đề, câu hỏi và bốn lựa chọn. */
public class QuizSetRepository {
    private static final int QUERY_TIMEOUT_SECONDS = 10;
    private static final String LIST_OWNED_SQL = """
            SELECT qs.id, qs.owner_id, u.username AS owner_username,
                   qs.title, qs.description, qs.level, qs.is_published,
                   COUNT(q.id)::INT AS question_count
            FROM quiz_sets qs
            JOIN users u ON u.id = qs.owner_id
            LEFT JOIN questions q ON q.quiz_set_id = qs.id
            WHERE qs.owner_id = ?
            GROUP BY qs.id, u.username
            ORDER BY qs.updated_at DESC, qs.id DESC
            """;
    private static final String LIST_PUBLISHED_SQL = """
            SELECT qs.id, qs.owner_id, u.username AS owner_username,
                   qs.title, qs.description, qs.level, qs.is_published,
                   COUNT(q.id)::INT AS question_count
            FROM quiz_sets qs
            JOIN users u ON u.id = qs.owner_id
            LEFT JOIN questions q ON q.quiz_set_id = qs.id
            WHERE qs.is_published = TRUE
            GROUP BY qs.id, u.username
            ORDER BY qs.updated_at DESC, qs.id DESC
            """;
    private final Database database;

    public QuizSetRepository(Database database) {
        this.database = database;
    }

    public List<Payloads.QuizSetSummary> listOwned(long ownerId) throws SQLException {
        return list(LIST_OWNED_SQL, ownerId, ownerId);
    }

    public List<Payloads.QuizSetSummary> listPublished(long currentUserId) throws SQLException {
        return list(LIST_PUBLISHED_SQL, null, currentUserId);
    }

    private List<Payloads.QuizSetSummary> list(String sql, Long parameter, long currentUserId)
            throws SQLException {
        try (Connection connection = database.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
            if (parameter != null) statement.setLong(1, parameter);
            try (ResultSet result = statement.executeQuery()) {
                List<Payloads.QuizSetSummary> items = new ArrayList<>();
                while (result.next()) {
                    long ownerId = result.getLong("owner_id");
                    items.add(new Payloads.QuizSetSummary(
                            result.getLong("id"), ownerId, result.getString("owner_username"),
                            result.getString("title"), result.getString("description"),
                            result.getString("level"), result.getBoolean("is_published"),
                            result.getInt("question_count"), ownerId == currentUserId));
                }
                return items;
            }
        }
    }

    public Optional<StoredQuizSet> findById(long quizSetId) throws SQLException {
        try (Connection connection = database.getConnection()) {
            String sql = """
                    SELECT id, owner_id, title, description, level, is_published
                    FROM quiz_sets WHERE id = ?
                    """;
            long ownerId;
            boolean published;
            String title;
            String description;
            String level;
            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                statement.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
                statement.setLong(1, quizSetId);
                try (ResultSet result = statement.executeQuery()) {
                    if (!result.next()) return Optional.empty();
                    ownerId = result.getLong("owner_id");
                    published = result.getBoolean("is_published");
                    title = result.getString("title");
                    description = result.getString("description");
                    level = result.getString("level");
                }
            }
            List<Payloads.QuizQuestionEdit> questions = loadQuestions(connection, quizSetId);
            return Optional.of(new StoredQuizSet(ownerId, published,
                    new Payloads.QuizSetEdit(quizSetId, title, description, level, questions)));
        }
    }

    private List<Payloads.QuizQuestionEdit> loadQuestions(Connection connection, long quizSetId)
            throws SQLException {
        String sql = """
                SELECT id, content, explanation FROM questions
                WHERE quiz_set_id = ? ORDER BY position
                """;
        List<Payloads.QuizQuestionEdit> questions = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
            statement.setLong(1, quizSetId);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) {
                    long questionId = result.getLong("id");
                    questions.add(new Payloads.QuizQuestionEdit(
                            questionId, result.getString("content"),
                            result.getString("explanation"), loadChoices(connection, questionId)));
                }
            }
        }
        return questions;
    }

    private List<Payloads.QuizChoiceEdit> loadChoices(Connection connection, long questionId)
            throws SQLException {
        String sql = """
                SELECT id, content, position, is_correct FROM choices
                WHERE question_id = ? ORDER BY position
                """;
        List<Payloads.QuizChoiceEdit> choices = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
            statement.setLong(1, questionId);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) {
                    choices.add(new Payloads.QuizChoiceEdit(
                            result.getLong("id"), result.getString("content"),
                            result.getInt("position"), result.getBoolean("is_correct")));
                }
            }
        }
        return choices;
    }

    /** Lưu header và thay toàn bộ danh sách câu hỏi trong một transaction ngắn. */
    public long save(long ownerId, Payloads.QuizSetEdit quizSet) throws SQLException {
        try (Connection connection = database.getConnection()) {
            connection.setAutoCommit(false);
            try {
                long quizSetId = quizSet.id() == null
                        ? insertQuizSet(connection, ownerId, quizSet)
                        : updateQuizSet(connection, ownerId, quizSet);
                replaceQuestions(connection, quizSetId, quizSet.questions());
                connection.commit();
                return quizSetId;
            } catch (SQLException | RuntimeException e) {
                connection.rollback();
                throw e;
            }
        }
    }

    private long insertQuizSet(Connection connection, long ownerId, Payloads.QuizSetEdit quizSet)
            throws SQLException {
        String sql = """
                INSERT INTO quiz_sets (owner_id, title, description, level, is_published)
                VALUES (?, ?, ?, ?, FALSE) RETURNING id
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, ownerId);
            setQuizSetFields(statement, quizSet, 2);
            try (ResultSet result = statement.executeQuery()) {
                result.next();
                return result.getLong("id");
            }
        }
    }

    private long updateQuizSet(Connection connection, long ownerId, Payloads.QuizSetEdit quizSet)
            throws SQLException {
        String sql = """
                UPDATE quiz_sets
                SET title = ?, description = ?, level = ?, is_published = FALSE, updated_at = now()
                WHERE id = ? AND owner_id = ?
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            setQuizSetFields(statement, quizSet, 1);
            statement.setLong(4, quizSet.id());
            statement.setLong(5, ownerId);
            if (statement.executeUpdate() == 0) throw ownershipError(connection, quizSet.id());
            return quizSet.id();
        }
    }

    private void setQuizSetFields(PreparedStatement statement, Payloads.QuizSetEdit quizSet, int start)
            throws SQLException {
        statement.setString(start, quizSet.title());
        statement.setString(start + 1, quizSet.description());
        statement.setString(start + 2, quizSet.level());
    }

    private void replaceQuestions(Connection connection, long quizSetId,
                                  List<Payloads.QuizQuestionEdit> questions) throws SQLException {
        try (PreparedStatement delete = connection.prepareStatement(
                "DELETE FROM questions WHERE quiz_set_id = ?")) {
            delete.setLong(1, quizSetId);
            delete.executeUpdate();
        }
        String questionSql = """
                INSERT INTO questions (quiz_set_id, content, explanation, position)
                VALUES (?, ?, ?, ?) RETURNING id
                """;
        String choiceSql = """
                INSERT INTO choices (question_id, content, position, is_correct)
                VALUES (?, ?, ?, ?)
                """;
        for (int index = 0; index < questions.size(); index++) {
            Payloads.QuizQuestionEdit question = questions.get(index);
            long questionId;
            try (PreparedStatement insertQuestion = connection.prepareStatement(questionSql)) {
                insertQuestion.setLong(1, quizSetId);
                insertQuestion.setString(2, question.content());
                insertQuestion.setString(3, question.explanation());
                insertQuestion.setInt(4, index + 1);
                try (ResultSet result = insertQuestion.executeQuery()) {
                    result.next();
                    questionId = result.getLong("id");
                }
            }
            try (PreparedStatement insertChoice = connection.prepareStatement(choiceSql)) {
                for (Payloads.QuizChoiceEdit choice : question.choices()) {
                    insertChoice.setLong(1, questionId);
                    insertChoice.setString(2, choice.content());
                    insertChoice.setInt(3, choice.position());
                    insertChoice.setBoolean(4, choice.correct());
                    insertChoice.addBatch();
                }
                insertChoice.executeBatch();
            }
        }
    }

    public void setPublished(long quizSetId, long ownerId, boolean published) throws SQLException {
        String sql = """
                UPDATE quiz_sets SET is_published = ?, updated_at = now()
                WHERE id = ? AND owner_id = ?
                """;
        try (Connection connection = database.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setBoolean(1, published);
            statement.setLong(2, quizSetId);
            statement.setLong(3, ownerId);
            if (statement.executeUpdate() == 0) throw ownershipError(connection, quizSetId);
        }
    }

    public void delete(long quizSetId, long ownerId) throws SQLException {
        try (Connection connection = database.getConnection();
             PreparedStatement statement = connection.prepareStatement(
                     "DELETE FROM quiz_sets WHERE id = ? AND owner_id = ?")) {
            statement.setLong(1, quizSetId);
            statement.setLong(2, ownerId);
            if (statement.executeUpdate() == 0) throw ownershipError(connection, quizSetId);
        }
    }

    private QuizSetException ownershipError(Connection connection, long quizSetId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT 1 FROM quiz_sets WHERE id = ?")) {
            statement.setLong(1, quizSetId);
            try (ResultSet result = statement.executeQuery()) {
                return new QuizSetException(result.next() ? "NOT_OWNER" : "NOT_FOUND");
            }
        }
    }

    public record StoredQuizSet(long ownerId, boolean published, Payloads.QuizSetEdit data) { }
}
</file>

<file path="src/main/java/com/nihongoquest/server/quiz/QuizSetService.java">
package com.nihongoquest.server.quiz;

import com.nihongoquest.common.protocol.Payloads;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/** Nghiệp vụ quản lý draft và xuất bản bộ đề. */
public class QuizSetService {
    private static final Set<String> LEVELS = Set.of("N5", "N4", "N3", "N2", "N1");
    private final QuizSetRepository repository;

    public QuizSetService(QuizSetRepository repository) {
        this.repository = repository;
    }

    public Payloads.QuizSetListData list(long userId, String scope) throws SQLException {
        if ("OWN".equalsIgnoreCase(scope)) {
            return new Payloads.QuizSetListData(repository.listOwned(userId));
        }
        if ("PUBLISHED".equalsIgnoreCase(scope)) {
            return new Payloads.QuizSetListData(repository.listPublished(userId));
        }
        throw new QuizSetException("BAD_REQUEST");
    }

    public Payloads.QuizSetEdit get(long userId, long quizSetId) throws SQLException {
        if (quizSetId <= 0) throw new QuizSetException("BAD_REQUEST");
        QuizSetRepository.StoredQuizSet stored = repository.findById(quizSetId)
                .orElseThrow(() -> new QuizSetException("NOT_FOUND"));
        if (!stored.published() && stored.ownerId() != userId) {
            throw new QuizSetException("NOT_OWNER");
        }
        return stored.data();
    }

    public long save(long userId, Payloads.QuizSetEdit input) throws SQLException {
        return repository.save(userId, validate(input, false));
    }

    public void publish(long userId, long quizSetId, boolean published) throws SQLException {
        if (quizSetId <= 0) throw new QuizSetException("BAD_REQUEST");
        if (published) {
            QuizSetRepository.StoredQuizSet stored = repository.findById(quizSetId)
                    .orElseThrow(() -> new QuizSetException("NOT_FOUND"));
            if (stored.ownerId() != userId) throw new QuizSetException("NOT_OWNER");
            validate(stored.data(), true);
        }
        repository.setPublished(quizSetId, userId, published);
    }

    public void delete(long userId, long quizSetId) throws SQLException {
        if (quizSetId <= 0) throw new QuizSetException("BAD_REQUEST");
        repository.delete(quizSetId, userId);
    }

    /** Snapshot server-only dùng khi tạo phòng; mọi tài khoản được dùng bộ đề đã publish. */
    public Payloads.QuizSetEdit getPublishedForRoom(long quizSetId) throws SQLException {
        if (quizSetId <= 0) throw new QuizSetException("BAD_REQUEST");
        QuizSetRepository.StoredQuizSet stored = repository.findById(quizSetId)
                .orElseThrow(() -> new QuizSetException("NOT_FOUND"));
        if (!stored.published()) throw new QuizSetException("QUIZ_NOT_PUBLISHED");
        return validate(stored.data(), true);
    }

    /** Draft có thể chưa có câu hỏi; câu đã thêm phải luôn đủ bốn lựa chọn. */
    static Payloads.QuizSetEdit validate(Payloads.QuizSetEdit input, boolean publishing) {
        if (input == null) throw new QuizSetException("BAD_REQUEST");
        String title = clean(input.title());
        String description = clean(input.description());
        String level = clean(input.level()).toUpperCase(Locale.ROOT);
        if (title.isEmpty() || title.length() > 100 || !LEVELS.contains(level)) {
            throw new QuizSetException("INVALID_QUIZ");
        }
        List<Payloads.QuizQuestionEdit> source = input.questions() == null
                ? List.of() : input.questions();
        if (publishing && source.size() < 3) throw new QuizSetException("INVALID_QUIZ");

        List<Payloads.QuizQuestionEdit> questions = new ArrayList<>();
        for (Payloads.QuizQuestionEdit question : source) {
            questions.add(validateQuestion(question));
        }
        return new Payloads.QuizSetEdit(input.id(), title, description, level, List.copyOf(questions));
    }

    private static Payloads.QuizQuestionEdit validateQuestion(Payloads.QuizQuestionEdit question) {
        if (question == null || clean(question.content()).isEmpty()
                || question.choices() == null || question.choices().size() != 4) {
            throw new QuizSetException("INVALID_QUIZ");
        }
        Set<Integer> positions = new HashSet<>();
        int correctCount = 0;
        List<Payloads.QuizChoiceEdit> choices = new ArrayList<>();
        for (Payloads.QuizChoiceEdit choice : question.choices()) {
            if (choice == null || clean(choice.content()).isEmpty()
                    || choice.position() < 1 || choice.position() > 4
                    || !positions.add(choice.position())) {
                throw new QuizSetException("INVALID_QUIZ");
            }
            if (choice.correct()) correctCount++;
            choices.add(new Payloads.QuizChoiceEdit(
                    choice.id(), clean(choice.content()), choice.position(), choice.correct()));
        }
        if (correctCount != 1 || positions.size() != 4) {
            throw new QuizSetException("INVALID_QUIZ");
        }
        choices.sort(Comparator.comparingInt(Payloads.QuizChoiceEdit::position));
        return new Payloads.QuizQuestionEdit(question.id(), clean(question.content()),
                clean(question.explanation()), List.copyOf(choices));
    }

    private static String clean(String value) {
        return value == null ? "" : value.trim();
    }
}
</file>

<file path="src/main/java/com/nihongoquest/server/quizroom/QuizRoom.java">
package com.nihongoquest.server.quizroom;

import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.server.network.ClientHandler;
import com.nihongoquest.server.question.Choice;
import com.nihongoquest.server.question.Question;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.LongSupplier;
import java.util.function.Consumer;

/** Phòng Quiz trong RAM: lobby chung, tiến độ câu hỏi riêng cho từng người chơi. */
public class QuizRoom {
    static final int MIN_PLAYERS = 2;
    static final int MAX_PLAYERS = 20;
    static final int QUESTION_SECONDS = 30;

    private enum State { LOBBY, RUNNING, FINISHED }

    private final String pin;
    private final long hostId;
    private final String title;
    private final boolean hostPlays;
    private final int durationSeconds;
    private final List<Question> questions;
    private final ScheduledExecutorService scheduler;
    private final LongSupplier nanoTime;
    private final Consumer<QuizRoom> finishedCallback;
    private final Map<Long, PlayerState> members = new LinkedHashMap<>();

    private State state = State.LOBBY;
    private long roomDeadlineNanos;
    private ScheduledFuture<?> roomTimeout;

    QuizRoom(String pin, ClientHandler host, String title, boolean hostPlays,
             int durationSeconds, List<Question> questions,
             ScheduledExecutorService scheduler, LongSupplier nanoTime,
             Consumer<QuizRoom> finishedCallback) {
        this.pin = pin;
        this.hostId = host.getPlayerId();
        this.title = title;
        this.hostPlays = hostPlays;
        this.durationSeconds = durationSeconds;
        this.questions = List.copyOf(questions);
        this.scheduler = scheduler;
        this.nanoTime = nanoTime;
        this.finishedCallback = finishedCallback;
        PlayerState hostState = new PlayerState(hostId, host.getUsername(), true, hostPlays, host);
        members.put(hostId, hostState);
        host.setCurrentQuizRoom(this);
    }

    synchronized void join(ClientHandler client) {
        PlayerState existing = members.get(client.getPlayerId());
        if (existing != null && !existing.left) {
            existing.client = client;
            client.setCurrentQuizRoom(this);
            sendLobbyToAll();
            return;
        }
        if (state != State.LOBBY) throw new QuizRoomException("ROOM_STARTED");
        if (playerCount() >= MAX_PLAYERS) throw new QuizRoomException("ROOM_FULL");
        PlayerState joined = new PlayerState(client.getPlayerId(), client.getUsername(),
                false, true, client);
        members.put(joined.userId, joined);
        client.setCurrentQuizRoom(this);
        sendLobbyToAll();
    }

    synchronized void start(ClientHandler requester) {
        requireHost(requester);
        if (state != State.LOBBY) throw new QuizRoomException("ROOM_STARTED");
        if (connectedPlayerCount() < MIN_PLAYERS) {
            throw new QuizRoomException("NOT_ENOUGH_PLAYERS");
        }
        state = State.RUNNING;
        roomDeadlineNanos = nanoTime.getAsLong() + TimeUnit.SECONDS.toNanos(durationSeconds);
        roomTimeout = scheduler.schedule(this::finishNormally, durationSeconds, TimeUnit.SECONDS);

        for (PlayerState member : members.values()) {
            if (member.client != null) {
                member.client.send(new Message(MessageType.QUIZ_ROOM_START,
                        Payloads.toJson(new Payloads.QuizRoomStarted(
                                pin, title, durationSeconds, member.playing, member.host))));
            }
        }
        broadcastLeaderboard(false, MessageType.QUIZ_LEADERBOARD);
        for (PlayerState member : members.values()) {
            if (member.playing && !member.left) sendNextQuestion(member);
        }
    }

    synchronized void answer(ClientHandler client, Payloads.QuizAnswerData answer) {
        if (state != State.RUNNING || answer == null) return;
        PlayerState player = members.get(client.getPlayerId());
        if (player == null || player.left || !player.playing || player.client != client
                || !player.awaitingAnswer) return;
        Question question = currentQuestion(player);
        if (!pin.equals(answer.sessionId()) || answer.attempt() != player.attempt
                || answer.questionId() != question.getId()) return;
        long now = nanoTime.getAsLong();
        if (now >= roomDeadlineNanos) {
            finishNormally();
            return;
        }
        if (now >= player.questionDeadlineNanos) {
            onQuestionTimeout(player.userId, player.attempt);
            return;
        }
        int choiceIndex = question.indexOfChoice(answer.choiceId());
        if (choiceIndex < 0) return;
        cancelQuestionTimer(player);
        resolveAnswer(player, question.getChoices().get(choiceIndex), now);
        broadcastLeaderboard(false, MessageType.QUIZ_LEADERBOARD);
        advance(player);
    }

    synchronized void leave(ClientHandler client) {
        PlayerState player = members.get(client.getPlayerId());
        if (player == null || player.left) return;
        if (player.host) {
            cancel("HOST_CANCELLED");
            return;
        }
        player.left = true;
        player.awaitingAnswer = false;
        cancelQuestionTimer(player);
        player.client = null;
        client.clearCurrentQuizRoom(this);
        if (state == State.LOBBY) members.remove(player.userId);
        sendLobbyToAll();
        if (state == State.RUNNING) broadcastLeaderboard(false, MessageType.QUIZ_LEADERBOARD);
    }

    synchronized void cancelByHost(ClientHandler client) {
        requireHost(client);
        cancel("HOST_CANCELLED");
    }

    synchronized void shutdown() {
        cancel("SERVER_STOPPED");
    }

    synchronized void disconnected(ClientHandler client) {
        PlayerState player = members.get(client.getPlayerId());
        if (player == null || player.client != client) return;
        player.client = null;
        client.clearCurrentQuizRoom(this);
        if (state == State.LOBBY) sendLobbyToAll();
        if (state == State.RUNNING) broadcastLeaderboard(false, MessageType.QUIZ_LEADERBOARD);
    }

    synchronized boolean reconnect(ClientHandler client) {
        PlayerState player = members.get(client.getPlayerId());
        if (state == State.FINISHED || player == null || player.left) return false;
        player.client = client;
        client.setCurrentQuizRoom(this);
        boolean running = state == State.RUNNING;
        client.send(new Message(MessageType.QUIZ_REJOINED,
                Payloads.toJson(new Payloads.QuizRejoinData(
                        lobbyData(player.userId), running, player.playing,
                        running ? roomRemainingSeconds() : 0))));
        if (!running) {
            sendLobbyToAll();
            return true;
        }
        client.send(new Message(MessageType.QUIZ_LEADERBOARD,
                Payloads.toJson(leaderboard(false))));
        if (player.playing) {
            long now = nanoTime.getAsLong();
            if (now >= roomDeadlineNanos) finishNormally();
            else if (!player.awaitingAnswer || now >= player.questionDeadlineNanos) {
                if (player.awaitingAnswer) onQuestionTimeout(player.userId, player.attempt);
                else sendNextQuestion(player);
            } else {
                sendCurrentQuestion(player, now);
            }
        }
        return true;
    }

    private void sendNextQuestion(PlayerState player) {
        if (state != State.RUNNING || player.left) return;
        long now = nanoTime.getAsLong();
        long roomRemaining = roomDeadlineNanos - now;
        if (roomRemaining <= 0) {
            finishNormally();
            return;
        }
        player.attempt++;
        player.awaitingAnswer = true;
        player.questionDeadlineNanos = now + Math.min(
                TimeUnit.SECONDS.toNanos(QUESTION_SECONDS), roomRemaining);
        int expectedAttempt = player.attempt;
        long delay = player.questionDeadlineNanos - now;
        player.questionTimeout = scheduler.schedule(
                () -> onQuestionTimeout(player.userId, expectedAttempt), delay, TimeUnit.NANOSECONDS);
        sendCurrentQuestion(player, now);
    }

    private void sendCurrentQuestion(PlayerState player, long now) {
        if (player.client == null || !player.client.isConnected()) return;
        Question question = currentQuestion(player);
        int questionSeconds = ceilSeconds(player.questionDeadlineNanos - now);
        player.client.send(new Message(MessageType.QUIZ_QUESTION,
                Payloads.toJson(new Payloads.QuizQuestionData(
                        pin, pin, player.attempt, question.getId(), question.getContent(),
                        question.getChoices().stream().map(choice -> new Payloads.ChoiceData(
                                choice.id(), choice.content(), choice.position())).toList(),
                        questionSeconds, roomRemainingSeconds()))));
    }

    private synchronized void onQuestionTimeout(long userId, int expectedAttempt) {
        if (state != State.RUNNING) return;
        PlayerState player = members.get(userId);
        if (player == null || player.left || !player.awaitingAnswer
                || player.attempt != expectedAttempt) return;
        if (nanoTime.getAsLong() >= roomDeadlineNanos) {
            finishNormally();
            return;
        }
        resolveAnswer(player, null, nanoTime.getAsLong());
        broadcastLeaderboard(false, MessageType.QUIZ_LEADERBOARD);
        advance(player);
    }

    private void resolveAnswer(PlayerState player, Choice chosen, long now) {
        Question question = currentQuestion(player);
        player.awaitingAnswer = false;
        boolean correct = chosen != null && chosen.correct();
        int earned = 0;
        if (correct) {
            long remaining = Math.max(0, player.questionDeadlineNanos - now);
            earned = 500 + (int) Math.floor(500.0 * remaining
                    / TimeUnit.SECONDS.toNanos(QUESTION_SECONDS));
            earned = Math.max(500, Math.min(1000, earned));
            player.score += earned;
            player.correctAnswers++;
        }
        long correctId = question.getChoices().get(question.getCorrectAnswerIndex()).id();
        if (player.client != null && player.client.isConnected()) {
            player.client.send(new Message(MessageType.QUIZ_ANSWER_RESULT,
                    Payloads.toJson(new Payloads.QuizAnswerResult(
                            pin, player.attempt, question.getId(), correct,
                            chosen == null ? null : chosen.id(), correctId, earned, player.score))));
        }
    }

    private void advance(PlayerState player) {
        player.position = (player.position + 1) % questions.size();
        sendNextQuestion(player);
    }

    private synchronized void finishNormally() {
        if (state == State.FINISHED) return;
        state = State.FINISHED;
        cancelTimers();
        broadcastLeaderboard(true, MessageType.QUIZ_ROOM_FINISHED);
        clearClients();
        finishedCallback.accept(this);
    }

    private void cancel(String reason) {
        if (state == State.FINISHED) return;
        state = State.FINISHED;
        cancelTimers();
        for (PlayerState member : members.values()) {
            if (member.client != null && member.client.isConnected()) {
                member.client.send(new Message(MessageType.QUIZ_ROOM_CANCEL, reason));
            }
        }
        clearClients();
        finishedCallback.accept(this);
    }

    private void cancelTimers() {
        if (roomTimeout != null) roomTimeout.cancel(false);
        members.values().forEach(this::cancelQuestionTimer);
    }

    private void cancelQuestionTimer(PlayerState player) {
        if (player.questionTimeout != null) player.questionTimeout.cancel(false);
        player.questionTimeout = null;
    }

    private void clearClients() {
        for (PlayerState member : members.values()) {
            if (member.client != null) member.client.clearCurrentQuizRoom(this);
        }
    }

    private void sendLobbyToAll() {
        for (PlayerState member : members.values()) {
            if (!member.left && member.client != null && member.client.isConnected()) {
                member.client.send(new Message(MessageType.QUIZ_LOBBY_UPDATE,
                        Payloads.toJson(lobbyData(member.userId))));
            }
        }
    }

    private Payloads.QuizLobbyData lobbyData(long viewerId) {
        List<Payloads.QuizLobbyPlayer> data = members.values().stream()
                .filter(member -> !member.left)
                .map(member -> new Payloads.QuizLobbyPlayer(
                        member.userId, member.username, member.host, member.playing,
                        member.client != null && member.client.isConnected()))
                .toList();
        return new Payloads.QuizLobbyData(pin, title, hostUsername(), viewerId == hostId,
                hostPlays, state != State.LOBBY, playerCount(), data);
    }

    private Payloads.QuizLeaderboardData leaderboard(boolean finished) {
        List<PlayerState> ordered = members.values().stream()
                .filter(member -> member.playing)
                .sorted(Comparator.comparingInt((PlayerState member) -> member.score).reversed()
                        .thenComparing(Comparator.comparingInt(
                                (PlayerState member) -> member.correctAnswers).reversed())
                        .thenComparing(member -> member.username, String.CASE_INSENSITIVE_ORDER))
                .toList();
        List<Payloads.QuizLeaderboardEntry> entries = new ArrayList<>();
        int rank = 0;
        int previousScore = -1;
        int previousCorrect = -1;
        for (int index = 0; index < ordered.size(); index++) {
            PlayerState player = ordered.get(index);
            if (index == 0 || player.score != previousScore
                    || player.correctAnswers != previousCorrect) rank = index + 1;
            entries.add(new Payloads.QuizLeaderboardEntry(rank, player.userId, player.username,
                    player.score, player.correctAnswers,
                    player.client != null && player.client.isConnected()));
            previousScore = player.score;
            previousCorrect = player.correctAnswers;
        }
        return new Payloads.QuizLeaderboardData(pin, finished, List.copyOf(entries));
    }

    private void broadcastLeaderboard(boolean finished, MessageType type) {
        Payloads.QuizLeaderboardData payload = leaderboard(finished);
        for (PlayerState member : members.values()) {
            if (member.client != null && member.client.isConnected()) {
                member.client.send(new Message(type, Payloads.toJson(payload)));
            }
        }
    }

    private Question currentQuestion(PlayerState player) {
        return questions.get(player.position);
    }

    private int playerCount() {
        return (int) members.values().stream()
                .filter(member -> member.playing && !member.left).count();
    }

    private int connectedPlayerCount() {
        return (int) members.values().stream()
                .filter(member -> member.playing && !member.left
                        && member.client != null && member.client.isConnected()).count();
    }

    private int roomRemainingSeconds() {
        if (state != State.RUNNING) return durationSeconds;
        return ceilSeconds(roomDeadlineNanos - nanoTime.getAsLong());
    }

    private String hostUsername() {
        return members.get(hostId).username;
    }

    private void requireHost(ClientHandler client) {
        if (client.getPlayerId() != hostId) throw new QuizRoomException("NOT_HOST");
    }

    private static int ceilSeconds(long nanos) {
        return (int) Math.max(0, (nanos + TimeUnit.SECONDS.toNanos(1) - 1)
                / TimeUnit.SECONDS.toNanos(1));
    }

    public String getPin() { return pin; }
    synchronized Payloads.QuizLobbyData lobbyFor(long viewerId) { return lobbyData(viewerId); }
    public synchronized boolean isRunning() { return state == State.RUNNING; }
    public synchronized boolean isLobby() { return state == State.LOBBY; }
    public boolean isHost(long userId) { return hostId == userId; }
    public synchronized boolean isFinished() { return state == State.FINISHED; }
    public synchronized List<Long> memberIds() { return List.copyOf(members.keySet()); }

    private static final class PlayerState {
        final long userId;
        final String username;
        final boolean host;
        final boolean playing;
        ClientHandler client;
        int position;
        int attempt;
        int score;
        int correctAnswers;
        boolean awaitingAnswer;
        boolean left;
        long questionDeadlineNanos;
        ScheduledFuture<?> questionTimeout;

        PlayerState(long userId, String username, boolean host,
                    boolean playing, ClientHandler client) {
            this.userId = userId;
            this.username = username;
            this.host = host;
            this.playing = playing;
            this.client = client;
        }
    }
}
</file>

<file path="src/main/java/com/nihongoquest/server/quizroom/QuizRoomManager.java">
package com.nihongoquest.server.quizroom;

import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.server.network.ClientHandler;
import com.nihongoquest.server.question.Choice;
import com.nihongoquest.server.question.Question;
import com.nihongoquest.server.quiz.QuizSetException;
import com.nihongoquest.server.quiz.QuizSetService;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.IntSupplier;

/** Quản lý PIN và ánh xạ tài khoản vào phòng Quiz đang hoạt động. */
public class QuizRoomManager {
    private final QuizSetService quizSets;
    private final ScheduledExecutorService scheduler;
    private final IntSupplier pinSupplier;
    private final Map<String, QuizRoom> rooms = new ConcurrentHashMap<>();
    private final Map<Long, QuizRoom> userRooms = new ConcurrentHashMap<>();

    public QuizRoomManager(QuizSetService quizSets, ScheduledExecutorService scheduler) {
        this(quizSets, scheduler,
                () -> ThreadLocalRandom.current().nextInt(100_000, 1_000_000));
    }

    QuizRoomManager(QuizSetService quizSets, ScheduledExecutorService scheduler,
                    IntSupplier pinSupplier) {
        this.quizSets = quizSets;
        this.scheduler = scheduler;
        this.pinSupplier = pinSupplier;
    }

    public synchronized void create(ClientHandler host, Payloads.QuizRoomCreateRequest request)
            throws SQLException {
        requireAvailable(host);
        if (request == null || request.durationMinutes() < 1 || request.durationMinutes() > 15) {
            throw new QuizRoomException("INVALID_DURATION");
        }
        Payloads.QuizSetEdit quizSet;
        try {
            quizSet = quizSets.getPublishedForRoom(request.quizSetId());
        } catch (QuizSetException e) {
            throw new QuizRoomException(e.getCode());
        }
        List<Question> questions = snapshot(quizSet);
        String pin = uniquePin();
        QuizRoom room = new QuizRoom(pin, host, quizSet.title(), request.hostPlays(),
                request.durationMinutes() * 60, questions, scheduler, System::nanoTime,
                this::scheduleCleanup);
        rooms.put(pin, room);
        userRooms.put(host.getPlayerId(), room);
        host.send(new Message(MessageType.QUIZ_ROOM_CREATED,
                Payloads.toJson(new Payloads.QuizRoomCreated(
                        room.lobbyFor(host.getPlayerId())))));
    }

    public synchronized void join(ClientHandler client, String rawPin) {
        requireAvailable(client);
        String pin = normalizePin(rawPin);
        QuizRoom room = rooms.get(pin);
        if (room == null || room.isFinished()) throw new QuizRoomException("ROOM_NOT_FOUND");
        room.join(client);
        userRooms.put(client.getPlayerId(), room);
    }

    public void start(ClientHandler client) {
        requireCurrent(client).start(client);
    }

    public void answer(ClientHandler client, Payloads.QuizAnswerData answer) {
        requireCurrent(client).answer(client, answer);
    }

    public synchronized void leave(ClientHandler client) {
        QuizRoom room = requireCurrent(client);
        room.leave(client);
        userRooms.remove(client.getPlayerId(), room);
    }

    public void cancel(ClientHandler client) {
        requireCurrent(client).cancelByHost(client);
    }

    public void disconnected(ClientHandler client) {
        QuizRoom room = userRooms.get(client.getPlayerId());
        if (room != null) room.disconnected(client);
    }

    /** Gọi sau LOGIN_OK; room tự gửi snapshot lobby hoặc câu hiện tại. */
    public boolean reconnect(ClientHandler client) {
        QuizRoom room = userRooms.get(client.getPlayerId());
        if (room == null) return false;
        if (room.reconnect(client)) return true;
        userRooms.remove(client.getPlayerId(), room);
        return false;
    }

    public boolean isHostOfLobby(ClientHandler client, String rawPin) {
        String pin;
        try {
            pin = normalizePin(rawPin);
        } catch (QuizRoomException e) {
            return false;
        }
        QuizRoom room = rooms.get(pin);
        return room != null && room == client.getCurrentQuizRoom()
                && room.isLobby() && room.isHost(client.getPlayerId());
    }

    public void joinFromInvite(ClientHandler client, String pin) {
        join(client, pin);
    }

    private void requireAvailable(ClientHandler client) {
        if (!client.isAuthenticated()) throw new QuizRoomException("NOT_AUTHENTICATED");
        if (client.getCurrentRoom() != null || client.isQueued()
                || client.getCurrentQuizRoom() != null
                || userRooms.containsKey(client.getPlayerId())) {
            throw new QuizRoomException("BUSY");
        }
    }

    private QuizRoom requireCurrent(ClientHandler client) {
        QuizRoom room = client.getCurrentQuizRoom();
        if (room == null) throw new QuizRoomException("NOT_IN_ROOM");
        return room;
    }

    private List<Question> snapshot(Payloads.QuizSetEdit quizSet) {
        List<Question> questions = new ArrayList<>();
        for (Payloads.QuizQuestionEdit source : quizSet.questions()) {
            if (source.id() == null || source.id() <= 0) {
                throw new QuizRoomException("INVALID_QUIZ");
            }
            List<Choice> choices = new ArrayList<>();
            for (Payloads.QuizChoiceEdit choice : source.choices()) {
                if (choice.id() == null || choice.id() <= 0) {
                    throw new QuizRoomException("INVALID_QUIZ");
                }
                choices.add(new Choice(choice.id(), source.id(), choice.content(),
                        choice.correct(), choice.position()));
            }
            questions.add(new Question(source.id(), source.content(), quizSet.title(),
                    quizSet.level(), source.explanation(), choices));
        }
        if (questions.size() < 3) throw new QuizRoomException("INVALID_QUIZ");
        return List.copyOf(questions);
    }

    private String uniquePin() {
        for (int attempts = 0; attempts < 100; attempts++) {
            String pin = String.format("%06d", pinSupplier.getAsInt());
            if (!rooms.containsKey(pin)) return pin;
        }
        throw new QuizRoomException("PIN_UNAVAILABLE");
    }

    private String normalizePin(String rawPin) {
        String pin = rawPin == null ? "" : rawPin.trim();
        if (!pin.matches("\\d{6}")) throw new QuizRoomException("INVALID_PIN");
        return pin;
    }

    private void scheduleCleanup(QuizRoom room) {
        scheduler.execute(() -> cleanup(room));
    }

    private synchronized void cleanup(QuizRoom room) {
        rooms.remove(room.getPin(), room);
        for (long userId : room.memberIds()) userRooms.remove(userId, room);
    }

    public int activeRoomCount() { return rooms.size(); }

    public void shutdown() {
        List<QuizRoom> active = List.copyOf(rooms.values());
        active.forEach(QuizRoom::shutdown);
        rooms.clear();
        userRooms.clear();
    }
}
</file>

<file path="src/main/java/com/nihongoquest/server/ranked/MatchRepository.java">
package com.nihongoquest.server.ranked;

import com.nihongoquest.server.database.Database;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/** Lưu một kết quả Ranked và thống kê hai người trong một transaction JDBC ngắn. */
public class MatchRepository {
    private static final int QUERY_TIMEOUT_SECONDS = 10;
    private final Database database;

    public MatchRepository(Database database) {
        this.database = Objects.requireNonNull(database);
    }

    public void saveResult(MatchResult first, MatchResult second, int durationSeconds,
                           EndReason reason, Long forfeitingUserId) throws SQLException {
        validate(first, second, durationSeconds, forfeitingUserId);
        Long winnerId = winner(first, second, forfeitingUserId);
        try (Connection connection = database.getConnection()) {
            connection.setAutoCommit(false);
            try {
                insertMatch(connection, first, second, durationSeconds, reason, winnerId);
                List<MatchResult> ordered = List.of(first, second).stream()
                        .sorted(Comparator.comparingLong(MatchResult::userId)).toList();
                for (MatchResult result : ordered) {
                    updateStatistics(connection, result,
                            winnerId != null && winnerId == result.userId(),
                            winnerId != null && winnerId != result.userId());
                }
                connection.commit();
            } catch (SQLException | RuntimeException e) {
                try {
                    connection.rollback();
                } catch (SQLException rollbackFailure) {
                    e.addSuppressed(rollbackFailure);
                }
                throw e;
            }
        }
    }

    public List<MatchHistoryItem> findHistory(long userId, int limit) throws SQLException {
        if (limit < 1 || limit > 100) throw new IllegalArgumentException("Limit khong hop le");
        String sql = """
                SELECT m.id, m.player1_id, m.player2_id,
                       player1.username AS player1_username,
                       player2.username AS player2_username,
                       m.score1, m.score2, m.winner_id, m.duration_seconds,
                       m.end_reason, m.played_at
                FROM matches m
                JOIN users player1 ON player1.id = m.player1_id
                JOIN users player2 ON player2.id = m.player2_id
                WHERE m.player1_id = ? OR m.player2_id = ?
                ORDER BY m.played_at DESC
                LIMIT ?
                """;
        List<MatchHistoryItem> history = new ArrayList<>();
        try (Connection connection = database.getConnection();
             PreparedStatement statement = prepare(connection, sql)) {
            statement.setLong(1, userId);
            statement.setLong(2, userId);
            statement.setInt(3, limit);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) history.add(readHistory(result, userId));
            }
        }
        return List.copyOf(history);
    }

    static MatchHistoryItem readHistory(ResultSet result, long userId) throws SQLException {
        long player1Id = result.getLong("player1_id");
        boolean first = player1Id == userId;
        long winnerId = result.getLong("winner_id");
        boolean draw = result.wasNull();
        String outcome = draw ? "DRAW" : winnerId == userId ? "WIN" : "LOSS";
        return new MatchHistoryItem(
                result.getLong("id"),
                result.getString(first ? "player2_username" : "player1_username"),
                result.getInt(first ? "score1" : "score2"),
                result.getInt(first ? "score2" : "score1"),
                outcome,
                result.getInt("duration_seconds"),
                result.getString("end_reason"),
                result.getTimestamp("played_at").toInstant().toString());
    }

    private void insertMatch(Connection connection, MatchResult first, MatchResult second,
                             int durationSeconds, EndReason reason, Long winnerId) throws SQLException {
        try (PreparedStatement statement = prepare(connection, """
                INSERT INTO matches
                    (player1_id, player2_id, score1, score2, winner_id, duration_seconds, end_reason)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """)) {
            statement.setLong(1, first.userId());
            statement.setLong(2, second.userId());
            statement.setInt(3, first.score());
            statement.setInt(4, second.score());
            if (winnerId == null) statement.setNull(5, Types.BIGINT);
            else statement.setLong(5, winnerId);
            statement.setInt(6, durationSeconds);
            statement.setString(7, reason.name());
            requireOne(statement.executeUpdate());
        }
    }

    private void updateStatistics(Connection connection, MatchResult result,
                                  boolean won, boolean lost) throws SQLException {
        try (PreparedStatement statement = prepare(connection, """
                UPDATE users
                SET wins = wins + ?, losses = losses + ?, draws = draws + ?,
                    total_score = total_score + ?,
                    questions_answered = questions_answered + ?,
                    correct_answers = correct_answers + ?, updated_at = now()
                WHERE id = ?
                """)) {
            statement.setInt(1, won ? 1 : 0);
            statement.setInt(2, lost ? 1 : 0);
            statement.setInt(3, !won && !lost ? 1 : 0);
            statement.setInt(4, result.score());
            statement.setInt(5, result.questionsAnswered());
            statement.setInt(6, result.correctAnswers());
            statement.setLong(7, result.userId());
            requireOne(statement.executeUpdate());
        }
    }

    public static Long winner(MatchResult first, MatchResult second, Long forfeitingUserId) {
        if (forfeitingUserId != null) {
            return forfeitingUserId == first.userId() ? second.userId() : first.userId();
        }
        if (first.score() == second.score()) return null;
        return first.score() > second.score() ? first.userId() : second.userId();
    }

    private static void validate(MatchResult first, MatchResult second, int durationSeconds,
                                 Long forfeitingUserId) {
        if (first.userId() == second.userId() || (durationSeconds != 180 && durationSeconds != 300)) {
            throw new IllegalArgumentException("Kết quả Ranked không hợp lệ");
        }
        if (forfeitingUserId != null && forfeitingUserId != first.userId()
                && forfeitingUserId != second.userId()) {
            throw new IllegalArgumentException("Người bỏ cuộc không thuộc trận");
        }
    }

    private static PreparedStatement prepare(Connection connection, String sql) throws SQLException {
        PreparedStatement statement = connection.prepareStatement(sql);
        statement.setQueryTimeout(QUERY_TIMEOUT_SECONDS);
        return statement;
    }

    private static void requireOne(int count) throws SQLException {
        if (count != 1) throw new SQLException("Expected one changed row, got " + count);
    }

    public enum EndReason { NORMAL, DISCONNECT }

    public record MatchResult(long userId, int score, int questionsAnswered, int correctAnswers) {
        public MatchResult {
            if (userId <= 0 || score < 0 || questionsAnswered < 0
                    || correctAnswers < 0 || correctAnswers > questionsAnswered) {
                throw new IllegalArgumentException("Thống kê người chơi không hợp lệ");
            }
        }
    }

    public record MatchHistoryItem(long matchId, String opponentUsername,
                                   int myScore, int opponentScore, String result,
                                   int durationSeconds, String endReason, String playedAt) { }
}
</file>

<file path="src/main/resources/client/friend/friends.fxml">
<?xml version="1.0" encoding="UTF-8"?>

<?import javafx.scene.control.*?>
<?import javafx.scene.layout.*?>

<BorderPane styleClass="root,app-shell"
            xmlns="http://javafx.com/javafx/21"
            xmlns:fx="http://javafx.com/fxml/1"
            fx:controller="com.nihongoquest.client.friend.FriendsController">
    <center>
        <VBox spacing="12" styleClass="page-content">
            <HBox alignment="CENTER_RIGHT" styleClass="page-action-row">
                <Button text="LÀM MỚI" onAction="#onRefresh" styleClass="primary-button"/>
            </HBox>
            <TabPane VBox.vgrow="ALWAYS" tabClosingPolicy="UNAVAILABLE">
                <tabs>
                    <Tab text="BẠN BÈ">
                        <VBox spacing="12" styleClass="tab-content">
                            <ListView fx:id="friendList" VBox.vgrow="ALWAYS"/>
                            <HBox alignment="CENTER_LEFT" spacing="10">
                                <ComboBox fx:id="rankedDurationBox" prefWidth="120"/>
                                <Button text="MỜI 1V1" onAction="#onInviteRanked"
                                        styleClass="primary-button"/>
                                <TextField fx:id="quizPinField" promptText="PIN Quiz 6 số"
                                           prefWidth="150"/>
                                <Button text="MỜI VÀO QUIZ" onAction="#onInviteQuiz"
                                        styleClass="secondary-button"/>
                                <Region HBox.hgrow="ALWAYS"/>
                                <Button text="XÓA BẠN" onAction="#onRemoveFriend"
                                        styleClass="secondary-button"/>
                            </HBox>
                        </VBox>
                    </Tab>
                    <Tab text="LỜI MỜI KẾT BẠN">
                        <VBox spacing="12" styleClass="tab-content">
                            <ListView fx:id="requestList" VBox.vgrow="ALWAYS"/>
                            <HBox spacing="10">
                                <Button text="CHẤP NHẬN" onAction="#onAccept"
                                        styleClass="primary-button"/>
                                <Button text="TỪ CHỐI" onAction="#onReject"
                                        styleClass="secondary-button"/>
                            </HBox>
                        </VBox>
                    </Tab>
                    <Tab text="TÌM NGƯỜI CHƠI">
                        <VBox spacing="12" styleClass="tab-content">
                            <HBox spacing="10">
                                <TextField fx:id="searchField" promptText="Nhập một phần username"
                                           HBox.hgrow="ALWAYS" onAction="#onSearch"/>
                                <Button text="TÌM" onAction="#onSearch" styleClass="primary-button"/>
                            </HBox>
                            <ListView fx:id="searchResults" VBox.vgrow="ALWAYS"/>
                            <Button text="GỬI LỜI MỜI KẾT BẠN" onAction="#onAddFriend"
                                    styleClass="secondary-button"/>
                        </VBox>
                    </Tab>
                </tabs>
            </TabPane>
            <Label fx:id="statusLabel" text="Đang tải..." styleClass="helper-text"/>
        </VBox>
    </center>
</BorderPane>
</file>

<file path="src/main/resources/client/history/match-history.fxml">
<?xml version="1.0" encoding="UTF-8"?>

<?import javafx.scene.control.*?>
<?import javafx.scene.layout.*?>

<BorderPane styleClass="root,app-shell"
            xmlns="http://javafx.com/javafx/21"
            xmlns:fx="http://javafx.com/fxml/1"
            fx:controller="com.nihongoquest.client.history.MatchHistoryController">
    <center>
        <VBox spacing="14" styleClass="page-content">
            <HBox alignment="CENTER_RIGHT" styleClass="page-action-row">
                <Button text="LÀM MỚI" onAction="#onRefresh" styleClass="primary-button"/>
            </HBox>
            <TableView fx:id="historyTable" VBox.vgrow="ALWAYS">
                <columns>
                    <TableColumn fx:id="timeColumn" text="THỜI GIAN" prefWidth="180"/>
                    <TableColumn fx:id="opponentColumn" text="ĐỐI THỦ" prefWidth="210"/>
                    <TableColumn fx:id="scoreColumn" text="TỶ SỐ" prefWidth="120"/>
                    <TableColumn fx:id="resultColumn" text="KẾT QUẢ" prefWidth="130"/>
                    <TableColumn fx:id="modeColumn" text="CHẾ ĐỘ" prefWidth="130"/>
                    <TableColumn fx:id="reasonColumn" text="KẾT THÚC" prefWidth="170"/>
                </columns>
            </TableView>
            <Label fx:id="statusLabel" text="Đang tải..." styleClass="helper-text"/>
        </VBox>
    </center>
</BorderPane>
</file>

<file path="src/main/resources/client/leaderboard/leaderboard.fxml">
<?xml version="1.0" encoding="UTF-8"?>

<?import javafx.geometry.Insets?>
<?import javafx.scene.control.*?>
<?import javafx.scene.layout.*?>

<BorderPane styleClass="root,app-shell"
            xmlns="http://javafx.com/javafx/21"
            xmlns:fx="http://javafx.com/fxml/1"
            fx:controller="com.nihongoquest.client.leaderboard.LeaderboardController">
    <center>
        <VBox spacing="14" styleClass="page-content">
            <HBox alignment="CENTER_RIGHT" styleClass="page-action-row">
                <Button text="LÀM MỚI" onAction="#onRefresh" styleClass="primary-button"/>
            </HBox>
            <TableView fx:id="leaderboardTable" VBox.vgrow="ALWAYS">
                <columns>
                    <TableColumn fx:id="rankColumn" text="HẠNG" prefWidth="90"/>
                    <TableColumn fx:id="usernameColumn" text="NGƯỜI CHƠI" prefWidth="300"/>
                    <TableColumn fx:id="winsColumn" text="THẮNG" prefWidth="150"/>
                    <TableColumn fx:id="drawsColumn" text="HÒA" prefWidth="150"/>
                    <TableColumn fx:id="scoreColumn" text="TỔNG ĐIỂM" prefWidth="190"/>
                </columns>
            </TableView>
            <Label fx:id="statusLabel" text="Đang tải..." styleClass="helper-text"/>
        </VBox>
    </center>
</BorderPane>
</file>

<file path="src/main/resources/client/quiz/quiz-battle.fxml">
<?xml version="1.0" encoding="UTF-8"?>

<?import javafx.scene.control.*?>
<?import javafx.scene.layout.*?>

<BorderPane styleClass="root,app-shell"
            xmlns="http://javafx.com/javafx/21"
            xmlns:fx="http://javafx.com/fxml/1"
            fx:controller="com.nihongoquest.client.quiz.QuizBattleController">
    <top>
        <HBox alignment="CENTER_LEFT" spacing="18" styleClass="gameplay-header">
            <VBox spacing="2" HBox.hgrow="ALWAYS">
                <Label text="QUIZ ROOM" styleClass="app-brand"/>
                <Label fx:id="titleLabel" text="Bộ đề" styleClass="header-page-title"/>
            </VBox>
            <VBox alignment="CENTER_RIGHT" spacing="2">
                <Label fx:id="pinLabel" text="PIN ------" styleClass="field-caption"/>
                <Label fx:id="roomTimeLabel" text="3:00" styleClass="quiz-room-time"/>
            </VBox>
        </HBox>
    </top>
    <center>
        <HBox spacing="18" styleClass="battle-content">
            <VBox spacing="14" HBox.hgrow="ALWAYS">
                <HBox alignment="CENTER_LEFT" spacing="12">
                    <Label fx:id="scoreLabel" text="0 điểm" styleClass="section-title"/>
                    <Region HBox.hgrow="ALWAYS"/>
                    <Label text="THỜI GIAN CÂU" styleClass="timer-caption"/>
                    <ProgressBar fx:id="questionProgress" progress="0"
                                 prefWidth="220" styleClass="time-progress"/>
                    <Label fx:id="questionTimeLabel" text="--" styleClass="time-label"/>
                </HBox>
                <VBox spacing="12" styleClass="question-card" VBox.vgrow="ALWAYS">
                    <Label fx:id="questionLabel" text="Đang chuẩn bị câu hỏi"
                           wrapText="true" styleClass="battle-question"/>
                    <GridPane hgap="12" vgap="12">
                        <columnConstraints>
                            <ColumnConstraints percentWidth="50" hgrow="ALWAYS"/>
                            <ColumnConstraints percentWidth="50" hgrow="ALWAYS"/>
                        </columnConstraints>
                        <Button fx:id="answerAButton" text="A" onAction="#onAnswer"
                                maxWidth="Infinity" styleClass="answer-button"
                                GridPane.columnIndex="0" GridPane.rowIndex="0"/>
                        <Button fx:id="answerBButton" text="B" onAction="#onAnswer"
                                maxWidth="Infinity" styleClass="answer-button"
                                GridPane.columnIndex="1" GridPane.rowIndex="0"/>
                        <Button fx:id="answerCButton" text="C" onAction="#onAnswer"
                                maxWidth="Infinity" styleClass="answer-button"
                                GridPane.columnIndex="0" GridPane.rowIndex="1"/>
                        <Button fx:id="answerDButton" text="D" onAction="#onAnswer"
                                maxWidth="Infinity" styleClass="answer-button"
                                GridPane.columnIndex="1" GridPane.rowIndex="1"/>
                    </GridPane>
                    <Label fx:id="statusLabel" text="" styleClass="status-label"/>
                </VBox>
                <Button fx:id="leaveButton" text="Rời phòng" onAction="#onLeave"
                        styleClass="danger-outline-button"/>
            </VBox>
            <VBox spacing="10" prefWidth="350" styleClass="quiz-side-panel">
                <Label text="BẢNG XẾP HẠNG TRỰC TIẾP" styleClass="section-title"/>
                <ListView fx:id="leaderboardList" VBox.vgrow="ALWAYS"/>
            </VBox>
        </HBox>
    </center>
</BorderPane>
</file>

<file path="src/main/resources/client/quiz/quiz-lobby.fxml">
<?xml version="1.0" encoding="UTF-8"?>

<?import javafx.scene.control.*?>
<?import javafx.scene.layout.*?>

<BorderPane styleClass="root,app-shell"
            xmlns="http://javafx.com/javafx/21"
            xmlns:fx="http://javafx.com/fxml/1"
            fx:controller="com.nihongoquest.client.quiz.QuizLobbyController">
    <center>
        <VBox spacing="14" styleClass="page-content">
            <HBox alignment="CENTER_LEFT">
                <VBox spacing="3" HBox.hgrow="ALWAYS">
                    <Label fx:id="titleLabel" text="Bộ đề" styleClass="section-title"/>
                    <Label text="Phòng khóa khi host bắt đầu; tối đa 20 người chơi."
                           styleClass="helper-text"/>
                </VBox>
                <VBox alignment="CENTER_RIGHT" spacing="2">
                    <Label text="MÃ PIN" styleClass="field-caption"/>
                    <Label fx:id="pinLabel" text="------" styleClass="lobby-pin"/>
                </VBox>
                <Label fx:id="countLabel" text="0/20 người chơi" styleClass="helper-text"/>
            </HBox>
            <ListView fx:id="playerList" VBox.vgrow="ALWAYS" styleClass="quiz-list"/>
            <Label fx:id="statusLabel" text="" styleClass="status-label"/>
            <HBox alignment="CENTER_RIGHT" spacing="10">
                <Button fx:id="leaveButton" text="Rời phòng" onAction="#onLeave"
                        styleClass="danger-outline-button"/>
                <Button fx:id="startButton" text="BẮT ĐẦU"
                        onAction="#onStart" prefWidth="180"/>
            </HBox>
        </VBox>
    </center>
</BorderPane>
</file>

<file path="src/main/resources/client/quiz/quiz-room-menu.fxml">
<?xml version="1.0" encoding="UTF-8"?>

<?import javafx.scene.control.*?>
<?import javafx.scene.layout.*?>

<BorderPane styleClass="root,app-shell"
            xmlns="http://javafx.com/javafx/21"
            xmlns:fx="http://javafx.com/fxml/1"
            fx:controller="com.nihongoquest.client.quiz.QuizRoomMenuController">
    <center>
        <HBox alignment="CENTER" spacing="24" styleClass="page-content">
            <VBox spacing="13" styleClass="quiz-room-card">
                <Label text="TẠO PHÒNG" styleClass="section-title"/>
                <Label text="Bộ đề đã xuất bản" styleClass="field-caption"/>
                <ComboBox fx:id="quizSetCombo" prefWidth="380"/>
                <Label text="Thời lượng chung" styleClass="field-caption"/>
                <HBox alignment="CENTER_LEFT" spacing="8">
                    <Spinner fx:id="durationSpinner" editable="true" prefWidth="110"/>
                    <Label text="phút (1–15)"/>
                </HBox>
                <CheckBox fx:id="hostPlaysCheck" text="Host cũng tham gia trả lời" selected="true"/>
                <Button fx:id="createButton" text="TẠO PHÒNG VÀ LẤY PIN"
                        onAction="#onCreate" maxWidth="Infinity"/>
            </VBox>
            <VBox spacing="13" styleClass="quiz-room-card">
                <Label text="VÀO PHÒNG" styleClass="section-title"/>
                <Label text="Nhập PIN 6 chữ số do host cung cấp" styleClass="helper-text"/>
                <TextField fx:id="pinField" promptText="123456" maxWidth="260"
                           styleClass="pin-input"/>
                <Button fx:id="joinButton" text="THAM GIA"
                        onAction="#onJoin" maxWidth="Infinity"/>
            </VBox>
        </HBox>
    </center>
    <bottom>
        <HBox alignment="CENTER" styleClass="editor-footer">
            <Label fx:id="statusLabel" text="" styleClass="status-label"/>
        </HBox>
    </bottom>
</BorderPane>
</file>

<file path="src/main/resources/client/quiz/quiz-set-editor.fxml">
<?xml version="1.0" encoding="UTF-8"?>

<?import javafx.geometry.Insets?>
<?import javafx.scene.control.*?>
<?import javafx.scene.layout.*?>

<BorderPane styleClass="root,app-shell"
            xmlns="http://javafx.com/javafx/21"
            xmlns:fx="http://javafx.com/fxml/1"
            fx:controller="com.nihongoquest.client.quiz.QuizSetEditorController">
    <center>
        <SplitPane dividerPositions="0.34" styleClass="quiz-editor-split">
            <VBox spacing="10" styleClass="quiz-side-panel">
                <Label text="Danh sách câu hỏi" styleClass="section-title"/>
                <ListView fx:id="questionList" VBox.vgrow="ALWAYS"/>
                <HBox spacing="8">
                    <Button fx:id="newQuestionButton" text="Câu mới" onAction="#onNewQuestion"
                            HBox.hgrow="ALWAYS" maxWidth="Infinity"/>
                    <Button fx:id="removeQuestionButton" text="Bỏ câu" onAction="#onRemoveQuestion"
                            disable="true" styleClass="danger-outline-button"
                            HBox.hgrow="ALWAYS" maxWidth="Infinity"/>
                </HBox>
            </VBox>
            <ScrollPane fitToWidth="true" styleClass="quiz-editor-scroll">
                <VBox fx:id="editorBox" spacing="12" styleClass="quiz-form">
                    <Label text="Thông tin bộ đề" styleClass="section-title"/>
                    <Label text="Tên bộ đề" styleClass="field-caption"/>
                    <TextField fx:id="titleField" promptText="Ví dụ: Từ vựng N5 cơ bản"/>
                    <HBox spacing="12">
                        <VBox spacing="5" HBox.hgrow="ALWAYS">
                            <Label text="Mô tả" styleClass="field-caption"/>
                            <TextArea fx:id="descriptionArea" prefRowCount="2" wrapText="true"/>
                        </VBox>
                        <VBox spacing="5">
                            <Label text="Cấp độ JLPT" styleClass="field-caption"/>
                            <ComboBox fx:id="levelCombo" prefWidth="120"/>
                        </VBox>
                    </HBox>
                    <Separator/>
                    <Label text="Nội dung câu hỏi" styleClass="section-title"/>
                    <TextArea fx:id="questionArea" promptText="Nhập câu hỏi" prefRowCount="3" wrapText="true"/>
                    <Label text="Giải thích sau khi trả lời (không bắt buộc)" styleClass="field-caption"/>
                    <TextArea fx:id="explanationArea" prefRowCount="2" wrapText="true"/>
                    <Label text="Bốn lựa chọn — chọn nút tròn cạnh đáp án đúng" styleClass="field-caption"/>
                    <GridPane hgap="10" vgap="9">
                        <columnConstraints>
                            <ColumnConstraints minWidth="28"/>
                            <ColumnConstraints hgrow="ALWAYS"/>
                        </columnConstraints>
                        <RadioButton fx:id="correct1" GridPane.columnIndex="0" GridPane.rowIndex="0"/>
                        <TextField fx:id="choice1Field" promptText="Lựa chọn 1"
                                   GridPane.columnIndex="1" GridPane.rowIndex="0"/>
                        <RadioButton fx:id="correct2" GridPane.columnIndex="0" GridPane.rowIndex="1"/>
                        <TextField fx:id="choice2Field" promptText="Lựa chọn 2"
                                   GridPane.columnIndex="1" GridPane.rowIndex="1"/>
                        <RadioButton fx:id="correct3" GridPane.columnIndex="0" GridPane.rowIndex="2"/>
                        <TextField fx:id="choice3Field" promptText="Lựa chọn 3"
                                   GridPane.columnIndex="1" GridPane.rowIndex="2"/>
                        <RadioButton fx:id="correct4" GridPane.columnIndex="0" GridPane.rowIndex="3"/>
                        <TextField fx:id="choice4Field" promptText="Lựa chọn 4"
                                   GridPane.columnIndex="1" GridPane.rowIndex="3"/>
                    </GridPane>
                    <Button fx:id="applyQuestionButton" text="Thêm câu hỏi"
                            onAction="#onApplyQuestion" maxWidth="Infinity"/>
                </VBox>
            </ScrollPane>
        </SplitPane>
    </center>
    <bottom>
        <HBox spacing="12" alignment="CENTER_RIGHT" styleClass="editor-footer">
            <Label fx:id="statusLabel" text="" styleClass="status-label" HBox.hgrow="ALWAYS"/>
            <Button text="Quay lại" onAction="#onCancel" styleClass="secondary-button"/>
            <Button fx:id="saveButton" text="Lưu bản nháp" onAction="#onSave"/>
        </HBox>
    </bottom>
</BorderPane>
</file>

<file path="src/main/resources/client/quiz/quiz-set-list.fxml">
<?xml version="1.0" encoding="UTF-8"?>

<?import javafx.geometry.Insets?>
<?import javafx.scene.control.*?>
<?import javafx.scene.layout.*?>

<BorderPane styleClass="root,app-shell"
            xmlns="http://javafx.com/javafx/21"
            xmlns:fx="http://javafx.com/fxml/1"
            fx:controller="com.nihongoquest.client.quiz.QuizSetListController">
    <center>
        <VBox spacing="14" styleClass="page-content">
            <HBox spacing="10" alignment="CENTER_LEFT">
                <Button text="Bộ đề của tôi" onAction="#onOwned"/>
                <Button text="Bộ đề công khai" onAction="#onPublished" styleClass="secondary-button"/>
                <Region HBox.hgrow="ALWAYS"/>
                <Button text="Tạo bộ đề mới" onAction="#onCreate" styleClass="primary-button"/>
            </HBox>
            <ListView fx:id="quizSetList" VBox.vgrow="ALWAYS" styleClass="quiz-list"/>
            <HBox spacing="10" alignment="CENTER_LEFT">
                <Button fx:id="viewButton" text="Xem" onAction="#onView" styleClass="secondary-button"/>
                <Button fx:id="editButton" text="Sửa" onAction="#onEdit"/>
                <Button fx:id="publishButton" text="Xuất bản" onAction="#onPublish"/>
                <Button fx:id="deleteButton" text="Xóa" onAction="#onDelete"
                        styleClass="danger-outline-button"/>
                <Region HBox.hgrow="ALWAYS"/>
                <Label fx:id="statusLabel" text="" styleClass="status-label"/>
            </HBox>
        </VBox>
    </center>
</BorderPane>
</file>

<file path="src/main/resources/client/ranked/battle/result.fxml">
<?xml version="1.0" encoding="UTF-8"?>

<?import javafx.scene.control.*?>
<?import javafx.scene.layout.*?>

<BorderPane styleClass="root,app-shell"
            xmlns="http://javafx.com/javafx/21"
            xmlns:fx="http://javafx.com/fxml/1"
            fx:controller="com.nihongoquest.client.ranked.battle.ResultController">
    <center>
        <VBox alignment="CENTER" spacing="20" styleClass="page-content">
            <VBox alignment="CENTER" spacing="14" styleClass="result-card">
                <Label text="KẾT QUẢ TRẬN ĐẤU" styleClass="result-eyebrow"/>
                <Label fx:id="resultLabel" text="CHIẾN THẮNG" styleClass="result-title"/>
                <Label text="TỶ SỐ CHUNG CUỘC" styleClass="score-caption"/>
                <Label fx:id="scoreLabel" text="0  -  0" styleClass="result-score"/>
                <Label fx:id="opponentLabel" text="Đối thủ" styleClass="result-opponent"/>
            </VBox>
        </VBox>
    </center>
</BorderPane>
</file>

<file path="src/main/resources/db.properties.example">
# Sao chép thành db.properties và điền thông tin Database Settings của Supabase.
db.host=your-database-host
db.port=5432
db.name=postgres
db.user=your-database-user
db.password=your-database-password
db.ssl=true
</file>

<file path="src/test/java/com/nihongoquest/client/profile/ProfilePresenterTest.java">
package com.nihongoquest.client.profile;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ProfilePresenterTest {

    @Test
    void calculatesRoundedAccuracy() {
        Player player = new Player(1, "sakura", 4, 2, 1, 120, 6, 4);

        assertEquals(67, ProfilePresenter.accuracy(player));
    }

    @Test
    void returnsZeroAccuracyBeforeAnyAnswer() {
        Player player = new Player(1, "sakura", 0, 0, 0, 0, 0, 0);

        assertEquals(0, ProfilePresenter.accuracy(player));
    }
}
</file>

<file path="src/test/java/com/nihongoquest/common/protocol/MessageTest.java">
package com.nihongoquest.common.protocol;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class MessageTest {

    @Test
    void jsonFramePreservesSeparatorsUnicodeAndEscapedNewlines() {
        String payload = "Câu hỏi | đáp án\n日本語";
        Message decoded = Message.fromWire(new Message(MessageType.QUESTION, payload).toWire());

        assertEquals(MessageType.QUESTION, decoded.getType());
        assertEquals(payload, decoded.payloadText());
    }

    @Test
    void rejectsBlankAndMalformedFrames() {
        assertThrows(IllegalArgumentException.class, () -> Message.fromWire(" "));
        assertThrows(IllegalArgumentException.class, () -> Message.fromWire("not-json"));
        assertThrows(IllegalArgumentException.class,
                () -> Message.fromWire("{\"payload\":\"x\"}"));
    }
}
</file>

<file path="src/test/java/com/nihongoquest/server/network/OnlineUserRegistryTest.java">
package com.nihongoquest.server.network;

import org.junit.jupiter.api.Test;

import java.net.Socket;

import static org.junit.jupiter.api.Assertions.*;

class OnlineUserRegistryTest {
    @Test
    void allowsOnlyOneConnectionPerAccountAndRemovesExactSession() {
        OnlineUserRegistry registry = new OnlineUserRegistry();
        StubClient first = new StubClient(7);
        StubClient second = new StubClient(7);

        assertTrue(registry.login(7, first));
        assertFalse(registry.login(7, second));
        assertSame(first, registry.find(7));
        registry.logout(second);
        assertSame(first, registry.find(7));
        registry.logout(first);
        assertNull(registry.find(7));
    }

    @Test
    void reportsBusyForQueueOrActiveRoomState() {
        OnlineUserRegistry registry = new OnlineUserRegistry();
        StubClient client = new StubClient(8);
        assertTrue(registry.login(8, client));
        assertFalse(registry.isBusy(8));
        client.setQueued(true);
        assertTrue(registry.isBusy(8));
    }

    private static final class StubClient extends ClientHandler {
        StubClient(long id) {
            super(new Socket());
            setAuthenticatedPlayer(id, "player" + id);
        }

        @Override public boolean isConnected() { return true; }
    }
}
</file>

<file path="src/test/java/com/nihongoquest/server/question/QuestionFixtures.java">
package com.nihongoquest.server.question;

import com.nihongoquest.server.database.Database;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/** In-memory test bank; attempts to open a real database connection fail the test. */
public final class QuestionFixtures {
    private QuestionFixtures() { }

    public static Database offlineDatabase() {
        return new Database() {
            @Override
            public java.sql.Connection getConnection() {
                throw new AssertionError("Tests must not connect to a database");
            }
        };
    }

    public static Question question(long id, int count, int correctCount) {
        List<Choice> choices = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            choices.add(new Choice(id * 10 + i + 1, id, "選択肢 " + (i + 1), i < correctCount, i + 1));
        }
        return new Question(id, "意味は？", "VOCABULARY", "N5", "Explanation must stay on server", choices);
    }

    public static class Bank extends QuestionRepository {
        public final List<List<Long>> exclusions = new ArrayList<>();
        private final List<Question> questions;

        public Bank(List<Question> questions) {
            super(offlineDatabase());
            this.questions = List.copyOf(questions);
        }

        @Override
        public List<Question> findRandomQuestions(String level, int limit, Collection<Long> excluded)
                throws SQLException {
            exclusions.add(List.copyOf(excluded));
            return questions.stream().filter(q -> !excluded.contains(q.getId()))
                    .filter(q -> level == null || level.equals(q.getLevel())).limit(limit).toList();
        }

        @Override
        public Question findById(long id) {
            return questions.stream().filter(q -> q.getId() == id).findFirst().orElse(null);
        }
    }
}
</file>

<file path="src/test/java/com/nihongoquest/server/question/QuestionRepositoryTest.java">
package com.nihongoquest.server.question;

import org.junit.jupiter.api.Test;
import com.nihongoquest.server.database.Database;

import javax.sql.rowset.CachedRowSet;
import javax.sql.rowset.RowSetMetaDataImpl;
import javax.sql.rowset.RowSetProvider;
import java.sql.SQLException;
import java.sql.Types;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class QuestionRepositoryTest {
    @Test
    void loadsOnlyPublishedSetsAndBatchesChoicesOnOneConnection() throws Exception {
        JdbcStub jdbc = new JdbcStub(false);
        List<Question> questions = new QuestionRepository(jdbc.database()).findRandomQuestions(
                "N5", 3, List.of(99L));
        assertEquals(1, jdbc.connections);
        assertEquals(2, jdbc.sql.size());
        String query = jdbc.sql.get(0);
        assertTrue(query.contains("JOIN quiz_sets"));
        assertTrue(query.contains("qs.is_published = TRUE"));
        assertTrue(query.contains("qs.level = ?"));
        assertTrue(query.contains("q.id NOT IN (?)"));
        assertTrue(query.contains("ORDER BY RANDOM() LIMIT ?"));
        assertEquals(Map.of(1, "N5", 2, 99L, 3, 3), jdbc.bindings.get(0));
        assertTrue(jdbc.sql.get(1).contains("question_id IN (?)"));
        assertTrue(jdbc.sql.get(1).contains("ORDER BY question_id, position"));
        assertEquals(Map.of(1, 3_000_000_000L), jdbc.bindings.get(1));
        assertEquals(30_000_000_001L, questions.getFirst().getChoices().getFirst().id());
        assertEquals(1, jdbc.closedConnections);
        assertEquals(2, jdbc.closedStatements);
        assertEquals(2, jdbc.closedResults);
    }

    @Test
    void closesConnectionAndStatementsWhenChoiceQueryFails() {
        JdbcStub jdbc = new JdbcStub(true);
        assertThrows(SQLException.class, () -> new QuestionRepository(jdbc.database()).findRandomQuestions(3));
        assertFalse(jdbc.sql.get(0).contains("qs.level = ?"));
        assertEquals(Map.of(1, 3), jdbc.bindings.get(0));
        assertEquals(1, jdbc.closedConnections);
        assertEquals(2, jdbc.closedStatements);
        assertEquals(1, jdbc.closedResults);
    }

    @Test
    void findByIdAndFindChoicesBindLongIds() throws Exception {
        JdbcStub jdbc = new JdbcStub(false);
        assertEquals(3_000_000_000L, new QuestionRepository(jdbc.database()).findById(3_000_000_000L).getId());
        assertTrue(jdbc.sql.get(0).contains("WHERE q.id = ? AND qs.is_published = TRUE"));
        assertEquals(Map.of(1, 3_000_000_000L), jdbc.bindings.get(0));
        assertEquals(1, new QuestionRepository(jdbc.database()).findChoicesByQuestionId(3_000_000_000L).size());
        assertTrue(jdbc.sql.getLast().contains("WHERE question_id = ? ORDER BY position"));
        assertEquals(Map.of(1, 3_000_000_000L), jdbc.bindings.getLast());
        assertEquals(jdbc.connections, jdbc.closedConnections);
        assertEquals(jdbc.sql.size(), jdbc.closedStatements);
        assertEquals(jdbc.sql.size(), jdbc.closedResults);
    }

    @Test
    void mapsQuestionMetadataAndBigintIdsWithoutDatabase() throws Exception {
        try (CachedRowSet rows = row(new String[]{"id", "content", "category", "level", "explanation"},
                new int[]{Types.BIGINT, Types.VARCHAR, Types.VARCHAR, Types.VARCHAR, Types.VARCHAR},
                new Object[]{3_000_000_000L, "漢字 |\n意味？", "KANJI", null, "説明"})) {
            Question question = QuestionRepository.readQuestions(rows).getFirst();
            assertEquals(3_000_000_000L, question.getId());
            assertEquals("漢字 |\n意味？", question.getContent());
            assertEquals("KANJI", question.getCategory());
            assertNull(question.getLevel());
            assertEquals("説明", question.getExplanation());
            assertTrue(question.getChoices().isEmpty());
        }
    }

    @Test
    void mapsChoiceOwnershipAnswerKeyAndPosition() throws Exception {
        try (CachedRowSet rows = choiceRow(true)) {
            Choice choice = QuestionRepository.readChoices(rows).getFirst();
            assertEquals(30_000_000_001L, choice.id());
            assertEquals(3_000_000_000L, choice.questionId());
            assertEquals("答え", choice.content());
            assertTrue(choice.correct());
            assertEquals(4, choice.position());
        }
    }

    @Test
    void rejectsNullAnswerKeyInsteadOfSilentlyMappingItToFalse() throws Exception {
        try (CachedRowSet rows = choiceRow(null)) {
            assertTrue(assertThrows(SQLException.class, () -> QuestionRepository.readChoices(rows))
                    .getMessage().contains("is_correct is null"));
        }
    }

    private CachedRowSet choiceRow(Boolean correct) throws SQLException {
        return row(new String[]{"id", "question_id", "content", "is_correct", "position"},
                new int[]{Types.BIGINT, Types.BIGINT, Types.VARCHAR, Types.BOOLEAN, Types.INTEGER},
                new Object[]{30_000_000_001L, 3_000_000_000L, "答え", correct, 4});
    }

    private CachedRowSet row(String[] columns, int[] types, Object[] values) throws SQLException {
        CachedRowSet rows = RowSetProvider.newFactory().createCachedRowSet();
        RowSetMetaDataImpl metadata = new RowSetMetaDataImpl();
        metadata.setColumnCount(columns.length);
        for (int i = 0; i < columns.length; i++) {
            metadata.setColumnName(i + 1, columns[i]);
            metadata.setColumnType(i + 1, types[i]);
        }
        rows.setMetaData(metadata);
        rows.moveToInsertRow();
        for (int i = 0; i < values.length; i++) {
            if (values[i] == null) rows.updateNull(i + 1);
            else rows.updateObject(i + 1, values[i]);
        }
        rows.insertRow();
        rows.moveToCurrentRow();
        rows.beforeFirst();
        return rows;
    }

    /** Small strict JDBC fake: tests SQL bindings, mapping and closure, not a real DB. */
    private class JdbcStub {
        final boolean failChoices;
        final List<String> sql = new ArrayList<>();
        final List<Map<Integer, Object>> bindings = new ArrayList<>();
        int connections;
        int closedConnections;
        int closedStatements;
        int closedResults;

        JdbcStub(boolean failChoices) {
            this.failChoices = failChoices;
        }

        Database database() {
            return new Database() {
                @Override public Connection getConnection() {
                    connections++;
                    return (Connection) Proxy.newProxyInstance(getClass().getClassLoader(),
                            new Class<?>[]{Connection.class}, (proxy, method, args) -> switch (method.getName()) {
                                case "prepareStatement" -> statement((String) args[0]);
                                case "close" -> { closedConnections++; yield null; }
                                default -> throw new AssertionError("Unexpected JDBC method: " + method.getName());
                            });
                }
            };
        }

        PreparedStatement statement(String query) {
            sql.add(query);
            Map<Integer, Object> parameters = new HashMap<>();
            bindings.add(parameters);
            return (PreparedStatement) Proxy.newProxyInstance(getClass().getClassLoader(),
                    new Class<?>[]{PreparedStatement.class}, (proxy, method, args) -> switch (method.getName()) {
                        case "setString", "setInt", "setLong" -> { parameters.put((Integer) args[0], args[1]); yield null; }
                        case "setQueryTimeout" -> null;
                        case "executeQuery" -> results(query);
                        case "close" -> { closedStatements++; yield null; }
                        default -> throw new AssertionError("Unexpected JDBC method: " + method.getName());
                    });
        }

        ResultSet results(String query) throws SQLException {
            CachedRowSet rows;
            if (query.contains("FROM choices")) {
                if (failChoices) throw new SQLException("Choice query failed");
                rows = choiceRow(true);
            } else {
                rows = row(new String[]{"id", "content", "category", "level", "explanation"},
                        new int[]{Types.BIGINT, Types.VARCHAR, Types.VARCHAR, Types.VARCHAR, Types.VARCHAR},
                        new Object[]{3_000_000_000L, "Q", "KANJI", "N5", null});
            }
            return (ResultSet) Proxy.newProxyInstance(getClass().getClassLoader(), new Class<?>[]{ResultSet.class},
                    (proxy, method, args) -> {
                        if (method.getName().equals("close")) closedResults++;
                        return method.invoke(rows, args);
                    });
        }
    }
}
</file>

<file path="src/test/java/com/nihongoquest/server/question/QuestionServiceTest.java">
package com.nihongoquest.server.question;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;

import static com.nihongoquest.server.question.QuestionFixtures.question;
import static org.junit.jupiter.api.Assertions.*;

class QuestionServiceTest {
    private final QuestionService service = new QuestionService(new QuestionFixtures.Bank(List.of()));

    @Test
    void acceptsFourChoicesWithExactlyOneCorrectAnswer() {
        assertTrue(service.isValidForRanked(question(1, 4, 1)));
    }

    @ParameterizedTest
    @CsvSource({"3,1", "4,2", "4,0", "5,1"})
    void rejectsInvalidChoiceCountsAndAnswerKeys(int choices, int correct) {
        assertFalse(service.isValidForRanked(question(15, choices, correct)));
    }

    @Test
    void rejectsDuplicateOrNonpositivePositionsAndWrongQuestionOwnership() {
        List<Choice> original = question(1, 4, 1).getChoices();
        for (Choice replacement : List.of(
                new Choice(14, 1, "D", false, 1),
                new Choice(14, 1, "D", false, 0),
                new Choice(14, 2, "D", false, 4),
                new Choice(11, 1, "D", false, 4))) {
            List<Choice> choices = new ArrayList<>(original);
            choices.set(3, replacement);
            assertFalse(service.isValidForRanked(new Question(1, "Q", "KANJI", null, null, choices)));
        }
    }

    @Test
    void rejectsBlankQuestionAndChoiceContentAndMissingQuestions() {
        assertFalse(service.isValidForRanked(null));
        assertFalse(service.isValidForRanked(new Question(1, " ", "KANJI", null, null,
                question(1, 4, 1).getChoices())));
        List<Choice> choices = new ArrayList<>(question(1, 4, 1).getChoices());
        choices.set(2, new Choice(13, 1, "\n", false, 3));
        assertFalse(service.isValidForRanked(new Question(1, "Q", "KANJI", null, null, choices)));
        choices.set(2, null);
        assertFalse(service.isValidForRanked(new Question(1, "Q", "KANJI", null, null, choices)));
    }

    @Test
    void fillsRequestedCountWithoutReusingRejectedQuestions() {
        var bank = new QuestionFixtures.Bank(List.of(question(1, 3, 1), question(2, 4, 1),
                question(3, 4, 2), question(4, 4, 1), question(5, 4, 1)));
        List<Question> result = new QuestionService(bank).getRankedQuestions("N5", 3);
        assertEquals(List.of(2L, 4L, 5L), result.stream().map(Question::getId).toList());
        assertEquals(List.of(1L, 2L, 3L), bank.exclusions.get(1));
        assertThrows(UnsupportedOperationException.class, () -> result.clear());
    }

    @Test
    void fillsTenQuestionsEvenWhenTheInitialBatchContainsInvalidData() {
        List<Question> bank = new ArrayList<>();
        bank.add(question(1, 3, 1));
        for (int i = 2; i <= 11; i++) bank.add(question(i, 4, 1));
        assertEquals(10, new QuestionService(new QuestionFixtures.Bank(bank)).getRankedQuestions(null, 10).size());
    }

    @Test
    void failsClearlyWhenBankIsExhaustedOrLevelHasNoQuestions() {
        var subject = new QuestionService(new QuestionFixtures.Bank(List.of(question(1, 4, 1))));
        assertTrue(assertThrows(IllegalStateException.class,
                () -> subject.getRankedQuestions(null, 3)).getMessage().contains("minimum=3, found=1"));
        assertThrows(IllegalStateException.class, () -> subject.getRankedQuestions("N1", 1));
        assertThrows(IllegalArgumentException.class, () -> subject.getRankedQuestions(null, 0));
        assertThrows(IllegalStateException.class, () -> subject.getQuestion(99));
        assertEquals(1, subject.getQuestion(1).getId());
    }

    @Test
    void rankedPoolAcceptsBetweenMinimumAndMaximumQuestions() {
        List<Question> fiveQuestions = java.util.stream.LongStream.rangeClosed(1, 5)
                .mapToObj(id -> question(id, 4, 1)).toList();
        List<Question> result = new QuestionService(new QuestionFixtures.Bank(fiveQuestions))
                .getRankedQuestionsUpTo(null, 10, 3);
        assertEquals(5, result.size());
    }

    @Test
    void wrapsDatabaseFailuresWithTheirCause() {
        SQLException failure = new SQLException("Database unavailable", "08001");
        var bank = new QuestionFixtures.Bank(List.of()) {
            @Override
            public List<Question> findRandomQuestions(String level, int limit, Collection<Long> excluded)
                    throws SQLException { throw failure; }
        };
        assertSame(failure, assertThrows(IllegalStateException.class,
                () -> new QuestionService(bank).getRankedQuestions(null, 3)).getCause());
    }

    @Test
    void keepsChoicesOrderedAndImmutableWithoutLosingTheirIds() {
        List<Choice> choices = new ArrayList<>(question(3_000_000_000L, 4, 1).getChoices());
        Collections.reverse(choices);
        Question snapshot = new Question(3_000_000_000L, "Q", "KANJI", null, null, choices);
        choices.clear();
        assertEquals(List.of(1, 2, 3, 4), snapshot.getChoices().stream().map(Choice::position).toList());
        assertEquals(0, snapshot.indexOfChoice(30_000_000_001L));
        assertEquals(-1, snapshot.indexOfChoice(999));
        assertEquals(0, snapshot.getCorrectAnswerIndex());
        assertThrows(UnsupportedOperationException.class, () -> snapshot.getChoices().clear());
    }
}
</file>

<file path=".cursor/rules/nihongoquest.mdc">
description: Quy tắc phát triển AI & Quy trình Git cho dự án NihongoQuest (ĐACS4 - VKU)
alwaysApply: true

NIHONGOQUEST — AI RULES & WORKFLOW GUIDELINES

Dự án: NihongoQuest — Hệ thống thi đấu tiếng Nhật thời gian thực qua TCP Socket (Đồ án cơ sở 4 - VKU)
Giảng viên hướng dẫn: TS. Trần Uyên Trang
Sinh viên: Lê Quốc Dinh (24ITB028) & Nguyễn Văn Hoài An (24ITB004)

I. QUY TRÌNH PHÁT TRIỂN & GIT WORKFLOW (BẮT BUỘC)

1. Quy trình 5 bước làm việc

Xác định mục tiêu nhỏ: Không làm quá nhiều thứ cùng lúc. Chia nhỏ tác vụ thành các bước dưới 15-30 phút.

Tạo nhánh mới (Git Branching):

Tất cả thay đổi code/tài liệu BẮT BUỘC làm trên nhánh riêng, KHÔNG commit trực tiếp vào main.

Cú pháp đặt tên nhánh:

Tính năng mới: feature/<mô-tả-ngắn> (VD: feature/quiz-room-lobby, feature/leaderboard-ui)

Sửa lỗi: fix/<mô-tả-loi> (VD: fix/disconnect-handling, fix/login-utf8)

Cập nhật tài liệu: docs/<mô-tả> (VD: docs/setup-guide)

Tối ưu code: refactor/<mô-tả> (VD: refactor/player-repository)

Kiểm tra tự động (Self-Check & Test):

Sau khi sửa code, BẮT BUỘC chạy ./mvnw clean test (hoặc mvnw.cmd clean test trên Windows) để đảm bảo:

Không có lỗi biên dịch (Compilation Error).

Tất cả các Unit Test & FXML Test đều vượt qua (100% PASS).

Đệ trình & Xin duyệt (User Approval):

Hiển thị tóm tắt các file đã thay đổi, kết quả chạy test và gợi ý thông điệp Commit chuẩn.

Chờ người dùng xác nhận "Đồng ý / OK".

Commit & Gộp nhánh (Commit & Merge):

Thực hiện commit đúng cú pháp chuẩn đã gợi ý.

Hướng dẫn chuyển về nhánh main và merge khi hoàn thành tính năng.

II. CHUẨN COMMIT (CONVENTIONAL COMMITS)

Tất cả commit message phải tuân theo định dạng chuẩn quốc tế:

<type>(<scope>): <mô tả ngắn gọn bằng tiếng Việt hoặc tiếng Anh>


Các <type> được phép sử dụng:

feat: Thêm chức năng mới (Feature)

Ví dụ: feat(quiz): thêm màn hình sảnh chờ và sinh mã PIN 6 số

fix: Sửa lỗi bug (Bug fix)

Ví dụ: fix(ranked): hiển thị popup thông báo khi đối thủ mất kết nối

docs: Cập nhật tài liệu (Documentation)

Ví dụ: docs(readme): cập nhật hướng dẫn chạy ứng dụng

style: Định dạng code, sửa CSS (không ảnh hưởng logic)

Ví dụ: style(client): căn chỉnh lại giao diện thẻ câu hỏi

refactor: Reorganize/tối ưu code mà không đổi tính năng

Ví dụ: refactor(server): đơn giản hóa hàm lưu kết quả JDBC

test: Thêm hoặc sửa test case

Ví dụ: test(common): bổ sung unit test cho Payloads.java

III. QUY ĐỊNH NGUYÊN TẮC KIẾN TRÚC & CODE (ARCHITECTURE RULES)

1. Ranh giới Client - Server (CỰC KỲ QUAN TRỌNG)

Client (com.nihongoquest.client):

Chỉ làm nhiệm vụ hiển thị JavaFX UI, bắt sự kiện nút bấm và gửi/nhận JSON qua TCP.

TUYỆT ĐỐI KHÔNG khởi tạo new Socket(...) trong Controller. Mọi giao tiếp đi qua GameClient.

TUYỆT ĐỐI KHÔNG kết nối CSDL, không chứa mật khẩu DB, không import bất kỳ package nào của Server.

Không tự tính điểm hay tự quyết định thắng/thua.

Server (com.nihongoquest.server):

Đóng vai trò Trọng tài (Authority): Quyết định đáp án đúng, chấm điểm, quản lý thời gian (Timer), xử lý đếm ngược.

Đọc/Ghi CSDL PostgreSQL (Supabase) qua JDBC.

TUYỆT ĐỐI KHÔNG gửi đáp án đúng (correct choice/index) về Client trong bản tin QUESTION.

Common (com.nihongoquest.common):

Chứa DTO, Enum MessageType, và Message format dùng chung giữa 2 bên.

2. Tiêu chuẩn Đồ án cơ sở (ĐACS4)

Đơn giản & Rõ ràng: Ưu tiên code thuần Java 21, JavaFX, JDBC. KHÔNG dùng Spring Boot, JPA/Hibernate, mã hóa SSL/TLS phức tạp hay JWT nếu không có yêu cầu đặc biệt.

Xử lý bất đồng bộ:

ServerListener phía Client phải chạy trên Thread riêng để đọc dữ liệu liên tục từ Socket mà không gây đơ/treo JavaFX UI.

Khi cập nhật giao diện JavaFX từ luồng Socket, BẮT BUỘC bọc trong Platform.runLater(() -> { ... }).

Định dạng kết nối:

TCP Socket truyền chuỗi UTF-8. Mỗi frame là một chuỗi JSON nằm trên một dòng kết thúc bằng ký tự xuống dòng \n.
</file>

<file path=".mvn/wrapper/maven-wrapper.properties">
distributionUrl=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.8.5/apache-maven-3.8.5-bin.zip
wrapperUrl=https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.3.2/maven-wrapper-3.3.2.jar
</file>

<file path="docs/database.md">
# Database Supabase

`sql/supabase_schema.sql` là schema duy nhất của dự án. Script có tính phá hủy: nó
xóa schema NihongoQuest cũ rồi tạo lại `users`, `quiz_sets`, `questions`, `choices`,
`matches` và `friendships`.

## Thiết lập

1. Sao lưu dữ liệu cũ nếu cần.
2. Chạy `sql/supabase_schema.sql` trong Supabase SQL Editor.
3. Chạy `sql/seed_demo.sql` nếu cần bộ dữ liệu demo.
4. Chạy `sql/verify_schema.sql` để kiểm tra read-only.
5. Sao chép `src/main/resources/db.properties.example` thành `db.properties` và điền
   host/user/password. File thật đã nằm trong `.gitignore`.

Ba tài khoản seed là `demo_host`, `demo_player1`, `demo_player2`, cùng mật khẩu
`1234`. Password trong seed là BCrypt hash; server vẫn xác minh bằng BCrypt.

## Quy tắc câu hỏi

Mỗi question thuộc một quiz set và có đúng bốn choices, một choice đúng. Server chỉ
lấy câu từ quiz set có `is_published = true`. Validation đầy đủ vẫn được thực hiện
trước khi câu được phát tới client.

Client không chứa cấu hình và không kết nối trực tiếp Supabase.

## Truy vấn thống kê

Top 10 đọc trực tiếp từ `users`, sắp theo `wins DESC`, `total_score DESC`, `username ASC`.
Lịch sử đọc từ `matches`, join hai username, lọc một trong hai cột người chơi và giới hạn
100 dòng mới nhất. Hồ sơ và các màn hình truy vấn chỉ tính dữ liệu Ranked; điểm Quiz Room
không được ghi vào database.

## Quan hệ bạn bè

Mỗi cặp chỉ có một dòng trong `friendships`, luôn thỏa `user_low_id < user_high_id`.
`requested_by_id` cho biết người gửi khi trạng thái là `PENDING`; accept chuyển sang
`ACCEPTED`, còn reject/remove xóa dòng. Presence và game invite không lưu database.
</file>

<file path="docs/roadmap.md">
# Lộ trình MVP

Các mốc được làm tuần tự trên nhánh riêng và phải chạy `mvnw.cmd clean test` trước
khi xin duyệt commit:

1. `refactor/mvp-foundation`: schema, protocol object, router/session và persistence gọn. ✓
2. `feature/quiz-set-management`: CRUD editor và publish bộ đề. ✓
3. `feature/timed-ranked`: chế độ 3/5 phút, tiến độ riêng và timer 30 giây/câu. ✓
4. `feature/quiz-room`: PIN, lobby, rapid quiz, live leaderboard và reconnect. ✓
5. `feature/leaderboard-history`: Top 10 và 100 trận gần nhất. ✓
6. `feature/friends-invites`: friend request, presence và lời mời Ranked/Quiz. ✓

Ngoài phạm vi: TLS/JWT, HTTP/WebSocket, Elo, lưu từng đáp án, phục hồi server crash
và tối ưu hàng nghìn kết nối.
</file>

<file path="src/main/java/com/nihongoquest/server/network/ClientHandler.java">
package com.nihongoquest.server.network;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.server.ranked.GameRoom;
import com.nihongoquest.server.quizroom.QuizRoom;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;
import java.util.logging.Logger;

/** Một kết nối TCP: đọc frame, gửi frame và giữ thông tin phiên đã đăng nhập. */
public class ClientHandler implements Runnable {
    private static final Logger LOGGER = Logger.getLogger(ClientHandler.class.getName());

    private final Socket socket;
    private final ServerRequestRouter router;
    private final Consumer<String> activityListener;
    private final Consumer<TrafficEvent> trafficListener;
    private final Consumer<ClientHandler> closeListener;
    private final AtomicBoolean closed = new AtomicBoolean();
    private final Instant connectedAt = Instant.now();

    private BufferedReader reader;
    private PrintWriter writer;
    private volatile boolean connected;
    private volatile boolean queued;
    private volatile Long playerId;
    private volatile String username;
    private volatile GameRoom currentRoom;
    private volatile QuizRoom currentQuizRoom;
    private volatile Instant lastActivity = Instant.now();

    public ClientHandler(Socket socket, ServerRequestRouter router,
                         Consumer<String> activityListener,
                         Consumer<TrafficEvent> trafficListener,
                         Consumer<ClientHandler> closeListener) {
        this.socket = socket;
        this.router = router;
        this.activityListener = activityListener;
        this.trafficListener = trafficListener;
        this.closeListener = closeListener;
    }

    /** Constructor tối thiểu cho test double không mở luồng TCP. */
    protected ClientHandler(Socket socket) {
        this(socket, null, ignored -> { }, ignored -> { }, ignored -> { });
    }

    @Override
    public void run() {
        connected = true;
        try {
            reader = new BufferedReader(new InputStreamReader(
                    socket.getInputStream(), StandardCharsets.UTF_8));
            writer = new PrintWriter(new OutputStreamWriter(
                    socket.getOutputStream(), StandardCharsets.UTF_8), true);
            String line;
            while (connected && (line = reader.readLine()) != null) {
                lastActivity = Instant.now();
                Message message = Message.fromWire(line);
                reportTraffic(TrafficEvent.Direction.RECEIVED, safeWire(message));
                router.handle(this, message);
            }
        } catch (IllegalArgumentException e) {
            LOGGER.warning("Client gửi JSON không hợp lệ: " + e.getMessage());
        } catch (IOException e) {
            if (connected) LOGGER.warning("Mất kết nối " + getRemoteAddress() + ": " + e.getMessage());
        } finally {
            close();
        }
    }

    public synchronized void send(Message message) {
        if (writer == null || closed.get()) return;
        String wire = message.toWire();
        writer.println(wire);
        reportTraffic(TrafficEvent.Direction.SENT, safeWire(message));
    }

    public void close() {
        if (!closed.compareAndSet(false, true)) return;
        connected = false;
        if (router != null) router.disconnected(this);
        GameRoom room = currentRoom;
        currentRoom = null;
        if (room != null) room.playerDisconnected(this);
        try {
            socket.close();
        } catch (IOException ignored) {
            // Socket đã đóng.
        }
        closeListener.accept(this);
    }

    private String safeWire(Message message) {
        if (message.getType() != MessageType.LOGIN && message.getType() != MessageType.REGISTER) {
            return message.toWire();
        }
        JsonNode payload = message.getPayload().deepCopy();
        if (payload instanceof ObjectNode object) object.put("password", "***");
        return new Message(message.getType(), payload).toWire();
    }

    private void reportTraffic(TrafficEvent.Direction direction, String json) {
        trafficListener.accept(new TrafficEvent(Instant.now(), direction, getDisplayName(), json));
    }

    public void setAuthenticatedPlayer(long playerId, String username) {
        this.playerId = playerId;
        this.username = username;
    }

    public Long getPlayerId() { return playerId; }
    public String getUsername() { return username; }
    public boolean isAuthenticated() { return playerId != null; }
    public boolean isQueued() { return queued; }
    public void setQueued(boolean queued) { this.queued = queued; }
    public GameRoom getCurrentRoom() { return currentRoom; }
    public void setCurrentRoom(GameRoom room) { currentRoom = room; }
    public void clearCurrentRoom(GameRoom room) { if (currentRoom == room) currentRoom = null; }
    public QuizRoom getCurrentQuizRoom() { return currentQuizRoom; }
    public void setCurrentQuizRoom(QuizRoom room) { currentQuizRoom = room; }
    public void clearCurrentQuizRoom(QuizRoom room) {
        if (currentQuizRoom == room) currentQuizRoom = null;
    }
    public boolean isConnected() { return connected; }
    public Instant getConnectedAt() { return connectedAt; }
    public Instant getLastActivity() { return lastActivity; }
    public String getRemoteAddress() { return String.valueOf(socket.getRemoteSocketAddress()); }
    public String getDisplayName() { return username == null ? getRemoteAddress() : username; }

    public String getStatusText() {
        if (!connected) return "Đã ngắt kết nối";
        if (currentRoom != null) return "Đang thi đấu";
        if (currentQuizRoom != null) return "Đang ở phòng Quiz";
        if (queued) return "Đang chờ ghép trận";
        return isAuthenticated() ? "Trực tuyến" : "Chưa đăng nhập";
    }

    public void reportActivity(String message) { activityListener.accept(message); }
}
</file>

<file path="src/main/java/com/nihongoquest/server/player/PlayerRepository.java">
package com.nihongoquest.server.player;

import com.nihongoquest.server.database.Database;

import org.mindrot.jbcrypt.BCrypt;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class PlayerRepository {

    private final Database database;

    public PlayerRepository(Database database) {
        this.database = database;
    }

    public AuthResult register(String username, String password) throws SQLException {
        String sql = """
                INSERT INTO users (username, password_hash)
                VALUES (?, ?)
                RETURNING id, username, wins, losses, draws, total_score,
                          questions_answered, correct_answers
                """;

        try (Connection connection = database.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, username);
            statement.setString(2, BCrypt.hashpw(password, BCrypt.gensalt()));
            try (ResultSet result = statement.executeQuery()) {
                result.next();
                return AuthResult.success(readPlayer(result));
            }
        } catch (SQLException e) {
            if ("23505".equals(e.getSQLState())) {
                return AuthResult.failure("USERNAME_TAKEN");
            }
            throw e;
        }
    }

    public AuthResult login(String username, String password) throws SQLException {
        String sql = """
                SELECT id, username, password_hash, wins, losses, draws, total_score,
                       questions_answered, correct_answers
                FROM users
                WHERE username = ?
                """;

        try (Connection connection = database.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, username);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next() || !BCrypt.checkpw(password, result.getString("password_hash"))) {
                    return AuthResult.failure("INVALID_CREDENTIALS");
                }
                return AuthResult.success(readPlayer(result));
            }
        }
    }

    public PlayerData findProfile(long userId) throws SQLException {
        String sql = """
                SELECT id, username, wins, losses, draws, total_score,
                       questions_answered, correct_answers
                FROM users
                WHERE id = ?
                """;
        try (Connection connection = database.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, userId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("User not found: " + userId);
                return readPlayer(result);
            }
        }
    }

    public List<LeaderboardPlayer> findLeaderboard(int limit) throws SQLException {
        if (limit < 1 || limit > 100) throw new IllegalArgumentException("Limit khong hop le");
        String sql = """
                SELECT id, username, wins, losses, draws, total_score
                FROM users
                ORDER BY wins DESC, total_score DESC, username ASC
                LIMIT ?
                """;
        List<LeaderboardPlayer> players = new ArrayList<>();
        try (Connection connection = database.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, limit);
            try (ResultSet result = statement.executeQuery()) {
                int rank = 1;
                while (result.next()) {
                    players.add(new LeaderboardPlayer(rank++, result.getLong("id"),
                            result.getString("username"), result.getInt("wins"),
                            result.getInt("losses"), result.getInt("draws"),
                            result.getInt("total_score")));
                }
            }
        }
        return List.copyOf(players);
    }

    private PlayerData readPlayer(ResultSet result) throws SQLException {
        return new PlayerData(
                result.getLong("id"),
                result.getString("username"),
                result.getInt("wins"),
                result.getInt("losses"),
                result.getInt("draws"),
                result.getInt("total_score"),
                result.getInt("questions_answered"),
                result.getInt("correct_answers")
        );
    }

    public record PlayerData(long id, String username, int wins, int losses, int draws,
                             int totalScore, int questionsAnswered, int correctAnswers) {
        public com.fasterxml.jackson.databind.JsonNode toPayload() {
            return com.nihongoquest.common.protocol.Payloads.player(id, username, wins, losses,
                    draws, totalScore, questionsAnswered, correctAnswers);
        }
    }

    public record LeaderboardPlayer(int rank, long userId, String username,
                                    int wins, int losses, int draws, int totalScore) { }

    public record AuthResult(boolean success, PlayerData player, String reason) {
        public static AuthResult success(PlayerData player) {
            return new AuthResult(true, player, null);
        }

        public static AuthResult failure(String reason) {
            return new AuthResult(false, null, reason);
        }
    }
}
</file>

<file path="src/main/java/com/nihongoquest/server/ranked/GameRoom.java">
package com.nihongoquest.server.ranked;

import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.server.network.ClientHandler;
import com.nihongoquest.server.question.Choice;
import com.nihongoquest.server.question.Question;
import com.nihongoquest.server.ranked.MatchRepository.EndReason;
import com.nihongoquest.server.ranked.MatchRepository.MatchResult;

import java.sql.SQLException;
import java.util.List;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.LongSupplier;
import java.util.logging.Logger;

/** Trận Ranked có deadline chung nhưng mỗi người tự tiến qua các câu hỏi. */
public class GameRoom {
    private static final Logger LOGGER = Logger.getLogger(GameRoom.class.getName());

    static final int QUESTION_SECONDS = 30;
    static final int MIN_QUESTION_POOL = 3;
    static final int MAX_QUESTION_POOL = 10;
    public static final int THREE_MINUTES = 180;
    public static final int FIVE_MINUTES = 300;

    private final String roomId;
    private final ClientHandler[] players;
    private final long[] userIds;
    private final List<Question> questions;
    private final int durationSeconds;
    private final MatchRepository matches;
    private final ScheduledExecutorService scheduler;
    private final LongSupplier nanoTime;

    private final int[] questionPositions = new int[2];
    private final int[] attempts = new int[2];
    private final int[] scores = new int[2];
    private final int[] answeredCount = new int[2];
    private final int[] correctCount = new int[2];
    private final boolean[] awaitingAnswer = new boolean[2];
    private final long[] questionDeadlines = new long[2];
    private final ScheduledFuture<?>[] questionTimeouts = new ScheduledFuture<?>[2];

    private long matchDeadlineNanos;
    private boolean started;
    private boolean finished;
    private ScheduledFuture<?> matchTimeout;

    public GameRoom(String roomId, ClientHandler player1, ClientHandler player2,
                    List<Question> questions, int durationSeconds,
                    MatchRepository matches, ScheduledExecutorService scheduler) {
        this(roomId, player1, player2, questions, durationSeconds,
                matches, scheduler, System::nanoTime);
    }

    GameRoom(String roomId, ClientHandler player1, ClientHandler player2,
             List<Question> questions, int durationSeconds, MatchRepository matches,
             ScheduledExecutorService scheduler, LongSupplier nanoTime) {
        if (durationSeconds != THREE_MINUTES && durationSeconds != FIVE_MINUTES) {
            throw new IllegalArgumentException("Ranked duration must be 180 or 300 seconds");
        }
        if (questions == null || questions.size() < MIN_QUESTION_POOL) {
            throw new IllegalArgumentException("Ranked needs at least three questions");
        }
        this.roomId = roomId;
        this.players = new ClientHandler[]{player1, player2};
        this.userIds = new long[]{player1.getPlayerId(), player2.getPlayerId()};
        this.questions = List.copyOf(questions);
        this.durationSeconds = durationSeconds;
        this.matches = matches;
        this.scheduler = scheduler;
        this.nanoTime = nanoTime;
        player1.setCurrentRoom(this);
        player2.setCurrentRoom(this);
    }

    public synchronized void start() {
        if (started || finished) return;
        started = true;
        if (!players[0].isConnected() || !players[1].isConnected()) {
            playerDisconnected(!players[0].isConnected() ? players[0] : players[1]);
            return;
        }

        long now = nanoTime.getAsLong();
        matchDeadlineNanos = now + TimeUnit.SECONDS.toNanos(durationSeconds);
        matchTimeout = scheduler.schedule(this::endGame, durationSeconds, TimeUnit.SECONDS);
        players[0].send(new Message(MessageType.MATCH_FOUND,
                Payloads.matchFound(roomId, players[1].getUsername(), durationSeconds)));
        players[1].send(new Message(MessageType.MATCH_FOUND,
                Payloads.matchFound(roomId, players[0].getUsername(), durationSeconds)));
        sendQuestion(0);
        sendQuestion(1);
    }

    public synchronized void handleAnswer(ClientHandler player, Payloads.AnswerData answer) {
        int index = indexOf(player);
        if (!started || finished || index < 0 || answer == null || !awaitingAnswer[index]) return;
        Question question = currentQuestion(index);
        if (!roomId.equals(answer.sessionId()) || answer.attempt() != attempts[index]
                || answer.questionId() != question.getId()) {
            return;
        }

        long now = nanoTime.getAsLong();
        if (now >= matchDeadlineNanos) {
            endGame();
            return;
        }
        if (now >= questionDeadlines[index]) {
            onQuestionTimeout(index, attempts[index]);
            return;
        }
        int choiceIndex = question.indexOfChoice(answer.choiceId());
        if (choiceIndex < 0) return;

        cancelQuestionTimeout(index);
        resolveAnswer(index, question.getChoices().get(choiceIndex));
        advancePlayer(index);
    }

    private void sendQuestion(int playerIndex) {
        if (finished) return;
        long now = nanoTime.getAsLong();
        long matchRemainingNanos = matchDeadlineNanos - now;
        if (matchRemainingNanos <= 0) {
            endGame();
            return;
        }

        Question question = currentQuestion(playerIndex);
        attempts[playerIndex]++;
        awaitingAnswer[playerIndex] = true;
        long questionNanos = Math.min(TimeUnit.SECONDS.toNanos(QUESTION_SECONDS), matchRemainingNanos);
        questionDeadlines[playerIndex] = now + questionNanos;
        int questionSeconds = ceilSeconds(questionNanos);
        int matchSeconds = ceilSeconds(matchRemainingNanos);
        int expectedAttempt = attempts[playerIndex];
        questionTimeouts[playerIndex] = scheduler.schedule(
                () -> onQuestionTimeout(playerIndex, expectedAttempt),
                questionNanos, TimeUnit.NANOSECONDS);

        players[playerIndex].send(new Message(MessageType.QUESTION,
                Payloads.question(roomId, attempts[playerIndex], questionSeconds, matchSeconds,
                        question.getId(), question.getContent(), question.getChoices().stream()
                                .map(choice -> new Payloads.ChoiceData(
                                        choice.id(), choice.content(), choice.position()))
                                .toList())));
    }

    private synchronized void onQuestionTimeout(int playerIndex, int expectedAttempt) {
        if (finished || !awaitingAnswer[playerIndex] || attempts[playerIndex] != expectedAttempt) return;
        if (nanoTime.getAsLong() >= matchDeadlineNanos) {
            endGame();
            return;
        }
        resolveAnswer(playerIndex, null);
        advancePlayer(playerIndex);
    }

    private void resolveAnswer(int playerIndex, Choice chosenChoice) {
        Question question = currentQuestion(playerIndex);
        awaitingAnswer[playerIndex] = false;
        answeredCount[playerIndex]++;
        boolean correct = chosenChoice != null && chosenChoice.correct();
        int awarded = correct ? 1 : 0;
        if (correct) {
            scores[playerIndex]++;
            correctCount[playerIndex]++;
        }
        long correctChoiceId = question.getChoices().get(question.getCorrectAnswerIndex()).id();
        players[playerIndex].send(new Message(MessageType.ANSWER_RESULT,
                Payloads.answerResult(roomId, attempts[playerIndex], question.getId(), correct,
                        chosenChoice == null ? null : chosenChoice.id(), correctChoiceId, awarded)));
        sendScores();
    }

    private void advancePlayer(int playerIndex) {
        questionPositions[playerIndex] = (questionPositions[playerIndex] + 1) % questions.size();
        sendQuestion(playerIndex);
    }

    public synchronized void playerDisconnected(ClientHandler disconnected) {
        int disconnectedIndex = indexOf(disconnected);
        if (finished || disconnectedIndex < 0) return;
        finished = true;
        cancelAllTimers();
        clearRoom();
        boolean saved = saveResult(EndReason.DISCONNECT, userIds[disconnectedIndex]);
        int opponent = 1 - disconnectedIndex;
        if (saved && players[opponent].isConnected()) {
            sendGameOver(opponent, "WIN");
        }
    }

    /** Được gọi bởi deadline chung; public để test và dashboard có thể kết thúc an toàn. */
    public synchronized void endGame() {
        if (finished) return;
        finished = true;
        cancelAllTimers();
        boolean saved = saveResult(EndReason.NORMAL, null);
        if (saved) {
            sendGameOver(0, resultText(0));
            sendGameOver(1, resultText(1));
        }
        clearRoom();
    }

    private boolean saveResult(EndReason reason, Long forfeitingUserId) {
        try {
            matches.saveResult(result(0), result(1), durationSeconds, reason, forfeitingUserId);
            return true;
        } catch (SQLException e) {
            LOGGER.warning("Không thể lưu kết quả phòng " + roomId + ": " + e.getMessage());
            sendBoth(MessageType.MATCH_ERROR, "DATABASE_ERROR");
            return false;
        }
    }

    private MatchResult result(int index) {
        return new MatchResult(userIds[index], scores[index],
                answeredCount[index], correctCount[index]);
    }

    private Question currentQuestion(int playerIndex) {
        return questions.get(questionPositions[playerIndex]);
    }

    private void sendScores() {
        players[0].send(new Message(MessageType.SCORE_UPDATE,
                Payloads.scores(scores[0], scores[1])));
        players[1].send(new Message(MessageType.SCORE_UPDATE,
                Payloads.scores(scores[1], scores[0])));
    }

    private String resultText(int index) {
        int opponent = 1 - index;
        return scores[index] > scores[opponent] ? "WIN"
                : scores[index] < scores[opponent] ? "LOSE" : "DRAW";
    }

    private void sendGameOver(int index, String result) {
        int opponent = 1 - index;
        players[index].send(new Message(MessageType.GAME_OVER,
                Payloads.gameOver(result, scores[index], scores[opponent])));
    }

    private void cancelAllTimers() {
        if (matchTimeout != null) matchTimeout.cancel(false);
        cancelQuestionTimeout(0);
        cancelQuestionTimeout(1);
    }

    private void cancelQuestionTimeout(int index) {
        if (questionTimeouts[index] != null) questionTimeouts[index].cancel(false);
        questionTimeouts[index] = null;
    }

    private int indexOf(ClientHandler player) {
        return player == players[0] ? 0 : player == players[1] ? 1 : -1;
    }

    private void clearRoom() {
        players[0].clearCurrentRoom(this);
        players[1].clearCurrentRoom(this);
    }

    private void sendBoth(MessageType type, String payload) {
        players[0].send(new Message(type, payload));
        players[1].send(new Message(type, payload));
    }

    private static int ceilSeconds(long nanos) {
        return (int) Math.max(1, (nanos + TimeUnit.SECONDS.toNanos(1) - 1)
                / TimeUnit.SECONDS.toNanos(1));
    }

    public String getRoomId() { return roomId; }
    public int getDurationSeconds() { return durationSeconds; }
    public synchronized boolean isFinished() { return finished; }
}
</file>

<file path="src/main/resources/client/ranked/battle/battle.fxml">
<?xml version="1.0" encoding="UTF-8"?>

<?import javafx.scene.control.*?>
<?import javafx.scene.layout.*?>

<BorderPane styleClass="root,app-shell"
            xmlns="http://javafx.com/javafx/21"
            xmlns:fx="http://javafx.com/fxml/1"
            fx:controller="com.nihongoquest.client.ranked.battle.BattleController">
    <center>
        <VBox alignment="TOP_CENTER" spacing="16" styleClass="battle-content">
            <HBox alignment="CENTER" spacing="28" styleClass="scoreboard-card">
                <VBox alignment="CENTER" spacing="4" styleClass="player-panel">
                    <Label text="BẠN" styleClass="player-role"/>
                    <Label fx:id="player1Label" text="Player A" styleClass="player-name"/>
                </VBox>
                <VBox alignment="CENTER" spacing="2" styleClass="score-panel">
                    <Label fx:id="scoreLabel" text="0  :  0" styleClass="score-value"/>
                    <Label text="ĐIỂM" styleClass="score-caption"/>
                    <Label fx:id="matchTimeLabel" text="3:00" styleClass="match-time-label"/>
                </VBox>
                <VBox alignment="CENTER" spacing="4" styleClass="player-panel">
                    <Label text="ĐỐI THỦ" styleClass="player-role"/>
                    <Label fx:id="player2Label" text="Player B" styleClass="player-name"/>
                </VBox>
            </HBox>

            <VBox spacing="14" styleClass="question-card">
                <HBox alignment="CENTER_LEFT" spacing="12">
                    <Label text="THỜI GIAN" styleClass="timer-caption"/>
                    <ProgressBar fx:id="timeProgressBar" progress="0"
                                 HBox.hgrow="ALWAYS" maxWidth="Infinity"
                                 styleClass="time-progress"/>
                    <Label fx:id="timeLabel" text="30s" styleClass="time-label"/>
                </HBox>
                <Label fx:id="questionLabel" text="Đang chuẩn bị câu hỏi"
                       styleClass="battle-question" wrapText="true" maxWidth="760"/>
            </VBox>

            <GridPane hgap="14" vgap="14" styleClass="answer-grid" maxWidth="800">
                <columnConstraints>
                    <ColumnConstraints percentWidth="50" hgrow="ALWAYS"/>
                    <ColumnConstraints percentWidth="50" hgrow="ALWAYS"/>
                </columnConstraints>
                <Button fx:id="answerAButton" text="Answer A" onAction="#onAnswerSelected"
                        maxWidth="Infinity" styleClass="answer-button" GridPane.columnIndex="0" GridPane.rowIndex="0"/>
                <Button fx:id="answerBButton" text="Answer B" onAction="#onAnswerSelected"
                        maxWidth="Infinity" styleClass="answer-button" GridPane.columnIndex="1" GridPane.rowIndex="0"/>
                <Button fx:id="answerCButton" text="Answer C" onAction="#onAnswerSelected"
                        maxWidth="Infinity" styleClass="answer-button" GridPane.columnIndex="0" GridPane.rowIndex="1"/>
                <Button fx:id="answerDButton" text="Answer D" onAction="#onAnswerSelected"
                        maxWidth="Infinity" styleClass="answer-button" GridPane.columnIndex="1" GridPane.rowIndex="1"/>
            </GridPane>
        </VBox>
    </center>
</BorderPane>
</file>

<file path="src/main/resources/client/ranked/matchmaking/matchmaking.fxml">
<?xml version="1.0" encoding="UTF-8"?>

<?import javafx.scene.control.*?>
<?import javafx.scene.layout.*?>

<BorderPane styleClass="root,app-shell"
            xmlns="http://javafx.com/javafx/21"
            xmlns:fx="http://javafx.com/fxml/1"
            fx:controller="com.nihongoquest.client.ranked.matchmaking.MatchmakingController">
    <center>
        <VBox alignment="CENTER" spacing="22" styleClass="page-content">
            <VBox alignment="CENTER" spacing="18" styleClass="search-card">
                <Label text="THI ĐẤU RANKED 1V1" styleClass="search-title"/>
                <Label fx:id="usernameLabel" text="Đang tìm cho: Người chơi"
                       styleClass="search-user"/>
                <HBox alignment="CENTER" spacing="16">
                    <RadioButton fx:id="threeMinutesRadio" text="3 phút" selected="true">
                        <toggleGroup>
                            <ToggleGroup fx:id="durationGroup"/>
                        </toggleGroup>
                    </RadioButton>
                    <RadioButton fx:id="fiveMinutesRadio" text="5 phút" toggleGroup="$durationGroup"/>
                </HBox>
                <Button fx:id="searchButton" text="BẮT ĐẦU TÌM TRẬN"
                        onAction="#startSearch" prefWidth="220"/>
                <StackPane styleClass="spinner-ring">
                    <ProgressIndicator fx:id="searchSpinner" progress="-1.0"
                                       prefWidth="82" prefHeight="82"
                                       styleClass="search-spinner"/>
                </StackPane>
                <Label fx:id="statusLabel" text="Chọn thời lượng rồi bắt đầu tìm đối thủ."
                       styleClass="status-label,search-status" wrapText="true" maxWidth="400"/>
                <Label text="Hệ thống sẽ tự động chuyển sang màn hình thi đấu khi tìm thấy đối thủ."
                       styleClass="helper-text" wrapText="true" maxWidth="400"/>
                <Button fx:id="cancelButton" text="HỦY TÌM TRẬN"
                        onAction="#onCancel" prefWidth="220"
                        managed="false" visible="false"
                        styleClass="danger-outline-button"/>
            </VBox>
        </VBox>
    </center>
</BorderPane>
</file>

<file path="src/test/java/com/nihongoquest/server/dashboard/DashboardControllerTest.java">
package com.nihongoquest.server.dashboard;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.server.network.TrafficEvent;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class DashboardControllerTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Test
    void formatsValidFrameWithObjectPayload() throws Exception {
        String wire = new Message(MessageType.LOGIN,
                Payloads.credentials("sakura", "secret123")).toWire();
        TrafficEvent event = new TrafficEvent(
                Instant.parse("2026-09-20T03:00:00Z"),
                TrafficEvent.Direction.RECEIVED, "127.0.0.1:5000", wire);

        JsonNode formatted = MAPPER.readTree(DashboardController.formatTraffic(event));

        assertEquals("127.0.0.1:5000", formatted.get("client").asText());
        assertEquals("LOGIN", formatted.at("/message/type").asText());
        assertEquals("sakura", formatted.at("/message/payload/username").asText());
        assertEquals("secret123", formatted.at("/message/payload/password").asText());
    }

    @Test
    void keepsMalformedFrameAsRawText() throws Exception {
        TrafficEvent event = new TrafficEvent(
                Instant.parse("2026-09-20T03:00:00Z"),
                TrafficEvent.Direction.RECEIVED, "127.0.0.1:5000", "not-json");

        JsonNode formatted = MAPPER.readTree(DashboardController.formatTraffic(event));

        assertFalse(formatted.get("validJson").asBoolean());
        assertEquals("not-json", formatted.get("raw").asText());
    }
}
</file>

<file path="src/test/java/com/nihongoquest/server/ranked/GameRoomTest.java">
package com.nihongoquest.server.ranked;

import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.server.network.ClientHandler;
import com.nihongoquest.server.question.Question;
import com.nihongoquest.server.question.QuestionFixtures;
import com.nihongoquest.server.question.QuestionService;
import com.nihongoquest.server.ranked.MatchRepository.EndReason;
import com.nihongoquest.server.ranked.MatchRepository.MatchResult;
import org.junit.jupiter.api.Test;

import java.net.Socket;
import java.sql.SQLException;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

import static com.nihongoquest.server.question.QuestionFixtures.question;
import static org.junit.jupiter.api.Assertions.*;

class GameRoomTest {
    private static final List<Question> BANK = List.of(
            question(1, 4, 1), question(2, 4, 1), question(3, 4, 1));

    @Test
    void playersAdvanceIndependentlyAndStaleOrDuplicateAnswersAreIgnored() throws Exception {
        ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);
        FakeMatches matches = new FakeMatches();
        StubClient first = new StubClient(1);
        StubClient second = new StubClient(2);
        GameRoom room = new GameRoom("room", first, second, BANK,
                GameRoom.FIVE_MINUTES, matches, scheduler);
        try {
            room.start();
            Payloads.QuestionData firstOne = takeQuestion(first);
            Payloads.QuestionData secondOne = takeQuestion(second);
            assertQuestionHasNoAnswer(firstOne, first.messages);

            room.handleAnswer(first, answer(firstOne, 0));
            Payloads.QuestionData firstTwo = takeQuestion(first);
            room.handleAnswer(first, answer(firstTwo, 0));
            Payloads.QuestionData firstThree = takeQuestion(first);

            assertEquals(3, firstThree.attempt());
            assertEquals(3, firstThree.questionId());
            assertTrue(second.questions.isEmpty(), "Người thứ hai không bị kéo theo tiến độ đối thủ");
            assertEquals(2, first.count(MessageType.ANSWER_RESULT));

            room.handleAnswer(first, answer(firstOne, 0));
            room.handleAnswer(first, answer(firstTwo, 0));
            assertEquals(2, first.count(MessageType.ANSWER_RESULT));

            room.handleAnswer(second, answer(secondOne, 1));
            assertEquals(2, takeQuestion(second).attempt());
            room.endGame();

            assertEquals(new Payloads.GameOver("WIN", 2, 0),
                    Payloads.parseGameOver(first.finished.poll(2, TimeUnit.SECONDS).getPayload()));
            assertEquals(1, matches.calls);
            assertEquals(300, matches.duration);
            assertEquals(new MatchResult(1, 2, 2, 2), matches.first);
            assertEquals(new MatchResult(2, 0, 1, 0), matches.second);
        } finally {
            scheduler.shutdownNow();
        }
    }

    @Test
    void questionPoolRepeatsWhileAttemptKeepsIncreasing() throws Exception {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        StubClient first = new StubClient(1);
        StubClient second = new StubClient(2);
        GameRoom room = new GameRoom("repeat", first, second, BANK,
                GameRoom.THREE_MINUTES, new FakeMatches(), scheduler);
        try {
            room.start();
            for (int attempt = 1; attempt <= 3; attempt++) {
                Payloads.QuestionData current = takeQuestion(first);
                assertEquals(attempt, current.attempt());
                room.handleAnswer(first, answer(current, 0));
            }
            Payloads.QuestionData repeated = takeQuestion(first);
            assertEquals(4, repeated.attempt());
            assertEquals(1, repeated.questionId());
        } finally {
            room.endGame();
            scheduler.shutdownNow();
        }
    }

    @Test
    void lateAnswerBecomesTimeoutAndAutomaticallyMovesForward() throws Exception {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        AtomicLong time = new AtomicLong();
        StubClient first = new StubClient(1);
        StubClient second = new StubClient(2);
        GameRoom room = new GameRoom("timeout", first, second, BANK,
                GameRoom.THREE_MINUTES, new FakeMatches(), scheduler, time::get);
        try {
            room.start();
            Payloads.QuestionData initial = takeQuestion(first);
            time.set(TimeUnit.SECONDS.toNanos(31));
            room.handleAnswer(first, answer(initial, 0));

            Message timeoutFrame = first.first(MessageType.ANSWER_RESULT);
            Payloads.AnswerResult timeout = Payloads.parseAnswerResult(timeoutFrame.getPayload());
            assertFalse(timeout.correct());
            assertNull(timeout.chosenChoiceId());
            assertEquals(0, timeout.scoreAwarded());
            assertEquals(2, takeQuestion(first).attempt());
        } finally {
            room.endGame();
            scheduler.shutdownNow();
        }
    }

    @Test
    void disconnectForfeitsImmediatelyAndOpponentReceivesWin() throws Exception {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        FakeMatches matches = new FakeMatches();
        StubClient first = new StubClient(1);
        StubClient second = new StubClient(2);
        GameRoom room = new GameRoom("room", first, second, BANK,
                GameRoom.THREE_MINUTES, matches, scheduler);
        try {
            room.start();
            room.playerDisconnected(first);
            assertEquals(EndReason.DISCONNECT, matches.reason);
            assertEquals(1L, matches.forfeiting);
            Message result = second.finished.poll(2, TimeUnit.SECONDS);
            assertNotNull(result);
            assertEquals("WIN", Payloads.parseGameOver(result.getPayload()).result());
            assertTrue(room.isFinished());
        } finally {
            scheduler.shutdownNow();
        }
    }

    @Test
    void equalScoresFinishAsDrawForBothPlayers() throws Exception {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        FakeMatches matches = new FakeMatches();
        StubClient first = new StubClient(1);
        StubClient second = new StubClient(2);
        GameRoom room = new GameRoom("draw", first, second, BANK,
                GameRoom.THREE_MINUTES, matches, scheduler);
        try {
            room.start();
            room.endGame();
            assertEquals("DRAW", Payloads.parseGameOver(
                    first.finished.poll(2, TimeUnit.SECONDS).getPayload()).result());
            assertEquals("DRAW", Payloads.parseGameOver(
                    second.finished.poll(2, TimeUnit.SECONDS).getPayload()).result());
            assertEquals(180, matches.duration);
        } finally {
            scheduler.shutdownNow();
        }
    }

    @Test
    void matchmakingOnlyPairsPlayersWithSameDuration() {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        QuestionService questions = new QuestionService(new QuestionFixtures.Bank(BANK));
        MatchmakingManager manager = new MatchmakingManager(questions, new FakeMatches(), scheduler);
        StubClient first = new StubClient(1);
        StubClient second = new StubClient(2);
        StubClient third = new StubClient(3);
        try {
            manager.enqueue(first, 180);
            manager.enqueue(second, 300);
            assertNull(first.getCurrentRoom());
            assertNull(second.getCurrentRoom());

            manager.enqueue(third, 180);
            assertNotNull(first.getCurrentRoom());
            assertSame(first.getCurrentRoom(), third.getCurrentRoom());
            assertNull(second.getCurrentRoom());
            assertTrue(second.isQueued());
            assertEquals(1, manager.getWaitingCount());
        } finally {
            if (first.getCurrentRoom() != null) first.getCurrentRoom().endGame();
            scheduler.shutdownNow();
        }
    }

    @Test
    void matchmakingRejectsInvalidDurationAndTooSmallQuestionBank() {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        MatchmakingManager invalidBank = new MatchmakingManager(
                new QuestionService(new QuestionFixtures.Bank(List.of(question(1, 4, 1)))),
                new FakeMatches(), scheduler);
        StubClient invalidDuration = new StubClient(1);
        StubClient first = new StubClient(2);
        StubClient second = new StubClient(3);
        try {
            invalidBank.enqueue(invalidDuration, 60);
            assertEquals("INVALID_DURATION", invalidDuration.first(MessageType.MATCH_ERROR).payloadText());

            invalidBank.enqueue(first, 180);
            invalidBank.enqueue(second, 180);
            assertNull(first.getCurrentRoom());
            assertFalse(first.isQueued());
            assertEquals("QUESTIONS_UNAVAILABLE", first.first(MessageType.MATCH_ERROR).payloadText());
        } finally {
            scheduler.shutdownNow();
        }
    }

    private static Payloads.QuestionData takeQuestion(StubClient client) throws InterruptedException {
        Message message = client.questions.poll(2, TimeUnit.SECONDS);
        assertNotNull(message);
        return Payloads.parseQuestion(message.getPayload());
    }

    private static Payloads.AnswerData answer(Payloads.QuestionData question, int choiceIndex) {
        return new Payloads.AnswerData(question.sessionId(), question.attempt(), question.questionId(),
                question.choices().get(choiceIndex).choiceId());
    }

    private static void assertQuestionHasNoAnswer(Payloads.QuestionData question,
                                                   List<Message> messages) {
        assertEquals(4, question.choices().size());
        Message frame = messages.stream().filter(message -> message.getType() == MessageType.QUESTION)
                .findFirst().orElseThrow();
        assertTrue(frame.getPayload().findValues("correct").isEmpty());
        assertTrue(frame.getPayload().findValues("correctChoiceId").isEmpty());
        assertTrue(frame.getPayload().findValues("explanation").isEmpty());
    }

    private static final class FakeMatches extends MatchRepository {
        int calls;
        int duration;
        MatchResult first;
        MatchResult second;
        EndReason reason;
        Long forfeiting;

        FakeMatches() { super(QuestionFixtures.offlineDatabase()); }

        @Override
        public void saveResult(MatchResult first, MatchResult second, int duration,
                               EndReason reason, Long forfeiting) throws SQLException {
            calls++;
            this.duration = duration;
            this.first = first;
            this.second = second;
            this.reason = reason;
            this.forfeiting = forfeiting;
        }
    }

    private static final class StubClient extends ClientHandler {
        final List<Message> messages = new CopyOnWriteArrayList<>();
        final BlockingQueue<Message> questions = new LinkedBlockingQueue<>();
        final BlockingQueue<Message> finished = new LinkedBlockingQueue<>();
        final long id;

        StubClient(long id) {
            super(new Socket());
            this.id = id;
        }

        @Override public boolean isConnected() { return true; }
        @Override public boolean isAuthenticated() { return true; }
        @Override public Long getPlayerId() { return id; }
        @Override public String getUsername() { return "player" + id; }
        @Override public void send(Message message) {
            messages.add(message);
            if (message.getType() == MessageType.QUESTION) questions.add(message);
            if (message.getType() == MessageType.GAME_OVER) finished.add(message);
        }

        long count(MessageType type) {
            return messages.stream().filter(message -> message.getType() == type).count();
        }

        Message first(MessageType type) {
            return messages.stream().filter(message -> message.getType() == type)
                    .findFirst().orElseThrow();
        }
    }
}
</file>

<file path="mvnw">
#!/bin/sh
# ----------------------------------------------------------------------------
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#    https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
# ----------------------------------------------------------------------------

# ----------------------------------------------------------------------------
# Maven Start Up Batch script
#
# Required ENV vars:
# ------------------
#   JAVA_HOME - location of a JDK home dir
#
# Optional ENV vars
# -----------------
#   M2_HOME - location of maven2's installed home dir
#   MAVEN_OPTS - parameters passed to the Java VM when running Maven
#     e.g. to debug Maven itself, use
#       set MAVEN_OPTS=-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=y,address=8000
#   MAVEN_SKIP_RC - flag to disable loading of mavenrc files
# ----------------------------------------------------------------------------

if [ -z "$MAVEN_SKIP_RC" ] ; then

  if [ -f /usr/local/etc/mavenrc ] ; then
    . /usr/local/etc/mavenrc
  fi

  if [ -f /etc/mavenrc ] ; then
    . /etc/mavenrc
  fi

  if [ -f "$HOME/.mavenrc" ] ; then
    . "$HOME/.mavenrc"
  fi

fi

# OS specific support.  $var _must_ be set to either true or false.
cygwin=false;
darwin=false;
mingw=false
case "`uname`" in
  CYGWIN*) cygwin=true ;;
  MINGW*) mingw=true;;
  Darwin*) darwin=true
    # Use /usr/libexec/java_home if available, otherwise fall back to /Library/Java/Home
    # See https://developer.apple.com/library/mac/qa/qa1170/_index.html
    if [ -z "$JAVA_HOME" ]; then
      if [ -x "/usr/libexec/java_home" ]; then
        export JAVA_HOME="`/usr/libexec/java_home`"
      else
        export JAVA_HOME="/Library/Java/Home"
      fi
    fi
    ;;
esac

if [ -z "$JAVA_HOME" ] ; then
  if [ -r /etc/gentoo-release ] ; then
    JAVA_HOME=`java-config --jre-home`
  fi
fi

if [ -z "$M2_HOME" ] ; then
  ## resolve links - $0 may be a link to maven's home
  PRG="$0"

  # need this for relative symlinks
  while [ -h "$PRG" ] ; do
    ls=`ls -ld "$PRG"`
    link=`expr "$ls" : '.*-> \(.*\)$'`
    if expr "$link" : '/.*' > /dev/null; then
      PRG="$link"
    else
      PRG="`dirname "$PRG"`/$link"
    fi
  done

  saveddir=`pwd`

  M2_HOME=`dirname "$PRG"`/..

  # make it fully qualified
  M2_HOME=`cd "$M2_HOME" && pwd`

  cd "$saveddir"
  # echo Using m2 at $M2_HOME
fi

# For Cygwin, ensure paths are in UNIX format before anything is touched
if $cygwin ; then
  [ -n "$M2_HOME" ] &&
    M2_HOME=`cygpath --unix "$M2_HOME"`
  [ -n "$JAVA_HOME" ] &&
    JAVA_HOME=`cygpath --unix "$JAVA_HOME"`
  [ -n "$CLASSPATH" ] &&
    CLASSPATH=`cygpath --path --unix "$CLASSPATH"`
fi

# For Mingw, ensure paths are in UNIX format before anything is touched
if $mingw ; then
  [ -n "$M2_HOME" ] &&
    M2_HOME="`(cd "$M2_HOME"; pwd)`"
  [ -n "$JAVA_HOME" ] &&
    JAVA_HOME="`(cd "$JAVA_HOME"; pwd)`"
fi

if [ -z "$JAVA_HOME" ]; then
  javaExecutable="`which javac`"
  if [ -n "$javaExecutable" ] && ! [ "`expr \"$javaExecutable\" : '\([^ ]*\)'`" = "no" ]; then
    # readlink(1) is not available as standard on Solaris 10.
    readLink=`which readlink`
    if [ ! `expr "$readLink" : '\([^ ]*\)'` = "no" ]; then
      if $darwin ; then
        javaHome="`dirname \"$javaExecutable\"`"
        javaExecutable="`cd \"$javaHome\" && pwd -P`/javac"
      else
        javaExecutable="`readlink -f \"$javaExecutable\"`"
      fi
      javaHome="`dirname \"$javaExecutable\"`"
      javaHome=`expr "$javaHome" : '\(.*\)/bin'`
      JAVA_HOME="$javaHome"
      export JAVA_HOME
    fi
  fi
fi

if [ -z "$JAVACMD" ] ; then
  if [ -n "$JAVA_HOME"  ] ; then
    if [ -x "$JAVA_HOME/jre/sh/java" ] ; then
      # IBM's JDK on AIX uses strange locations for the executables
      JAVACMD="$JAVA_HOME/jre/sh/java"
    else
      JAVACMD="$JAVA_HOME/bin/java"
    fi
  else
    JAVACMD="`\\unset -f command; \\command -v java`"
  fi
fi

if [ ! -x "$JAVACMD" ] ; then
  echo "Error: JAVA_HOME is not defined correctly." >&2
  echo "  We cannot execute $JAVACMD" >&2
  exit 1
fi

if [ -z "$JAVA_HOME" ] ; then
  echo "Warning: JAVA_HOME environment variable is not set."
fi

CLASSWORLDS_LAUNCHER=org.codehaus.plexus.classworlds.launcher.Launcher

# traverses directory structure from process work directory to filesystem root
# first directory with .mvn subdirectory is considered project base directory
find_maven_basedir() {

  if [ -z "$1" ]
  then
    echo "Path not specified to find_maven_basedir"
    return 1
  fi

  basedir="$1"
  wdir="$1"
  while [ "$wdir" != '/' ] ; do
    if [ -d "$wdir"/.mvn ] ; then
      basedir=$wdir
      break
    fi
    # workaround for JBEAP-8937 (on Solaris 10/Sparc)
    if [ -d "${wdir}" ]; then
      wdir=`cd "$wdir/.."; pwd`
    fi
    # end of workaround
  done
  echo "${basedir}"
}

# concatenates all lines of a file
concat_lines() {
  if [ -f "$1" ]; then
    echo "$(tr -s '\n' ' ' < "$1")"
  fi
}

BASE_DIR=`find_maven_basedir "$(pwd)"`
if [ -z "$BASE_DIR" ]; then
  exit 1;
fi

##########################################################################################
# Extension to allow automatically downloading the maven-wrapper.jar from Maven-central
# This allows using the maven wrapper in projects that prohibit checking in binary data.
##########################################################################################
if [ -r "$BASE_DIR/.mvn/wrapper/maven-wrapper.jar" ]; then
    if [ "$MVNW_VERBOSE" = true ]; then
      echo "Found .mvn/wrapper/maven-wrapper.jar"
    fi
else
    if [ "$MVNW_VERBOSE" = true ]; then
      echo "Couldn't find .mvn/wrapper/maven-wrapper.jar, downloading it ..."
    fi
    if [ -n "$MVNW_REPOURL" ]; then
      jarUrl="$MVNW_REPOURL/org/apache/maven/wrapper/maven-wrapper/3.1.0/maven-wrapper-3.1.0.jar"
    else
      jarUrl="https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.1.0/maven-wrapper-3.1.0.jar"
    fi
    while IFS="=" read key value; do
      case "$key" in (wrapperUrl) jarUrl="$value"; break ;;
      esac
    done < "$BASE_DIR/.mvn/wrapper/maven-wrapper.properties"
    if [ "$MVNW_VERBOSE" = true ]; then
      echo "Downloading from: $jarUrl"
    fi
    wrapperJarPath="$BASE_DIR/.mvn/wrapper/maven-wrapper.jar"
    if $cygwin; then
      wrapperJarPath=`cygpath --path --windows "$wrapperJarPath"`
    fi

    if command -v wget > /dev/null; then
        if [ "$MVNW_VERBOSE" = true ]; then
          echo "Found wget ... using wget"
        fi
        if [ -z "$MVNW_USERNAME" ] || [ -z "$MVNW_PASSWORD" ]; then
            wget "$jarUrl" -O "$wrapperJarPath" || rm -f "$wrapperJarPath"
        else
            wget --http-user=$MVNW_USERNAME --http-password=$MVNW_PASSWORD "$jarUrl" -O "$wrapperJarPath" || rm -f "$wrapperJarPath"
        fi
    elif command -v curl > /dev/null; then
        if [ "$MVNW_VERBOSE" = true ]; then
          echo "Found curl ... using curl"
        fi
        if [ -z "$MVNW_USERNAME" ] || [ -z "$MVNW_PASSWORD" ]; then
            curl -o "$wrapperJarPath" "$jarUrl" -f
        else
            curl --user $MVNW_USERNAME:$MVNW_PASSWORD -o "$wrapperJarPath" "$jarUrl" -f
        fi

    else
        if [ "$MVNW_VERBOSE" = true ]; then
          echo "Falling back to using Java to download"
        fi
        javaClass="$BASE_DIR/.mvn/wrapper/MavenWrapperDownloader.java"
        # For Cygwin, switch paths to Windows format before running javac
        if $cygwin; then
          javaClass=`cygpath --path --windows "$javaClass"`
        fi
        if [ -e "$javaClass" ]; then
            if [ ! -e "$BASE_DIR/.mvn/wrapper/MavenWrapperDownloader.class" ]; then
                if [ "$MVNW_VERBOSE" = true ]; then
                  echo " - Compiling MavenWrapperDownloader.java ..."
                fi
                # Compiling the Java class
                ("$JAVA_HOME/bin/javac" "$javaClass")
            fi
            if [ -e "$BASE_DIR/.mvn/wrapper/MavenWrapperDownloader.class" ]; then
                # Running the downloader
                if [ "$MVNW_VERBOSE" = true ]; then
                  echo " - Running MavenWrapperDownloader.java ..."
                fi
                ("$JAVA_HOME/bin/java" -cp .mvn/wrapper MavenWrapperDownloader "$MAVEN_PROJECTBASEDIR")
            fi
        fi
    fi
fi
##########################################################################################
# End of extension
##########################################################################################

export MAVEN_PROJECTBASEDIR=${MAVEN_BASEDIR:-"$BASE_DIR"}
if [ "$MVNW_VERBOSE" = true ]; then
  echo $MAVEN_PROJECTBASEDIR
fi
MAVEN_OPTS="$(concat_lines "$MAVEN_PROJECTBASEDIR/.mvn/jvm.config") $MAVEN_OPTS"

# For Cygwin, switch paths to Windows format before running java
if $cygwin; then
  [ -n "$M2_HOME" ] &&
    M2_HOME=`cygpath --path --windows "$M2_HOME"`
  [ -n "$JAVA_HOME" ] &&
    JAVA_HOME=`cygpath --path --windows "$JAVA_HOME"`
  [ -n "$CLASSPATH" ] &&
    CLASSPATH=`cygpath --path --windows "$CLASSPATH"`
  [ -n "$MAVEN_PROJECTBASEDIR" ] &&
    MAVEN_PROJECTBASEDIR=`cygpath --path --windows "$MAVEN_PROJECTBASEDIR"`
fi

# Provide a "standardized" way to retrieve the CLI args that will
# work with both Windows and non-Windows executions.
MAVEN_CMD_LINE_ARGS="$MAVEN_CONFIG $@"
export MAVEN_CMD_LINE_ARGS

WRAPPER_LAUNCHER=org.apache.maven.wrapper.MavenWrapperMain

exec "$JAVACMD" \
  $MAVEN_OPTS \
  $MAVEN_DEBUG_OPTS \
  -classpath "$MAVEN_PROJECTBASEDIR/.mvn/wrapper/maven-wrapper.jar" \
  "-Dmaven.home=${M2_HOME}" \
  "-Dmaven.multiModuleProjectDirectory=${MAVEN_PROJECTBASEDIR}" \
  ${WRAPPER_LAUNCHER} $MAVEN_CONFIG "$@"
</file>

<file path="mvnw.cmd">
@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements.  See the NOTICE file
@REM distributed with this work for additional information
@REM regarding copyright ownership.  The ASF licenses this file
@REM to you under the Apache License, Version 2.0 (the
@REM "License"); you may not use this file except in compliance
@REM with the License.  You may obtain a copy of the License at
@REM
@REM    https://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing,
@REM software distributed under the License is distributed on an
@REM "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
@REM KIND, either express or implied.  See the License for the
@REM specific language governing permissions and limitations
@REM under the License.
@REM ----------------------------------------------------------------------------

@REM ----------------------------------------------------------------------------
@REM Maven Start Up Batch script
@REM
@REM Required ENV vars:
@REM JAVA_HOME - location of a JDK home dir
@REM
@REM Optional ENV vars
@REM M2_HOME - location of maven2's installed home dir
@REM MAVEN_BATCH_ECHO - set to 'on' to enable the echoing of the batch commands
@REM MAVEN_BATCH_PAUSE - set to 'on' to wait for a keystroke before ending
@REM MAVEN_OPTS - parameters passed to the Java VM when running Maven
@REM     e.g. to debug Maven itself, use
@REM set MAVEN_OPTS=-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=y,address=8000
@REM MAVEN_SKIP_RC - flag to disable loading of mavenrc files
@REM ----------------------------------------------------------------------------

@REM Begin all REM lines with '@' in case MAVEN_BATCH_ECHO is 'on'
@echo off
@REM set title of command window
title %0
@REM enable echoing by setting MAVEN_BATCH_ECHO to 'on'
@if "%MAVEN_BATCH_ECHO%" == "on"  echo %MAVEN_BATCH_ECHO%

@REM set %HOME% to equivalent of $HOME
if "%HOME%" == "" (set "HOME=%HOMEDRIVE%%HOMEPATH%")

@REM Execute a user defined script before this one
if not "%MAVEN_SKIP_RC%" == "" goto skipRcPre
@REM check for pre script, once with legacy .bat ending and once with .cmd ending
if exist "%USERPROFILE%\mavenrc_pre.bat" call "%USERPROFILE%\mavenrc_pre.bat" %*
if exist "%USERPROFILE%\mavenrc_pre.cmd" call "%USERPROFILE%\mavenrc_pre.cmd" %*
:skipRcPre

@setlocal

set ERROR_CODE=0

@REM To isolate internal variables from possible post scripts, we use another setlocal
@setlocal

@REM ==== START VALIDATION ====
if not "%JAVA_HOME%" == "" goto OkJHome

echo.
echo Error: JAVA_HOME not found in your environment. >&2
echo Please set the JAVA_HOME variable in your environment to match the >&2
echo location of your Java installation. >&2
echo.
goto error

:OkJHome
if exist "%JAVA_HOME%\bin\java.exe" goto init

echo.
echo Error: JAVA_HOME is set to an invalid directory. >&2
echo JAVA_HOME = "%JAVA_HOME%" >&2
echo Please set the JAVA_HOME variable in your environment to match the >&2
echo location of your Java installation. >&2
echo.
goto error

@REM ==== END VALIDATION ====

:init

@REM Find the project base dir, i.e. the directory that contains the folder ".mvn".
@REM Fallback to current working directory if not found.

set MAVEN_PROJECTBASEDIR=%MAVEN_BASEDIR%
IF NOT "%MAVEN_PROJECTBASEDIR%"=="" goto endDetectBaseDir

set EXEC_DIR=%CD%
set WDIR=%EXEC_DIR%
:findBaseDir
IF EXIST "%WDIR%"\.mvn goto baseDirFound
cd ..
IF "%WDIR%"=="%CD%" goto baseDirNotFound
set WDIR=%CD%
goto findBaseDir

:baseDirFound
set MAVEN_PROJECTBASEDIR=%WDIR%
cd "%EXEC_DIR%"
goto endDetectBaseDir

:baseDirNotFound
set MAVEN_PROJECTBASEDIR=%EXEC_DIR%
cd "%EXEC_DIR%"

:endDetectBaseDir

IF NOT EXIST "%MAVEN_PROJECTBASEDIR%\.mvn\jvm.config" goto endReadAdditionalConfig

@setlocal EnableExtensions EnableDelayedExpansion
for /F "usebackq delims=" %%a in ("%MAVEN_PROJECTBASEDIR%\.mvn\jvm.config") do set JVM_CONFIG_MAVEN_PROPS=!JVM_CONFIG_MAVEN_PROPS! %%a
@endlocal & set JVM_CONFIG_MAVEN_PROPS=%JVM_CONFIG_MAVEN_PROPS%

:endReadAdditionalConfig

SET MAVEN_JAVA_EXE="%JAVA_HOME%\bin\java.exe"
set WRAPPER_JAR="%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar"
set WRAPPER_LAUNCHER=org.apache.maven.wrapper.MavenWrapperMain

set DOWNLOAD_URL="https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.1.0/maven-wrapper-3.1.0.jar"

FOR /F "usebackq tokens=1,2 delims==" %%A IN ("%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.properties") DO (
    IF "%%A"=="wrapperUrl" SET DOWNLOAD_URL=%%B
)

@REM Extension to allow automatically downloading the maven-wrapper.jar from Maven-central
@REM This allows using the maven wrapper in projects that prohibit checking in binary data.
if exist %WRAPPER_JAR% (
    if "%MVNW_VERBOSE%" == "true" (
        echo Found %WRAPPER_JAR%
    )
) else (
    if not "%MVNW_REPOURL%" == "" (
        SET DOWNLOAD_URL="%MVNW_REPOURL%/org/apache/maven/wrapper/maven-wrapper/3.1.0/maven-wrapper-3.1.0.jar"
    )
    if "%MVNW_VERBOSE%" == "true" (
        echo Couldn't find %WRAPPER_JAR%, downloading it ...
        echo Downloading from: %DOWNLOAD_URL%
    )

    powershell -Command "&{"^
		"$webclient = new-object System.Net.WebClient;"^
		"if (-not ([string]::IsNullOrEmpty('%MVNW_USERNAME%') -and [string]::IsNullOrEmpty('%MVNW_PASSWORD%'))) {"^
		"$webclient.Credentials = new-object System.Net.NetworkCredential('%MVNW_USERNAME%', '%MVNW_PASSWORD%');"^
		"}"^
		"[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $webclient.DownloadFile('%DOWNLOAD_URL%', '%WRAPPER_JAR%')"^
		"}"
    if "%MVNW_VERBOSE%" == "true" (
        echo Finished downloading %WRAPPER_JAR%
    )
)
@REM End of extension

@REM Provide a "standardized" way to retrieve the CLI args that will
@REM work with both Windows and non-Windows executions.
set MAVEN_CMD_LINE_ARGS=%*

%MAVEN_JAVA_EXE% ^
  %JVM_CONFIG_MAVEN_PROPS% ^
  %MAVEN_OPTS% ^
  %MAVEN_DEBUG_OPTS% ^
  -classpath %WRAPPER_JAR% ^
  "-Dmaven.multiModuleProjectDirectory=%MAVEN_PROJECTBASEDIR%" ^
  %WRAPPER_LAUNCHER% %MAVEN_CONFIG% %*
if ERRORLEVEL 1 goto error
goto end

:error
set ERROR_CODE=1

:end
@endlocal & set ERROR_CODE=%ERROR_CODE%

if not "%MAVEN_SKIP_RC%"=="" goto skipRcPost
@REM check for post script, once with legacy .bat ending and once with .cmd ending
if exist "%USERPROFILE%\mavenrc_post.bat" call "%USERPROFILE%\mavenrc_post.bat"
if exist "%USERPROFILE%\mavenrc_post.cmd" call "%USERPROFILE%\mavenrc_post.cmd"
:skipRcPost

@REM pause the script if MAVEN_BATCH_PAUSE is set to 'on'
if "%MAVEN_BATCH_PAUSE%"=="on" pause

if "%MAVEN_TERMINATE_CMD%"=="on" exit %ERROR_CODE%

cmd /C exit /B %ERROR_CODE%
</file>

<file path="src/main/java/com/nihongoquest/client/ranked/battle/BattleController.java">
package com.nihongoquest.client.ranked.battle;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.profile.Player;
import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.Payloads;
import com.fasterxml.jackson.databind.JsonNode;
import javafx.animation.KeyFrame;
import javafx.animation.Timeline;
import javafx.application.Platform;
import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.ProgressBar;
import javafx.util.Duration;

import java.util.List;

/**
 * BattleController xử lý màn hình thi đấu (battle.fxml).
 * Chỉ hiển thị player, câu hỏi, đáp án và điểm nhận từ Server.
 * Controller không được tự tính kết quả trận đấu — Server quyết định đúng/sai và điểm.
 */
public class BattleController {

    @FXML
    private Label player1Label;

    @FXML
    private Label player2Label;

    @FXML
    private Label scoreLabel;

    @FXML
    private Label questionLabel;

    @FXML
    private ProgressBar timeProgressBar;

    @FXML
    private Label timeLabel;
    @FXML
    private Label matchTimeLabel;

    @FXML
    private Button answerAButton;

    @FXML
    private Button answerBButton;

    @FXML
    private Button answerCButton;

    @FXML
    private Button answerDButton;

    private ClientApp app;
    private GameClient gameClient;
    private String opponentUsername;
    private List<Button> answerButtons;
    private Payloads.QuestionData currentQuestion;
    private Timeline countdownTimeline;
    private long countdownStartedNanos;
    private long countdownDurationMillis;
    private long matchCountdownDurationMillis;
    private long matchCountdownStartedNanos;
    private String roomId;

    public void setSession(ClientApp app, GameClient gameClient, Player player,
                           String roomId, String opponentUsername, int durationSeconds) {
        this.app = app;
        this.gameClient = gameClient;
        this.opponentUsername = opponentUsername;
        this.roomId = roomId;
        this.answerButtons = List.of(
                answerAButton, answerBButton, answerCButton, answerDButton);
        player1Label.setText(player.getUsername());
        player2Label.setText(opponentUsername);
        scoreLabel.setText("0  :  0");
        questionLabel.setText("Đã ghép trận thành công - đang chuẩn bị câu hỏi");
        timeProgressBar.setProgress(0);
        timeLabel.setText("--");
        matchTimeLabel.setText(formatSeconds(durationSeconds));
        setAnswersDisabled(true);

        gameClient.setMessageHandler(message ->
                Platform.runLater(() -> handleMessage(message)));
        gameClient.setConnectionErrorHandler(error ->
                Platform.runLater(() -> {
                    stopCountdown();
                    questionLabel.setText(error);
                    timeProgressBar.setProgress(0);
                    timeLabel.setText("--");
                    setAnswersDisabled(true);
                }));
    }

    private void setAnswersDisabled(boolean disabled) {
        answerAButton.setDisable(disabled);
        answerBButton.setDisable(disabled);
        answerCButton.setDisable(disabled);
        answerDButton.setDisable(disabled);
    }

    @FXML
    private void onAnswerSelected(ActionEvent event) {
        int answerIndex = answerButtons.indexOf(event.getSource());
        if (answerIndex < 0) {
            return;
        }
        setAnswersDisabled(true);
        try {
            gameClient.sendAnswer(currentQuestion.sessionId(), currentQuestion.attempt(),
                    currentQuestion.questionId(), currentQuestion.choices().get(answerIndex).choiceId());
        } catch (IllegalStateException | IllegalArgumentException e) {
            questionLabel.setText(e.getMessage());
        }
    }

    private void handleMessage(Message message) {
        switch (message.getType()) {
            case QUESTION -> showQuestion(message.getPayload());
            case ANSWER_RESULT -> showAnswerResult(message.getPayload());
            case SCORE_UPDATE -> showScore(message.getPayload());
            case GAME_OVER -> showGameOver(message.getPayload());
            case MATCH_ERROR -> {
                stopCountdown();
                questionLabel.setText("Đối thủ đã ngắt kết nối");
                timeProgressBar.setProgress(0);
                timeLabel.setText("--");
                setAnswersDisabled(true);
            }
            default -> {
                // Màn Battle chỉ xử lý message gameplay.
            }
        }
    }

    private void showQuestion(JsonNode payload) {
        try {
            Payloads.QuestionData question = Payloads.parseQuestion(payload);
            if (!roomId.equals(question.sessionId()) || question.attempt() <= 0
                    || question.questionDurationSeconds() <= 0
                    || question.matchRemainingSeconds() <= 0
                    || question.choices() == null || question.choices().size() != 4) {
                showProtocolError();
                return;
            }
            currentQuestion = question;
            questionLabel.setText("Lượt " + question.attempt() + ": " + question.content());
            for (int i = 0; i < answerButtons.size(); i++) {
                answerButtons.get(i).setText(question.choices().get(i).content());
            }
            clearAnswerStyles();
            setAnswersDisabled(false);
            startCountdown(question.questionDurationSeconds(), question.matchRemainingSeconds());
        } catch (RuntimeException e) {
            showProtocolError();
        }
    }

    private void showAnswerResult(JsonNode payload) {
        try {
            Payloads.AnswerResult result = Payloads.parseAnswerResult(payload);
            if (currentQuestion == null || !roomId.equals(result.sessionId())
                    || result.attempt() != currentQuestion.attempt()
                    || result.questionId() != currentQuestion.questionId()) {
                return;
            }
            boolean correct = result.correct();
            int chosenIndex = choiceIndex(result.chosenChoiceId());
            int correctIndex = choiceIndex(result.correctChoiceId());
            if ((result.chosenChoiceId() != null && chosenIndex < 0) || correctIndex < 0) {
                showProtocolError();
                return;
            }
            stopCountdown();
            setAnswersDisabled(true);
            if (result.chosenChoiceId() == null) {
                timeProgressBar.setProgress(0);
                timeLabel.setText("Hết giờ");
            } else if (!correct) {
                answerButtons.get(chosenIndex).getStyleClass().add("answer-wrong");
                timeLabel.setText("Sai");
            } else {
                timeLabel.setText("Đúng");
            }
            answerButtons.get(correctIndex).getStyleClass().add("answer-correct");
        } catch (RuntimeException e) {
            showProtocolError();
        }
    }

    private void showScore(JsonNode payload) {
        try {
            Payloads.Scores scores = Payloads.parseScores(payload);
            scoreLabel.setText(scores.myScore() + "  :  " + scores.opponentScore());
        } catch (RuntimeException e) {
            showProtocolError();
        }
    }

    private void showGameOver(JsonNode payload) {
        try {
            stopCountdown();
            Payloads.GameOver result = Payloads.parseGameOver(payload);
            app.showResult(result.result(), result.myScore(), result.opponentScore(),
                    opponentUsername);
        } catch (RuntimeException e) {
            showProtocolError();
        }
    }

    private void startCountdown(int questionSeconds, int matchSeconds) {
        stopCountdown();
        countdownDurationMillis = questionSeconds * 1_000L;
        countdownStartedNanos = System.nanoTime();
        matchCountdownDurationMillis = matchSeconds * 1_000L;
        matchCountdownStartedNanos = countdownStartedNanos;
        timeProgressBar.setProgress(1);
        timeLabel.setText(questionSeconds + "s");
        matchTimeLabel.setText(formatSeconds(matchSeconds));

        countdownTimeline = new Timeline(new KeyFrame(
                Duration.millis(100), event -> updateCountdown()));
        countdownTimeline.setCycleCount(Timeline.INDEFINITE);
        countdownTimeline.play();
    }

    private void updateCountdown() {
        long elapsedMillis = (System.nanoTime() - countdownStartedNanos) / 1_000_000L;
        long remainingMillis = Math.max(0, countdownDurationMillis - elapsedMillis);
        long matchElapsedMillis = (System.nanoTime() - matchCountdownStartedNanos) / 1_000_000L;
        long matchRemainingMillis = Math.max(0, matchCountdownDurationMillis - matchElapsedMillis);
        timeProgressBar.setProgress((double) remainingMillis / countdownDurationMillis);
        timeLabel.setText(((remainingMillis + 999) / 1_000) + "s");
        matchTimeLabel.setText(formatSeconds((int) ((matchRemainingMillis + 999) / 1_000)));
        if (remainingMillis == 0) {
            stopCountdown();
            setAnswersDisabled(true);
            timeLabel.setText("Chờ Server");
        }
    }

    private void stopCountdown() {
        if (countdownTimeline != null) {
            countdownTimeline.stop();
            countdownTimeline = null;
        }
    }

    private void clearAnswerStyles() {
        for (Button button : answerButtons) {
            button.getStyleClass().removeAll("answer-correct", "answer-wrong");
        }
    }

    private int choiceIndex(Long choiceId) {
        if (choiceId == null || currentQuestion == null) return -1;
        for (int index = 0; index < currentQuestion.choices().size(); index++) {
            if (currentQuestion.choices().get(index).choiceId() == choiceId) return index;
        }
        return -1;
    }

    private String formatSeconds(int seconds) {
        return String.format("%d:%02d", seconds / 60, seconds % 60);
    }

    private void showProtocolError() {
        stopCountdown();
        questionLabel.setText("Dữ liệu trận đấu không hợp lệ");
        timeProgressBar.setProgress(0);
        timeLabel.setText("--");
        setAnswersDisabled(true);
    }
}
</file>

<file path="src/main/java/com/nihongoquest/client/ranked/matchmaking/MatchmakingController.java">
package com.nihongoquest.client.ranked.matchmaking;

import com.nihongoquest.client.layout.NavigationGuard;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.profile.Player;
import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.Payloads;
import com.fasterxml.jackson.databind.JsonNode;
import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Alert;
import javafx.scene.control.ButtonType;
import javafx.scene.control.Label;
import javafx.scene.control.ProgressIndicator;
import javafx.scene.control.RadioButton;

import java.util.Optional;

/**
 * MatchmakingController xử lý màn hình đang tìm đối thủ (matchmaking.fxml).
 * Hiển thị trạng thái chờ; sau này nhận MATCH_FOUND từ Server rồi chuyển sang Battle.
 */
public class MatchmakingController implements NavigationGuard {

    @FXML
    private Label statusLabel;
    @FXML
    private Button cancelButton;
    @FXML
    private Label usernameLabel;
    @FXML
    private ProgressIndicator searchSpinner;
    @FXML
    private RadioButton threeMinutesRadio;
    @FXML
    private RadioButton fiveMinutesRadio;
    @FXML
    private Button searchButton;

    private ClientApp app;
    private GameClient gameClient;
    private boolean searching;

    public void setSession(ClientApp app, GameClient gameClient, Player player) {
        this.app = app;
        this.gameClient = gameClient;
        usernameLabel.setText("Đang tìm cho: " + player.getUsername());
        searchSpinner.setVisible(false);
        gameClient.setMessageHandler(message ->
                Platform.runLater(() -> handleMessage(message)));
        gameClient.setConnectionErrorHandler(error ->
                Platform.runLater(() -> {
                    showError(error);
                    searchSpinner.setVisible(false);
                    cancelButton.setDisable(true);
                }));
    }

    @FXML
    private void startSearch() {
        int duration = fiveMinutesRadio.isSelected() ? 300 : 180;
        try {
            searching = true;
            threeMinutesRadio.setDisable(true);
            fiveMinutesRadio.setDisable(true);
            searchButton.setDisable(true);
            searchSpinner.setVisible(true);
            cancelButton.setManaged(true);
            cancelButton.setVisible(true);
            cancelButton.setText("HỦY TÌM TRẬN");
            showStatus("Đang gửi yêu cầu tìm trận " + (duration / 60) + " phút...");
            gameClient.findMatch(duration);
        } catch (IllegalStateException e) {
            searching = false;
            showError(e.getMessage());
            searchSpinner.setVisible(false);
            searchButton.setDisable(false);
        }
    }

    /**
     * Xử lý nút hủy tìm trận.
     */
    @FXML
    private void onCancel() {
        if (!searching) {
            return;
        }
        cancelButton.setDisable(true);
        showStatus("Đang hủy tìm trận...");
        try {
            gameClient.cancelMatch();
        } catch (IllegalStateException e) {
            showError(e.getMessage());
        }
    }

    private void handleMessage(Message message) {
        switch (message.getType()) {
            case WAITING -> showStatus("Đang tìm đối thủ...");
            case MATCH_CANCELLED -> {
                searching = false;
                searchSpinner.setVisible(false);
                app.showMatchmaking();
            }
            case MATCH_FOUND -> handleMatchFound(message.getPayload());
            case MATCH_ERROR -> handleMatchError(message.payloadText());
            case QUESTION, ANSWER_RESULT, SCORE_UPDATE, GAME_OVER ->
                    gameClient.redispatch(message);
            default -> {
                // Màn tìm trận chỉ xử lý các message matchmaking.
            }
        }
    }

    private void handleMatchFound(JsonNode payload) {
        try {
            Payloads.MatchFound match = Payloads.parseMatchFound(payload);
            if (match.roomId().isBlank() || match.opponent().isBlank()) {
                throw new IllegalArgumentException("Empty match");
            }
            searchSpinner.setVisible(false);
            statusLabel.setText("Đã tìm thấy " + match.opponent());
            if (match.durationSeconds() != 180 && match.durationSeconds() != 300) {
                throw new IllegalArgumentException("Invalid duration");
            }
            app.showBattle(match.roomId(), match.opponent(), match.durationSeconds());
        } catch (RuntimeException e) {
            showError("Dữ liệu trận đấu không hợp lệ");
            cancelButton.setDisable(false);
        }
    }

    private void handleMatchError(String reason) {
        String message = switch (reason) {
            case "NOT_AUTHENTICATED" -> "Bạn cần đăng nhập trước khi tìm trận";
            case "ALREADY_WAITING" -> "Bạn đang ở trong hàng chờ";
            case "ALREADY_MATCHED" -> "Bạn đã được ghép trận";
            case "OPPONENT_DISCONNECTED" -> "Đối thủ đã ngắt kết nối";
            case "QUESTIONS_UNAVAILABLE" -> "Chưa thể tạo trận: không tải được đủ câu hỏi hợp lệ";
            case "INVALID_DURATION" -> "Chế độ trận đấu phải là 3 hoặc 5 phút";
            default -> "Không thể tìm trận";
        };
        showError(message);
        if (!"ALREADY_MATCHED".equals(reason)) {
            searching = false;
            searchSpinner.setVisible(false);
            searchButton.setDisable(false);
            threeMinutesRadio.setDisable(false);
            fiveMinutesRadio.setDisable(false);
            cancelButton.setDisable(false);
            cancelButton.setManaged(false);
            cancelButton.setVisible(false);
        }
    }

    private void showStatus(String message) {
        statusLabel.getStyleClass().remove("status-error");
        statusLabel.setText(message);
    }

    private void showError(String message) {
        if (!statusLabel.getStyleClass().contains("status-error")) {
            statusLabel.getStyleClass().add("status-error");
        }
        statusLabel.setText(message);
    }

    @Override
    public boolean requestNavigationAway() {
        if (!searching) return true;
        Alert alert = new Alert(Alert.AlertType.CONFIRMATION);
        alert.setTitle("Hủy tìm trận");
        alert.setHeaderText("Bạn đang trong hàng chờ ghép trận");
        alert.setContentText("Rời màn hình sẽ hủy yêu cầu tìm đối thủ hiện tại.");
        Optional<ButtonType> choice = alert.showAndWait();
        if (choice.isEmpty() || choice.get() != ButtonType.OK) return false;
        gameClient.cancelMatch();
        searching = false;
        return true;
    }
}
</file>

<file path="pom.xml">
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">

    <modelVersion>4.0.0</modelVersion>

    <groupId>com.nihongoquest</groupId>
    <artifactId>nihongoquest</artifactId>
    <version>1.0-SNAPSHOT</version>

    <name>NihongoQuest</name>
    <description>Ứng dụng JavaFX học tiếng Nhật đối kháng 1v1 qua TCP Socket</description>

    <properties>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <maven.compiler.release>21</maven.compiler.release>
        <javafx.version>21.0.6</javafx.version>
    </properties>

    <dependencies>

        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
            <version>2.18.3</version>
        </dependency>

        <dependency>
            <groupId>org.openjfx</groupId>
            <artifactId>javafx-controls</artifactId>
            <version>${javafx.version}</version>
        </dependency>

        <dependency>
            <groupId>org.openjfx</groupId>
            <artifactId>javafx-fxml</artifactId>
            <version>${javafx.version}</version>
        </dependency>

        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <version>42.7.7</version>
        </dependency>

        <dependency>
            <groupId>org.mindrot</groupId>
            <artifactId>jbcrypt</artifactId>
            <version>0.4</version>
        </dependency>

        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>5.12.1</version>
            <scope>test</scope>
        </dependency>

    </dependencies>

    <build>
        <plugins>

            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-surefire-plugin</artifactId>
                <version>3.5.2</version>
            </plugin>

            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.13.0</version>
                <configuration>
                    <release>${maven.compiler.release}</release>
                </configuration>
            </plugin>

            <plugin>
                <groupId>org.openjfx</groupId>
                <artifactId>javafx-maven-plugin</artifactId>
                <version>0.0.8</version>

                <configuration>
                    <mainClass>com.nihongoquest.client.ClientApp</mainClass>
                </configuration>
            </plugin>

        </plugins>
    </build>

    <profiles>
        <profile>
            <id>server-dashboard</id>
            <build>
                <plugins>
                    <plugin>
                        <groupId>org.openjfx</groupId>
                        <artifactId>javafx-maven-plugin</artifactId>
                        <version>0.0.8</version>
                        <configuration>
                            <mainClass>com.nihongoquest.server.dashboard.ServerDashboardApp</mainClass>
                        </configuration>
                    </plugin>
                </plugins>
            </build>
        </profile>
    </profiles>

</project>
</file>

<file path="sql/supabase_schema.sql">
-- NIHONGOQUEST - RESET SCHEMA CHO DO AN
-- CANH BAO: script nay xoa toan bo du lieu NihongoQuest hien co.
-- Chay trong Supabase SQL Editor, sau do chay seed_demo.sql neu can du lieu demo.

DROP TABLE IF EXISTS ranked_answers CASCADE;
DROP TABLE IF EXISTS ranked_match_questions CASCADE;
DROP TABLE IF EXISTS ranked_match_players CASCADE;
DROP TABLE IF EXISTS ranked_matches CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS friendships CASCADE;
DROP TABLE IF EXISTS choices CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS quiz_sets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(60) NOT NULL,
    wins INT NOT NULL DEFAULT 0 CHECK (wins >= 0),
    losses INT NOT NULL DEFAULT 0 CHECK (losses >= 0),
    draws INT NOT NULL DEFAULT 0 CHECK (draws >= 0),
    total_score INT NOT NULL DEFAULT 0 CHECK (total_score >= 0),
    questions_answered INT NOT NULL DEFAULT 0 CHECK (questions_answered >= 0),
    correct_answers INT NOT NULL DEFAULT 0 CHECK (correct_answers >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quiz_sets (
    id BIGSERIAL PRIMARY KEY,
    owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    level VARCHAR(2) NOT NULL CHECK (level IN ('N5', 'N4', 'N3', 'N2', 'N1')),
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE questions (
    id BIGSERIAL PRIMARY KEY,
    quiz_set_id BIGINT NOT NULL REFERENCES quiz_sets(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    explanation TEXT NOT NULL DEFAULT '',
    position INT NOT NULL CHECK (position > 0),
    UNIQUE (quiz_set_id, position)
);

CREATE TABLE choices (
    id BIGSERIAL PRIMARY KEY,
    question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    position INT NOT NULL CHECK (position BETWEEN 1 AND 4),
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (question_id, position),
    UNIQUE (id, question_id)
);

CREATE TABLE matches (
    id BIGSERIAL PRIMARY KEY,
    player1_id BIGINT NOT NULL REFERENCES users(id),
    player2_id BIGINT NOT NULL REFERENCES users(id),
    score1 INT NOT NULL CHECK (score1 >= 0),
    score2 INT NOT NULL CHECK (score2 >= 0),
    winner_id BIGINT REFERENCES users(id),
    duration_seconds INT NOT NULL CHECK (duration_seconds IN (180, 300)),
    end_reason VARCHAR(20) NOT NULL CHECK (end_reason IN ('NORMAL', 'DISCONNECT')),
    played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (player1_id <> player2_id),
    CHECK (winner_id IS NULL OR winner_id IN (player1_id, player2_id))
);

CREATE TABLE friendships (
    user_low_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_high_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_by_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(10) NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_low_id, user_high_id),
    CHECK (user_low_id < user_high_id),
    CHECK (requested_by_id IN (user_low_id, user_high_id))
);

CREATE INDEX idx_quiz_sets_public ON quiz_sets (is_published, level);
CREATE INDEX idx_questions_set ON questions (quiz_set_id, position);
CREATE INDEX idx_matches_player1 ON matches (player1_id, played_at DESC);
CREATE INDEX idx_matches_player2 ON matches (player2_id, played_at DESC);
CREATE INDEX idx_friendships_high ON friendships (user_high_id, status);

-- Client khong bao gio ket noi database. Khong can RLS/JWT cho ban demo JDBC LAN.
</file>

<file path="src/main/java/com/nihongoquest/client/auth/LoginController.java">
package com.nihongoquest.client.auth;

import com.nihongoquest.client.config.ClientConfig;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.profile.Player;
import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.Payloads;
import com.fasterxml.jackson.databind.JsonNode;
import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.scene.control.Button;
import javafx.scene.control.Hyperlink;
import javafx.scene.control.Label;
import javafx.scene.control.PasswordField;
import javafx.scene.control.TextField;

import java.io.IOException;

public class LoginController {

    @FXML
    private Label authTitle;
    @FXML
    private Label authSubtitle;
    @FXML
    private TextField serverHostField;
    @FXML
    private TextField serverPortField;
    @FXML
    private Button connectButton;
    @FXML
    private Label connectionStatusLabel;
    @FXML
    private TextField usernameField;
    @FXML
    private PasswordField passwordField;
    @FXML
    private PasswordField confirmPasswordField;
    @FXML
    private Button submitButton;
    @FXML
    private Label statusLabel;
    @FXML
    private Label modePromptLabel;
    @FXML
    private Hyperlink modeLink;

    private ClientApp app;
    private GameClient gameClient;
    private boolean loginMode = true;

    public void setApp(ClientApp app, GameClient gameClient) {
        this.app = app;
        this.gameClient = gameClient;
        gameClient.setMessageHandler(message ->
                Platform.runLater(() -> handleServerMessage(message)));
        gameClient.setConnectionErrorHandler(error ->
                Platform.runLater(() -> {
                    showConnectionError(error);
                    setConnectionControlsDisabled(false);
                    connectButton.setText("KẾT NỐI");
                    setSubmitDisabled(true);
                }));
        serverHostField.setText(ClientConfig.serverHost());
        serverPortField.setText(Integer.toString(ClientConfig.serverPort()));
        showConnectionStatus("Chưa kết nối tới server", null);
        showStatus("Hãy kết nối server trước khi đăng nhập");
        setSubmitDisabled(true);
    }
    
    @FXML
    private void onConnect() {
        String host = serverHostField.getText().trim();
        int port;
        if (host.isEmpty()) {
            showConnectionError("Địa chỉ server không được để trống");
            serverHostField.requestFocus();
            return;
        }
        try {
            port = Integer.parseInt(serverPortField.getText().trim());
            if (port < 1 || port > 65_535) {
                throw new NumberFormatException();
            }
        } catch (NumberFormatException e) {
            showConnectionError("Cổng phải là số từ 1 đến 65535");
            serverPortField.requestFocus();
            return;
        }

        showConnectionStatus("Đang kết nối tới " + host + ":" + port + "...", null);
        setConnectionControlsDisabled(true);
        setSubmitDisabled(true);
        Thread connector = new Thread(() -> {
            try {
                if (gameClient.isConnected()) {
                    gameClient.disconnect();
                }
                gameClient.connect(host, port);
                Platform.runLater(() -> {
                    showConnectionSuccess("Đã kết nối tới " + host + ":" + port);
                    showStatus("Bạn có thể đăng nhập hoặc đăng ký");
                    setConnectionControlsDisabled(false);
                    connectButton.setText("KẾT NỐI LẠI");
                    setSubmitDisabled(false);
                });
            } catch (IOException | RuntimeException e) {
                Platform.runLater(() -> {
                    showConnectionError("Không thể kết nối tới " + host + ":" + port);
                    setConnectionControlsDisabled(false);
                    connectButton.setText("KẾT NỐI");
                });
            }
        }, "server-connector");
        connector.setDaemon(true); //Đảm bảo thread kết nối server sẽ tự động kết thúc khi chương trình kết thúc
        connector.start();
    }

    @FXML
    private void onSubmit() {
        if (!gameClient.isConnected()) {
            showError("Hãy kết nối tới server trước");
            return;
        }
        if (!validateInput()) {
            return;
        }
        String username = usernameField.getText().trim();
        String password = passwordField.getText();
        setWaiting(loginMode ? "Đang đăng nhập..." : "Đang tạo tài khoản...");
        if (loginMode) {
            gameClient.login(username, password);
        } else {
            gameClient.register(username, password);
        }
    }

    @FXML
    private void onToggleMode() {
        setMode(!loginMode);
        passwordField.clear();
        confirmPasswordField.clear();
        showStatus(gameClient.isConnected()
                ? "Bạn có thể đăng nhập hoặc đăng ký"
                : "Hãy kết nối server trước khi đăng nhập");
    }

    private boolean validateInput() {
        String username = usernameField.getText().trim();
        String password = passwordField.getText();
        if (!username.matches("[a-zA-Z0-9_]{3,20}")) {
            showError("Username gồm 3-20 chữ, số hoặc dấu gạch dưới");
            return false;
        }
        if (password.length() < 4) {
            showError("Mật khẩu phải có ít nhất 4 ký tự");
            return false;
        }
        if (!loginMode && !password.equals(confirmPasswordField.getText())) {
            showError("Mật khẩu xác nhận không khớp");
            return false;
        }
        return true;
    }

    private void handleServerMessage(Message message) {
        switch (message.getType()) {
            case LOGIN_OK -> app.showMatchmaking(parsePlayer(message.getPayload()));
            case REGISTER_OK -> {
                setMode(true);
                passwordField.clear();
                confirmPasswordField.clear();
                showSuccess("Đăng ký thành công. Hãy đăng nhập tài khoản mới.");
                setSubmitDisabled(false);
            }
            case LOGIN_FAIL, REGISTER_FAIL -> {
                showError(toVietnameseError(message.payloadText()));
                setSubmitDisabled(false);
            }
            case QUIZ_REJOINED -> {
                Payloads.QuizRejoinData rejoin = Payloads.fromJson(
                        message.getPayload(), Payloads.QuizRejoinData.class);
                if (rejoin.running()) {
                    app.showQuizBattle(new Payloads.QuizRoomStarted(
                            rejoin.lobby().pin(), rejoin.lobby().title(),
                            rejoin.remainingSeconds(), rejoin.playing(),
                            rejoin.lobby().currentUserHost()));
                } else {
                    app.showQuizLobby(rejoin.lobby());
                }
            }
            case QUIZ_QUESTION, QUIZ_LEADERBOARD, QUIZ_ROOM_FINISHED ->
                    gameClient.redispatch(message);
            default -> {
                // Auth screen không xử lý message gameplay.
            }
        }
    }

    private Player parsePlayer(JsonNode payload) {
        Payloads.PlayerStats values = Payloads.parsePlayer(payload);
        return new Player(
                values.id(), values.username(), values.wins(), values.losses(),
                values.draws(), values.totalScore(),
                values.questionsAnswered(), values.correctAnswers()
        );
    }

    private String toVietnameseError(String reason) {
        return switch (reason) {
            case "USERNAME_TAKEN" -> "Username đã được sử dụng";
            case "INVALID_CREDENTIALS" -> "Sai username hoặc mật khẩu";
            case "BAD_REQUEST" -> "Thông tin đăng nhập không hợp lệ";
            case "DATABASE_ERROR" -> "Server không thể truy cập database";
            default -> "Đăng nhập/đăng ký thất bại";
        };
    }

    private void setWaiting(String message) {
        showStatus(message);
        setSubmitDisabled(true);
    }

    private void setMode(boolean loginMode) {
        this.loginMode = loginMode;
        authTitle.setText(loginMode ? "ĐĂNG NHẬP" : "TẠO TÀI KHOẢN");
        authSubtitle.setText(loginMode
                ? "Chào mừng bạn quay lại"
                : "Đăng ký tài khoản NihongoQuest mới");
        submitButton.setText(loginMode ? "ĐĂNG NHẬP" : "ĐĂNG KÝ");
        modePromptLabel.setText(loginMode ? "Chưa có tài khoản?" : "Đã có tài khoản?");
        modeLink.setText(loginMode ? "Đăng ký" : "Đăng nhập");
        confirmPasswordField.setVisible(!loginMode);
        confirmPasswordField.setManaged(!loginMode);
    }

    private void setSubmitDisabled(boolean disabled) {
        submitButton.setDisable(disabled);
    }

    private void setConnectionControlsDisabled(boolean disabled) {
        serverHostField.setDisable(disabled);
        serverPortField.setDisable(disabled);
        connectButton.setDisable(disabled);
    }

    private void showConnectionSuccess(String message) {
        showConnectionStatus(message, "status-success");
    }

    private void showConnectionError(String message) {
        showConnectionStatus(message, "status-error");
    }

    private void showConnectionStatus(String message, String styleClass) {
        connectionStatusLabel.setText(message);
        connectionStatusLabel.getStyleClass().removeAll("status-success", "status-error");
        if (styleClass != null) {
            connectionStatusLabel.getStyleClass().add(styleClass);
        }
    }

    private void showStatus(String message) {
        setStatus(message, null);
    }

    private void showSuccess(String message) {
        setStatus(message, "status-success");
    }

    private void showError(String message) {
        setStatus(message, "status-error");
    }

    private void setStatus(String message, String styleClass) {
        statusLabel.setText(message);
        statusLabel.getStyleClass().removeAll("status-success", "status-error");
        if (styleClass != null) {
            statusLabel.getStyleClass().add(styleClass);
        }
    }
}
</file>

<file path="src/main/java/com/nihongoquest/client/network/ServerListener.java">
package com.nihongoquest.client.network;

import com.nihongoquest.common.protocol.Message;

import java.io.IOException;

/**
 * ServerListener chạy trên thread riêng để nhận message từ Server.
 * Không được chạy vòng lặp nhận dữ liệu trên JavaFX Application Thread
 * vì read() có thể block giao diện.
 *
 * Sau khi nhận dữ liệu, class này sẽ chuyển cho GameClient / Controller xử lý.
 */
public class ServerListener implements Runnable {

    private final GameClient gameClient;
    private volatile boolean running;

    public ServerListener(GameClient gameClient) {
        this.gameClient = gameClient;
        this.running = false;
    }

    @Override
    public void run() {
        running = true;
        while (running) {
            try {
                Message message = gameClient.read();
                if (message == null) {
                    if (running) {
                        gameClient.connectionLost("Server đã đóng kết nối");
                    }
                    break;
                }
                gameClient.receive(message);
            } catch (IOException | IllegalArgumentException e) {
                if (running) {
                    gameClient.connectionLost("Mất kết nối: " + e.getMessage());
                }
                break;
            }
        }
        running = false;
    }

    public void stop() {
        running = false;
    }
}
</file>

<file path="src/main/java/com/nihongoquest/common/protocol/MessageType.java">
package com.nihongoquest.common.protocol;

/**
 * MessageType định nghĩa các loại message trao đổi giữa client và server.
 */
public enum MessageType {
    CONNECT,
    REGISTER,
    REGISTER_OK,
    REGISTER_FAIL,
    LOGIN,
    LOGIN_OK,
    LOGIN_FAIL,
    PROFILE_GET,
    PROFILE_DATA,
    LEADERBOARD_GET,
    LEADERBOARD_DATA,
    MATCH_HISTORY_GET,
    MATCH_HISTORY_DATA,
    QUERY_ERROR,
    USER_SEARCH,
    USER_SEARCH_RESULT,
    FRIEND_REQUEST_SEND,
    FRIEND_REQUEST_SENT,
    FRIEND_REQUEST_LIST,
    FRIEND_REQUEST_RESPOND,
    FRIEND_LIST,
    FRIEND_REMOVE,
    FRIEND_REMOVED,
    PRESENCE_UPDATE,
    GAME_INVITE_SEND,
    GAME_INVITE_RECEIVED,
    GAME_INVITE_RESPOND,
    GAME_INVITE_STATUS,
    SOCIAL_ERROR,
    FIND_MATCH,
    CANCEL_MATCH,
    WAITING,
    MATCH_CANCELLED,
    MATCH_ERROR,
    MATCH_FOUND,
    QUESTION,
    ANSWER,
    ANSWER_RESULT,
    SCORE_UPDATE,
    GAME_OVER,
    QUIZ_SET_LIST,
    QUIZ_SET_LIST_RESULT,
    QUIZ_SET_GET,
    QUIZ_SET_DETAIL,
    QUIZ_SET_SAVE,
    QUIZ_SET_SAVED,
    QUIZ_SET_PUBLISH,
    QUIZ_SET_PUBLISHED,
    QUIZ_SET_DELETE,
    QUIZ_SET_DELETED,
    QUIZ_SET_ERROR,
    QUIZ_ROOM_CREATE,
    QUIZ_ROOM_CREATED,
    QUIZ_ROOM_JOIN,
    QUIZ_LOBBY_UPDATE,
    QUIZ_ROOM_START,
    QUIZ_QUESTION,
    QUIZ_ANSWER,
    QUIZ_ANSWER_RESULT,
    QUIZ_LEADERBOARD,
    QUIZ_ROOM_LEAVE,
    QUIZ_ROOM_CANCEL,
    QUIZ_REJOINED,
    QUIZ_ROOM_FINISHED,
    QUIZ_ERROR,
    DISCONNECT
}
</file>

<file path="src/main/java/com/nihongoquest/server/ranked/MatchmakingManager.java">
package com.nihongoquest.server.ranked;

import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.server.network.ClientHandler;
import com.nihongoquest.server.question.Question;
import com.nihongoquest.server.question.QuestionService;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ScheduledExecutorService;
import java.util.logging.Level;
import java.util.logging.Logger;

/** Ghép riêng người chọn cùng chế độ 3 phút hoặc 5 phút. */
public class MatchmakingManager {
    private static final Logger LOGGER = Logger.getLogger(MatchmakingManager.class.getName());

    private final Map<Integer, Deque<ClientHandler>> queues = Map.of(
            GameRoom.THREE_MINUTES, new ArrayDeque<>(),
            GameRoom.FIVE_MINUTES, new ArrayDeque<>());
    private final QuestionService questionService;
    private final MatchRepository matchRepository;
    private final ScheduledExecutorService scheduler;

    public MatchmakingManager(QuestionService questionService, MatchRepository matchRepository,
                              ScheduledExecutorService scheduler) {
        this.questionService = Objects.requireNonNull(questionService);
        this.matchRepository = Objects.requireNonNull(matchRepository);
        this.scheduler = Objects.requireNonNull(scheduler);
    }

    public synchronized void enqueue(ClientHandler client, int durationSeconds) {
        if (!client.isAuthenticated()) {
            client.send(new Message(MessageType.MATCH_ERROR, "NOT_AUTHENTICATED"));
            return;
        }
        if (!queues.containsKey(durationSeconds)) {
            client.send(new Message(MessageType.MATCH_ERROR, "INVALID_DURATION"));
            return;
        }
        if (client.getCurrentRoom() != null || client.getCurrentQuizRoom() != null) {
            client.send(new Message(MessageType.MATCH_ERROR, "ALREADY_MATCHED"));
            return;
        }
        if (client.isQueued()) {
            client.send(new Message(MessageType.MATCH_ERROR, "ALREADY_WAITING"));
            return;
        }

        queues.get(durationSeconds).offerLast(client);
        client.setQueued(true);
        client.send(new Message(MessageType.WAITING, ""));
        LOGGER.info(client.getUsername() + " đã vào hàng chờ " + durationSeconds
                + " giây. Hiện có: " + queues.get(durationSeconds).size());
        tryCreateMatch(durationSeconds);
    }

    public synchronized void dequeue(ClientHandler client) {
        if (client.getCurrentRoom() != null) {
            client.send(new Message(MessageType.MATCH_ERROR, "ALREADY_MATCHED"));
            return;
        }
        removeFromQueue(client);
        client.send(new Message(MessageType.MATCH_CANCELLED, ""));
    }

    public synchronized void tryCreateMatch(int durationSeconds) {
        Deque<ClientHandler> queue = queues.get(durationSeconds);
        if (queue == null) return;
        while (true) {
            ClientHandler player1 = pollValidClient(queue);
            if (player1 == null) return;
            ClientHandler player2 = pollValidClient(queue);
            if (player2 == null) {
                queue.addFirst(player1);
                return;
            }

            player1.setQueued(false);
            player2.setQueued(false);
            if (Objects.equals(player1.getPlayerId(), player2.getPlayerId())) {
                player1.send(new Message(MessageType.MATCH_ERROR, "SAME_USER"));
                player2.send(new Message(MessageType.MATCH_ERROR, "SAME_USER"));
                continue;
            }
            List<Question> questions;
            try {
                questions = questionService.getRankedQuestionsUpTo(null,
                        GameRoom.MAX_QUESTION_POOL, GameRoom.MIN_QUESTION_POOL);
            } catch (IllegalStateException e) {
                LOGGER.log(Level.WARNING, "Không thể tạo trận: lỗi ngân hàng câu hỏi", e);
                player1.send(new Message(MessageType.MATCH_ERROR, "QUESTIONS_UNAVAILABLE"));
                player2.send(new Message(MessageType.MATCH_ERROR, "QUESTIONS_UNAVAILABLE"));
                continue;
            }
            GameRoom room = new GameRoom(UUID.randomUUID().toString(), player1, player2,
                    questions, durationSeconds, matchRepository, scheduler);
            LOGGER.info("Đã tạo room " + room.getRoomId() + " (" + durationSeconds + " giây): "
                    + player1.getUsername() + " vs " + player2.getUsername());
            room.start();
        }
    }

    /** Tạo ngay một trận do lời mời bạn bè, không đi qua hàng chờ. */
    public synchronized void createDirectMatch(ClientHandler inviter, ClientHandler target,
                                               int durationSeconds) {
        if (!queues.containsKey(durationSeconds)) {
            throw new IllegalStateException("INVALID_DURATION");
        }
        if (!isAvailable(inviter) || !isAvailable(target)) {
            throw new IllegalStateException("TARGET_BUSY");
        }
        if (Objects.equals(inviter.getPlayerId(), target.getPlayerId())) {
            throw new IllegalStateException("SAME_USER");
        }
        List<Question> questions;
        try {
            questions = questionService.getRankedQuestionsUpTo(null,
                    GameRoom.MAX_QUESTION_POOL, GameRoom.MIN_QUESTION_POOL);
        } catch (IllegalStateException e) {
            throw new IllegalStateException("QUESTIONS_UNAVAILABLE", e);
        }
        GameRoom room = new GameRoom(UUID.randomUUID().toString(), inviter, target,
                questions, durationSeconds, matchRepository, scheduler);
        LOGGER.info("Tạo trận mời trực tiếp: " + inviter.getUsername()
                + " vs " + target.getUsername());
        room.start();
    }

    public synchronized void disconnect(ClientHandler client) {
        removeFromQueue(client);
    }

    private ClientHandler pollValidClient(Deque<ClientHandler> queue) {
        while (!queue.isEmpty()) {
            ClientHandler client = queue.pollFirst();
            if (client.isConnected() && client.isAuthenticated()
                    && client.getCurrentRoom() == null
                    && client.getCurrentQuizRoom() == null) {
                return client;
            }
            client.setQueued(false);
        }
        return null;
    }

    private boolean isAvailable(ClientHandler client) {
        return client != null && client.isConnected() && client.isAuthenticated()
                && !client.isQueued() && client.getCurrentRoom() == null
                && client.getCurrentQuizRoom() == null;
    }

    private void removeFromQueue(ClientHandler client) {
        boolean removed = queues.values().stream().anyMatch(queue -> queue.remove(client));
        if (removed) {
            client.setQueued(false);
            LOGGER.info(client.getUsername() + " đã rời hàng chờ. Còn lại: " + getWaitingCount());
        }
    }

    public synchronized int getWaitingCount() {
        return queues.values().stream().mapToInt(Deque::size).sum();
    }
}
</file>

<file path="src/main/resources/client/shared/style.css">
.root {
    -fx-font-family: "Segoe UI", "Arial", sans-serif;
    -fx-font-size: 14px;
    -fx-background-color: #f5f7fa;
}

.title {
    -fx-font-size: 28px;
    -fx-font-weight: bold;
    -fx-text-fill: #1a365d;
}

.button {
    -fx-background-color: #2b6cb0;
    -fx-text-fill: white;
    -fx-font-size: 14px;
    -fx-padding: 10 20 10 20;
    -fx-background-radius: 8px;
    -fx-cursor: hand;
}

.button:hover {
    -fx-background-color: #2c5282;
}

.button:pressed {
    -fx-background-color: #1a365d;
}

.label {
    -fx-text-fill: #2d3748;
}

.status-label {
    -fx-text-fill: #4a5568;
    -fx-alignment: center;
    -fx-min-height: 24px;
}

.auth-card {
    -fx-background-color: white;
    -fx-background-radius: 12px;
    -fx-padding: 32px 40px 28px 40px;
    -fx-effect: dropshadow(gaussian, rgba(26, 54, 93, 0.15), 18, 0, 0, 4);
}

.connection-card {
    -fx-background-color: #edf2f7;
    -fx-background-radius: 12px;
    -fx-padding: 30px;
    -fx-effect: dropshadow(gaussian, rgba(26, 54, 93, 0.12), 18, 0, 0, 4);
}

.connection-title {
    -fx-font-size: 20px;
    -fx-font-weight: bold;
    -fx-text-fill: #1a365d;
}

.connection-subtitle {
    -fx-text-fill: #718096;
    -fx-padding: 0 0 6px 0;
}

.field-caption {
    -fx-font-size: 12px;
    -fx-font-weight: bold;
    -fx-text-fill: #4a5568;
}

.connection-status-label {
    -fx-text-fill: #4a5568;
    -fx-min-height: 42px;
}

.brand-title {
    -fx-font-size: 18px;
    -fx-font-weight: bold;
    -fx-text-fill: #2b6cb0;
}

.auth-title {
    -fx-font-size: 26px;
    -fx-font-weight: bold;
    -fx-text-fill: #1a365d;
}

.auth-subtitle {
    -fx-text-fill: #718096;
    -fx-padding: 0 0 8px 0;
}

.text-field,
.password-field {
    -fx-pref-height: 42px;
    -fx-background-radius: 6px;
    -fx-border-radius: 6px;
    -fx-border-color: #cbd5e0;
    -fx-background-color: #ffffff;
    -fx-padding: 0 12px;
}

.text-field:focused,
.password-field:focused {
    -fx-border-color: #2b6cb0;
    -fx-border-width: 2px;
}

.primary-button {
    -fx-font-weight: bold;
    -fx-background-radius: 6px;
}

.secondary-button {
    -fx-background-color: white;
    -fx-text-fill: #2b6cb0;
    -fx-border-color: #aac7e8;
    -fx-border-radius: 7px;
    -fx-background-radius: 7px;
}

.secondary-button:hover {
    -fx-background-color: #edf6ff;
}

.mode-link {
    -fx-text-fill: #2b6cb0;
    -fx-font-weight: bold;
    -fx-padding: 4px 0;
}

.status-success {
    -fx-text-fill: #2f855a;
}

.status-error {
    -fx-text-fill: #c53030;
}

.search-spinner {
    -fx-progress-color: #2b6cb0;
}

.answer-correct,
.answer-correct:disabled {
    -fx-background-color: #2f855a;
    -fx-text-fill: white;
    -fx-opacity: 1;
}

.answer-wrong,
.answer-wrong:disabled {
    -fx-background-color: #c53030;
    -fx-text-fill: white;
    -fx-opacity: 1;
}

.time-progress {
    -fx-accent: #2b6cb0;
    -fx-pref-height: 14px;
}

.time-label {
    -fx-font-weight: bold;
    -fx-min-width: 34px;
}

/* Shared authenticated layout */
.app-shell {
    -fx-background-color: linear-gradient(to bottom right, #f8fbff, #eef3fb);
}

.authenticated-shell,
.gameplay-shell {
    -fx-background-color: #f4f7fb;
}

.authenticated-main {
    -fx-background-color: #f4f7fb;
}

.app-sidebar {
    -fx-background-color: #0f2747;
    -fx-padding: 24px 16px 18px 16px;
}

.sidebar-brand-block {
    -fx-padding: 0 8px 18px 8px;
}

.sidebar-brand-primary,
.sidebar-brand-accent {
    -fx-font-size: 23px;
    -fx-font-weight: bold;
    -fx-text-fill: #ffffff;
}

.sidebar-brand-accent {
    -fx-text-fill: #63b3ed;
}

.sidebar-tagline {
    -fx-font-size: 9px;
    -fx-font-weight: bold;
    -fx-text-fill: #8eaccb;
    -fx-padding: 5px 0 0 0;
}

.sidebar-separator .line {
    -fx-border-color: #294563;
    -fx-border-width: 1px 0 0 0;
}

.sidebar-menu {
    -fx-padding: 16px 0;
}

.sidebar-footer {
    -fx-padding: 14px 0 0 0;
}

.sidebar-button {
    -fx-background-color: transparent;
    -fx-text-fill: #c8d7e8;
    -fx-alignment: center-left;
    -fx-font-size: 14px;
    -fx-font-weight: bold;
    -fx-padding: 12px 14px;
    -fx-background-radius: 9px;
    -fx-border-width: 0;
}

.sidebar-button:hover {
    -fx-background-color: #1d3d63;
    -fx-text-fill: #ffffff;
}

.sidebar-button.active {
    -fx-background-color: #3182ce;
    -fx-text-fill: #ffffff;
}

.sidebar-button:disabled {
    -fx-opacity: 0.48;
}

.sidebar-logout-button,
.sidebar-logout-button:hover {
    -fx-text-fill: #fecaca;
}

.sidebar-logout-button:hover {
    -fx-background-color: #5f2330;
}

.shared-page-header {
    -fx-background-color: #ffffff;
    -fx-padding: 20px 28px;
    -fx-border-color: transparent transparent #dce5f0 transparent;
    -fx-border-width: 0 0 1px 0;
}

.gameplay-header {
    -fx-background-color: #ffffff;
    -fx-padding: 16px 24px;
    -fx-border-color: transparent transparent #dce5f0 transparent;
    -fx-border-width: 0 0 1px 0;
}

.shared-page-title {
    -fx-font-size: 24px;
    -fx-font-weight: bold;
    -fx-text-fill: #163657;
}

.shared-page-subtitle {
    -fx-font-size: 13px;
    -fx-text-fill: #64748b;
}

.authenticated-content {
    -fx-background-color: #f4f7fb;
}

/* Home */
.home-page {
    -fx-background-color: linear-gradient(to bottom right, #f7fbff, #eaf2fb);
    -fx-padding: 48px;
}

.home-hero {
    -fx-background-color: rgba(255, 255, 255, 0.94);
    -fx-background-radius: 18px;
    -fx-border-color: #dce8f5;
    -fx-border-radius: 18px;
    -fx-padding: 48px;
    -fx-effect: dropshadow(gaussian, rgba(15, 39, 71, 0.12), 24, 0, 0, 7);
}

.home-eyebrow,
.profile-eyebrow {
    -fx-font-size: 12px;
    -fx-font-weight: bold;
    -fx-text-fill: #3182ce;
}

.home-hero-title {
    -fx-font-size: 38px;
    -fx-font-weight: bold;
    -fx-text-fill: #0f2747;
}

.home-hero-subtitle {
    -fx-font-size: 16px;
    -fx-line-spacing: 4px;
    -fx-text-fill: #58708b;
}

.home-cta-button {
    -fx-font-size: 15px;
    -fx-padding: 14px 32px;
    -fx-background-radius: 9px;
}

.home-orb {
    -fx-opacity: 0.12;
}

.home-orb-primary {
    -fx-fill: #3182ce;
}

.home-orb-secondary {
    -fx-fill: #0f2747;
}

/* Profile */
.profile-page {
    -fx-padding: 28px 36px;
    -fx-background-color: #f4f7fb;
}

.profile-hero,
.accuracy-card {
    -fx-background-color: #ffffff;
    -fx-background-radius: 14px;
    -fx-border-color: #dde7f1;
    -fx-border-radius: 14px;
    -fx-padding: 24px;
    -fx-max-width: 820px;
}

.profile-page-avatar {
    -fx-background-color: linear-gradient(to bottom right, #3182ce, #1f5f9f);
    -fx-background-radius: 999px;
    -fx-min-width: 84px;
    -fx-min-height: 84px;
    -fx-pref-width: 84px;
    -fx-pref-height: 84px;
}

.profile-page-avatar-text {
    -fx-font-size: 32px;
    -fx-font-weight: bold;
    -fx-text-fill: #ffffff;
}

.profile-page-username {
    -fx-font-size: 26px;
    -fx-font-weight: bold;
    -fx-text-fill: #0f2747;
}

.profile-stats-grid {
    -fx-max-width: 820px;
}

.profile-stat-card {
    -fx-background-color: #ffffff;
    -fx-background-radius: 12px;
    -fx-border-color: #dde7f1;
    -fx-border-radius: 12px;
    -fx-padding: 20px 14px;
}

.profile-stat-value {
    -fx-font-size: 27px;
    -fx-font-weight: bold;
    -fx-text-fill: #2b6cb0;
}

.accuracy-card {
    -fx-max-width: 772px;
}

.accuracy-value {
    -fx-font-size: 34px;
    -fx-font-weight: bold;
    -fx-text-fill: #6b46c1;
    -fx-min-width: 100px;
}

.page-action-row {
    -fx-padding: 0 0 4px 0;
}

.tab-content {
    -fx-padding: 18px;
}

.app-header {
    -fx-background-color: rgba(255, 255, 255, 0.96);
    -fx-padding: 16px 28px;
    -fx-border-color: transparent transparent #dbe5f1 transparent;
    -fx-border-width: 0 0 1px 0;
    -fx-effect: dropshadow(gaussian, rgba(26, 54, 93, 0.08), 12, 0, 0, 2);
}

.app-brand {
    -fx-font-size: 12px;
    -fx-font-weight: bold;
    -fx-text-fill: #3182ce;
}

.header-page-title {
    -fx-font-size: 21px;
    -fx-font-weight: bold;
    -fx-text-fill: #183b66;
}

.page-content {
    -fx-padding: 30px 40px 36px 40px;
}

/* Home */
.welcome-title {
    -fx-font-size: 30px;
    -fx-font-weight: bold;
    -fx-text-fill: #183b66;
}

.welcome-subtitle {
    -fx-font-size: 15px;
    -fx-text-fill: #718096;
}

.stat-card {
    -fx-background-color: white;
    -fx-background-radius: 12px;
    -fx-border-color: #e2e8f0;
    -fx-border-radius: 12px;
    -fx-padding: 18px 16px;
    -fx-min-width: 165px;
    -fx-effect: dropshadow(gaussian, rgba(26, 54, 93, 0.08), 12, 0, 0, 3);
}

.stat-value {
    -fx-font-size: 28px;
    -fx-font-weight: bold;
    -fx-text-fill: #2b6cb0;
}

.stat-win { -fx-text-fill: #2f855a; }
.stat-loss { -fx-text-fill: #c53030; }
.stat-correct { -fx-text-fill: #6b46c1; }

.stat-caption {
    -fx-font-size: 11px;
    -fx-font-weight: bold;
    -fx-text-fill: #718096;
}

.action-card {
    -fx-background-color: linear-gradient(to right, #e8f2ff, #f0edff);
    -fx-background-radius: 14px;
    -fx-border-color: #d6e5fa;
    -fx-border-radius: 14px;
    -fx-padding: 22px 42px;
    -fx-min-width: 700px;
}

.action-title {
    -fx-font-size: 20px;
    -fx-font-weight: bold;
    -fx-text-fill: #1a365d;
}

.action-subtitle {
    -fx-text-fill: #5f6f85;
}

.large-button {
    -fx-font-size: 15px;
    -fx-padding: 12px 24px;
    -fx-background-radius: 9px;
}

/* Matchmaking */
.search-card {
    -fx-background-color: white;
    -fx-background-radius: 16px;
    -fx-border-color: #e2e8f0;
    -fx-border-radius: 16px;
    -fx-padding: 34px 54px;
    -fx-min-width: 520px;
    -fx-effect: dropshadow(gaussian, rgba(26, 54, 93, 0.12), 18, 0, 0, 5);
}

.search-title {
    -fx-font-size: 25px;
    -fx-font-weight: bold;
    -fx-text-fill: #183b66;
}

.search-user {
    -fx-font-size: 14px;
    -fx-text-fill: #4a5568;
}

.spinner-ring {
    -fx-padding: 10px;
}

.search-status {
    -fx-font-size: 15px;
    -fx-font-weight: bold;
}

.helper-text {
    -fx-font-size: 12px;
    -fx-text-fill: #8290a3;
    -fx-text-alignment: center;
}

.danger-outline-button {
    -fx-background-color: transparent;
    -fx-text-fill: #c53030;
    -fx-border-color: #feb2b2;
    -fx-border-radius: 8px;
    -fx-background-radius: 8px;
    -fx-font-weight: bold;
}

.danger-outline-button:hover {
    -fx-background-color: #fff5f5;
    -fx-text-fill: #9b2c2c;
}

/* Battle */
.battle-content {
    -fx-padding: 20px 38px 28px 38px;
}

.scoreboard-card {
    -fx-background-color: #183b66;
    -fx-background-radius: 14px;
    -fx-padding: 14px 34px;
    -fx-min-width: 760px;
    -fx-max-width: 800px;
}

.player-panel {
    -fx-min-width: 210px;
}

.player-role, .score-caption, .timer-caption {
    -fx-font-size: 10px;
    -fx-font-weight: bold;
    -fx-text-fill: #93b5da;
}

.player-name {
    -fx-font-size: 18px;
    -fx-font-weight: bold;
    -fx-text-fill: white;
}

.score-panel {
    -fx-min-width: 150px;
}

.score-value {
    -fx-font-size: 30px;
    -fx-font-weight: bold;
    -fx-text-fill: #90cdf4;
}

.match-time-label {
    -fx-font-size: 13px;
    -fx-font-weight: bold;
    -fx-text-fill: #fbd38d;
}

.question-card {
    -fx-background-color: white;
    -fx-background-radius: 14px;
    -fx-border-color: #e2e8f0;
    -fx-border-radius: 14px;
    -fx-padding: 18px 24px;
    -fx-min-width: 760px;
    -fx-max-width: 800px;
}

.timer-caption {
    -fx-text-fill: #718096;
}

.battle-question {
    -fx-font-size: 21px;
    -fx-font-weight: bold;
    -fx-text-fill: #1a365d;
    -fx-text-alignment: center;
    -fx-alignment: center;
    -fx-min-height: 68px;
}

.answer-grid {
    -fx-padding: 2px 0 0 0;
}

.answer-button {
    -fx-background-color: white;
    -fx-text-fill: #23466f;
    -fx-border-color: #cbd9ea;
    -fx-border-radius: 10px;
    -fx-background-radius: 10px;
    -fx-font-size: 15px;
    -fx-font-weight: bold;
    -fx-padding: 16px 18px;
    -fx-min-height: 58px;
}

.answer-button:hover {
    -fx-background-color: #edf6ff;
    -fx-border-color: #63b3ed;
}

.answer-button:disabled {
    -fx-opacity: 0.58;
}

.answer-button.answer-correct,
.answer-button.answer-correct:disabled {
    -fx-background-color: #2f855a;
    -fx-border-color: #2f855a;
    -fx-text-fill: white;
    -fx-opacity: 1;
}

.answer-button.answer-wrong,
.answer-button.answer-wrong:disabled {
    -fx-background-color: #c53030;
    -fx-border-color: #c53030;
    -fx-text-fill: white;
    -fx-opacity: 1;
}

/* Result */
.result-card {
    -fx-background-color: white;
    -fx-background-radius: 18px;
    -fx-border-color: #e2e8f0;
    -fx-border-radius: 18px;
    -fx-padding: 38px 70px;
    -fx-min-width: 560px;
    -fx-effect: dropshadow(gaussian, rgba(26, 54, 93, 0.13), 20, 0, 0, 6);
}

.result-eyebrow {
    -fx-font-size: 11px;
    -fx-font-weight: bold;
    -fx-text-fill: #718096;
}

.result-title {
    -fx-font-size: 34px;
    -fx-font-weight: bold;
    -fx-text-fill: #1a365d;
}

.result-win { -fx-text-fill: #2f855a; }
.result-lose { -fx-text-fill: #c53030; }
.result-draw { -fx-text-fill: #b7791f; }

.result-score {
    -fx-font-size: 42px;
    -fx-font-weight: bold;
    -fx-text-fill: #183b66;
}

.result-opponent {
    -fx-font-size: 15px;
    -fx-text-fill: #4a5568;
    -fx-padding: 0 0 8px 0;
}

/* Quiz set management */
.quiz-list {
    -fx-background-color: white;
    -fx-border-color: #dbe5f1;
    -fx-border-radius: 10px;
    -fx-background-radius: 10px;
}

.quiz-list .list-cell,
.quiz-side-panel .list-cell {
    -fx-padding: 12px;
    -fx-cell-size: 58px;
}

.quiz-editor-split {
    -fx-padding: 18px 24px;
    -fx-background-color: transparent;
}

.quiz-side-panel,
.quiz-form {
    -fx-background-color: white;
    -fx-padding: 18px;
}

.quiz-editor-scroll {
    -fx-background-color: white;
    -fx-border-color: transparent;
}

.section-title {
    -fx-font-size: 17px;
    -fx-font-weight: bold;
    -fx-text-fill: #1a365d;
}

.editor-footer {
    -fx-background-color: white;
    -fx-border-color: #dbe5f1 transparent transparent transparent;
    -fx-padding: 12px 24px;
}

/* Multiplayer Quiz Room */
.quiz-room-card {
    -fx-background-color: white;
    -fx-background-radius: 14px;
    -fx-border-color: #dbe5f1;
    -fx-border-radius: 14px;
    -fx-padding: 26px;
    -fx-min-width: 410px;
    -fx-min-height: 300px;
    -fx-effect: dropshadow(gaussian, rgba(26, 54, 93, 0.10), 14, 0, 0, 4);
}

.pin-input {
    -fx-font-size: 26px;
    -fx-font-weight: bold;
    -fx-alignment: center;
}

.lobby-pin {
    -fx-font-size: 25px;
    -fx-font-weight: bold;
    -fx-text-fill: #2b6cb0;
}

.quiz-room-time {
    -fx-font-size: 22px;
    -fx-font-weight: bold;
    -fx-text-fill: #b7791f;
}
</file>

<file path="src/main/java/com/nihongoquest/client/home/HomeController.java">
package com.nihongoquest.client.home;

import com.nihongoquest.client.ClientApp;
import com.nihongoquest.client.network.GameClient;
import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.scene.control.Button;

/**
 * HomeController xử lý CTA duy nhất trên màn hình chính.
 * Không tạo Socket trực tiếp trong Controller.
 */
public class HomeController {
    @FXML
    private Button findMatchButton;

    private GameClient gameClient;
    private ClientApp app;

    public void setSession(ClientApp app, GameClient gameClient) {
        this.app = app;
        this.gameClient = gameClient;
        gameClient.setMessageHandler(message -> { });
    }

    /**
     * Xử lý khi người dùng bấm "TÌM TRẬN".
     */
    @FXML
    private void onFindMatch(ActionEvent event) {
        findMatchButton.setDisable(true);
        app.showMatchmaking();
    }

}
</file>

<file path="src/main/java/com/nihongoquest/server/network/ServerRequestRouter.java">
package com.nihongoquest.server.network;

import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.server.player.PlayerRepository;
import com.nihongoquest.server.player.PlayerRepository.AuthResult;
import com.nihongoquest.server.friend.SocialException;
import com.nihongoquest.server.friend.SocialService;
import com.nihongoquest.server.ranked.GameRoom;
import com.nihongoquest.server.ranked.MatchRepository;
import com.nihongoquest.server.ranked.MatchmakingManager;
import com.nihongoquest.server.quiz.QuizSetException;
import com.nihongoquest.server.quiz.QuizSetService;
import com.nihongoquest.server.quizroom.QuizRoomException;
import com.nihongoquest.server.quizroom.QuizRoomManager;

import java.sql.SQLException;
import java.util.regex.Pattern;
import java.util.logging.Logger;

/** Switch giao thức duy nhất phía server; nghiệp vụ được chuyển cho manager/repository. */
public class ServerRequestRouter {
    private static final Logger LOGGER = Logger.getLogger(ServerRequestRouter.class.getName());
    private static final Pattern USERNAME_PATTERN = Pattern.compile("[a-zA-Z0-9_]{3,20}");

    private final MatchmakingManager matchmaking;
    private final PlayerRepository players;
    private final OnlineUserRegistry onlineUsers;
    private final MatchRepository matches;
    private final SocialService social;
    private final QuizSetService quizSets;
    private final QuizRoomManager quizRooms;

    public ServerRequestRouter(MatchmakingManager matchmaking, PlayerRepository players,
                               OnlineUserRegistry onlineUsers, MatchRepository matches,
                               QuizSetService quizSets,
                               QuizRoomManager quizRooms, SocialService social) {
        this.matchmaking = matchmaking;
        this.players = players;
        this.onlineUsers = onlineUsers;
        this.matches = matches;
        this.social = social;
        this.quizSets = quizSets;
        this.quizRooms = quizRooms;
    }

    public void handle(ClientHandler client, Message message) {
        switch (message.getType()) {
            case REGISTER -> authenticate(client, message, true);
            case LOGIN -> authenticate(client, message, false);
            case PROFILE_GET -> handleProfileGet(client);
            case LEADERBOARD_GET -> handleLeaderboardGet(client);
            case MATCH_HISTORY_GET -> handleMatchHistoryGet(client);
            case USER_SEARCH -> handleUserSearch(client, message);
            case FRIEND_REQUEST_SEND -> handleFriendRequestSend(client, message);
            case FRIEND_REQUEST_LIST -> handleSocialAction(client, () -> social.sendRequests(client));
            case FRIEND_REQUEST_RESPOND -> handleFriendRequestRespond(client, message);
            case FRIEND_LIST -> handleSocialAction(client, () -> social.sendFriendList(client));
            case FRIEND_REMOVE -> handleFriendRemove(client, message);
            case GAME_INVITE_SEND -> handleGameInviteSend(client, message);
            case GAME_INVITE_RESPOND -> handleGameInviteRespond(client, message);
            case FIND_MATCH -> handleFindMatch(client, message);
            case CANCEL_MATCH -> matchmaking.dequeue(client);
            case ANSWER -> handleAnswer(client, message);
            case QUIZ_SET_LIST -> handleQuizSetList(client, message);
            case QUIZ_SET_GET -> handleQuizSetGet(client, message);
            case QUIZ_SET_SAVE -> handleQuizSetSave(client, message);
            case QUIZ_SET_PUBLISH -> handleQuizSetPublish(client, message);
            case QUIZ_SET_DELETE -> handleQuizSetDelete(client, message);
            case QUIZ_ROOM_CREATE -> handleQuizRoomCreate(client, message);
            case QUIZ_ROOM_JOIN -> handleQuizRoomJoin(client, message);
            case QUIZ_ROOM_START -> handleQuizAction(client, quizRooms::start);
            case QUIZ_ANSWER -> handleQuizAnswer(client, message);
            case QUIZ_ROOM_LEAVE -> handleQuizAction(client, quizRooms::leave);
            case QUIZ_ROOM_CANCEL -> handleQuizAction(client, quizRooms::cancel);
            case DISCONNECT -> client.close();
            case CONNECT -> client.reportActivity("TCP client sẵn sàng: " + client.getRemoteAddress());
            default -> LOGGER.fine("Chưa xử lý type=" + message.getType());
        }
    }

    private void handleProfileGet(ClientHandler client) {
        if (!requireQueryLogin(client)) return;
        try {
            client.send(new Message(MessageType.PROFILE_DATA,
                    players.findProfile(client.getPlayerId()).toPayload()));
        } catch (SQLException e) {
            databaseQueryError(client, e);
        }
    }

    private void handleLeaderboardGet(ClientHandler client) {
        if (!requireQueryLogin(client)) return;
        try {
            var entries = players.findLeaderboard(10).stream()
                    .map(player -> new Payloads.LeaderboardEntry(
                            player.rank(), player.userId(), player.username(), player.wins(),
                            player.losses(), player.draws(), player.totalScore()))
                    .toList();
            client.send(new Message(MessageType.LEADERBOARD_DATA,
                    Payloads.toJson(new Payloads.LeaderboardData(entries))));
        } catch (SQLException e) {
            databaseQueryError(client, e);
        }
    }

    private void handleMatchHistoryGet(ClientHandler client) {
        if (!requireQueryLogin(client)) return;
        try {
            var entries = matches.findHistory(client.getPlayerId(), 100).stream()
                    .map(match -> new Payloads.MatchHistoryEntry(
                            match.matchId(), match.opponentUsername(), match.myScore(),
                            match.opponentScore(), match.result(), match.durationSeconds(),
                            match.endReason(), match.playedAt()))
                    .toList();
            client.send(new Message(MessageType.MATCH_HISTORY_DATA,
                    Payloads.toJson(new Payloads.MatchHistoryData(entries))));
        } catch (SQLException e) {
            databaseQueryError(client, e);
        }
    }

    private boolean requireQueryLogin(ClientHandler client) {
        if (client.isAuthenticated()) return true;
        client.send(new Message(MessageType.QUERY_ERROR, "NOT_AUTHENTICATED"));
        return false;
    }

    private void databaseQueryError(ClientHandler client, SQLException error) {
        LOGGER.warning("Loi database khi truy van: " + error.getMessage());
        client.send(new Message(MessageType.QUERY_ERROR, "DATABASE_ERROR"));
    }

    private void handleUserSearch(ClientHandler client, Message message) {
        handleSocial(client, () -> social.search(client, Payloads.fromJson(
                message.getPayload(), Payloads.UserSearchRequest.class)));
    }

    private void handleFriendRequestSend(ClientHandler client, Message message) {
        handleSocial(client, () -> social.sendFriendRequest(client, Payloads.fromJson(
                message.getPayload(), Payloads.FriendTarget.class).userId()));
    }

    private void handleFriendRequestRespond(ClientHandler client, Message message) {
        handleSocial(client, () -> social.respondRequest(client, Payloads.fromJson(
                message.getPayload(), Payloads.FriendRequestReply.class)));
    }

    private void handleFriendRemove(ClientHandler client, Message message) {
        handleSocial(client, () -> social.removeFriend(client, Payloads.fromJson(
                message.getPayload(), Payloads.FriendTarget.class).userId()));
    }

    private void handleGameInviteSend(ClientHandler client, Message message) {
        handleSocial(client, () -> social.sendGameInvite(client, Payloads.fromJson(
                message.getPayload(), Payloads.GameInviteSend.class)));
    }

    private void handleGameInviteRespond(ClientHandler client, Message message) {
        handleSocial(client, () -> social.respondGameInvite(client, Payloads.fromJson(
                message.getPayload(), Payloads.GameInviteRespond.class)));
    }

    private void handleSocialAction(ClientHandler client, SqlAction action) {
        handleSocial(client, action);
    }

    private void handleSocial(ClientHandler client, SqlAction action) {
        if (!client.isAuthenticated()) {
            sendSocialError(client, "NOT_AUTHENTICATED");
            return;
        }
        try {
            action.run();
        } catch (SocialException e) {
            sendSocialError(client, e.getCode());
        } catch (IllegalArgumentException | NullPointerException e) {
            sendSocialError(client, "BAD_REQUEST");
        } catch (SQLException e) {
            LOGGER.warning("Loi database social: " + e.getMessage());
            sendSocialError(client, "DATABASE_ERROR");
        }
    }

    private void sendSocialError(ClientHandler client, String code) {
        client.send(new Message(MessageType.SOCIAL_ERROR, code));
    }

    @FunctionalInterface
    private interface SqlAction {
        void run() throws SQLException;
    }

    private void handleQuizSetList(ClientHandler client, Message message) {
        if (!requireLogin(client)) return;
        try {
            Payloads.QuizSetListRequest request = Payloads.fromJson(
                    message.getPayload(), Payloads.QuizSetListRequest.class);
            client.send(new Message(MessageType.QUIZ_SET_LIST_RESULT,
                    Payloads.toJson(quizSets.list(client.getPlayerId(), request.scope()))));
        } catch (QuizSetException e) {
            sendQuizError(client, e.getCode());
        } catch (IllegalArgumentException e) {
            sendQuizError(client, "BAD_REQUEST");
        } catch (SQLException e) {
            databaseQuizError(client, e);
        }
    }

    private void handleQuizSetGet(ClientHandler client, Message message) {
        if (!requireLogin(client)) return;
        try {
            Payloads.QuizSetId request = Payloads.fromJson(
                    message.getPayload(), Payloads.QuizSetId.class);
            client.send(new Message(MessageType.QUIZ_SET_DETAIL,
                    Payloads.toJson(quizSets.get(client.getPlayerId(), request.quizSetId()))));
        } catch (QuizSetException e) {
            sendQuizError(client, e.getCode());
        } catch (IllegalArgumentException e) {
            sendQuizError(client, "BAD_REQUEST");
        } catch (SQLException e) {
            databaseQuizError(client, e);
        }
    }

    private void handleQuizSetSave(ClientHandler client, Message message) {
        if (!requireLogin(client)) return;
        try {
            Payloads.QuizSetEdit request = Payloads.fromJson(
                    message.getPayload(), Payloads.QuizSetEdit.class);
            long id = quizSets.save(client.getPlayerId(), request);
            client.send(new Message(MessageType.QUIZ_SET_SAVED,
                    Payloads.toJson(new Payloads.QuizSetSaved(id))));
        } catch (QuizSetException e) {
            sendQuizError(client, e.getCode());
        } catch (IllegalArgumentException e) {
            sendQuizError(client, "BAD_REQUEST");
        } catch (SQLException e) {
            databaseQuizError(client, e);
        }
    }

    private void handleQuizSetPublish(ClientHandler client, Message message) {
        if (!requireLogin(client)) return;
        try {
            Payloads.QuizSetPublishRequest request = Payloads.fromJson(
                    message.getPayload(), Payloads.QuizSetPublishRequest.class);
            quizSets.publish(client.getPlayerId(), request.quizSetId(), request.published());
            client.send(new Message(MessageType.QUIZ_SET_PUBLISHED, Payloads.toJson(request)));
        } catch (QuizSetException e) {
            sendQuizError(client, e.getCode());
        } catch (IllegalArgumentException e) {
            sendQuizError(client, "BAD_REQUEST");
        } catch (SQLException e) {
            databaseQuizError(client, e);
        }
    }

    private void handleQuizSetDelete(ClientHandler client, Message message) {
        if (!requireLogin(client)) return;
        try {
            Payloads.QuizSetId request = Payloads.fromJson(
                    message.getPayload(), Payloads.QuizSetId.class);
            quizSets.delete(client.getPlayerId(), request.quizSetId());
            client.send(new Message(MessageType.QUIZ_SET_DELETED, Payloads.toJson(request)));
        } catch (QuizSetException e) {
            sendQuizError(client, e.getCode());
        } catch (IllegalArgumentException e) {
            sendQuizError(client, "BAD_REQUEST");
        } catch (SQLException e) {
            databaseQuizError(client, e);
        }
    }

    private boolean requireLogin(ClientHandler client) {
        if (client.isAuthenticated()) return true;
        sendQuizError(client, "NOT_AUTHENTICATED");
        return false;
    }

    private void sendQuizError(ClientHandler client, String code) {
        client.send(new Message(MessageType.QUIZ_SET_ERROR, code));
    }

    private void databaseQuizError(ClientHandler client, SQLException error) {
        LOGGER.warning("Lỗi database bộ đề: " + error.getMessage());
        sendQuizError(client, "DATABASE_ERROR");
    }

    public void disconnected(ClientHandler client) {
        matchmaking.disconnect(client);
        quizRooms.disconnected(client);
        social.onLogout(client);
        onlineUsers.logout(client);
    }

    private void handleAnswer(ClientHandler client, Message message) {
        GameRoom room = client.getCurrentRoom();
        if (room == null) return;
        try {
            Payloads.AnswerData answer = Payloads.parseAnswer(message.getPayload());
            room.handleAnswer(client, answer);
        } catch (IllegalArgumentException e) {
            LOGGER.warning("Đáp án không hợp lệ từ " + client.getDisplayName());
        }
    }

    private void handleFindMatch(ClientHandler client, Message message) {
        try {
            Payloads.FindMatchRequest request = Payloads.parseFindMatch(message.getPayload());
            matchmaking.enqueue(client, request.durationSeconds());
        } catch (IllegalArgumentException | NullPointerException e) {
            client.send(new Message(MessageType.MATCH_ERROR, "INVALID_DURATION"));
        }
    }

    private void authenticate(ClientHandler client, Message message, boolean registering) {
        MessageType ok = registering ? MessageType.REGISTER_OK : MessageType.LOGIN_OK;
        MessageType fail = registering ? MessageType.REGISTER_FAIL : MessageType.LOGIN_FAIL;
        if (client.isAuthenticated()) {
            client.send(new Message(fail, "ALREADY_AUTHENTICATED"));
            return;
        }
        Payloads.Credentials credentials;
        try {
            credentials = Payloads.parseCredentials(message.getPayload());
        } catch (IllegalArgumentException e) {
            client.send(new Message(fail, "BAD_REQUEST"));
            return;
        }
        if (!USERNAME_PATTERN.matcher(credentials.username()).matches()
                || credentials.password().length() < 4) {
            client.send(new Message(fail, "BAD_REQUEST"));
            return;
        }
        try {
            AuthResult result = registering
                    ? players.register(credentials.username(), credentials.password())
                    : players.login(credentials.username(), credentials.password());
            if (!result.success()) {
                client.send(new Message(fail, result.reason()));
                return;
            }
            if (!registering) {
                if (!onlineUsers.login(result.player().id(), client)) {
                    client.send(new Message(fail, "ALREADY_ONLINE"));
                    return;
                }
                client.setAuthenticatedPlayer(result.player().id(), result.player().username());
            }
            client.send(new Message(ok, result.player().toPayload()));
            if (!registering) {
                quizRooms.reconnect(client);
                social.onLogin(client);
            }
        } catch (SQLException e) {
            LOGGER.warning("Lỗi database khi xác thực: " + e.getMessage());
            client.send(new Message(fail, "DATABASE_ERROR"));
        }
    }

    private void handleQuizRoomCreate(ClientHandler client, Message message) {
        try {
            Payloads.QuizRoomCreateRequest request = Payloads.fromJson(
                    message.getPayload(), Payloads.QuizRoomCreateRequest.class);
            quizRooms.create(client, request);
        } catch (QuizRoomException e) {
            sendQuizRoomError(client, e.getCode());
        } catch (IllegalArgumentException e) {
            sendQuizRoomError(client, "BAD_REQUEST");
        } catch (SQLException e) {
            LOGGER.warning("Lỗi database khi tạo phòng Quiz: " + e.getMessage());
            sendQuizRoomError(client, "DATABASE_ERROR");
        }
    }

    private void handleQuizRoomJoin(ClientHandler client, Message message) {
        try {
            Payloads.QuizRoomJoinRequest request = Payloads.fromJson(
                    message.getPayload(), Payloads.QuizRoomJoinRequest.class);
            quizRooms.join(client, request.pin());
        } catch (QuizRoomException e) {
            sendQuizRoomError(client, e.getCode());
        } catch (IllegalArgumentException e) {
            sendQuizRoomError(client, "BAD_REQUEST");
        }
    }

    private void handleQuizAnswer(ClientHandler client, Message message) {
        try {
            Payloads.QuizAnswerData answer = Payloads.fromJson(
                    message.getPayload(), Payloads.QuizAnswerData.class);
            quizRooms.answer(client, answer);
        } catch (QuizRoomException e) {
            sendQuizRoomError(client, e.getCode());
        } catch (IllegalArgumentException e) {
            sendQuizRoomError(client, "BAD_REQUEST");
        }
    }

    private void handleQuizAction(ClientHandler client,
                                  java.util.function.Consumer<ClientHandler> action) {
        try {
            action.accept(client);
        } catch (QuizRoomException e) {
            sendQuizRoomError(client, e.getCode());
        }
    }

    private void sendQuizRoomError(ClientHandler client, String code) {
        client.send(new Message(MessageType.QUIZ_ERROR, code));
    }
}
</file>

<file path="src/main/resources/client/home/home.fxml">
<?xml version="1.0" encoding="UTF-8"?>

<?import javafx.scene.control.*?>
<?import javafx.scene.layout.*?>
<?import javafx.scene.shape.Circle?>

<StackPane styleClass="home-page"
           xmlns="http://javafx.com/javafx/21"
           xmlns:fx="http://javafx.com/fxml/1"
           fx:controller="com.nihongoquest.client.home.HomeController">
    <Pane mouseTransparent="true">
        <Circle radius="120" layoutX="730" layoutY="120" styleClass="home-orb,home-orb-primary"/>
        <Circle radius="70" layoutX="650" layoutY="470" styleClass="home-orb,home-orb-secondary"/>
    </Pane>
    <VBox alignment="CENTER_LEFT" spacing="18" maxWidth="760" styleClass="home-hero">
        <Label text="NIHONGOQUEST" styleClass="home-eyebrow"/>
        <Label text="Sẵn sàng chinh phục tiếng Nhật?"
               wrapText="true" styleClass="home-hero-title"/>
        <Label text="Thử sức trong một trận đấu thời gian thực và nâng cao phản xạ tiếng Nhật qua từng câu hỏi."
               wrapText="true" maxWidth="560" styleClass="home-hero-subtitle"/>
        <Button fx:id="findMatchButton" text="TÌM TRẬN 1V1"
                onAction="#onFindMatch" styleClass="primary-button,home-cta-button"/>
    </VBox>
</StackPane>
</file>

<file path=".gitignore">
target/
src/main/resources/db.properties
!.mvn/wrapper/maven-wrapper.jar
!**/src/main/**/target/
!**/src/test/**/target/
.kotlin

### IntelliJ IDEA ###
.idea/
*.iws
*.iml
*.ipr

### Kilo (AI worktrees) ###
.kilo/
repomix-output.md

### Eclipse ###
.apt_generated
.classpath
.factorypath
.project
.settings
.springBeans
.sts4-cache

### NetBeans ###
/nbproject/private/
/nbbuild/
/dist/
/nbdist/
/.nb-gradle/
build/
!**/src/main/**/build/
!**/src/test/**/build/

### VS Code ###
.vscode/

### Mac OS ###
.DS_Store
.work-ranked/
</file>

<file path="docs/architecture.md">
# Kiến trúc NihongoQuest

NihongoQuest là một Maven module Java 21 gồm ba vùng độc lập:

- `com.nihongoquest.client`: JavaFX, controller và kết nối TCP qua `GameClient`.
- `com.nihongoquest.server`: socket server, nghiệp vụ, timer và JDBC repository.
- `com.nihongoquest.common.protocol`: frame JSON, message type và payload dùng chung.

Client không import server, server không import client. Controller không tạo socket và
không truy cập database. Mọi đáp án, thời gian, điểm và kết quả đều do server quyết định.

## Luồng server

```text
ServerSocket
  -> ClientHandler (chỉ đọc/ghi TCP và giữ phiên)
  -> ServerRequestRouter (switch theo MessageType)
  -> Manager/Repository của từng chức năng
  -> PostgreSQL qua Database
```

`GameServer` dùng pool 50 thread cho kết nối và một scheduler bốn thread dùng chung
cho timer phòng. `OnlineUserRegistry` đảm bảo một tài khoản chỉ đăng nhập trên một
client và là nền tảng cho presence/reconnect ở các giai đoạn tiếp theo.

## Persistence đơn giản

Ranked chỉ lưu một dòng kết quả trong `matches` và cập nhật hai dòng `users` bằng một
transaction JDBC ngắn trong `MatchRepository`. Không lưu từng answer, không dùng Elo,
`SELECT FOR UPDATE` hay lớp transaction tổng quát. Trạng thái realtime nằm trong RAM.

Quản lý bộ đề đi qua `QuizSetService` để kiểm tra dữ liệu và `QuizSetRepository` để lưu
`quiz_sets`, `questions`, `choices`. Mỗi lần sửa sẽ chuyển bộ đề về draft; chỉ chủ sở hữu
được sửa, xóa hoặc xuất bản. Bộ đề cần ít nhất ba câu hợp lệ mới được xuất bản.

Schema chuẩn duy nhất là `sql/supabase_schema.sql`; xem `database.md`.

## Ranked theo thời gian

`MatchmakingManager` giữ hai hàng chờ riêng cho chế độ 180 và 300 giây. Mỗi `GameRoom`
chỉ dùng scheduler chung của server nhưng giữ con trỏ câu hỏi, attempt và timer 30 giây
riêng cho từng người. Vì vậy người trả lời nhanh được chuyển câu ngay, không chờ đối thủ.
Server dùng `sessionId + attempt + questionId` để bỏ qua đáp án cũ hoặc trùng.

Mỗi trận lấy tối đa 10 câu hợp lệ từ các bộ đề đã publish và cần ít nhất 3 câu. Khi hết
danh sách, câu hỏi lặp lại cho tới deadline chung. Ngắt kết nối vẫn xử thua ngay.

## Quiz Room trong RAM

`QuizRoomManager` sinh và quản lý PIN sáu số. Khi host tạo phòng, server lấy snapshot của
bộ đề published; việc sửa/xóa bộ đề sau đó không ảnh hưởng phòng đang chạy. `QuizRoom`
giữ lobby, deadline chung, tiến độ và timer câu riêng của tối đa 20 người chơi.

Điểm, số câu đúng và leaderboard chỉ ở RAM. Slot được gắn với user ID thay vì socket nên
mất TCP không xóa người chơi; đăng nhập lại trước deadline sẽ gắn kết nối mới và phát lại
câu hiện tại. Rời chủ động sẽ khóa reconnect. Host mất TCP trong trận không hủy phòng,
nhưng host bấm hủy/rời sẽ kết thúc phòng cho mọi người.

## Trạng thái triển khai

Nền tảng đã có xác thực, dashboard, Ranked 1v1 3/5 phút, câu hỏi PostgreSQL, protocol
payload object, session registry, persistence đơn giản, quản lý bộ đề, Quiz Room, Top 10 Ranked
và lịch sử thi đấu. `PlayerRepository` phục vụ hồ sơ/leaderboard; `MatchRepository` vừa lưu kết
quả vừa đọc lịch sử theo user. `FriendshipRepository` lưu quan hệ bạn bè; `SocialService` giữ
lời mời chơi 60 giây trong RAM và nối accept với direct Ranked hoặc join Quiz.
</file>

<file path="src/main/java/com/nihongoquest/common/protocol/Payloads.java">
package com.nihongoquest.common.protocol;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.List;

/** JSON payload builders/parsers shared by both TCP endpoints. */
public final class Payloads {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private Payloads() {
    }

    public static JsonNode credentials(String username, String password) {
        ObjectNode node = MAPPER.createObjectNode();
        node.put("username", username);
        node.put("password", password);
        return write(node);
    }

    public static Credentials parseCredentials(JsonNode payload) {
        JsonNode node = requireObject(payload);
        return new Credentials(requiredText(node, "username"), requiredText(node, "password"));
    }

    public static JsonNode player(long id, String username, int wins, int losses, int draws,
                                  int totalScore, int questionsAnswered, int correctAnswers) {
        ObjectNode node = MAPPER.createObjectNode();
        node.put("id", id);
        node.put("username", username);
        node.put("wins", wins);
        node.put("losses", losses);
        node.put("draws", draws);
        node.put("totalScore", totalScore);
        node.put("questionsAnswered", questionsAnswered);
        node.put("correctAnswers", correctAnswers);
        return write(node);
    }

    public static PlayerStats parsePlayer(JsonNode payload) {
        JsonNode node = requireObject(payload);
        return new PlayerStats(node.get("id").asLong(), requiredText(node, "username"),
                node.get("wins").asInt(), node.get("losses").asInt(),
                node.get("draws").asInt(), node.get("totalScore").asInt(),
                node.get("questionsAnswered").asInt(), node.get("correctAnswers").asInt());
    }

    public static JsonNode findMatch(int durationSeconds) {
        return write(new FindMatchRequest(durationSeconds));
    }

    public static FindMatchRequest parseFindMatch(JsonNode payload) {
        return fromJson(payload, FindMatchRequest.class);
    }

    public static JsonNode matchFound(String roomId, String opponent, int durationSeconds) {
        ObjectNode node = MAPPER.createObjectNode();
        node.put("roomId", roomId);
        node.put("opponent", opponent);
        node.put("durationSeconds", durationSeconds);
        return write(node);
    }

    public static MatchFound parseMatchFound(JsonNode payload) {
        JsonNode node = requireObject(payload);
        return new MatchFound(requiredText(node, "roomId"), requiredText(node, "opponent"),
                node.get("durationSeconds").asInt());
    }

    public static JsonNode question(String sessionId, int attempt, int questionDurationSeconds,
                                    int matchRemainingSeconds, long questionId,
                                    String content, List<ChoiceData> choices) {
        ObjectNode node = MAPPER.createObjectNode();
        node.put("sessionId", sessionId);
        node.put("attempt", attempt);
        node.put("questionDurationSeconds", questionDurationSeconds);
        node.put("matchRemainingSeconds", matchRemainingSeconds);
        node.put("questionId", questionId);
        node.put("content", content);
        // Explicit public DTO: no server model or answer key can be serialized here.
        node.set("choices", MAPPER.valueToTree(choices));
        return write(node);
    }

    public static QuestionData parseQuestion(JsonNode payload) {
        JsonNode node = requireObject(payload);
        return new QuestionData(requiredText(node, "sessionId"), requiredPositiveInt(node, "attempt"),
                requiredPositiveId(node, "questionId"), requiredText(node, "content"),
                MAPPER.convertValue(node.get("choices"), MAPPER.getTypeFactory()
                        .constructCollectionType(List.class, ChoiceData.class)),
                requiredPositiveInt(node, "questionDurationSeconds"),
                requiredPositiveInt(node, "matchRemainingSeconds"));
    }

    public static JsonNode answer(String sessionId, int attempt, long questionId, long choiceId) {
        if (sessionId == null || sessionId.isBlank() || attempt <= 0
                || questionId <= 0 || choiceId <= 0) {
            throw new IllegalArgumentException("Question and choice IDs must be positive");
        }
        ObjectNode node = MAPPER.createObjectNode();
        node.put("sessionId", sessionId);
        node.put("attempt", attempt);
        node.put("questionId", questionId);
        node.put("choiceId", choiceId);
        return write(node);
    }

    public static AnswerData parseAnswer(JsonNode payload) {
        JsonNode node = requireObject(payload);
        return new AnswerData(requiredText(node, "sessionId"), requiredPositiveInt(node, "attempt"),
                requiredPositiveId(node, "questionId"), requiredPositiveId(node, "choiceId"));
    }

    private static long requiredPositiveId(JsonNode node, String field) {
        JsonNode value = node == null ? null : node.get(field);
        if (value == null || !value.isIntegralNumber() || !value.canConvertToLong() || value.longValue() <= 0) {
            throw new IllegalArgumentException("Payload có ID không hợp lệ: " + field);
        }
        return value.longValue();
    }

    public static JsonNode answerResult(String sessionId, int attempt, long questionId,
                                        boolean correct, Long chosenChoiceId,
                                        long correctChoiceId, int scoreAwarded) {
        ObjectNode node = MAPPER.createObjectNode();
        node.put("sessionId", sessionId);
        node.put("attempt", attempt);
        node.put("questionId", questionId);
        node.put("correct", correct);
        if (chosenChoiceId == null) node.putNull("chosenChoiceId");
        else node.put("chosenChoiceId", chosenChoiceId);
        node.put("correctChoiceId", correctChoiceId);
        node.put("scoreAwarded", scoreAwarded);
        return write(node);
    }

    private static int requiredPositiveInt(JsonNode node, String field) {
        JsonNode value = node == null ? null : node.get(field);
        if (value == null || !value.isIntegralNumber() || !value.canConvertToInt()
                || value.intValue() <= 0) {
            throw new IllegalArgumentException("Payload có số không hợp lệ: " + field);
        }
        return value.intValue();
    }

    public static AnswerResult parseAnswerResult(JsonNode payload) {
        JsonNode node = requireObject(payload);
        JsonNode chosen = node.get("chosenChoiceId");
        return new AnswerResult(requiredText(node, "sessionId"), node.get("attempt").asInt(),
                requiredPositiveId(node, "questionId"), node.get("correct").asBoolean(),
                chosen == null || chosen.isNull() ? null : chosen.asLong(),
                requiredPositiveId(node, "correctChoiceId"), node.get("scoreAwarded").asInt());
    }

    public static JsonNode scores(int mine, int opponent) {
        ObjectNode node = MAPPER.createObjectNode();
        node.put("myScore", mine);
        node.put("opponentScore", opponent);
        return write(node);
    }

    public static Scores parseScores(JsonNode payload) {
        JsonNode node = requireObject(payload);
        return new Scores(node.get("myScore").asInt(), node.get("opponentScore").asInt());
    }

    public static JsonNode gameOver(String result, int mine, int opponent) {
        ObjectNode node = MAPPER.createObjectNode();
        node.put("result", result);
        node.put("myScore", mine);
        node.put("opponentScore", opponent);
        return write(node);
    }

    public static GameOver parseGameOver(JsonNode payload) {
        JsonNode node = requireObject(payload);
        return new GameOver(requiredText(node, "result"), node.get("myScore").asInt(),
                node.get("opponentScore").asInt());
    }

    /** Chuyển một record DTO thành JSON object để gửi qua TCP. */
    public static JsonNode toJson(Object value) {
        if (value == null) {
            throw new IllegalArgumentException("Payload không được null");
        }
        return write(value);
    }

    /** Đọc JSON object thành record DTO dùng chung giữa client và server. */
    public static <T> T fromJson(JsonNode payload, Class<T> type) {
        requireObject(payload);
        try {
            return MAPPER.treeToValue(payload, type);
        } catch (Exception e) {
            throw new IllegalArgumentException("Payload không đúng định dạng " + type.getSimpleName(), e);
        }
    }

    private static String requiredText(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || !value.isTextual()) {
            throw new IllegalArgumentException("Payload thiếu trường " + field);
        }
        return value.textValue();
    }

    private static JsonNode requireObject(JsonNode payload) {
        if (payload == null || !payload.isObject()) {
            throw new IllegalArgumentException("Payload phải là JSON object");
        }
        return payload;
    }

    private static JsonNode write(Object value) {
        return MAPPER.valueToTree(value);
    }

    public record Credentials(String username, String password) { }
    public record PlayerStats(long id, String username, int wins, int losses, int draws,
                              int totalScore, int questionsAnswered, int correctAnswers) { }
    public record LeaderboardEntry(int rank, long userId, String username,
                                   int wins, int losses, int draws, int totalScore) { }
    public record LeaderboardData(List<LeaderboardEntry> players) { }
    public record MatchHistoryEntry(long matchId, String opponentUsername,
                                    int myScore, int opponentScore, String result,
                                    int durationSeconds, String endReason, String playedAt) { }
    public record MatchHistoryData(List<MatchHistoryEntry> matches) { }
    public record UserSearchRequest(String query) { }
    public record UserSearchItem(long userId, String username, boolean online, boolean busy) { }
    public record UserSearchData(List<UserSearchItem> users) { }
    public record FriendTarget(long userId) { }
    public record FriendRequestReply(long userId, boolean accept) { }
    public record FriendRequestItem(long userId, String username) { }
    public record FriendRequestListData(List<FriendRequestItem> requests) { }
    public record FriendItem(long userId, String username, boolean online, boolean busy) { }
    public record FriendListData(List<FriendItem> friends) { }
    public record PresenceData(long userId, boolean online, boolean busy) { }
    public record GameInviteSend(long targetUserId, String type,
                                 int durationSeconds, String roomPin) { }
    public record GameInviteReceived(String inviteId, long fromUserId, String fromUsername,
                                     String type, int durationSeconds, String roomPin,
                                     long expiresAtEpochMillis) { }
    public record GameInviteRespond(String inviteId, boolean accept) { }
    public record GameInviteStatus(String inviteId, String status) { }
    public record FindMatchRequest(int durationSeconds) { }
    public record MatchFound(String roomId, String opponent, int durationSeconds) { }
    public record ChoiceData(long choiceId, String content, int position) { }
    public record QuestionData(String sessionId, int attempt, long questionId,
                               String content, List<ChoiceData> choices,
                               int questionDurationSeconds, int matchRemainingSeconds) { }
    public record AnswerData(String sessionId, int attempt, long questionId, long choiceId) { }
    public record AnswerResult(String sessionId, int attempt, long questionId, boolean correct,
                               Long chosenChoiceId, long correctChoiceId, int scoreAwarded) { }
    public record Scores(int myScore, int opponentScore) { }
    public record GameOver(String result, int myScore, int opponentScore) { }
    public record QuizSetListRequest(String scope) { }
    public record QuizSetId(long quizSetId) { }
    public record QuizSetPublishRequest(long quizSetId, boolean published) { }
    public record QuizSetSaved(long quizSetId) { }
    public record QuizSetSummary(long id, long ownerId, String ownerUsername,
                                 String title, String description, String level,
                                 boolean published, int questionCount, boolean ownedByMe) { }
    public record QuizChoiceEdit(Long id, String content, int position, boolean correct) { }
    public record QuizQuestionEdit(Long id, String content, String explanation,
                                   List<QuizChoiceEdit> choices) { }
    public record QuizSetEdit(Long id, String title, String description, String level,
                              List<QuizQuestionEdit> questions) { }
    public record QuizSetListData(List<QuizSetSummary> items) { }
    public record QuizRoomCreateRequest(long quizSetId, int durationMinutes, boolean hostPlays) { }
    public record QuizRoomJoinRequest(String pin) { }
    public record QuizRoomPinRequest(String pin) { }
    public record QuizRoomCreated(QuizLobbyData lobby) { }
    public record QuizLobbyPlayer(long userId, String username, boolean host,
                                  boolean playing, boolean connected) { }
    public record QuizLobbyData(String pin, String title, String hostUsername,
                                boolean currentUserHost, boolean hostPlays, boolean started,
                                int playerCount, List<QuizLobbyPlayer> members) { }
    public record QuizRoomStarted(String pin, String title, int durationSeconds,
                                  boolean playing, boolean host) { }
    public record QuizQuestionData(String sessionId, String pin, int attempt, long questionId,
                                   String content, List<ChoiceData> choices,
                                   int questionDurationSeconds, int roomRemainingSeconds) { }
    public record QuizAnswerData(String sessionId, int attempt, long questionId, long choiceId) { }
    public record QuizAnswerResult(String sessionId, int attempt, long questionId,
                                   boolean correct, Long chosenChoiceId, long correctChoiceId,
                                   int scoreAwarded, int totalScore) { }
    public record QuizLeaderboardEntry(int rank, long userId, String username,
                                       int score, int correctAnswers, boolean connected) { }
    public record QuizLeaderboardData(String pin, boolean finished,
                                      List<QuizLeaderboardEntry> entries) { }
    public record QuizRejoinData(QuizLobbyData lobby, boolean running,
                                 boolean playing, int remainingSeconds) { }
}
</file>

<file path="src/test/java/com/nihongoquest/client/ClientFxmlTest.java">
package com.nihongoquest.client;

import com.nihongoquest.client.layout.AuthenticatedRoute;
import com.nihongoquest.client.layout.AuthenticatedShellController;
import com.nihongoquest.server.dashboard.DashboardController;
import javafx.application.Platform;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.layout.Pane;
import javafx.scene.layout.VBox;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.FutureTask;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ClientFxmlTest {

    @BeforeAll
    static void startJavaFx() throws Exception {
        CountDownLatch started = new CountDownLatch(1);
        Platform.startup(started::countDown);
        if (!started.await(10, TimeUnit.SECONDS)) {
            throw new IllegalStateException("JavaFX không khởi động đúng hạn");
        }
    }

    @AfterAll
    static void stopJavaFx() {
        Platform.exit();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "/client/auth/login.fxml",
            "/client/layout/authenticated-shell.fxml",
            "/client/home/home.fxml",
            "/client/profile/profile.fxml",
            "/client/leaderboard/leaderboard.fxml",
            "/client/history/match-history.fxml",
            "/client/friend/friends.fxml",
            "/client/quiz/quiz-set-list.fxml",
            "/client/quiz/quiz-set-editor.fxml",
            "/client/quiz/quiz-room-menu.fxml",
            "/client/quiz/quiz-lobby.fxml",
            "/client/quiz/quiz-battle.fxml",
            "/client/ranked/matchmaking/matchmaking.fxml",
            "/client/ranked/battle/battle.fxml",
            "/client/ranked/battle/result.fxml"
    })
    void loadsClientScreen(String resource) throws Exception {
        loadScreen(resource, "/client/shared/style.css");
    }

    @Test
    void loadsServerDashboard() throws Exception {
        loadScreen("/server/dashboard/server-dashboard.fxml",
                "/server/dashboard/server-dashboard.css");
    }

    @Test
    void shellMarksActiveRouteAndHidesChromeDuringGameplay() throws Exception {
        FutureTask<boolean[]> check = new FutureTask<>(() -> {
            FXMLLoader loader = new FXMLLoader(ClientFxmlTest.class.getResource(
                    "/client/layout/authenticated-shell.fxml"));
            Parent root = loader.load();
            AuthenticatedShellController controller = loader.getController();
            Button matchmakingButton = (Button) root.lookup("#matchmakingButton");
            VBox sidebar = (VBox) root.lookup("#sidebar");

            controller.showContent(new Pane(), "Đấu hạng 1v1", "",
                    AuthenticatedRoute.MATCHMAKING, true);
            boolean matchmakingActive = matchmakingButton.getStyleClass().contains("active");
            boolean sidebarVisible = sidebar.isVisible() && sidebar.isManaged();

            controller.showContent(new Pane(), "Đấu trường", "",
                    AuthenticatedRoute.BATTLE, false);
            boolean gameplayHidden = !sidebar.isVisible() && !sidebar.isManaged();
            return new boolean[] {matchmakingActive, sidebarVisible, gameplayHidden};
        });
        Platform.runLater(check);

        boolean[] result = check.get(10, TimeUnit.SECONDS);
        assertTrue(result[0]);
        assertTrue(result[1]);
        assertTrue(result[2]);
    }

    private void loadScreen(String resource, String stylesheet) throws Exception {
        FutureTask<Parent> load = new FutureTask<>(() -> {
            FXMLLoader loader = new FXMLLoader(ClientFxmlTest.class.getResource(resource));
            try {
                Parent root = loader.load();
                Scene scene = new Scene(root, 980, 680);
                scene.getStylesheets().add(
                        ClientFxmlTest.class.getResource(stylesheet).toExternalForm());
                root.applyCss();
                root.layout();
                return root;
            } finally {
                if (loader.getController() instanceof DashboardController dashboard) {
                    dashboard.shutdown();
                }
            }
        });
        Platform.runLater(load);

        assertNotNull(load.get(10, TimeUnit.SECONDS));
    }
}
</file>

<file path="src/test/java/com/nihongoquest/common/protocol/PayloadsTest.java">
package com.nihongoquest.common.protocol;

import org.junit.jupiter.api.Test;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PayloadsTest {

    @Test
    void questionPayloadPreservesPipeAndNewlineInContent() {
        var payload = Payloads.question("ranked-1", 4, 30, 155, 3_000_000_000L,
                "どれ | chọn đáp án?\n", List.of(new Payloads.ChoiceData(30_000_000_001L, "A | một", 1)));

        Payloads.QuestionData question = Payloads.parseQuestion(payload);

        assertEquals("どれ | chọn đáp án?\n", question.content());
        assertEquals("A | một", question.choices().getFirst().content());
        assertEquals(3_000_000_000L, question.questionId());
        assertEquals(30_000_000_001L, question.choices().getFirst().choiceId());
        assertEquals("ranked-1", question.sessionId());
        assertEquals(4, question.attempt());
        assertEquals(155, question.matchRemainingSeconds());
    }

    @Test
    void questionPayloadContainsOnlyPublicFields() throws Exception {
        var node = Payloads.question("room", 1, 30, 180, 1,
                "Q", List.of(new Payloads.ChoiceData(11, "A", 1)));
        assertEquals(7, node.size());
        assertEquals(3, node.get("choices").get(0).size());
        for (String secret : List.of("correct", "is_correct", "correctAnswer", "correctChoiceId", "explanation")) {
            assertFalse(node.findValues(secret).iterator().hasNext());
        }
    }

    @Test
    void answersCarryDatabaseIdsAndRejectMalformedIdentifiers() {
        assertEquals(new Payloads.AnswerData("room", 2,
                        3_000_000_000L, 30_000_000_001L),
                Payloads.parseAnswer(Payloads.answer("room", 2,
                        3_000_000_000L, 30_000_000_001L)));
        ObjectMapper mapper = new ObjectMapper();
        for (String malformed : List.of("0", "null", "{}", "{\"questionId\":1,\"choiceId\":-1}",
                "{\"sessionId\":\"room\",\"attempt\":0,\"questionId\":1,\"choiceId\":11}",
                "{\"questionId\":1,\"choiceId\":1.5}", "{\"questionId\":1,\"choiceId\":\"11\"}")) {
            assertThrows(RuntimeException.class, () -> Payloads.parseAnswer(mapper.readTree(malformed)));
        }
    }

    @Test
    void credentialsAndGameResultsRoundTrip() {
        Payloads.Credentials credentials = Payloads.parseCredentials(
                Payloads.credentials("player_1", "mật-khẩu"));
        Payloads.AnswerResult answer = Payloads.parseAnswerResult(
                Payloads.answerResult("room", 1, 10, true, 12L, 12, 1));
        Payloads.GameOver game = Payloads.parseGameOver(
                Payloads.gameOver("WIN", 3, 1));

        assertEquals("player_1", credentials.username());
        assertEquals("mật-khẩu", credentials.password());
        assertTrue(answer.correct());
        assertEquals(12, answer.correctChoiceId());
        assertEquals("WIN", game.result());
        assertEquals(3, game.myScore());
    }

    @Test
    void quizSetRecordsRoundTripAsNestedJsonObjects() {
        Payloads.QuizSetEdit input = new Payloads.QuizSetEdit(
                12L, "Kanji N5", "Bộ đề demo", "N5",
                List.of(new Payloads.QuizQuestionEdit(21L, "山 là gì?", "Núi",
                        List.of(
                                new Payloads.QuizChoiceEdit(1L, "Núi", 1, true),
                                new Payloads.QuizChoiceEdit(2L, "Sông", 2, false),
                                new Payloads.QuizChoiceEdit(3L, "Biển", 3, false),
                                new Payloads.QuizChoiceEdit(4L, "Trời", 4, false)))));

        var json = Payloads.toJson(input);
        Payloads.QuizSetEdit output = Payloads.fromJson(json, Payloads.QuizSetEdit.class);

        assertTrue(json.isObject());
        assertTrue(json.get("questions").isArray());
        assertEquals(input, output);
    }

    @Test
    void quizRoomQuestionHidesAnswerAndLeaderboardRoundTrips() {
        Payloads.QuizQuestionData question = new Payloads.QuizQuestionData(
                "123456", "123456", 2, 10, "山 là gì?",
                List.of(new Payloads.ChoiceData(101, "Núi", 1)), 30, 120);
        var questionJson = Payloads.toJson(question);
        assertTrue(questionJson.findValues("correct").isEmpty());
        assertTrue(questionJson.findValues("correctChoiceId").isEmpty());
        assertEquals(question, Payloads.fromJson(questionJson, Payloads.QuizQuestionData.class));

        Payloads.QuizLeaderboardData board = new Payloads.QuizLeaderboardData(
                "123456", false, List.of(
                new Payloads.QuizLeaderboardEntry(1, 1, "an", 900, 1, true),
                new Payloads.QuizLeaderboardEntry(1, 2, "dinh", 900, 1, false)));
        assertEquals(board, Payloads.fromJson(
                Payloads.toJson(board), Payloads.QuizLeaderboardData.class));
    }

    @Test
    void profileLeaderboardAndHistoryUseObjectPayloads() {
        Payloads.PlayerStats profile = Payloads.parsePlayer(
                Payloads.player(1, "sakura", 4, 2, 1, 350, 20, 12));
        assertEquals(1, profile.draws());
        assertEquals(350, profile.totalScore());

        Payloads.LeaderboardData leaderboard = new Payloads.LeaderboardData(List.of(
                new Payloads.LeaderboardEntry(1, 1, "sakura", 4, 2, 1, 350)));
        assertEquals(leaderboard, Payloads.fromJson(
                Payloads.toJson(leaderboard), Payloads.LeaderboardData.class));

        Payloads.MatchHistoryData history = new Payloads.MatchHistoryData(List.of(
                new Payloads.MatchHistoryEntry(10, "tanaka", 5, 3,
                        "WIN", 180, "NORMAL", "2026-10-19T05:00:00Z")));
        assertEquals(history, Payloads.fromJson(
                Payloads.toJson(history), Payloads.MatchHistoryData.class));
    }

    @Test
    void socialAndInviteRecordsRoundTrip() {
        Payloads.FriendListData friends = new Payloads.FriendListData(List.of(
                new Payloads.FriendItem(2, "tanaka", true, false)));
        assertEquals(friends, Payloads.fromJson(
                Payloads.toJson(friends), Payloads.FriendListData.class));

        Payloads.GameInviteReceived invite = new Payloads.GameInviteReceived(
                "invite-1", 2, "tanaka", "RANKED", 180, null, 123456789L);
        assertEquals(invite, Payloads.fromJson(
                Payloads.toJson(invite), Payloads.GameInviteReceived.class));
    }
}
</file>

<file path="docs/protocol.md">
# Giao thức TCP NihongoQuest

Client giữ một TCP connection tới server. Mỗi frame là một JSON object UTF-8 trên
một dòng kết thúc bằng `\n`:

```json
{"type":"LOGIN","payload":{"username":"demo_player1","password":"1234"}}
```

`payload` là JSON object thật, không còn là chuỗi JSON escaped. Với trạng thái lỗi
ngắn, payload có thể là JSON string, ví dụ `"DATABASE_ERROR"`; message không có dữ
liệu dùng `null`.

## Message hiện có

- Auth: `CONNECT`, `REGISTER`, `REGISTER_OK/FAIL`, `LOGIN`, `LOGIN_OK/FAIL`.
- Truy vấn: `PROFILE_GET/DATA`, `LEADERBOARD_GET/DATA`,
  `MATCH_HISTORY_GET/DATA` và `QUERY_ERROR`.
- Bạn bè: `USER_SEARCH/RESULT`, `FRIEND_REQUEST_SEND/SENT/LIST/RESPOND`,
  `FRIEND_LIST`, `FRIEND_REMOVE/REMOVED`, `PRESENCE_UPDATE` và `SOCIAL_ERROR`.
- Lời mời chơi: `GAME_INVITE_SEND/RECEIVED/RESPOND/STATUS`.
- Ranked: `FIND_MATCH`, `CANCEL_MATCH`, `WAITING`, `MATCH_CANCELLED`,
  `MATCH_ERROR`, `MATCH_FOUND`, `QUESTION`, `ANSWER`, `ANSWER_RESULT`,
  `SCORE_UPDATE`, `GAME_OVER`.
- Bộ đề: `QUIZ_SET_LIST/LIST_RESULT`, `QUIZ_SET_GET/DETAIL`,
  `QUIZ_SET_SAVE/SAVED`, `QUIZ_SET_PUBLISH/PUBLISHED`,
  `QUIZ_SET_DELETE/DELETED` và `QUIZ_SET_ERROR`.
- Phòng Quiz: `QUIZ_ROOM_CREATE/CREATED`, `QUIZ_ROOM_JOIN`, `QUIZ_LOBBY_UPDATE`,
  `QUIZ_ROOM_START`, `QUIZ_QUESTION`, `QUIZ_ANSWER`, `QUIZ_ANSWER_RESULT`,
  `QUIZ_LEADERBOARD`, `QUIZ_ROOM_LEAVE`, `QUIZ_ROOM_CANCEL`, `QUIZ_REJOINED`,
  `QUIZ_ROOM_FINISHED` và `QUIZ_ERROR`.
- Kết nối: `DISCONNECT`.

`QUESTION` chỉ chứa ID, nội dung, lựa chọn và thời gian; không chứa `correct`,
`is_correct`, explanation hoặc đáp án đúng. `ANSWER_RESULT` chỉ công bố đáp án sau
khi server đã nhận/chấm câu trả lời.

## Payload Ranked theo thời gian

- `FIND_MATCH`: `{ "durationSeconds": 180 }` hoặc `300`; hai người chỉ được ghép khi
  chọn cùng thời lượng.
- `MATCH_FOUND`: room ID, tên đối thủ và thời lượng trận.
- `QUESTION`: `sessionId`, `attempt`, `questionId`, nội dung, bốn lựa chọn,
  `questionDurationSeconds` và `matchRemainingSeconds`. Không có đáp án đúng.
- `ANSWER`: gửi lại đúng `sessionId`, `attempt`, `questionId`, `choiceId`. Server bỏ qua
  attempt cũ, trùng hoặc đã quá 30 giây.
- `ANSWER_RESULT`: sau khi chấm mới chứa `correctChoiceId`, lựa chọn đã gửi và điểm nhận được.

Mỗi người nhận câu tiếp theo ngay sau khi trả lời hoặc timeout, không phải đợi đối thủ.
Hết danh sách tối đa 10 câu thì server lặp lại từ đầu cho tới deadline chung.

## Phòng Quiz

Host gửi ID bộ đề published, thời lượng 1–15 phút và lựa chọn có tham gia chơi hay không.
Server trả PIN sáu số duy nhất trong các phòng đang hoạt động. Lobby cần 2–20 người chơi;
host chỉ được tính khi chọn tham gia.

`QUIZ_QUESTION` không có đáp án đúng. `QUIZ_ANSWER` cũng mang session, attempt, question
và choice ID. Điểm đúng do server tính từ 500–1000 theo thời gian còn lại; sai hoặc timeout
bằng 0. Sau mỗi câu server gửi kết quả và leaderboard trực tiếp.

`QUIZ_REJOINED` được gửi sau khi cùng tài khoản đăng nhập lại, tiếp theo là leaderboard và
câu hiện tại. Kết quả phòng chỉ ở RAM, không ghi database.

Dashboard nhận bản sao traffic đã che trường password của `LOGIN` và `REGISTER`.
Không dùng HTTP, WebSocket, UDP, TLS hay JWT trong bản demo LAN.

## Hồ sơ, bảng xếp hạng và lịch sử

`PROFILE_GET` không cần payload; server đọc lại thống kê Ranked mới nhất trong `users` và trả
`PROFILE_DATA`. `LEADERBOARD_GET` trả tối đa 10 người, xếp theo số trận thắng giảm dần, tổng
điểm giảm dần rồi username tăng dần.

`MATCH_HISTORY_GET` trả tối đa 100 trận mới nhất. Mỗi dòng chứa đối thủ, tỷ số theo góc nhìn
người đang đăng nhập, kết quả `WIN/LOSS/DRAW`, chế độ 180/300 giây, lý do kết thúc và thời gian.
## Bạn bè và lời mời chơi

`USER_SEARCH` nhận một phần username và trả tối đa 20 kết quả, không gồm chính người tìm.
`FRIEND_REQUEST_SEND` tạo một dòng `PENDING`; cặp user được chuẩn hóa low/high nên lời mời
ngược chiều không thể bị trùng. Accept đổi thành `ACCEPTED`; reject và remove xóa dòng.

`FRIEND_LIST` kèm trạng thái online/busy lấy từ RAM server. Khi bạn bè đăng nhập hoặc ngắt
kết nối, server phát `PRESENCE_UPDATE`. `GAME_INVITE_SEND` chỉ hợp lệ với bạn bè đang online
và rảnh. Lời mời nằm trong RAM tối đa 60 giây:

- `RANKED`: mang thời lượng 180/300 giây; accept tạo trận trực tiếp, không qua hàng chờ.
- `QUIZ`: mang PIN; người gửi phải là host của lobby, accept sẽ join nếu phòng còn hợp lệ.
</file>

<file path="src/main/java/com/nihongoquest/client/network/GameClient.java">
package com.nihongoquest.client.network;

import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Protocol;
import com.fasterxml.jackson.databind.JsonNode;
import com.nihongoquest.common.protocol.Payloads;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.Charset;
import java.util.function.Consumer;

/** Quản lý duy nhất một kết nối TCP từ client tới server. */
public class GameClient {

    private Socket socket;
    private BufferedReader reader;
    private PrintWriter writer;
    private ServerListener listener;
    private volatile boolean connected;
    private Consumer<Message> messageHandler = message -> { };
    private Consumer<Message> globalMessageHandler = message -> { };
    private Consumer<String> errorHandler = error -> { };

    public synchronized void connect(String host, int port) throws IOException {
        if (connected) {
            return;
        }
        Charset charset = Charset.forName(Protocol.ENCODING);
        Socket newSocket = new Socket();
        try {
            newSocket.connect(new InetSocketAddress(host, port), 5_000);
            reader = new BufferedReader(new InputStreamReader(newSocket.getInputStream(), charset));
            writer = new PrintWriter(new OutputStreamWriter(newSocket.getOutputStream(), charset), true);
            socket = newSocket;
        } catch (IOException e) {
            try {
                newSocket.close();
            } catch (IOException ignored) {
                // Giữ lại lỗi kết nối ban đầu.
            }
            throw e;
        }
        connected = true;

        listener = new ServerListener(this);
        Thread thread = new Thread(listener, "tcp-server-listener");
        thread.setDaemon(true);
        thread.start();
        send(MessageType.CONNECT, "");
    }

    public synchronized void disconnect() {
        try {
            if (connected) {
                send(MessageType.DISCONNECT, "");
            }
        } catch (IllegalStateException ignored) {
            // Kết nối đã lỗi; vẫn đóng socket cục bộ.
        } finally {
            closeSocket();
        }
    }

    public void findMatch(int durationSeconds) {
        send(MessageType.FIND_MATCH, Payloads.findMatch(durationSeconds));
    }

    public void register(String username, String password) {
        send(MessageType.REGISTER,
                com.nihongoquest.common.protocol.Payloads.credentials(username, password));
    }

    public void login(String username, String password) {
        send(MessageType.LOGIN,
                com.nihongoquest.common.protocol.Payloads.credentials(username, password));
    }

    public void cancelMatch() {
        send(MessageType.CANCEL_MATCH, "");
    }

    public void getProfile() {
        send(MessageType.PROFILE_GET, "");
    }

    public void getLeaderboard() {
        send(MessageType.LEADERBOARD_GET, "");
    }

    public void getMatchHistory() {
        send(MessageType.MATCH_HISTORY_GET, "");
    }

    public void searchUsers(String query) {
        send(MessageType.USER_SEARCH,
                Payloads.toJson(new Payloads.UserSearchRequest(query)));
    }

    public void sendFriendRequest(long userId) {
        send(MessageType.FRIEND_REQUEST_SEND,
                Payloads.toJson(new Payloads.FriendTarget(userId)));
    }

    public void listFriendRequests() {
        send(MessageType.FRIEND_REQUEST_LIST, "");
    }

    public void respondFriendRequest(long userId, boolean accept) {
        send(MessageType.FRIEND_REQUEST_RESPOND,
                Payloads.toJson(new Payloads.FriendRequestReply(userId, accept)));
    }

    public void listFriends() {
        send(MessageType.FRIEND_LIST, "");
    }

    public void removeFriend(long userId) {
        send(MessageType.FRIEND_REMOVE,
                Payloads.toJson(new Payloads.FriendTarget(userId)));
    }

    public void inviteRanked(long userId, int durationSeconds) {
        send(MessageType.GAME_INVITE_SEND, Payloads.toJson(
                new Payloads.GameInviteSend(userId, "RANKED", durationSeconds, null)));
    }

    public void inviteQuiz(long userId, String roomPin) {
        send(MessageType.GAME_INVITE_SEND, Payloads.toJson(
                new Payloads.GameInviteSend(userId, "QUIZ", 0, roomPin)));
    }

    public void respondGameInvite(String inviteId, boolean accept) {
        send(MessageType.GAME_INVITE_RESPOND,
                Payloads.toJson(new Payloads.GameInviteRespond(inviteId, accept)));
    }

    public void sendAnswer(String sessionId, int attempt, long questionId, long choiceId) {
        send(MessageType.ANSWER,
                Payloads.answer(sessionId, attempt, questionId, choiceId));
    }

    public void listQuizSets(String scope) {
        send(MessageType.QUIZ_SET_LIST,
                Payloads.toJson(new Payloads.QuizSetListRequest(scope)));
    }

    public void getQuizSet(long quizSetId) {
        send(MessageType.QUIZ_SET_GET,
                Payloads.toJson(new Payloads.QuizSetId(quizSetId)));
    }

    public void saveQuizSet(Payloads.QuizSetEdit quizSet) {
        send(MessageType.QUIZ_SET_SAVE, Payloads.toJson(quizSet));
    }

    public void publishQuizSet(long quizSetId, boolean published) {
        send(MessageType.QUIZ_SET_PUBLISH,
                Payloads.toJson(new Payloads.QuizSetPublishRequest(quizSetId, published)));
    }

    public void deleteQuizSet(long quizSetId) {
        send(MessageType.QUIZ_SET_DELETE,
                Payloads.toJson(new Payloads.QuizSetId(quizSetId)));
    }

    public void createQuizRoom(long quizSetId, int durationMinutes, boolean hostPlays) {
        send(MessageType.QUIZ_ROOM_CREATE, Payloads.toJson(
                new Payloads.QuizRoomCreateRequest(quizSetId, durationMinutes, hostPlays)));
    }

    public void joinQuizRoom(String pin) {
        send(MessageType.QUIZ_ROOM_JOIN,
                Payloads.toJson(new Payloads.QuizRoomJoinRequest(pin)));
    }

    public void startQuizRoom() {
        send(MessageType.QUIZ_ROOM_START, "");
    }

    public void sendQuizAnswer(Payloads.QuizAnswerData answer) {
        send(MessageType.QUIZ_ANSWER, Payloads.toJson(answer));
    }

    public void leaveQuizRoom() {
        send(MessageType.QUIZ_ROOM_LEAVE, "");
    }

    public void cancelQuizRoom() {
        send(MessageType.QUIZ_ROOM_CANCEL, "");
    }

    public void redispatch(Message message) {
        messageHandler.accept(message);
    }

    Message read() throws IOException {
        String line = reader.readLine();
        return line == null ? null : Message.fromWire(line);
    }

    void receive(Message message) {
        globalMessageHandler.accept(message);
        messageHandler.accept(message);
    }   

    void connectionLost(String reason) {
        if (!connected) {
            return;
        }
        closeSocket();
        errorHandler.accept(reason);
    }

    private synchronized void send(MessageType type, JsonNode payload) {
        if (!connected || writer == null) {
            throw new IllegalStateException("Chưa kết nối tới server");
        }
        writer.println(new Message(type, payload).toWire());
        if (writer.checkError()) {
            throw new IllegalStateException("Không thể gửi dữ liệu tới server");
        }
    }

    private synchronized void send(MessageType type, String payload) {
        if (!connected || writer == null) {
            throw new IllegalStateException("Chưa kết nối tới server");
        }
        writer.println(new Message(type, payload).toWire());
        if (writer.checkError()) {
            throw new IllegalStateException("Không thể gửi dữ liệu tới server");
        }
    }

    private synchronized void closeSocket() {
        connected = false;
        if (listener != null) {
            listener.stop();
        }
        try {
            if (socket != null) {
                socket.close();
            }
        } catch (IOException ignored) {
            // Socket đã đóng.
        }
    }

    public void setMessageHandler(Consumer<Message> handler) {
        messageHandler = handler != null ? handler : message -> { };
    }

    public void setGlobalMessageHandler(Consumer<Message> handler) {
        globalMessageHandler = handler != null ? handler : message -> { };
    }

    public void setConnectionErrorHandler(Consumer<String> handler) {
        errorHandler = handler != null ? handler : error -> { };
    }

    public boolean isConnected() {
        return connected;
    }
}
</file>

<file path="src/main/java/com/nihongoquest/client/ClientApp.java">
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
</file>

<file path="src/main/java/com/nihongoquest/server/GameServer.java">
package com.nihongoquest.server;

import com.nihongoquest.server.ranked.MatchmakingManager;
import com.nihongoquest.server.ranked.MatchRepository;
import com.nihongoquest.server.network.ClientHandler;
import com.nihongoquest.server.network.OnlineUserRegistry;
import com.nihongoquest.server.network.ServerRequestRouter;
import com.nihongoquest.server.network.TrafficEvent;
import com.nihongoquest.server.question.QuestionRepository;
import com.nihongoquest.server.question.QuestionService;
import com.nihongoquest.server.quiz.QuizSetRepository;
import com.nihongoquest.server.quiz.QuizSetService;
import com.nihongoquest.server.quizroom.QuizRoomManager;

import com.nihongoquest.common.protocol.Protocol;
import com.nihongoquest.server.database.Database;
import com.nihongoquest.server.player.PlayerRepository;
import com.nihongoquest.server.friend.FriendshipRepository;
import com.nihongoquest.server.friend.SocialService;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;
import java.util.logging.Logger;

/**
 * GameServer là entry point phía Server.
 * Sau này mở ServerSocket, lắng nghe Client, accept connection và tạo ClientHandler.
 *
 * ServerSocket dùng để mở một cổng TCP và chờ Client kết nối.
 */
public class GameServer {

    private static final Logger LOGGER = Logger.getLogger(GameServer.class.getName());

    private MatchmakingManager matchmakingManager;
    private final QuestionService questionService;
    private final PlayerRepository playerRepository;
    private final MatchRepository matchRepository;
    private final OnlineUserRegistry onlineUsers;
    private final ServerRequestRouter requestRouter;
    private final QuizRoomManager quizRoomManager;
    private final ScheduledExecutorService scheduler;
    private volatile boolean running;
    private ServerSocket serverSocket;
    private ExecutorService clientExecutor;
    private final Set<ClientHandler> clients = ConcurrentHashMap.newKeySet();
    private final List<Consumer<String>> activityListeners = new CopyOnWriteArrayList<>();
    private final List<Consumer<TrafficEvent>> trafficListeners = new CopyOnWriteArrayList<>();

    public GameServer() {
        Database database = new Database();
        this.questionService = new QuestionService(new QuestionRepository(database));
        this.playerRepository = new PlayerRepository(database);
        this.matchRepository = new MatchRepository(database);
        this.scheduler = Executors.newScheduledThreadPool(4, task -> {
            Thread thread = new Thread(task, "game-timer");
            thread.setDaemon(true);
            return thread;
        });
        this.onlineUsers = new OnlineUserRegistry();
        this.matchmakingManager = new MatchmakingManager(
                questionService, matchRepository, scheduler);
        QuizSetService quizSetService = new QuizSetService(new QuizSetRepository(database));
        this.quizRoomManager = new QuizRoomManager(quizSetService, scheduler);
        SocialService socialService = new SocialService(new FriendshipRepository(database),
                onlineUsers, matchmakingManager, quizRoomManager, scheduler);
        this.requestRouter = new ServerRequestRouter(
                matchmakingManager, playerRepository, onlineUsers, matchRepository,
                quizSetService, quizRoomManager, socialService);
        this.running = false;
    }

    /**
     * Khởi động server trên cổng chỉ định.
     */
    public void start(int port) {
        running = true;
        try {
            serverSocket = new ServerSocket(port);
            clientExecutor = Executors.newFixedThreadPool(50, task -> {
                Thread thread = new Thread(task, "client-handler");
                thread.setDaemon(true);
                return thread;
            });
            LOGGER.info("GameServer đang lắng nghe tại cổng " + port);
            publishActivity("Server đã khởi động tại cổng " + port);
            while (running) {
                Socket clientSocket = serverSocket.accept();
                ClientHandler handler = new ClientHandler(
                        clientSocket, requestRouter,
                        this::publishActivity, this::publishTraffic, this::clientDisconnected);
                clients.add(handler);
                publishActivity("Kết nối mới: " + clientSocket.getRemoteSocketAddress());
                try {
                    clientExecutor.submit(handler);
                } catch (RejectedExecutionException e) {
                    handler.close();
                }
            }
        } catch (IOException e) {
            if (running) {
                throw new IllegalStateException("Không thể chạy GameServer", e);
            }
        } finally {
            running = false;
        }
    }

    /**
     * Dừng server và dọn dẹp tài nguyên.
     */
    public void stop() {
        running = false;
        quizRoomManager.shutdown();
        clients.forEach(ClientHandler::close);
        clients.clear();
        if (serverSocket != null) {
            try {
                serverSocket.close();
            } catch (IOException ignored) {
                // Server đang dừng.
            }
        }
        if (clientExecutor != null) {
            clientExecutor.shutdownNow();
        }
        LOGGER.info("Đã dừng GameServer");
        publishActivity("Server đã dừng");
    }

    public MatchmakingManager getMatchmakingManager() {
        return matchmakingManager;
    }

    public QuestionService getQuestionService() {
        return questionService;
    }

    public boolean isRunning() {
        return running;
    }

    public void addActivityListener(Consumer<String> listener) {
        activityListeners.add(listener);
    }

    public void removeActivityListener(Consumer<String> listener) {
        activityListeners.remove(listener);
    }

    public void addTrafficListener(Consumer<TrafficEvent> listener) {
        trafficListeners.add(listener);
    }

    public void removeTrafficListener(Consumer<TrafficEvent> listener) {
        trafficListeners.remove(listener);
    }

    public List<ClientSnapshot> getClientSnapshots() {
        return clients.stream()
                .map(client -> new ClientSnapshot(
                        client,
                        client.getUsername() == null ? "Chưa đăng nhập" : client.getUsername(),
                        client.getRemoteAddress(),
                        client.getStatusText(),
                        client.getConnectedAt(),
                        client.getLastActivity()))
                .sorted(Comparator.comparing(ClientSnapshot::connectedAt))
                .toList();
    }

    public int getAuthenticatedCount() {
        return (int) clients.stream().filter(ClientHandler::isAuthenticated).count();
    }

    public int getPlayingCount() {
        return (int) clients.stream().filter(client -> client.getCurrentRoom() != null
                || (client.getCurrentQuizRoom() != null
                    && client.getCurrentQuizRoom().isRunning())).count();
    }

    public int getActiveRoomCount() {
        int rankedRooms = (int) clients.stream()
                .map(ClientHandler::getCurrentRoom)
                .filter(room -> room != null && !room.isFinished())
                .distinct()
                .count();
        return rankedRooms + quizRoomManager.activeRoomCount();
    }

    public void disconnectClient(ClientHandler client) {
        if (client != null && clients.contains(client)) {
            publishActivity("Quản trị viên ngắt kết nối " + client.getDisplayName());
            client.close();
        }
    }

    private void clientDisconnected(ClientHandler client) {
        clients.remove(client);
        publishActivity(client.getDisplayName() + " đã ngắt kết nối");
    }

    private void publishActivity(String message) {
        LOGGER.info(message);
        activityListeners.forEach(listener -> listener.accept(message));
    }

    private void publishTraffic(TrafficEvent event) {
        trafficListeners.forEach(listener -> listener.accept(event));
    }

    public record ClientSnapshot(
            ClientHandler handler,
            String username,
            String address,
            String status,
            Instant connectedAt,
            Instant lastActivity) {
    }

    /**
     * Chạy Server độc lập với Client.
     */
    public static void main(String[] args) {
        GameServer server = new GameServer();
        server.start(Protocol.DEFAULT_PORT);
    }
}
</file>

<file path="README.md">
# NihongoQuest

Hệ thống thi đấu tiếng Nhật thời gian thực theo mô hình client-server, dùng Java 21,
JavaFX, TCP Socket, JSON line protocol, JDBC PostgreSQL/Supabase và BCrypt.

## Nguyên tắc chính

- Client chỉ hiển thị UI và gửi/nhận TCP qua `GameClient`.
- Server giữ đáp án, timer, chấm điểm và quyết định kết quả.
- Mỗi frame là một JSON object UTF-8 kết thúc bằng xuống dòng.
- Câu hỏi chỉ được đọc từ PostgreSQL; không có ngân hàng JSON trong source.
- Không dùng Spring Boot, Hibernate, HTTP gameplay, WebSocket, RMI, TLS hoặc JWT.

## Chuẩn bị database

1. Chạy `sql/supabase_schema.sql` trong Supabase SQL Editor. Script này xóa dữ liệu cũ.
2. Tùy chọn chạy `sql/seed_demo.sql` để tạo ba tài khoản và một bộ đề N5.
3. Chạy `sql/verify_schema.sql` để kiểm tra.
4. Sao chép `src/main/resources/db.properties.example` thành `db.properties` và điền
   thông tin Supabase. Không commit file chứa mật khẩu.

Chi tiết schema: [docs/database.md](docs/database.md).

## Chạy chương trình

Yêu cầu JDK 21.

```powershell
.\mvnw.cmd clean test
.\mvnw.cmd -Pserver-dashboard javafx:run
```

Mở terminal khác để chạy client:

```powershell
.\mvnw.cmd javafx:run
```

Dashboard hiển thị IP LAN và mặc định mở TCP port `5000`. Client nhập IP đó để kết nối.

## Tài liệu

- [Kiến trúc](docs/architecture.md)
- [Giao thức TCP](docs/protocol.md)
- [Database](docs/database.md)
- [Lộ trình MVP](docs/roadmap.md)

## Trạng thái

Nền tảng hiện có đăng ký/đăng nhập BCrypt, dashboard, Ranked 1v1 theo chế độ 3/5 phút,
quản lý bộ đề, Quiz Room nhiều người bằng PIN, Top 10 Ranked, lịch sử 100 trận gần nhất,
bạn bè/presence và lời mời trực tiếp vào Ranked hoặc Quiz Room.
</file>

</files>
