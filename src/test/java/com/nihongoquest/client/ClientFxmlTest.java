package com.nihongoquest.client;

import com.nihongoquest.server.dashboard.DashboardController;
import javafx.application.Platform;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.FutureTask;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertNotNull;

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
            "/client/home/home.fxml",
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
