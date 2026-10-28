package com.nihongoquest.client.proctor;

import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import javafx.application.Platform;
import javafx.scene.control.Alert;
import javafx.scene.control.ButtonBar;
import javafx.scene.control.ButtonType;
import javafx.stage.Stage;

import java.awt.image.BufferedImage;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/** App-scoped lifecycle owner for camera, media transport and automatic warning events. */
public final class ProctoringCoordinator implements AutoCloseable {
    private final GameClient client;
    private final Stage stage;
    private final ProctorMediaPublisher publisher = new ProctorMediaPublisher();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread thread = new Thread(r, "proctor-monitor"); thread.setDaemon(true); return thread;
    });
    private final Map<Payloads.ProctorEventType, Long> lastEvents = new ConcurrentHashMap<>();
    private volatile Payloads.QuizLobbyData lobby;
    private volatile Payloads.QuizRoomStarted room;
    private volatile CameraCaptureService camera;
    private volatile CapturedFrame latestFrame;
    private volatile boolean consentDenied;
    private volatile boolean focusEventSent;
    private volatile long focusLostAt;
    private volatile Consumer<Payloads.ProctorStatusUpdate> statusListener = ignored -> { };
    private volatile Consumer<Payloads.ProctorEventData> eventListener = ignored -> { };
    private volatile Consumer<CapturedFrame> previewListener = ignored -> { };

    public ProctoringCoordinator(GameClient client, Stage stage) {
        this.client = client;
        this.stage = stage;
        stage.focusedProperty().addListener((ignored, oldValue, focused) -> onFocusChanged(focused));
        stage.iconifiedProperty().addListener((ignored, oldValue, iconified) -> {
            if (iconified && isPlayerRunning()) emitEvent(Payloads.ProctorEventType.APP_MINIMIZED,
                    Payloads.ProctorSeverity.EVIDENCE, 0, 1.0);
        });
        scheduler.scheduleAtFixedRate(this::checkFocusDuration, 250, 250, TimeUnit.MILLISECONDS);
    }

    public void enterLobby(Payloads.QuizLobbyData data) {
        lobby = data;
        if (!data.proctoringEnabled() || data.currentUserHost()) return;
        if (camera == null && !consentDenied) Platform.runLater(() -> requestCameraConsent(false));
    }

    public void requestCameraConsent(boolean retry) {
        Payloads.QuizLobbyData current = lobby;
        if (current == null || !current.proctoringEnabled() || current.currentUserHost()) return;
        if (camera != null) return;
        ButtonType allow = new ButtonType("Cho phép và mở camera", ButtonBar.ButtonData.OK_DONE);
        ButtonType deny = new ButtonType("Từ chối", ButtonBar.ButtonData.CANCEL_CLOSE);
        Alert dialog = new Alert(Alert.AlertType.CONFIRMATION,
                "Camera được truyền trực tiếp cho host trong mạng LAN. Hệ thống có thể tạo ảnh và clip bằng chứng khi có cảnh báo. Không thu microphone.",
                allow, deny);
        dialog.setTitle("Giám sát Quiz Room");
        dialog.setHeaderText(retry ? "Thử mở lại camera" : "Phòng yêu cầu giám sát camera");
        Optional<ButtonType> result = dialog.showAndWait();
        if (result.isEmpty() || result.get() != allow) {
            consentDenied = true;
            reportStatus(Payloads.CameraStatus.DENIED, Payloads.CalibrationStatus.PENDING,
                    "Người chơi từ chối quyền camera");
            return;
        }
        consentDenied = false;
        startCamera();
    }

    private void startCamera() {
        reportStatus(Payloads.CameraStatus.INITIALIZING, Payloads.CalibrationStatus.PENDING,
                "Đang mở camera mặc định");
        CameraCaptureService service = new CameraCaptureService(this::onFrame, failure -> {
            Payloads.CameraStatus status = switch (failure) {
                case NOT_FOUND -> Payloads.CameraStatus.NOT_FOUND;
                case LOST -> Payloads.CameraStatus.LOST;
                case FAILED -> Payloads.CameraStatus.FAILED;
            };
            reportStatus(status, Payloads.CalibrationStatus.FAILED, "Không thể đọc camera");
            camera = null;
        });
        camera = service;
        service.start();
    }

    private void onFrame(CapturedFrame frame) {
        boolean first = latestFrame == null;
        latestFrame = frame;
        previewListener.accept(frame);
        if (room != null && room.playing()) publisher.offer(frame);
        if (first) reportStatus(Payloads.CameraStatus.READY,
                modelsAvailable() ? Payloads.CalibrationStatus.READY : Payloads.CalibrationStatus.FAILED,
                modelsAvailable() ? "Camera sẵn sàng" : "Camera sẵn sàng; thiếu model AI");
        if (room != null && room.playing() && isBlocked(frame.image())) {
            emitEvent(Payloads.ProctorEventType.CAMERA_BLOCKED,
                    Payloads.ProctorSeverity.EVIDENCE, frame.sequence(), .9);
        }
    }

    public void startRoom(Payloads.QuizRoomStarted started) {
        room = started;
    }

    public boolean handleMessage(Message message) {
        if (message.getType() == MessageType.PROCTOR_MEDIA_SESSION) {
            Payloads.ProctorMediaSession session = Payloads.fromJson(
                    message.getPayload(), Payloads.ProctorMediaSession.class);
            if (session.role() == Payloads.MediaRole.PUBLISHER && camera != null) {
                publisher.connect(client.getServerHost(), session);
            }
            return true;
        }
        if (message.getType() == MessageType.PROCTOR_STATUS_UPDATE) {
            statusListener.accept(Payloads.fromJson(message.getPayload(),
                    Payloads.ProctorStatusUpdate.class));
            return true;
        }
        if (message.getType() == MessageType.PROCTOR_EVENT) {
            eventListener.accept(Payloads.fromJson(message.getPayload(),
                    Payloads.ProctorEventData.class));
            return true;
        }
        return false;
    }

    private void reportStatus(Payloads.CameraStatus cameraStatus,
                              Payloads.CalibrationStatus calibration, String detail) {
        Payloads.QuizLobbyData current = lobby;
        if (current == null || !client.isConnected()) return;
        try {
            client.reportProctorStatus(new Payloads.ProctorStatusReport(
                    current.pin(), cameraStatus, calibration, detail, System.currentTimeMillis()));
        } catch (IllegalStateException ignored) { }
    }

    private void onFocusChanged(boolean focused) {
        if (!isPlayerRunning()) return;
        long now = System.currentTimeMillis();
        if (!focused) {
            if (focusLostAt == 0) focusLostAt = now;
            return;
        }
        long elapsed = focusLostAt == 0 ? 0 : now - focusLostAt;
        focusLostAt = 0;
        if (!focusEventSent && elapsed >= 1_000) emitEvent(
                Payloads.ProctorEventType.APP_FOCUS_LOST, Payloads.ProctorSeverity.WARNING,
                latestFrame == null ? 0 : latestFrame.sequence(), 1.0);
        focusEventSent = false;
    }

    private void checkFocusDuration() {
        if (!isPlayerRunning() || focusLostAt == 0 || focusEventSent) return;
        if (System.currentTimeMillis() - focusLostAt >= 3_000) {
            focusEventSent = true;
            emitEvent(Payloads.ProctorEventType.APP_FOCUS_LOST,
                    Payloads.ProctorSeverity.EVIDENCE,
                    latestFrame == null ? 0 : latestFrame.sequence(), 1.0);
        }
    }

    private void emitEvent(Payloads.ProctorEventType type, Payloads.ProctorSeverity severity,
                           long sequence, double confidence) {
        long now = System.currentTimeMillis();
        Long previous = lastEvents.put(type, now);
        if (previous != null && now - previous < 10_000) return;
        Payloads.QuizRoomStarted current = room;
        if (current == null || !client.isConnected()) return;
        client.reportProctorEvent(new Payloads.ProctorEventReport(current.pin(),
                UUID.randomUUID().toString(), type, severity, sequence, now, 0, confidence));
    }

    private boolean isPlayerRunning() {
        Payloads.QuizRoomStarted current = room;
        return current != null && current.proctoringEnabled() && current.playing();
    }

    private boolean modelsAvailable() {
        return getClass().getResource("/models/proctoring/face-detection-retail-0005.xml") != null
                && getClass().getResource("/models/proctoring/gaze-estimation-adas-0002.xml") != null;
    }

    private boolean isBlocked(BufferedImage image) {
        long total = 0, totalSquared = 0;
        int samples = 0;
        for (int y = 0; y < image.getHeight(); y += 8) for (int x = 0; x < image.getWidth(); x += 8) {
            int rgb = image.getRGB(x, y);
            int value = (((rgb >> 16) & 255) * 30 + ((rgb >> 8) & 255) * 59 + (rgb & 255) * 11) / 100;
            total += value; totalSquared += (long) value * value; samples++;
        }
        double mean = (double) total / samples;
        double variance = (double) totalSquared / samples - mean * mean;
        return mean < 20 || Math.sqrt(Math.max(0, variance)) < 8;
    }

    public Payloads.QuizLobbyData getLobby() { return lobby; }
    public CapturedFrame getLatestFrame() { return latestFrame; }
    public void setStatusListener(Consumer<Payloads.ProctorStatusUpdate> listener) { statusListener = listener; }
    public void setEventListener(Consumer<Payloads.ProctorEventData> listener) { eventListener = listener; }
    public void setPreviewListener(Consumer<CapturedFrame> listener) { previewListener = listener; }

    public void stopRoom() {
        room = null; publisher.close(); lastEvents.clear(); focusLostAt = 0;
    }

    @Override public void close() {
        stopRoom();
        CameraCaptureService current = camera;
        camera = null;
        if (current != null) current.close();
        scheduler.shutdownNow();
    }
}
