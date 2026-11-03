package com.nihongoquest.client.proctor;

import com.nihongoquest.common.media.MediaProtocol;
import com.nihongoquest.common.protocol.Payloads;
import javafx.scene.image.Image;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.io.ByteArrayInputStream;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Consumer;
import java.util.logging.Level;
import java.util.logging.Logger;

/** Host-side media reader. JPEG bytes stay off the JavaFX application thread. */
public final class ProctorMediaSubscriber implements AutoCloseable {
    private static final Logger LOGGER = Logger.getLogger(ProctorMediaSubscriber.class.getName());
    private final AtomicBoolean running = new AtomicBoolean();
    private final AtomicLong generation = new AtomicLong();
    private final PipelineStageMetrics receiveMetrics = new PipelineStageMetrics("network-receive");
    private final PipelineStageMetrics decodeMetrics = new PipelineStageMetrics("jpeg-decode");
    private volatile Socket socket;
    private volatile String activeTicket;

    public synchronized void connect(String host, Payloads.ProctorMediaSession session,
                                     Consumer<MediaProtocol.RelayedFrame> frames) {
        connect(host, session, frames, ignored -> { });
    }

    public synchronized void connect(String host, Payloads.ProctorMediaSession session,
                                     Consumer<MediaProtocol.RelayedFrame> frames,
                                     Consumer<String> errors) {
        connectInternal(host, session, frames, null, errors);
    }

    public synchronized void connectDecoded(String host, Payloads.ProctorMediaSession session,
                                             Consumer<DecodedFrame> frames,
                                             Consumer<String> errors) {
        connectInternal(host, session, null, frames, errors);
    }

    private synchronized void connectInternal(String host, Payloads.ProctorMediaSession session,
                                               Consumer<MediaProtocol.RelayedFrame> rawFrames,
                                               Consumer<DecodedFrame> decodedFrames,
                                               Consumer<String> errors) {
        if (running.get() && session.ticket().equals(activeTicket)) return;
        close();
        long id = generation.incrementAndGet();
        activeTicket = session.ticket();
        running.set(true);
        Thread.ofVirtual().name("proctor-media-host").start(() -> {
            if (generation.get() != id) return;
            try (Socket local = new Socket()) {
                if (generation.get() != id) return;
                socket = local;
                local.connect(new InetSocketAddress(host, session.mediaPort()), 5_000);
                local.setSoTimeout(10_000);
                DataInputStream input = new DataInputStream(
                        new BufferedInputStream(local.getInputStream()));
                DataOutputStream output = new DataOutputStream(
                        new BufferedOutputStream(local.getOutputStream()));
                MediaProtocol.writeHandshake(output, MediaProtocol.Role.HOST_SUBSCRIBER,
                        session.ticket());
                if (input.readUnsignedByte() != MediaProtocol.ACK_OK) return;
                local.setSoTimeout(0);
                long nextMetricsLog = System.nanoTime() + 5_000_000_000L;
                while (running.get() && generation.get() == id) {
                    receiveMetrics.offered();
                    long receiveStarted = System.nanoTime();
                    MediaProtocol.RelayedFrame frame = MediaProtocol.readRelayedFrame(input);
                    receiveMetrics.completed(System.nanoTime() - receiveStarted, frame.jpeg().length);
                    if (decodedFrames == null) {
                        rawFrames.accept(frame);
                    } else {
                        decodeMetrics.offered();
                        long decodeStarted = System.nanoTime();
                        Image image = new Image(new ByteArrayInputStream(frame.jpeg()));
                        long decodeNanos = System.nanoTime() - decodeStarted;
                        if (image.isError()) {
                            decodeMetrics.dropped();
                            LOGGER.log(Level.FINE, "jpeg_decode_failed", image.getException());
                        } else {
                            decodeMetrics.completed(decodeNanos, frame.jpeg().length);
                            decodedFrames.accept(new DecodedFrame(frame, image));
                        }
                    }
                    if (System.nanoTime() >= nextMetricsLog) {
                        logMetrics(receiveMetrics.snapshotAndReset());
                        if (decodedFrames != null) logMetrics(decodeMetrics.snapshotAndReset());
                        nextMetricsLog = System.nanoTime() + 5_000_000_000L;
                    }
                }
            } catch (Exception error) {
                if (generation.get() == id && running.get()) {
                    String detail = "Không thể nhận camera từ media server " + host + ":"
                            + session.mediaPort() + " (" + error.getMessage() + ")";
                    LOGGER.log(Level.WARNING, detail, error);
                    errors.accept(detail);
                }
            } finally {
                if (generation.get() == id) {
                    running.set(false);
                    activeTicket = null;
                    socket = null;
                }
            }
        });
    }

    private static void logMetrics(PipelineStageMetrics.Snapshot snapshot) {
        if (snapshot.hasActivity()) LOGGER.info(() -> "proctor_pipeline " + snapshot.logLine());
    }

    public record DecodedFrame(MediaProtocol.RelayedFrame frame, Image image) { }

    @Override public synchronized void close() {
        generation.incrementAndGet();
        running.set(false);
        activeTicket = null;
        Socket current = socket;
        socket = null;
        if (current != null) try { current.close(); } catch (Exception ignored) { }
    }
}
