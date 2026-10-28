package com.nihongoquest.client.proctor;

import java.awt.image.BufferedImage;

/** Immutable camera sample shared by preview, analysis and media transport. */
public record CapturedFrame(long sequence, long capturedAtEpochMillis,
                            byte[] jpeg, BufferedImage image) {
    public CapturedFrame {
        jpeg = jpeg.clone();
    }
}
