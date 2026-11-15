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
    void themeUsesCalmStudyPalette() throws IOException {
        String css = loadSharedTheme();
        // Design Tokens tập trung: palette Calm Study.
        for (String token : new String[]{
                "-ndq-primary: #315A63", "-ndq-primary-dark: #24444B",
                "-ndq-accent: #7A9E7E", "-ndq-sakura: #C98B72",
                "-ndq-sakura-deep: #A96852", "-ndq-coral: #C98B72",
                "-ndq-bg: #F7F7F2", "-ndq-surface: #FFFFFF", "-ndq-text: #24323A",
                "-ndq-text-secondary: #607078", "-ndq-border: #D9E2E0",
                "-ndq-sakura-soft: #F3E9E3", "-ndq-sakura-border: #DFC4B8",
                "-ndq-success: #55765A", "-ndq-warning: #A96852", "-ndq-error: #B94A48"}) {
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
    void quizFlowThemeDefinesSakuraComponentBlocks() throws IOException {
        String css = loadSharedTheme();
        for (String selector : new String[]{
                ".auth-brand-panel", ".auth-scroll", ".auth-server-pane",
                ".connection-status-pill",
                ".home-hero-card", ".home-mode-card", ".home-stat-value",
                ".quiz-action-card", ".quiz-steps-bar", ".pin-field",
                ".lobby-player-card", ".lobby-pin-panel", ".chip-camera-ok",
                ".lobby-action-bar",
                ".battle-hud", ".question-card", ".answer-letter",
                ".battle-side-panel", ".leaderboard-row.leaderboard-me",
                ".camera-caption"}) {
            assertTrue(css.contains(selector), "Thiếu component Phase 2: " + selector);
        }
    }

    @Test
    void serverDashboardSharesSakuraArcadeTokensAndFonts() throws IOException {
        String css = loadResource("/server/dashboard/server-dashboard.css");
        for (String token : new String[]{
                "-ndq-primary: #315A63", "-ndq-sakura: #C98B72",
                "-ndq-sakura-deep: #A96852", "-ndq-bg: #F7F7F2",
                "-ndq-text: #24323A", "-ndq-border: #D9E2E0"}) {
            assertTrue(css.contains(token), "Dashboard thiếu token: " + token);
        }
        assertTrue(css.contains("\"Nunito\""), "Dashboard thiếu heading Nunito");
        assertTrue(css.contains("\"Be Vietnam Pro\""), "Dashboard thiếu body Be Vietnam Pro");
    }
}
