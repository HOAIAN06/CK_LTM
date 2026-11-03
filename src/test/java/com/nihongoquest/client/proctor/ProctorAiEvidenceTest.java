package com.nihongoquest.client.proctor;

import org.junit.jupiter.api.Test;

import java.awt.Color;
import java.awt.image.BufferedImage;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProctorAiEvidenceTest {
    @Test
    void darkOrFlatFramesAreUnknownEvidence() {
        BufferedImage dark = new BufferedImage(24, 24, BufferedImage.TYPE_3BYTE_BGR);
        BufferedImage flat = new BufferedImage(24, 24, BufferedImage.TYPE_3BYTE_BGR);
        var graphics = flat.createGraphics();
        graphics.setColor(new Color(120, 120, 120));
        graphics.fillRect(0, 0, 24, 24);
        graphics.dispose();

        assertFalse(ProctorAiEngine.hasUsableEvidence(dark));
        assertFalse(ProctorAiEngine.hasUsableEvidence(flat));
    }

    @Test
    void variedWellLitFrameCanBeUsedAsEvidence() {
        BufferedImage image = new BufferedImage(36, 36, BufferedImage.TYPE_3BYTE_BGR);
        for (int y = 0; y < image.getHeight(); y++) {
            for (int x = 0; x < image.getWidth(); x++) {
                image.setRGB(x, y, ((x / 12 + y / 12) & 1) == 0
                        ? Color.WHITE.getRGB() : Color.DARK_GRAY.getRGB());
            }
        }
        assertTrue(ProctorAiEngine.hasUsableEvidence(image));
    }
}
