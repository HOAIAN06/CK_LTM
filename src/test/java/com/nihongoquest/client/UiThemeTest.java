package com.nihongoquest.client;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UiThemeTest {

    private static String loadSharedTheme() throws IOException {
        var resource = UiThemeTest.class.getResourceAsStream("/client/shared/style.css");
        assertNotNull(resource);
        try (resource) {
            return new String(resource.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    @Test
    void sharedThemeDefinesRequiredInteractionAndSemanticStates() throws IOException {
        String css = loadSharedTheme();
        for (String selector : new String[]{
                ".button:hover", ".button:pressed", ".button:focused", ".button:disabled",
                ".status-success", ".status-error", ".loading-state", ".empty-state",
                ".answer-correct", ".answer-wrong", ".camera-warning"}) {
            assertTrue(css.contains(selector), "Thiếu UI state: " + selector);
        }
    }

    @Test
    void themeUsesIndigoCyanEdtechPalette() throws IOException {
        String css = loadSharedTheme();
        // Design Tokens tập trung: palette Indigo/Cyan theo yêu cầu.
        for (String token : new String[]{
                "-ndq-primary: #4F46E5", "-ndq-primary-dark: #3730A3", "-ndq-accent: #06B6D4",
                "-ndq-bg: #F5F7FB", "-ndq-surface: #FFFFFF", "-ndq-text: #172033",
                "-ndq-text-secondary: #64748B", "-ndq-border: #E2E8F0",
                "-ndq-success: #16A34A", "-ndq-warning: #D97706", "-ndq-error: #DC2626"}) {
            assertTrue(css.contains(token), "Thiếu design token: " + token);
        }
        // Nền sáng: không có nền tối toàn cục.
        assertTrue(css.contains("-fx-background-color: -ndq-bg;"),
                "Thiếu nền sáng tham chiếu token -ndq-bg");
    }

    @Test
    void themeCentralizesColorsInDesignTokens() throws IOException {
        String css = loadSharedTheme();
        // Token phải được khai báo trên .root.
        assertTrue(css.contains(".root {"), "Thiếu khối token .root");
        // Không dùng lại màu xanh lá Duolingo làm nhận diện.
        for (String legacyGreen : new String[]{"#58cc02", "#46a302", "#1cb0f6", "#2b6cb0", "#183b66"}) {
            assertTrue(!css.contains(legacyGreen),
                    "Còn sót màu theme cũ: " + legacyGreen);
        }
        // Mọi selector nghiệp vụ phải tham chiếu token -ndq-* (đếm tham chiếu > 40).
        int references = css.split("-ndq-", -1).length - 1;
        assertTrue(references > 40, "Chưa token hóa đủ: chỉ có " + references + " tham chiếu -ndq-");
    }

    @Test
    void themeDefinesAnimationSystemComponents() throws IOException {
        String css = loadSharedTheme();
        for (String selector : new String[]{
                ".skeleton-line", ".skeleton-card", ".toast-card", ".rank-badge",
                ".countdown-critical", ".toast-banner", ".camera-tile.camera-ok",
                ".camera-tile.camera-warning", ".camera-tile.camera-error"}) {
            assertTrue(css.contains(selector), "Thiếu component theme v2: " + selector);
        }
    }
}
