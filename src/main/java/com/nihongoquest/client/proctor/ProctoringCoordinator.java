package com.nihongoquest.client.proctor;

import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.common.media.VisionMetadata;
import javafx.application.Platform;
import javafx.beans.value.ChangeListener;
import javafx.scene.control.Alert;
import javafx.scene.control.ButtonBar;
import javafx.scene.control.ButtonType;
import javafx.stage.Stage;

import java.awt.image.BufferedImage;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/** App-scoped lifecycle owner for camera, media transport and automatic warning events. */
public final class ProctoringCoordinator implements AutoCloseable {
    private final GameClient client;
    private final Stage stage;
    private final ChangeListener<Boolean> focusListener;
    private final ChangeListener<Boolean> iconifiedListener;
    private final ProctorMediaPublisher publisher = new ProctorMediaPublisher();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread thread = new Thread(r, "proctor-monitor"); thread.setDaemon(true); return thread;
    });
    private final Map<Payloads.ProctorEventType, Long> lastEvents = new ConcurrentHashMap<>();
    private volatile Payloads.QuizLobbyData lobby;
    private volatile Payloads.QuizRoomStarted room;
    private volatile CameraCaptureService camera;
    private volatile ProctorAiEngine ai;
    private volatile CapturedFrame latestFrame;
    private volatile VisionMetadata latestVision = VisionMetadata.unavailable(0);
    private volatile Payloads.ProctorMediaSession pendingPublisherSession;
    private volatile Payloads.ProctorMediaSession pendingHostSession;
    private volatile int cameraRetryCount;
    private long lifecycleGeneration;
    private volatile long calibrationStartedAt;
    private volatile long lastFrameAtMillis;
    private volatile long blockedStartedAt;
    private volatile long blockClearAt;
    private volatile boolean blockedStatusReported;
    private volatile String pendingMinimizeToast;
    private volatile boolean calibrationReported;
    private volatile Payloads.CalibrationStatus reportedCalibration = Payloads.CalibrationStatus.PENDING;
    private final AtomicBoolean consentPromptPending = new AtomicBoolean();
    private volatile boolean consentDenied;
    private final FocusEventDebouncer focusDebouncer = new FocusEventDebouncer();
    private volatile Consumer<Payloads.ProctorMediaSession> mediaSessionListener = ignored -> { };
    private volatile Consumer<Payloads.ProctorStatusUpdate> statusListener = ignored -> { };
    private volatile Consumer<Payloads.ProctorEventData> eventListener = ignored -> { };
    private volatile Consumer<String> toastListener = ignored -> { };
    private volatile Consumer<Payloads.CameraStatus> cameraStatusListener = ignored -> { };
    private volatile Consumer<CapturedFrame> previewListener = ignored -> { };
    private volatile Consumer<VisionMetadata> visionListener = ignored -> { };

    public ProctoringCoordinator(GameClient client, Stage stage) {
        this.client = client;
        this.stage = stage;
        focusListener = (ignored, oldValue, focused) -> onFocusChanged(focused);
        iconifiedListener = (ignored, oldValue, iconified) -> {
            if (iconified && isPlayerRunning()) emitEvent(Payloads.ProctorEventType.APP_MINIMIZED,
                    Payloads.ProctorSeverity.EVIDENCE, 0, 1.0);
            else if (!iconified && pendingMinimizeToast != null) {
                String toast = pendingMinimizeToast;
                pendingMinimizeToast = null;
                Platform.runLater(() -> toastListener.accept(toast));
            }
        };
        stage.focusedProperty().addListener(focusListener);
        stage.iconifiedProperty().addListener(iconifiedListener);
        scheduler.scheduleAtFixedRate(this::checkFocusDuration, 250, 250, TimeUnit.MILLISECONDS);
        scheduler.scheduleAtFixedRate(this::checkCameraHealth, 1, 1, TimeUnit.SECONDS);
    }

    public void enterLobby(Payloads.QuizLobbyData data) {
        lobby = data;
        if (!data.proctoringEnabled() || data.currentUserHost()) return;
        if (camera == null && !consentDenied && consentPromptPending.compareAndSet(false, true)) {
            Platform.runLater(() -> {
                try { requestCameraConsent(false); }
                finally { consentPromptPending.set(false); }
            });
        }
    }

    public void requestCameraConsent(boolean retry) {
        Payloads.QuizLobbyData current = lobby;
        if (current == null || !current.proctoringEnabled() || current.currentUserHost()) return;
        if (camera != null) return;
        ButtonType allow = new ButtonType("Cho phép và mở camera", ButtonBar.ButtonData.OK_DONE);
        ButtonType deny = new ButtonType("Từ chối", ButtonBar.ButtonData.CANCEL_CLOSE);
        Alert dialog = new Alert(Alert.AlertType.CONFIRMATION,
                "Camera được truyền trực tiếp cho host trong mạng LAN. AI chỉ tạo cảnh báo nghi vấn; ảnh và clip có thể lưu trên máy host. Không thu microphone.",
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
        cameraRetryCount = 0;
        long generation;
        synchronized (this) { generation = lifecycleGeneration; }
        scheduler.execute(() -> {
            ProctorAiEngine engine = null;
            try {
                engine = new ProctorAiEngine((type, frame) -> emitEvent(type,
                        Payloads.ProctorSeverity.WARNING, frame.sequence(), .8), vision -> {
                    latestVision = vision;
                    publisher.offerVision(vision);
                    visionListener.accept(vision);
                });
            } catch (Throwable ignored) { /* Camera remains usable without AI. */ }
            synchronized (this) {
                if (generation != lifecycleGeneration || lobby == null || consentDenied) {
                    if (engine != null) engine.close();
                    return;
                }
                ai = engine;
                if (engine != null) {
                    engine.startCalibration();
                    if (room != null && room.playing()) engine.setActive(true);
                }
            }
            startCamera();
        });
    }

    private synchronized void startCamera() {
        if (lobby == null || consentDenied || camera != null) return;
        reportStatus(Payloads.CameraStatus.INITIALIZING, Payloads.CalibrationStatus.PENDING,
                "Đang mở camera mặc định");
        calibrationStartedAt = System.currentTimeMillis();
        if (ai != null) ai.startCalibration();
        calibrationReported = false;
        reportedCalibration = Payloads.CalibrationStatus.PENDING;
        blockedStartedAt = 0; blockClearAt = 0; blockedStatusReported = false;
        CameraCaptureService[] holder = new CameraCaptureService[1];
        CameraCaptureService service = new CameraCaptureService(this::onFrame, failure -> {
            if (camera != holder[0] || lobby == null) return;
            Payloads.CameraStatus status = switch (failure) {
                case NOT_FOUND -> Payloads.CameraStatus.NOT_FOUND;
                case LOST -> Payloads.CameraStatus.LOST;
                case FAILED -> Payloads.CameraStatus.FAILED;
            };
            reportStatus(status, Payloads.CalibrationStatus.FAILED, "Không thể đọc camera");
            camera = null;
            scheduleCameraRetry();
        });
        holder[0] = service;
        camera = service;
        service.start();
        Payloads.ProctorMediaSession pending = pendingPublisherSession;
        if (pending != null && room != null) publisher.connect(client.getServerHost(), pending);
    }

    private void onFrame(CapturedFrame frame) {
        CapturedFrame previousFrame = latestFrame;
        latestFrame = frame;
        lastFrameAtMillis = System.currentTimeMillis();
        previewListener.accept(frame);
        if (ai != null) ai.offer(frame);
        if (room != null && room.playing()) publisher.offer(frame);
        long now = System.currentTimeMillis();
        if (!calibrationReported && now - calibrationStartedAt >= 5_000) {
            Payloads.CalibrationStatus result = ai == null
                    ? Payloads.CalibrationStatus.FAILED : ai.calibrationStatus();
            if (result != Payloads.CalibrationStatus.PENDING || now - calibrationStartedAt >= 8_000) {
                calibrationReported = true;
                cameraRetryCount = 0;
                reportedCalibration = result == Payloads.CalibrationStatus.PENDING
                        ? Payloads.CalibrationStatus.FAILED : result;
                reportStatus(blockedStatusReported ? Payloads.CameraStatus.BLOCKED
                                : Payloads.CameraStatus.READY, reportedCalibration,
                        result == Payloads.CalibrationStatus.READY
                                ? "Camera và AI sẵn sàng" : "Camera sẵn sàng; hiệu chuẩn AI thất bại");
            }
        }
        if (calibrationReported && reportedCalibration == Payloads.CalibrationStatus.FAILED
                && ai != null && ai.calibrationStatus() == Payloads.CalibrationStatus.READY) {
            reportedCalibration = Payloads.CalibrationStatus.READY;
            reportStatus(blockedStatusReported ? Payloads.CameraStatus.BLOCKED
                    : Payloads.CameraStatus.READY, reportedCalibration, "Hiệu chuẩn AI hoàn tất");
        }
        if (room != null && room.playing()) {
            if (isBlocked(frame.image(), previousFrame == null ? null : previousFrame.image())) {
                blockClearAt = 0;
                if (blockedStartedAt == 0) blockedStartedAt = now;
                if (now - blockedStartedAt >= 3_000 && !blockedStatusReported) {
                    blockedStatusReported = true;
                    reportStatus(Payloads.CameraStatus.BLOCKED,
                            ai == null ? Payloads.CalibrationStatus.FAILED : ai.calibrationStatus(),
                            "Camera có thể đang bị che");
                }
                if (now - blockedStartedAt >= 3_000) emitEvent(
                        Payloads.ProctorEventType.CAMERA_BLOCKED,
                        Payloads.ProctorSeverity.EVIDENCE, frame.sequence(), .9);
            } else {
                if (blockClearAt == 0) blockClearAt = now;
                if (now - blockClearAt >= 2_000) {
                    blockedStartedAt = 0;
                    if (blockedStatusReported) {
                        blockedStatusReported = false;
                        reportStatus(Payloads.CameraStatus.READY,
                                ai == null ? Payloads.CalibrationStatus.FAILED : ai.calibrationStatus(),
                                "Camera hoạt động bình thường");
                    }
                }
            }
        }
    }

    private void checkCameraHealth() {
        CameraCaptureService current = camera;
        if (current == null || lobby == null || !calibrationReported
                || System.currentTimeMillis() - lastFrameAtMillis < 2_000) return;
        camera = null;
        current.close();
        reportStatus(Payloads.CameraStatus.LOST, Payloads.CalibrationStatus.FAILED,
                "Camera không gửi frame trong 2 giây");
        scheduleCameraRetry();
    }

    private void scheduleCameraRetry() {
        if (consentDenied || lobby == null) return;
        long delay = cameraRetryCount++ < 3 ? 5 : 30;
        scheduler.schedule(() -> {
            if (!consentDenied && camera == null && lobby != null) startCamera();
        }, delay, TimeUnit.SECONDS);
    }

    public void startRoom(Payloads.QuizRoomStarted started) {
        room = started;
        if (ai != null) ai.setActive(started.playing());
        if (started.playing() && camera != null && pendingPublisherSession != null)
            publisher.connect(client.getServerHost(), pendingPublisherSession);
    }

    public boolean handleMessage(Message message) {
        if (message.getType() == MessageType.PROCTOR_MEDIA_SESSION) {
            Payloads.ProctorMediaSession session = Payloads.fromJson(
                    message.getPayload(), Payloads.ProctorMediaSession.class);
            if (session.role() == Payloads.MediaRole.PUBLISHER) {
                pendingPublisherSession = session;
                if (camera != null) publisher.connect(client.getServerHost(), session);
            } else if (session.role() == Payloads.MediaRole.HOST_SUBSCRIBER) {
                pendingHostSession = session;
                mediaSessionListener.accept(session);
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
        cameraStatusListener.accept(cameraStatus);
        Payloads.QuizLobbyData current = lobby;
        if (current == null || !client.isConnected()) return;
        try {
            client.reportProctorStatus(new Payloads.ProctorStatusReport(
                    current.pin(), cameraStatus, calibration, detail, System.currentTimeMillis()));
        } catch (IllegalStateException ignored) { }
    }

    private void onFocusChanged(boolean focused) {
        if (!isPlayerRunning()) return;
        FocusEventDebouncer.FocusEvent event = focusDebouncer.onFocusChanged(
                focused, System.nanoTime());
        if (event != null) emitEvent(Payloads.ProctorEventType.APP_FOCUS_LOST,
                event.severity(), latestFrame == null ? 0 : latestFrame.sequence(),
                1.0, event.durationMillis());
    }

    private void checkFocusDuration() {
        if (!isPlayerRunning()) return;
        FocusEventDebouncer.FocusEvent event = focusDebouncer.onTick(System.nanoTime());
        if (event != null) emitEvent(Payloads.ProctorEventType.APP_FOCUS_LOST,
                event.severity(), latestFrame == null ? 0 : latestFrame.sequence(),
                1.0, event.durationMillis());
    }

    private void emitEvent(Payloads.ProctorEventType type, Payloads.ProctorSeverity severity,
                           long sequence, double confidence) {
        emitEvent(type, severity, sequence, confidence, 0);
    }

    private void emitEvent(Payloads.ProctorEventType type, Payloads.ProctorSeverity severity,
                           long sequence, double confidence, int durationMillis) {
        Payloads.QuizRoomStarted current = room;
        if (current == null || !client.isConnected()) return;
        long now = System.currentTimeMillis();
        synchronized (lastEvents) {
            Long previous = lastEvents.get(type);
            if (previous != null && now - previous < 10_000) return;
            lastEvents.put(type, now);
        }
        client.reportProctorEvent(new Payloads.ProctorEventReport(current.pin(),
                UUID.randomUUID().toString(), type, severity, sequence, now, durationMillis, confidence));
        String description = switch (type) {
            case NO_FACE -> "Không phát hiện khuôn mặt.";
            case MULTIPLE_FACES -> "Có nhiều khuôn mặt trong khung hình.";
            case LOOKING_AWAY -> "Bạn đang nhìn ra ngoài màn hình.";
            case PHONE_DETECTED -> "Phát hiện điện thoại trong khung hình.";
            case CAMERA_BLOCKED -> "Camera có thể đang bị che.";
            case APP_FOCUS_LOST, APP_MINIMIZED -> "Bạn đã rời khỏi cửa sổ làm bài.";
        };
        String toast = "Cảnh báo: " + description + "\nSự kiện đã được gửi tới host.";
        if (type == Payloads.ProctorEventType.APP_MINIMIZED && stage.isIconified())
            pendingMinimizeToast = toast;
        else Platform.runLater(() -> toastListener.accept(toast));
    }

    private boolean isPlayerRunning() {
        Payloads.QuizRoomStarted current = room;
        return current != null && current.proctoringEnabled() && current.playing();
    }

    private boolean isBlocked(BufferedImage image, BufferedImage previous) {
        long total = 0, totalSquared = 0, difference = 0;
        int samples = 0;
        for (int y = 0; y < image.getHeight(); y += 8) for (int x = 0; x < image.getWidth(); x += 8) {
            int rgb = image.getRGB(x, y);
            int value = (((rgb >> 16) & 255) * 30 + ((rgb >> 8) & 255) * 59 + (rgb & 255) * 11) / 100;
            total += value; totalSquared += (long) value * value; samples++;
            if (previous != null) {
                int old = previous.getRGB(x, y);
                int oldValue = (((old >> 16) & 255) * 30 + ((old >> 8) & 255) * 59
                        + (old & 255) * 11) / 100;
                difference += Math.abs(value - oldValue);
            }
        }
        double mean = (double) total / samples;
        double variance = (double) totalSquared / samples - mean * mean;
        return mean < 20 || Math.sqrt(Math.max(0, variance)) < 8
                || previous != null && difference / (double) samples < 1.0;
    }

    public Payloads.QuizLobbyData getLobby() { return lobby; }
    public CapturedFrame getLatestFrame() { return latestFrame; }
    public void setMediaSessionListener(Consumer<Payloads.ProctorMediaSession> listener) {
        mediaSessionListener = listener;
        Payloads.ProctorMediaSession pending = pendingHostSession;
        if (pending != null) listener.accept(pending);
    }
    public void setStatusListener(Consumer<Payloads.ProctorStatusUpdate> listener) { statusListener = listener; }
    public void setEventListener(Consumer<Payloads.ProctorEventData> listener) { eventListener = listener; }
    public void setToastListener(Consumer<String> listener) { toastListener = listener; }
    public void setCameraStatusListener(Consumer<Payloads.CameraStatus> listener) { cameraStatusListener = listener; }
    public void setPreviewListener(Consumer<CapturedFrame> listener) { previewListener = listener; }
    public void setVisionListener(Consumer<VisionMetadata> listener) { visionListener = listener; }

    public synchronized void stopRoom() {
        lifecycleGeneration++;
        room = null; lobby = null; pendingPublisherSession = null; pendingHostSession = null;
        latestFrame = null;
        latestVision = VisionMetadata.unavailable(0);
        consentDenied = false; consentPromptPending.set(false); cameraRetryCount = 0;
        lastFrameAtMillis = 0; calibrationReported = false;
        reportedCalibration = Payloads.CalibrationStatus.PENDING; pendingMinimizeToast = null;
        previewListener = ignored -> { }; toastListener = ignored -> { };
        visionListener = ignored -> { };
        cameraStatusListener = ignored -> { };
        statusListener = ignored -> { }; eventListener = ignored -> { };
        mediaSessionListener = ignored -> { };
        publisher.close(); lastEvents.clear(); focusDebouncer.reset(); blockedStartedAt = 0; blockClearAt = 0;
        blockedStatusReported = false;
        CameraCaptureService current = camera;
        camera = null;
        if (current != null) current.close();
        ProctorAiEngine engine = ai; ai = null;
        if (engine != null) engine.close();
    }

    @Override public void close() {
        stopRoom();
        scheduler.shutdownNow();
        stage.focusedProperty().removeListener(focusListener);
        stage.iconifiedProperty().removeListener(iconifiedListener);
    }
}
