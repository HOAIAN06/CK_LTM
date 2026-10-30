package com.nihongoquest.client.proctor;

import org.bytedeco.javacv.Frame;
import org.bytedeco.javacv.Java2DFrameConverter;
import org.bytedeco.javacv.OpenCVFrameGrabber;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.MemoryCacheImageOutputStream;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Iterator;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Consumer;

/** Owns the default camera on one daemon thread and emits latest-wins 720p/45 FPS frames. */
public final class CameraCaptureService implements AutoCloseable {
    public static final int WIDTH = 1280;
    public static final int HEIGHT = 720;
    public static final int TARGET_FPS = 45;
    private static final long FRAME_INTERVAL_NANOS = 1_000_000_000L / TARGET_FPS;
    public enum Failure { NOT_FOUND, FAILED, LOST }
    private static final AtomicLong NEXT_SEQUENCE = new AtomicLong();
    private final Consumer<CapturedFrame> frameConsumer;
    private final Consumer<Failure> failureConsumer;
    private final AtomicBoolean running = new AtomicBoolean();
    private volatile OpenCVFrameGrabber grabber;
    private Thread thread;

    public CameraCaptureService(Consumer<CapturedFrame> frames, Consumer<Failure> failures) {
        frameConsumer = frames;
        failureConsumer = failures;
    }

    public synchronized void start() {
        if (!running.compareAndSet(false, true)) return;
        thread = Thread.ofPlatform().daemon().name("proctor-camera").start(this::captureLoop);
    }

    private void captureLoop() {
        long framesCaptured = 0;
        try (Java2DFrameConverter converter = new Java2DFrameConverter()) {
            OpenCVFrameGrabber local = new OpenCVFrameGrabber(0);
            grabber = local;
            local.setImageWidth(WIDTH);
            local.setImageHeight(HEIGHT);
            local.setFrameRate(TARGET_FPS);
            local.setTimeout(2_000);
            try {
                local.start();
            } catch (Exception startError) {
                failureConsumer.accept(Failure.NOT_FOUND);
                return;
            }
            long nextFrame = 0;
            while (running.get()) {
                Frame frame = local.grab();
                if (frame == null) {
                    failureConsumer.accept(framesCaptured == 0 ? Failure.NOT_FOUND : Failure.LOST);
                    return;
                }
                long nowNanos = System.nanoTime();
                if (nowNanos < nextFrame) continue;
                nextFrame = nowNanos + FRAME_INTERVAL_NANOS;
                long now = System.currentTimeMillis();
                BufferedImage source = converter.convert(frame);
                if (source == null) continue;
                BufferedImage image = scale(source);
                byte[] jpeg = encodeWithinLimit(image);
                if (jpeg != null) {
                    framesCaptured++;
                    frameConsumer.accept(new CapturedFrame(
                            NEXT_SEQUENCE.incrementAndGet(), now, jpeg, image));
                }
            }
        } catch (Throwable error) {
            // Native OpenCV loading failures are Errors (for example UnsatisfiedLinkError),
            // not Exceptions.  Letting one escape leaves the coordinator stuck forever in
            // INITIALIZING even though the capture thread has already died.
            if (running.get()) failureConsumer.accept(Failure.FAILED);
        } finally {
            running.set(false);
            OpenCVFrameGrabber local = grabber;
            grabber = null;
            if (local != null) try { local.stop(); local.close(); } catch (Exception ignored) { }
        }
    }

    private BufferedImage scale(BufferedImage source) {
        BufferedImage target = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_3BYTE_BGR);
        Graphics2D graphics = target.createGraphics();
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        graphics.drawImage(source, 0, 0, WIDTH, HEIGHT, null);
        graphics.dispose();
        return target;
    }

    private byte[] encodeWithinLimit(BufferedImage image) throws Exception {
        for (float quality : new float[]{.88f, .82f, .75f, .68f}) {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream(196_608);
            Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpeg");
            if (!writers.hasNext()) return null;
            ImageWriter writer = writers.next();
            try (MemoryCacheImageOutputStream output = new MemoryCacheImageOutputStream(bytes)) {
                writer.setOutput(output);
                ImageWriteParam params = writer.getDefaultWriteParam();
                params.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                params.setCompressionQuality(quality);
                writer.write(null, new IIOImage(image, null, null), params);
            } finally {
                writer.dispose();
            }
            if (bytes.size() <= 524_288) return bytes.toByteArray();
        }
        return null;
    }

    @Override public synchronized void close() {
        running.set(false);
        OpenCVFrameGrabber local = grabber;
        if (local != null) try { local.stop(); } catch (Exception ignored) { }
        if (thread != null) thread.interrupt();
    }
}
