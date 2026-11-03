package com.nihongoquest.client.proctor;

import com.nihongoquest.client.network.GameClient;
import com.nihongoquest.common.protocol.Payloads;
import org.junit.jupiter.api.Test;

import java.awt.image.BufferedImage;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ScheduledExecutorService;
import java.util.function.Consumer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProctoringCoordinatorTest {

    @Test
    void automaticCameraRetryHasAThreeAttemptLimit() {
        assertTrue(ProctoringCoordinator.shouldScheduleCameraRetry(0));
        assertTrue(ProctoringCoordinator.shouldScheduleCameraRetry(2));
        assertTrue(!ProctoringCoordinator.shouldScheduleCameraRetry(3));
    }

    @Test
    void noFirstFrameTimesOutAndReportsFailed() throws Exception {
        StubGameClient client = new StubGameClient();
        FakeFactory cameras = new FakeFactory();
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        try (ProctoringCoordinator coordinator = coordinator(client, cameras, scheduler, 40)) {
            startCamera(coordinator);

            await(() -> client.reports.stream()
                    .anyMatch(report -> report.cameraStatus() == Payloads.CameraStatus.FAILED));
            assertTrue(cameras.sources.getFirst().closed);
        }
    }

    @Test
    void callbacksFromSupersededAttemptAreIgnored() throws Exception {
        StubGameClient client = new StubGameClient();
        FakeFactory cameras = new FakeFactory();
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        try (ProctoringCoordinator coordinator = coordinator(client, cameras, scheduler, 5_000)) {
            startCamera(coordinator);
            FakeCamera first = cameras.sources.getFirst();
            first.fail(CameraCaptureService.Failure.FAILED);
            startCamera(coordinator);
            FakeCamera second = cameras.sources.get(1);

            first.frame(frame(1));
            assertNull(coordinator.getLatestFrame());
            second.frame(frame(2));
            assertEquals(2, coordinator.getLatestFrame().sequence());
        }
    }

    @Test
    void stopRoomCancelsInitializationTimeoutAndRetry() throws Exception {
        StubGameClient client = new StubGameClient();
        FakeFactory cameras = new FakeFactory();
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        try (ProctoringCoordinator coordinator = coordinator(client, cameras, scheduler, 40)) {
            startCamera(coordinator);
            coordinator.stopRoom();
            Thread.sleep(100);

            assertTrue(client.reports.stream().noneMatch(
                    report -> report.cameraStatus() == Payloads.CameraStatus.FAILED));
            assertEquals(1, cameras.sources.size());
            assertTrue(cameras.sources.getFirst().closed);
        }
    }

    @Test
    void frameLossIsDetectedEvenBeforeCalibrationFinishes() throws Exception {
        StubGameClient client = new StubGameClient();
        FakeFactory cameras = new FakeFactory();
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        try (ProctoringCoordinator coordinator = coordinator(client, cameras, scheduler, 5_000)) {
            startCamera(coordinator);
            cameras.sources.getFirst().frame(frame(1));
            Field lastFrame = ProctoringCoordinator.class.getDeclaredField("lastFrameAtMillis");
            lastFrame.setAccessible(true);
            lastFrame.setLong(coordinator, System.currentTimeMillis() - 3_000);
            Method health = ProctoringCoordinator.class.getDeclaredMethod("checkCameraHealth");
            health.setAccessible(true);
            health.invoke(coordinator);

            assertTrue(client.reports.stream().anyMatch(
                    report -> report.cameraStatus() == Payloads.CameraStatus.LOST));
        }
    }

    private static ProctoringCoordinator coordinator(StubGameClient client,
                                                     FakeFactory cameras,
                                                     ScheduledExecutorService scheduler,
                                                     long timeoutMillis) throws Exception {
        ProctoringCoordinator coordinator = new ProctoringCoordinator(
                client, null, scheduler, cameras, timeoutMillis);
        Field lobby = ProctoringCoordinator.class.getDeclaredField("lobby");
        lobby.setAccessible(true);
        lobby.set(coordinator, lobby());
        return coordinator;
    }

    private static void startCamera(ProctoringCoordinator coordinator) throws Exception {
        Method start = ProctoringCoordinator.class.getDeclaredMethod("startCamera");
        start.setAccessible(true);
        start.invoke(coordinator);
    }

    private static Payloads.QuizLobbyData lobby() {
        return new Payloads.QuizLobbyData("123456", "Demo", "host", false,
                false, true, false, 2, List.of());
    }

    private static CapturedFrame frame(long sequence) {
        return new CapturedFrame(sequence, System.currentTimeMillis(), new byte[]{1},
                new BufferedImage(1, 1, BufferedImage.TYPE_3BYTE_BGR));
    }

    private static void await(Check check) throws Exception {
        long deadline = System.nanoTime() + 1_000_000_000L;
        while (!check.done() && System.nanoTime() < deadline) Thread.sleep(10);
        assertTrue(check.done(), "Điều kiện không hoàn thành đúng hạn");
    }

    @FunctionalInterface
    private interface Check { boolean done(); }

    private static final class StubGameClient extends GameClient {
        final List<Payloads.ProctorStatusReport> reports = new CopyOnWriteArrayList<>();

        @Override public boolean isConnected() { return true; }
        @Override public void reportProctorStatus(Payloads.ProctorStatusReport report) {
            reports.add(report);
        }
    }

    private static final class FakeFactory implements CameraSourceFactory {
        final List<FakeCamera> sources = new ArrayList<>();

        @Override
        public CameraSource create(Consumer<CapturedFrame> frames,
                                   Consumer<CameraCaptureService.Failure> failures) {
            FakeCamera source = new FakeCamera(frames, failures);
            sources.add(source);
            return source;
        }
    }

    private static final class FakeCamera implements CameraSource {
        final Consumer<CapturedFrame> frames;
        final Consumer<CameraCaptureService.Failure> failures;
        boolean closed;

        FakeCamera(Consumer<CapturedFrame> frames,
                   Consumer<CameraCaptureService.Failure> failures) {
            this.frames = frames;
            this.failures = failures;
        }

        @Override public void start() { }
        @Override public void close() { closed = true; }
        void frame(CapturedFrame frame) { frames.accept(frame); }
        void fail(CameraCaptureService.Failure failure) { failures.accept(failure); }
    }
}
