package com.nihongoquest.client.ui;

import javafx.animation.FadeTransition;
import javafx.animation.Interpolator;
import javafx.animation.KeyFrame;
import javafx.animation.KeyValue;
import javafx.animation.ParallelTransition;
import javafx.animation.ScaleTransition;
import javafx.animation.SequentialTransition;
import javafx.animation.Timeline;
import javafx.animation.TranslateTransition;
import javafx.scene.Node;
import javafx.util.Duration;

/**
 * Hệ thống chuyển động ngắn, không chặn JavaFX Application Thread và không ảnh hưởng
 * logic gameplay, camera capture hay network.
 *
 * Nguyên tắc:
 * - Ưu tiên JavaFX Animation API có sẵn; không thêm thư viện ngoài.
 * - Mọi animation đều ngắn (<= 320ms) và đều có thể tắt.
 * - Có cờ {@code enabled} toàn cục để giảm/tắt animation khi máy yếu.
 */
public final class UiMotion {

    private static final Duration ENTER_DURATION = Duration.millis(190);
    private static final Duration FEEDBACK_DURATION = Duration.millis(110);
    private static final Duration SLIDE_DURATION = Duration.millis(240);
    private static final Duration SHAKE_DURATION = Duration.millis(70);
    private static final Duration TOAST_DURATION = Duration.millis(220);
    private static final Duration CELEBRATE_DURATION = Duration.millis(320);

    /** Cho phép tắt toàn bộ animation để tiết kiệm tài nguyên khi cần. */
    private static volatile boolean enabled = true;

    private UiMotion() { }

    public static boolean isEnabled() { return enabled; }

    public static void setEnabled(boolean value) { enabled = value; }

    /** Page transition: fade + slide dọc khi màn hình mới được gắn vào shell. */
    public static void enter(Node node) {
        if (!enabled || node == null) return;
        node.setOpacity(0);
        node.setTranslateY(10);
        FadeTransition fade = new FadeTransition(ENTER_DURATION, node);
        fade.setFromValue(0);
        fade.setToValue(1);
        TranslateTransition slide = new TranslateTransition(ENTER_DURATION, node);
        slide.setFromY(10);
        slide.setToY(0);
        new ParallelTransition(fade, slide).play();
    }

    /** Fade in đơn giản cho card/toast/overlay. */
    public static void fadeIn(Node node) {
        if (!enabled || node == null) return;
        node.setOpacity(0);
        FadeTransition fade = new FadeTransition(ENTER_DURATION, node);
        fade.setFromValue(0);
        fade.setToValue(1);
        fade.play();
    }

    /** Fade out rồi chạy hành động sau khi kết thúc (không chặn thread). */
    public static void fadeOut(Node node, Runnable onFinished) {
        if (node == null) return;
        if (!enabled) {
            node.setOpacity(0);
            if (onFinished != null) onFinished.run();
            return;
        }
        FadeTransition fade = new FadeTransition(ENTER_DURATION, node);
        fade.setFromValue(node.getOpacity() == 0 ? 1 : node.getOpacity());
        fade.setToValue(0);
        if (onFinished != null) fade.setOnFinished(ignored -> onFinished.run());
        fade.play();
    }

    /** Slide transition theo trục X, dùng cho drawer/sidebar/toast. */
    public static void slideIn(Node node, double fromX) {
        if (!enabled || node == null) return;
        node.setOpacity(0);
        node.setTranslateX(fromX);
        TranslateTransition slide = new TranslateTransition(SLIDE_DURATION, node);
        slide.setFromX(fromX);
        slide.setToX(0);
        slide.setInterpolator(Interpolator.EASE_OUT);
        FadeTransition fade = new FadeTransition(SLIDE_DURATION, node);
        fade.setFromValue(0);
        fade.setToValue(1);
        new ParallelTransition(slide, fade).play();
    }

    /** Feedback đúng/sai: scale hai chiều nhẹ. */
    public static void feedback(Node node) {
        if (!enabled || node == null) return;
        ScaleTransition grow = new ScaleTransition(FEEDBACK_DURATION, node);
        grow.setFromX(1);
        grow.setFromY(1);
        grow.setToX(1.035);
        grow.setToY(1.035);
        grow.setAutoReverse(true);
        grow.setCycleCount(2);
        grow.play();
    }

    /** Pulse cho đáp án đúng và cập nhật bảng xếp hạng. */
    public static void pulse(Node node) {
        if (!enabled || node == null) return;
        ScaleTransition pulse = new ScaleTransition(Duration.millis(150), node);
        pulse.setFromX(1);
        pulse.setFromY(1);
        pulse.setToX(1.06);
        pulse.setToY(1.06);
        pulse.setAutoReverse(true);
        pulse.setCycleCount(2);
        pulse.setInterpolator(Interpolator.EASE_BOTH);
        pulse.play();
    }

    /** Shake cho đáp án sai: lắc ngang rồi trở về vị trí cũ. */
    public static void shake(Node node) {
        if (!enabled || node == null) return;
        Timeline shake = new Timeline(
                new KeyFrame(Duration.ZERO, new KeyValue(node.translateXProperty(), 0)),
                new KeyFrame(SHAKE_DURATION, new KeyValue(node.translateXProperty(), -6)),
                new KeyFrame(SHAKE_DURATION.multiply(2), new KeyValue(node.translateXProperty(), 6)),
                new KeyFrame(SHAKE_DURATION.multiply(3), new KeyValue(node.translateXProperty(), -4)),
                new KeyFrame(SHAKE_DURATION.multiply(4), new KeyValue(node.translateXProperty(), 0)));
        shake.play();
    }

    /** Countdown gấp: pulse nhanh khi thời gian còn rất ít. */
    public static void countdown(Node node) {
        if (!enabled || node == null) return;
        ScaleTransition pulse = new ScaleTransition(Duration.millis(180), node);
        pulse.setFromX(1.0);
        pulse.setFromY(1.0);
        pulse.setToX(1.12);
        pulse.setToY(1.12);
        pulse.setAutoReverse(true);
        pulse.setCycleCount(2);
        pulse.setInterpolator(Interpolator.EASE_BOTH);
        pulse.play();
    }

    /** Rank up: nảy lên rồi trở về, dùng cho thành tích thăng hạng. */
    public static void rankUp(Node node) {
        if (!enabled || node == null) return;
        TranslateTransition up = new TranslateTransition(CELEBRATE_DURATION, node);
        up.setFromY(0);
        up.setToY(-14);
        up.setAutoReverse(true);
        up.setCycleCount(2);
        up.setInterpolator(Interpolator.SPLINE(0.2, 0.8, 0.3, 1.0));
        ScaleTransition pop = new ScaleTransition(CELEBRATE_DURATION, node);
        pop.setFromX(1);
        pop.setFromY(1);
        pop.setToX(1.1);
        pop.setToY(1.1);
        pop.setAutoReverse(true);
        pop.setCycleCount(2);
        new ParallelTransition(up, pop).play();
    }

    /** Toast notification: trượt vào từ trên xuống. */
    public static void toastIn(Node node) {
        if (node == null) return;
        if (!enabled) { node.setOpacity(1); node.setTranslateY(0); return; }
        node.setOpacity(0);
        node.setTranslateY(-16);
        TranslateTransition slide = new TranslateTransition(TOAST_DURATION, node);
        slide.setFromY(-16);
        slide.setToY(0);
        slide.setInterpolator(Interpolator.EASE_OUT);
        FadeTransition fade = new FadeTransition(TOAST_DURATION, node);
        fade.setFromValue(0);
        fade.setToValue(1);
        new ParallelTransition(slide, fade).play();
    }

    /** Toast notification: trượt ra khi ẩn. */
    public static void toastOut(Node node, Runnable onFinished) {
        if (node == null) return;
        if (!enabled) {
            node.setOpacity(0);
            if (onFinished != null) onFinished.run();
            return;
        }
        FadeTransition fade = new FadeTransition(TOAST_DURATION, node);
        fade.setFromValue(1);
        fade.setToValue(0);
        TranslateTransition slide = new TranslateTransition(TOAST_DURATION, node);
        slide.setFromY(0);
        slide.setToY(-16);
        ParallelTransition transition = new ParallelTransition(fade, slide);
        if (onFinished != null) transition.setOnFinished(ignored -> onFinished.run());
        transition.play();
    }

    /** Skeleton loading: nhấp nháy nhẹ cho placeholder đang tải. */
    public static void shimmer(Node node) {
        if (!enabled || node == null) return;
        FadeTransition shimmer = new FadeTransition(Duration.millis(700), node);
        shimmer.setFromValue(0.45);
        shimmer.setToValue(1.0);
        shimmer.setAutoReverse(true);
        shimmer.setCycleCount(javafx.animation.Animation.INDEFINITE);
        shimmer.play();
    }
}
