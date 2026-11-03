package com.nihongoquest.client.proctor;

import com.nihongoquest.common.media.VisionMetadata;
import javafx.animation.AnimationTimer;
import javafx.embed.swing.SwingFXUtils;
import javafx.scene.canvas.Canvas;
import javafx.scene.canvas.GraphicsContext;
import javafx.scene.image.Image;
import javafx.scene.layout.StackPane;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;

import java.awt.image.BufferedImage;

/** 60 Hz JavaFX renderer. Producers only replace the latest frame; they never block UI. */
public final class VideoCanvas extends StackPane {
    private final Canvas canvas = new Canvas();
    private volatile BufferedImage bufferedFrame;
    private volatile Image fxFrame;
    private volatile VisionMetadata vision = VisionMetadata.unavailable(0);
    private volatile String hud = "Đang chờ camera";
    private long lastPaintNanos;
    private int paintedFrames;
    private volatile int renderFps;
    private BufferedImage renderedBufferedFrame;
    private Image renderedImage;
    private long lastFrameIdentity;

    public VideoCanvas(double width, double height) {
        setMinSize(120, 90);
        setPrefSize(width, height);
        canvas.widthProperty().bind(widthProperty());
        canvas.heightProperty().bind(heightProperty());
        getChildren().add(canvas);
        new AnimationTimer() {
            @Override public void handle(long now) { paint(now); }
        }.start();
    }

    public void setFrame(BufferedImage frame) { bufferedFrame = frame; }
    public void setFrame(Image frame) { fxFrame = frame; bufferedFrame = null; }
    public void setVision(VisionMetadata value) { if (value != null) vision = value; }
    public void setHud(String value) { hud = value == null ? "" : value; }
    public int renderFps() { return renderFps; }

    private void paint(long now) {
        GraphicsContext graphics = canvas.getGraphicsContext2D();
        double width = canvas.getWidth(), height = canvas.getHeight();
        if (width <= 1 || height <= 1) return;
        Image image = fxFrame;
        BufferedImage buffered = bufferedFrame;
        if (buffered != null && buffered != renderedBufferedFrame) {
            renderedBufferedFrame = buffered;
            renderedImage = SwingFXUtils.toFXImage(buffered, null);
            lastFrameIdentity = System.identityHashCode(buffered);
            paintedFrames++;
        }
        if (buffered != null) image = renderedImage;
        else if (image != null && System.identityHashCode(image) != lastFrameIdentity) {
            lastFrameIdentity = System.identityHashCode(image);
            paintedFrames++;
        }
        graphics.setFill(Color.web("#101827"));
        graphics.fillRect(0, 0, width, height);
        if (image != null) {
            double ratio = Math.min(width / image.getWidth(), height / image.getHeight());
            double drawWidth = image.getWidth() * ratio, drawHeight = image.getHeight() * ratio;
            double left = (width - drawWidth) / 2, top = (height - drawHeight) / 2;
            graphics.drawImage(image, left, top, drawWidth, drawHeight);
            drawOverlay(graphics, left, top, drawWidth, drawHeight);
        }
        graphics.setFill(Color.color(0, 0, 0, .66));
        graphics.fillRoundRect(8, 8, Math.max(110, hud.length() * 7.5), 25, 8, 8);
        graphics.setFill(Color.WHITE);
        graphics.setFont(Font.font("System", 12));
        graphics.fillText(hud + " • " + renderFps + " FPS", 14, 25);
        if (lastPaintNanos == 0) lastPaintNanos = now;
        if (now - lastPaintNanos >= 1_000_000_000L) {
            renderFps = paintedFrames;
            paintedFrames = 0;
            lastPaintNanos = now;
        }
    }

    private void drawOverlay(GraphicsContext graphics, double left, double top,
                             double width, double height) {
        VisionMetadata value = vision;
        long age = value.analysedAtEpochMillis() == 0 ? Long.MAX_VALUE
                : System.currentTimeMillis() - value.analysedAtEpochMillis();
        if (age > 500) return;
        Color color = switch (value.attention()) {
            case LOOKING_AT_SCREEN -> Color.web("#38d996");
            case LOOKING_AWAY, PHONE, MULTIPLE_FACES -> Color.web("#ffbe3b");
            case NO_FACE -> Color.web("#ff5a5f");
            default -> Color.web("#76b7ff");
        };
        graphics.setStroke(color); graphics.setLineWidth(2.4);
        for (VisionMetadata.FaceBox face : value.faces()) {
            double x = left + face.x() * width, y = top + face.y() * height;
            double w = face.width() * width, h = face.height() * height;
            graphics.strokeRoundRect(x, y, w, h, 8, 8);
            double eyeX = left + (face.leftEyeX() + face.rightEyeX()) * width / 2;
            double eyeY = top + (face.leftEyeY() + face.rightEyeY()) * height / 2;
            graphics.strokeOval(eyeX - 3, eyeY - 3, 6, 6);
            graphics.strokeLine(eyeX, eyeY, eyeX + value.gazeX() * 42,
                    eyeY + value.gazeY() * 42);
        }
        graphics.setFill(color);
        graphics.fillText(attentionText(value.attention()), left + 8, top + 20);
    }

    private static String attentionText(VisionMetadata.Attention attention) {
        return switch (attention) {
            case LOOKING_AT_SCREEN -> "Nhìn màn hình";
            case LOOKING_AWAY -> "Nhìn lệch";
            case NO_FACE -> "Không thấy mặt";
            case MULTIPLE_FACES -> "Nhiều người";
            case PHONE -> "Điện thoại";
            default -> "Đang phân tích";
        };
    }
}
