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
