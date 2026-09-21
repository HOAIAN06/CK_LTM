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
                getClass().getResource("/fxml/server-dashboard.fxml"));
        Parent root = loader.load();
        controller = loader.getController();

        Scene scene = new Scene(root, 1180, 760);
        scene.getStylesheets().add(
                getClass().getResource("/css/server-dashboard.css").toExternalForm());
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
