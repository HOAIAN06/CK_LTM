package com.nihongoquest.ui;

import javafx.scene.paint.Color;
import javafx.scene.shape.SVGPath;

/**
 * Bộ icon SVG nội tuyến dùng chung cho client.
 *
 * <p>Mỗi icon là một {@link SVGPath} 24×24, tô trong suốt và dùng stroke để
 * đồng bộ với theme Sakura Arcade. Đường dẫn lấy từ bộ Lucide (giấy phép ISC)
 * và được rút gọn cho đúng nhu cầu điều hướng.</p>
 */
public final class Icons {

    public static final String SWORDS =
            "M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M5 14l6 6M2 22l3-3";
    public static final String GAMEPAD =
            "M6 12h4M8 10v4M15 13h.01M18 11h.01M17.32 5H6.68a4 4 0 0 0-3.978 3.59"
                    + "c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3"
                    + "c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1"
                    + "1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584"
                    + "-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z";
    public static final String LAYERS =
            "m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91"
                    + "a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83ZM22 17.65l-9.17 4.16"
                    + "a2 2 0 0 1-1.66 0L2 17.65M22 12.65l-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65";
    public static final String TROPHY =
            "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16"
                    + "M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"
                    + "M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"
                    + "M18 2H6v7a6 6 0 0 0 12 0V2Z";
    public static final String CLOCK =
            "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5M12 7v5l4 2";
    public static final String USERS =
            "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8"
                    + "M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75";
    public static final String USER =
            "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8";
    public static final String LOGOUT =
            "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9";

    private static final Color DEFAULT_STROKE = Color.web("#64748B");

    private Icons() {
    }

    /** Tạo icon stroke 24×24; style class cho phép theme đổi màu theo trạng thái. */
    public static SVGPath icon(String path) {
        SVGPath icon = new SVGPath();
        icon.setContent(path);
        icon.setFill(Color.TRANSPARENT);
        icon.setStroke(DEFAULT_STROKE);
        icon.setStrokeWidth(2);
        icon.getStyleClass().add("nav-icon");
        icon.setMouseTransparent(true);
        return icon;
    }
}
