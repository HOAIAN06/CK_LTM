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
