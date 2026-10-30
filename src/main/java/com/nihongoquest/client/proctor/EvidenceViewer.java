package com.nihongoquest.client.proctor;

import javafx.animation.KeyFrame;
import javafx.animation.Timeline;
import javafx.application.Platform;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.ScrollPane;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.HBox;
import javafx.stage.Modality;
import javafx.stage.Stage;
import javafx.stage.Window;
import javafx.util.Duration;
import org.bytedeco.javacv.FFmpegFrameGrabber;
import org.bytedeco.javacv.Frame;
import org.bytedeco.javacv.JavaFXFrameConverter;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;

/**
 * Opens evidence without initializing AWT. Images stay inside JavaFX and MP4 decoding runs
 * on bounded background workers so the application thread never waits for the desktop shell.
 */
public final class EvidenceViewer implements AutoCloseable {
    private final Consumer<String> errorHandler;
    private final ThreadPoolExecutor workers;
    private final Set<Playback> playbacks = ConcurrentHashMap.newKeySet();
    private final AtomicBoolean closed = new AtomicBoolean();

    public EvidenceViewer(Consumer<String> errorHandler) {
        this.errorHandler = errorHandler;
        workers = new ThreadPoolExecutor(2, 2, 15, TimeUnit.SECONDS,
                new ArrayBlockingQueue<>(4), task -> {
                    Thread thread = new Thread(task, "evidence-viewer");
                    thread.setDaemon(true);
                    return thread;
                }, new ThreadPoolExecutor.AbortPolicy());
    }

    public void showImage(Path file, Window owner) {
        if (!requireReadable(file, "Ảnh bằng chứng chưa sẵn sàng.")) return;
        runOnFx(() -> {
            Image image = new Image(file.toUri().toString(), true);
            ImageView view = new ImageView(image);
            view.setPreserveRatio(true);
            view.setFitWidth(960);
            view.setFitHeight(720);
            ScrollPane scroll = new ScrollPane(view);
            scroll.setFitToWidth(true);
            scroll.setFitToHeight(true);
            Stage stage = stage(owner, "Ảnh bằng chứng", scroll, 980, 760);
            image.exceptionProperty().addListener((ignored, oldError, error) -> {
                if (error != null) {
                    stage.close();
                    report("Không thể đọc ảnh bằng chứng: " + error.getMessage());
                }
            });
            stage.show();
        });
    }

    public void showVideo(Path file, Window owner) {
        if (!requireReadable(file, "Clip đang được xử lý hoặc chưa có dữ liệu.")) return;
        runOnFx(() -> {
            ImageView view = new ImageView();
            view.setPreserveRatio(true);
            view.setFitWidth(960);
            view.setFitHeight(720);
            Label status = new Label("Đang mở clip...");
            Button pause = new Button("Tạm dừng");
            HBox controls = new HBox(10, pause, status);
            controls.setAlignment(Pos.CENTER_LEFT);
            controls.setPadding(new Insets(8));
            BorderPane root = new BorderPane(view, null, null, controls, null);
            Stage stage = stage(owner, "Clip bằng chứng", root, 980, 790);
            Playback playback = new Playback(file, view, status, pause, stage);
            playbacks.add(playback);
            stage.setOnHidden(ignored -> playback.close());
            pause.setOnAction(ignored -> playback.togglePause());
            stage.show();
            playback.start();
        });
    }

    public void openDirectory(Path directory) {
        if (!requireReadable(directory, "Thư mục bằng chứng không tồn tại.")) return;
        submit(() -> {
            try {
                new ProcessBuilder(openCommand(directory)).start();
            } catch (IOException | RuntimeException error) {
                report("Không thể mở thư mục bằng chứng: " + error.getMessage());
            }
        });
    }

    private void submit(Runnable task) {
        if (closed.get()) return;
        try {
            workers.execute(task);
        } catch (RejectedExecutionException error) {
            report("Đang mở quá nhiều bằng chứng. Hãy đóng một cửa sổ rồi thử lại.");
        }
    }

    private boolean requireReadable(Path file, String missingMessage) {
        if (file != null && Files.isReadable(file)) return true;
        report(missingMessage);
        return false;
    }

    private Stage stage(Window owner, String title, javafx.scene.Parent root,
                        double width, double height) {
        Stage stage = new Stage();
        if (owner != null && owner.isShowing()) {
            stage.initOwner(owner);
            stage.initModality(Modality.NONE);
        }
        stage.setTitle(title);
        stage.setScene(new Scene(root, width, height));
        stage.setMinWidth(640);
        stage.setMinHeight(480);
        return stage;
    }

    static String[] openCommand(Path directory) {
        String os = System.getProperty("os.name", "").toLowerCase(Locale.ROOT);
        String path = directory.toAbsolutePath().toString();
        if (os.contains("win")) return new String[]{"explorer.exe", path};
        if (os.contains("mac")) return new String[]{"open", path};
        return new String[]{"xdg-open", path};
    }

    private void report(String message) {
        runOnFx(() -> errorHandler.accept(message));
    }

    private void runOnFx(Runnable action) {
        if (Platform.isFxApplicationThread()) action.run();
        else Platform.runLater(action);
    }

    @Override public void close() {
        if (!closed.compareAndSet(false, true)) return;
        playbacks.forEach(Playback::close);
        playbacks.clear();
        workers.shutdownNow();
    }

    private final class Playback implements AutoCloseable {
        private final Path file;
        private final Label status;
        private final Button pauseButton;
        private final Stage stage;
        private final AtomicReference<Image> latest = new AtomicReference<>();
        private final AtomicBoolean stopped = new AtomicBoolean();
        private final AtomicBoolean paused = new AtomicBoolean();
        private final Timeline painter;

        Playback(Path file, ImageView view, Label status, Button pauseButton, Stage stage) {
            this.file = file;
            this.status = status;
            this.pauseButton = pauseButton;
            this.stage = stage;
            painter = new Timeline(new KeyFrame(Duration.millis(100), ignored -> {
                Image image = latest.getAndSet(null);
                if (image != null) view.setImage(image);
            }));
            painter.setCycleCount(Timeline.INDEFINITE);
        }

        void start() {
            painter.play();
            submit(this::decode);
        }

        void togglePause() {
            boolean nowPaused = !paused.get();
            paused.set(nowPaused);
            pauseButton.setText(nowPaused ? "Tiếp tục" : "Tạm dừng");
            status.setText(nowPaused ? "Đã tạm dừng" : "Đang phát");
        }

        private void decode() {
            try (FFmpegFrameGrabber grabber = new FFmpegFrameGrabber(file.toFile());
                 JavaFXFrameConverter converter = new JavaFXFrameConverter()) {
                grabber.start();
                double sourceFps = grabber.getFrameRate();
                double fps = sourceFps > 0 && Double.isFinite(sourceFps)
                        ? Math.min(10, sourceFps) : 5;
                long frameDelayNanos = (long) (1_000_000_000d / fps);
                runOnFx(() -> status.setText("Đang phát"));
                long nextFrame = System.nanoTime();
                while (!stopped.get()) {
                    while (paused.get() && !stopped.get()) sleep(50);
                    if (stopped.get()) break;
                    Frame frame = grabber.grabImage();
                    if (frame == null) break;
                    latest.set(converter.convert(frame));
                    nextFrame += frameDelayNanos;
                    long waitNanos = nextFrame - System.nanoTime();
                    if (waitNanos > 0) sleep(Math.max(1, waitNanos / 1_000_000));
                    else nextFrame = System.nanoTime();
                }
                if (!stopped.get()) runOnFx(() -> status.setText("Đã phát xong"));
            } catch (Exception error) {
                if (!stopped.get()) {
                    runOnFx(() -> {
                        stage.close();
                        report("Không thể phát clip bằng chứng: " + error.getMessage());
                    });
                }
            }
        }

        private void sleep(long millis) {
            try {
                Thread.sleep(millis);
            } catch (InterruptedException error) {
                Thread.currentThread().interrupt();
                stopped.set(true);
            }
        }

        @Override public void close() {
            if (!stopped.compareAndSet(false, true)) return;
            painter.stop();
            latest.set(null);
            playbacks.remove(this);
        }
    }
}
