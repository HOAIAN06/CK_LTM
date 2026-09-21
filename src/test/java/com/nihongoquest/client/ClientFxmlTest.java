package com.nihongoquest.client;

import javafx.application.Platform;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
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
            "/fxml/login.fxml",
            "/fxml/home.fxml",
            "/fxml/matchmaking.fxml",
            "/fxml/battle.fxml",
            "/fxml/result.fxml"
    })
    void loadsClientScreen(String resource) throws Exception {
        FutureTask<Parent> load = new FutureTask<>(() -> {
            Parent root = new FXMLLoader(ClientFxmlTest.class.getResource(resource)).load();
            Scene scene = new Scene(root, 980, 680);
            scene.getStylesheets().add(
                    ClientFxmlTest.class.getResource("/css/style.css").toExternalForm());
            root.applyCss();
            root.layout();
            return root;
        });
        Platform.runLater(load);

        assertNotNull(load.get(10, TimeUnit.SECONDS));
    }
}
