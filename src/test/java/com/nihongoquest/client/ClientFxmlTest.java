package com.nihongoquest.client;

import com.nihongoquest.client.layout.AuthenticatedRoute;
import com.nihongoquest.client.layout.AuthenticatedShellController;
import com.nihongoquest.server.dashboard.DashboardController;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.ui.FontLoader;
import javafx.application.Platform;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.ComboBox;
import javafx.scene.control.Label;
import javafx.scene.layout.Pane;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.TilePane;
import javafx.scene.layout.VBox;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.concurrent.CountDownLatch;
import java.util.ArrayList;
import java.util.List;
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
            "/client/quiz/proctor-dashboard.fxml",
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

    @Test
    void proctorDashboardRendersTwentyTilesAndFiltersAndZooms() throws Exception {
        FutureTask<boolean[]> check = new FutureTask<>(() -> {
            FXMLLoader loader = new FXMLLoader(ClientFxmlTest.class.getResource(
                    "/client/quiz/proctor-dashboard.fxml"));
            Parent root = loader.load();
            new Scene(root, 980, 680); root.applyCss(); root.layout();
            var controller = loader.getController();
            List<Payloads.QuizLobbyPlayer> players = new ArrayList<>();
            for (int i = 0; i < 20; i++) players.add(new Payloads.QuizLobbyPlayer(
                    i + 2, "player" + i, false, true, true,
                    Payloads.CameraStatus.READY, Payloads.CalibrationStatus.READY, i % 2));
            Payloads.QuizLobbyData lobby = new Payloads.QuizLobbyData("123456", "Demo",
                    "host", true, false, true, true, 20, players);
            var update = controller.getClass().getDeclaredMethod("updateLobby",
                    Payloads.QuizLobbyData.class);
            update.setAccessible(true);
            update.invoke(controller, lobby);
            TilePane grid = (TilePane) root.lookup("#cameraGrid");
            boolean twenty = grid.getChildren().size() == 20;
            @SuppressWarnings("unchecked")
            ComboBox<String> filter = (ComboBox<String>) root.lookup("#filterBox");
            filter.getSelectionModel().select("Đang cảnh báo");
            boolean filtered = grid.getChildren().size() == 10;
            filter.getSelectionModel().select("Tất cả");
            grid.getChildren().getFirst().getOnMouseClicked().handle(null);
            boolean zoomed = grid.getChildren().size() == 1
                    && grid.getPrefTileWidth() == 800;
            return new boolean[]{twenty, filtered, zoomed};
        });
        Platform.runLater(check);
        boolean[] result = check.get(10, TimeUnit.SECONDS);
        assertTrue(result[0]); assertTrue(result[1]); assertTrue(result[2]);
    }

    @Test
    void headingResolvesToBundledNunito() throws Exception {
        FutureTask<String> check = new FutureTask<>(() -> {
            FontLoader.loadAll();
            Label label = new Label("Sakura");
            label.getStyleClass().add("title");
            StackPane root = new StackPane(label);
            Scene scene = new Scene(root, 320, 120);
            scene.getStylesheets().add(ClientFxmlTest.class.getResource(
                    "/client/shared/style.css").toExternalForm());
            root.applyCss();
            root.layout();
            return label.getFont().getFamily() + "|" + label.getFont().getStyle();
        });
        Platform.runLater(check);
        String font = check.get(10, TimeUnit.SECONDS);
        assertTrue(font.startsWith("Nunito"), "Heading phải dùng Nunito: " + font);
    }

    @Test
    void shellMarksHomeActiveAndKeepsSidebarVisible() throws Exception {
        FutureTask<boolean[]> check = new FutureTask<>(() -> {
            FXMLLoader loader = new FXMLLoader(ClientFxmlTest.class.getResource(
                    "/client/layout/authenticated-shell.fxml"));
            Parent root = loader.load();
            AuthenticatedShellController controller = loader.getController();
            Button homeButton = (Button) root.lookup("#homeButton");
            VBox sidebar = (VBox) root.lookup("#sidebar");
            assertNotNull(homeButton, "Shell phải có nút Trang chủ");

            controller.showContent(new Pane(), "Trang chủ", "",
                    AuthenticatedRoute.HOME, true);
            return new boolean[]{
                    homeButton.getStyleClass().contains("active"),
                    sidebar.isVisible() && sidebar.isManaged()};
        });
        Platform.runLater(check);

        boolean[] result = check.get(10, TimeUnit.SECONDS);
        assertTrue(result[0]);
        assertTrue(result[1]);
    }

    @Test
    void phaseTwoScreensRenderSakuraBlocks() throws Exception {
        FutureTask<boolean[]> check = new FutureTask<>(() -> {
            Parent login = loadStyled("/client/auth/login.fxml");
            boolean loginOk = login.lookup(".auth-brand-panel") != null
                    && login.lookup(".auth-scroll") != null
                    && login.lookup("#serverConfigPane") != null
                    && login.lookup(".connection-status-pill") != null;

            Parent home = loadStyled("/client/home/home.fxml");
            boolean homeOk = home.lookup(".home-hero-card") != null
                    && home.lookupAll(".home-mode-card").size() == 3
                    && home.lookupAll(".home-stat").size() == 3;

            Parent menu = loadStyled("/client/quiz/quiz-room-menu.fxml");
            boolean menuOk = menu.lookupAll(".quiz-action-card").size() == 2
                    && menu.lookup(".quiz-steps-bar") != null
                    && menu.lookup(".quiz-step-divider") != null
                    && menu.lookup(".pin-field") != null;

            Parent lobby = loadStyled("/client/quiz/quiz-lobby.fxml");
            boolean lobbyOk = lobby.lookup(".lobby-player-list") != null
                    && lobby.lookup("#cameraPanel") != null
                    && lobby.lookup(".lobby-pin-panel") != null
                    && lobby.lookup(".lobby-action-bar") != null;

            Parent battle = loadStyled("/client/quiz/quiz-battle.fxml");
            boolean battleOk = battle.lookup(".battle-hud") != null
                    && battle.lookup(".question-card") != null
                    && battle.lookup(".battle-side-panel") != null
                    && battle.lookupAll(".answer-button").size() == 4
                    && battle.lookupAll(".answer-letter").size() == 4;
            return new boolean[]{loginOk, homeOk, menuOk, lobbyOk, battleOk};
        });
        Platform.runLater(check);

        boolean[] result = check.get(10, TimeUnit.SECONDS);
        assertTrue(result[0], "Login thiếu khối brand/cấu hình server");
        assertTrue(result[1], "Trang chủ thiếu hero hoặc 3 mode card");
        assertTrue(result[2], "Quiz Room thiếu action card/bước/PIN field");
        assertTrue(result[3], "Lobby thiếu player list/camera/action bar");
        assertTrue(result[4], "Battle thiếu HUD/question/4 đáp án");
    }

    private static Parent loadStyled(String resource) {
        try {
            FXMLLoader loader = new FXMLLoader(ClientFxmlTest.class.getResource(resource));
            Parent root = loader.load();
            Scene scene = new Scene(root, 1180, 720);
            scene.getStylesheets().add(ClientFxmlTest.class.getResource(
                    "/client/shared/style.css").toExternalForm());
            root.applyCss();
            root.layout();
            return root;
        } catch (Exception e) {
            throw new IllegalStateException("Không load được " + resource, e);
        }
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
