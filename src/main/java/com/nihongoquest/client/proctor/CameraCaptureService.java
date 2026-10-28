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
import java.util.function.Consumer;

/** Owns the default camera on one daemon thread and emits bounded 320x240 JPEG frames. */
public final class CameraCaptureService implements AutoCloseable {
    public enum Failure { NOT_FOUND, FAILED, LOST }
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
        long sequence = 0;
        try (Java2DFrameConverter converter = new Java2DFrameConverter()) {
            OpenCVFrameGrabber local = new OpenCVFrameGrabber(0);
            grabber = local;
            local.setImageWidth(320);
            local.setImageHeight(240);
            local.setFrameRate(5);
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
                    failureConsumer.accept(sequence == 0 ? Failure.NOT_FOUND : Failure.LOST);
                    return;
                }
                long now = System.currentTimeMillis();
                if (now < nextFrame) continue;
                nextFrame = now + 200;
                BufferedImage source = converter.convert(frame);
                if (source == null) continue;
                BufferedImage image = scale(source);
                byte[] jpeg = encodeWithinLimit(image);
                if (jpeg != null) frameConsumer.accept(
                        new CapturedFrame(++sequence, now, jpeg, image));
            }
        } catch (Exception error) {
            if (running.get()) failureConsumer.accept(Failure.FAILED);
        } finally {
            running.set(false);
            OpenCVFrameGrabber local = grabber;
            grabber = null;
            if (local != null) try { local.stop(); local.close(); } catch (Exception ignored) { }
        }
    }

    private BufferedImage scale(BufferedImage source) {
        BufferedImage target = new BufferedImage(320, 240, BufferedImage.TYPE_3BYTE_BGR);
        Graphics2D graphics = target.createGraphics();
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        graphics.drawImage(source, 0, 0, 320, 240, null);
        graphics.dispose();
        return target;
    }

    private byte[] encodeWithinLimit(BufferedImage image) throws Exception {
        for (float quality : new float[]{.60f, .50f, .40f}) {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream(32_768);
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
            if (bytes.size() <= 65_536) return bytes.toByteArray();
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
