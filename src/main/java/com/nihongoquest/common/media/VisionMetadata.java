package com.nihongoquest.common.media;

import java.util.List;

/** Lightweight analysis result that is transported beside a video frame. */
public record VisionMetadata(long frameSequence, long analysedAtEpochMillis,
                             List<FaceBox> faces, double gazeX, double gazeY,
                             Attention attention, double confidence) {
    public VisionMetadata {
        faces = faces == null ? List.of() : List.copyOf(faces);
        attention = attention == null ? Attention.UNKNOWN : attention;
        confidence = Math.max(0, Math.min(1, confidence));
    }

    public static VisionMetadata unavailable(long sequence) {
        return new VisionMetadata(sequence, 0, List.of(), 0, 0, Attention.UNKNOWN, 0);
    }

    public enum Attention { LOOKING_AT_SCREEN, LOOKING_AWAY, NO_FACE, MULTIPLE_FACES, PHONE, UNKNOWN }

    /** Normalized 0..1 coordinates so overlays scale with any Canvas size. */
    public record FaceBox(double x, double y, double width, double height,
                          double leftEyeX, double leftEyeY, double rightEyeX, double rightEyeY) { }
}
