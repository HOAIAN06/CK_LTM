package com.nihongoquest.common.logging;

import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Locale;
import java.util.logging.FileHandler;
import java.util.logging.Formatter;
import java.util.logging.Handler;
import java.util.logging.Level;
import java.util.logging.LogRecord;
import java.util.logging.Logger;

/** Cấu hình log file xoay vòng dùng chung cho client và server. */
public final class RuntimeLog {
    private static final int LOG_LIMIT_BYTES = 2 * 1024 * 1024;
    private static final int LOG_FILE_COUNT = 5;
    private static boolean configured;

    private RuntimeLog() { }

    public static synchronized void configure(String role) {
        if (configured) return;
        String safeRole = role == null ? "application"
                : role.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9_-]", "-");
        try {
            Path directory = logDirectory();
            Files.createDirectories(directory);
            FileHandler file = new FileHandler(directory.resolve(safeRole + ".log").toString(),
                    LOG_LIMIT_BYTES, LOG_FILE_COUNT, true);
            file.setEncoding("UTF-8");
            file.setLevel(Level.ALL);
            file.setFormatter(new DiagnosticFormatter());
            Logger root = Logger.getLogger("");
            root.addHandler(file);
            root.setLevel(Level.INFO);
            configured = true;
            Logger.getLogger(RuntimeLog.class.getName()).info(
                    () -> "runtime_log_ready role=" + safeRole + " directory=" + directory);
        } catch (IOException | SecurityException error) {
            Logger.getLogger(RuntimeLog.class.getName()).log(Level.WARNING,
                    "Không thể tạo runtime log file; tiếp tục dùng console", error);
        }
    }

    public static String maskPin(String pin) {
        if (pin == null || pin.isBlank()) return "none";
        String normalized = pin.trim();
        if (normalized.length() <= 2) return "**";
        return "****" + normalized.substring(normalized.length() - 2);
    }

    private static Path logDirectory() {
        String configuredDirectory = System.getProperty("nihongoquest.log.dir");
        if (configuredDirectory != null && !configuredDirectory.isBlank()) {
            return Path.of(configuredDirectory).toAbsolutePath().normalize();
        }
        Path workingDirectory = Path.of(System.getProperty("user.dir", "."))
                .toAbsolutePath().normalize();
        if (Files.isRegularFile(workingDirectory.resolve("pom.xml"))) {
            return workingDirectory.resolve("logs");
        }
        return Path.of(System.getProperty("user.home"), ".nihongoquest", "logs")
                .toAbsolutePath().normalize();
    }

    private static final class DiagnosticFormatter extends Formatter {
        @Override
        public String format(LogRecord record) {
            String thrown = "";
            if (record.getThrown() != null) {
                StringWriter stack = new StringWriter();
                record.getThrown().printStackTrace(new PrintWriter(stack));
                thrown = System.lineSeparator() + stack;
            }
            return "%s level=%s thread=%s logger=%s %s%s%n".formatted(
                    Instant.ofEpochMilli(record.getMillis()), record.getLevel().getName(),
                    Thread.currentThread().getName(), record.getLoggerName(),
                    formatMessage(record).replace('\n', ' '), thrown);
        }
    }
}
