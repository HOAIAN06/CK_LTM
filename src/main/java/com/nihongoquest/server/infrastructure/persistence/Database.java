package com.nihongoquest.server.infrastructure.persistence;

import java.io.IOException;
import java.io.InputStream;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Properties;

public class Database {

    private final String url;
    private final String user;
    private final String password;

    public Database() {
        Properties properties = loadProperties();
        String host = require(properties, "db.host");
        String port = properties.getProperty("db.port", "5432");
        String name = properties.getProperty("db.name", "postgres");
        String ssl = properties.getProperty("db.ssl", "true");

        this.url = "jdbc:postgresql://" + host + ":" + port + "/" + name
                + "?sslmode=" + (Boolean.parseBoolean(ssl) ? "require" : "disable");
        this.user = require(properties, "db.user");
        this.password = require(properties, "db.password");
    }

    public Connection getConnection() throws SQLException {
        return DriverManager.getConnection(url, user, password);
    }

    private Properties loadProperties() {
        Properties properties = new Properties();
        try (InputStream input = Database.class.getResourceAsStream("/db.properties")) {
            if (input == null) {
                throw new IllegalStateException(
                        "Thiếu db.properties. Hãy sao chép db.properties.example và điền cấu hình Supabase.");
            }
            properties.load(input);
            return properties;
        } catch (IOException e) {
            throw new IllegalStateException("Không thể đọc db.properties", e);
        }
    }

    private String require(Properties properties, String key) {
        String value = properties.getProperty(key);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Thiếu cấu hình " + key);
        }
        return value.trim();
    }
}
