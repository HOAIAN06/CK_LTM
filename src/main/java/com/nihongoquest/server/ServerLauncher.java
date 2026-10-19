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
