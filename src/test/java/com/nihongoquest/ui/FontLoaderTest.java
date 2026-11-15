package com.nihongoquest.ui;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FontLoaderTest {

    @Test
    void bundledFontsArePackaged() {
        List<String> fonts = FontLoader.fontResources();
        assertTrue(fonts.stream().anyMatch(path -> path.contains("Nunito")),
                "Thiếu font heading Nunito");
        for (String path : fonts) {
            assertNotNull(FontLoaderTest.class.getResourceAsStream(path),
                    "Không tìm thấy font đóng gói: " + path);
        }
    }

    @Test
    void fontLicensesArePackaged() {
        for (String path : new String[]{
                "/licenses/Nunito-OFL.txt",
                "/licenses/BeVietnamPro-OFL.txt"}) {
            assertNotNull(FontLoaderTest.class.getResourceAsStream(path),
                    "Không tìm thấy license font: " + path);
        }
    }

    @Test
    void javaFxRegistersEveryBundledFont() {
        FontLoader.loadAll();
        assertTrue(FontLoader.loadedFontCount() == FontLoader.fontResources().size(),
                "Chỉ nạp được " + FontLoader.loadedFontCount() + "/"
                        + FontLoader.fontResources().size() + " font");
    }
}
