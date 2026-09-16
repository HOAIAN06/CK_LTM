package com.nihongoquest.client;

import javafx.application.Application;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.stage.Stage;

/**
 * ClientApp là entry point của ứng dụng JavaFX phía Client.
 * Nhiệm vụ: khởi động JavaFX, tạo Stage chính và load màn hình home.fxml.
 * Sau này có thể bổ sung hàm chuyển đổi giữa các màn hình.
 */
public class ClientApp extends Application {

    @Override
    public void start(Stage primaryStage) throws Exception {
        FXMLLoader loader = new FXMLLoader(
                getClass().getResource("/fxml/home.fxml")
        );
        Parent root = loader.load();

        Scene scene = new Scene(root, 800, 600);
        scene.getStylesheets().add(
                getClass().getResource("/css/style.css").toExternalForm()
        );

        primaryStage.setTitle("NihongoQuest");
        primaryStage.setScene(scene);
        primaryStage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
