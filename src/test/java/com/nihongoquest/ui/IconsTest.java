package com.nihongoquest.ui;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class IconsTest {

    @Test
    void navigationIconPathsAreNotBlank() {
        for (String path : List.of(Icons.SWORDS, Icons.GAMEPAD, Icons.LAYERS, Icons.TROPHY,
                Icons.CLOCK, Icons.USERS, Icons.USER, Icons.LOGOUT)) {
            assertFalse(path.isBlank(), "Icon path rỗng");
        }
    }

    @Test
    void lucideLicenseIsPackaged() {
        assertNotNull(IconsTest.class.getResourceAsStream("/licenses/Lucide-ISC.txt"),
                "Thiếu license Lucide");
    }
}
