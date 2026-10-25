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
