package com.nihongoquest.client;

import javafx.application.Application;

/** Plain Java entry point for IDE runs with JavaFX dependencies on the classpath. */
public final class ClientLauncher {
    private ClientLauncher() { }

    public static void main(String[] args) {
        Application.launch(ClientApp.class, args);
    }
}
