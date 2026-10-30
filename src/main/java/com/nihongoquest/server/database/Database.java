package com.nihongoquest.server.database;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Properties;

/** Mở kết nối JDBC tới PostgreSQL từ cấu hình cục bộ db.properties. */
public class Database {

    private final String url;
    private final String user;
    private final String password;

    public Database() {
        Properties properties = loadProperties();
        String host = require(properties, "db.host");
        String port = properties.getProperty("db.port", "5432");
        String name = properties.getProperty("db.name", "postgres");
        boolean ssl = Boolean.parseBoolean(properties.getProperty("db.ssl", "true"));
        url = "jdbc:postgresql://" + host + ":" + port + "/" + name
                + "?sslmode=" + (ssl ? "require" : "disable");
        user = require(properties, "db.user");
        password = require(properties, "db.password");
    }

    /** Constructor dành cho test hoặc cấu hình được truyền rõ ràng. */
    public Database(String url, String user, String password) {
        this.url = url;
        this.user = user;
        this.password = password;
    }

    public Connection getConnection() throws SQLException {
        return DriverManager.getConnection(url, user, password);
    }

    private Properties loadProperties() {
        Properties properties = new Properties();
        String explicit = System.getProperty("nihongoquest.db.config");
        Path[] candidates = explicit == null ? new Path[]{
                Path.of(System.getProperty("user.home"), ".nihongoquest", "db.properties"),
                Path.of("db.properties"),
                Path.of("src", "main", "resources", "db.properties")
        } : new Path[]{Path.of(explicit)};
        for (Path candidate : candidates) {
            if (!Files.isRegularFile(candidate)) continue;
            try (InputStream input = Files.newInputStream(candidate)) {
                properties.load(input);
                return properties;
            } catch (IOException error) {
                throw new IllegalStateException("Không thể đọc db.properties: " + candidate, error);
            }
        }
        try (InputStream input = Database.class.getResourceAsStream("/db.properties")) {
            if (input != null) {
                properties.load(input);
                return properties;
            }
        } catch (IOException error) {
            throw new IllegalStateException("Không thể đọc db.properties", error);
        }
        throw new IllegalStateException("Thiếu db.properties. Đặt tại ~/.nihongoquest/db.properties hoặc truyền -Dnihongoquest.db.config.");
    }

    private String require(Properties properties, String key) {
        String value = properties.getProperty(key);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Thiếu cấu hình " + key);
        }
        return value.trim();
    }
}
