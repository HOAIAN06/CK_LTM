package com.nihongoquest.ui;

import javafx.scene.text.Font;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.logging.Logger;

/**
 * Nạp font đóng gói trong jar đúng một lần cho cả client và server dashboard.
 *
 * <p>JavaFX không hỗ trợ {@code @font-face} trong CSS, nên font phải được đăng ký
 * bằng {@link Font#loadFont(InputStream, double)} trước khi load FXML/CSS.</p>
 */
public final class FontLoader {

    private static final Logger LOGGER = Logger.getLogger(FontLoader.class.getName());

    private static final List<String> FONTS = List.of(
            "/client/fonts/BeVietnamPro-Regular.ttf",
            "/client/fonts/BeVietnamPro-Medium.ttf",
            "/client/fonts/BeVietnamPro-SemiBold.ttf",
            "/client/fonts/BeVietnamPro-Bold.ttf",
            "/client/fonts/Nunito-Bold.ttf",
            "/client/fonts/Nunito-ExtraBold.ttf"
    );

    private static volatile boolean loaded;
    private static volatile int loadedCount;

    private FontLoader() {
    }

    /** Danh sách resource font để test/kiểm tra đóng gói. */
    public static List<String> fontResources() {
        return FONTS;
    }

    /** Số font đã đăng ký thành công với JavaFX (dùng cho test). */
    public static int loadedFontCount() {
        return loadedCount;
    }

    /** Nạp toàn bộ font; gọi trên JavaFX Application Thread trước khi load màn hình đầu tiên. */
    public static synchronized void loadAll() {
        if (loaded) {
            return;
        }
        loaded = true;
        for (String path : FONTS) {
            try (InputStream stream = FontLoader.class.getResourceAsStream(path)) {
                if (stream == null) {
                    LOGGER.warning("Không tìm thấy font đóng gói: " + path);
                    continue;
                }
                Font font = Font.loadFont(stream, 14);
                if (font == null) {
                    LOGGER.warning("JavaFX không nạp được font: " + path);
                } else {
                    loadedCount++;
                    LOGGER.fine(() -> "Đã nạp font " + path + " -> " + font.getName()
                            + " (" + font.getFamily() + ")");
                }
            } catch (IOException e) {
                LOGGER.warning("Lỗi đọc font " + path + ": " + e.getMessage());
            }
        }
    }
}
