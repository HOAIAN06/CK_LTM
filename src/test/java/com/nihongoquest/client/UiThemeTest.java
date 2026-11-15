package com.nihongoquest.client;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UiThemeTest {

    private static String loadSharedTheme() throws IOException {
        return loadResource("/client/shared/style.css");
    }

    private static String loadResource(String path) throws IOException {
        var resource = UiThemeTest.class.getResourceAsStream(path);
        assertNotNull(resource, "Không tìm thấy resource: " + path);
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
    void themeUsesSakuraArcadePalette() throws IOException {
        String css = loadSharedTheme();
        // Design Tokens tập trung: palette Sakura Arcade (D-017).
        for (String token : new String[]{
                "-ndq-primary: #4F46E5", "-ndq-primary-dark: #3730A3",
                "-ndq-accent: #06B6D4", "-ndq-sakura: #F472B6",
                "-ndq-sakura-deep: #DB2777", "-ndq-coral: #FB7185",
                "-ndq-bg: #FFF7FA", "-ndq-surface: #FFFFFF", "-ndq-text: #1E1B4B",
                "-ndq-text-secondary: #64748B", "-ndq-border: #FBCFE8",
                "-ndq-sakura-soft: #FCE7F3", "-ndq-sakura-border: #FBCFE8",
                "-ndq-success: #16A34A", "-ndq-warning: #D97706", "-ndq-error: #DC2626"}) {
            assertTrue(css.contains(token), "Thiếu design token: " + token);
        }
        // Nền sáng: không có nền tối toàn cục.
        assertTrue(css.contains("-fx-background-color: -ndq-bg;"),
                "Thiếu nền sáng tham chiếu token -ndq-bg");
    }

    @Test
    void themeBundlesNunitoHeadingsAndBeVietnamProBody() throws IOException {
        String css = loadSharedTheme();
        assertTrue(css.contains("\"Be Vietnam Pro\""), "Thiếu body font Be Vietnam Pro");
        assertTrue(css.contains("\"Nunito\""), "Thiếu heading font Nunito");
        assertTrue(css.contains("\"Noto Sans JP\""), "Thiếu fallback tiếng Nhật Noto Sans JP");
        // Heading phải được khai báo thành một nhóm dùng chung.
        int headingRule = css.indexOf("\"Nunito\"");
        assertTrue(headingRule > 0, "Thiếu rule heading Nunito");
    }

    @Test
    void themeCentralizesColorsInDesignTokens() throws IOException {
        String css = loadSharedTheme();
        // Token phải được khai báo trên .root.
        assertTrue(css.contains(".root {"), "Thiếu khối token .root");
        // Không dùng lại màu xanh lá Duolingo hoặc palette Indigo/Cyan cũ.
        for (String legacy : new String[]{
                "#58cc02", "#46a302", "#1cb0f6", "#2b6cb0", "#183b66",
                "#F5F7FB", "#172033"}) {
            assertTrue(!css.contains(legacy),
                    "Còn sót màu theme cũ: " + legacy);
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
                ".camera-tile.camera-warning", ".camera-tile.camera-error",
                ".nav-icon", ".sidebar-logo", ".sidebar-section-label", ".header-accent"}) {
            assertTrue(css.contains(selector), "Thiếu component theme v2: " + selector);
        }
    }

    @Test
    void serverDashboardSharesSakuraArcadeTokensAndFonts() throws IOException {
        String css = loadResource("/server/dashboard/server-dashboard.css");
        for (String token : new String[]{
                "-ndq-primary: #4F46E5", "-ndq-sakura: #F472B6",
                "-ndq-sakura-deep: #DB2777", "-ndq-bg: #FFF7FA",
                "-ndq-text: #1E1B4B", "-ndq-border: #FBCFE8"}) {
            assertTrue(css.contains(token), "Dashboard thiếu token: " + token);
        }
        assertTrue(css.contains("\"Nunito\""), "Dashboard thiếu heading Nunito");
        assertTrue(css.contains("\"Be Vietnam Pro\""), "Dashboard thiếu body Be Vietnam Pro");
    }
}
