package com.nihongoquest.client.proctor;

import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.common.media.MediaProtocol;
import com.nihongoquest.common.media.VisionMetadata;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.logging.Level;
import java.util.logging.Logger;

/** Binary media-channel publisher. A one-element queue guarantees latest-frame semantics. */
public final class ProctorMediaPublisher implements AutoCloseable {
    private static final Logger LOGGER = Logger.getLogger(ProctorMediaPublisher.class.getName());
    private final ArrayBlockingQueue<CapturedFrame> latest = new ArrayBlockingQueue<>(1);
    private final AtomicBoolean running = new AtomicBoolean();
    private final AtomicLong generation = new AtomicLong();
    private volatile Socket socket;
    private volatile String activeTicket;
    private volatile VisionMetadata latestVision = VisionMetadata.unavailable(0);

    public synchronized void connect(String host, Payloads.ProctorMediaSession session) {
        if (running.get() && session.ticket().equals(activeTicket)) return;
        close();
        long id = generation.incrementAndGet();
        activeTicket = session.ticket();
        running.set(true);
        Thread.ofVirtual().name("proctor-media-publisher").start(() -> run(host, session, id));
    }

    public void offer(CapturedFrame frame) {
        if (!latest.offer(frame)) {
            latest.poll();
            latest.offer(frame);
        }
    }

    /** Analysis is intentionally independent from capture; sender uses the newest result. */
    public void offerVision(VisionMetadata vision) {
        if (vision != null) latestVision = vision;
    }

    private void run(String host, Payloads.ProctorMediaSession session, long id) {
        if (generation.get() != id) return;
        try (Socket local = new Socket()) {
            if (generation.get() != id) return;
            socket = local;
            local.connect(new InetSocketAddress(host, session.mediaPort()), 5_000);
            local.setSoTimeout(10_000);
            DataOutputStream out = new DataOutputStream(new BufferedOutputStream(local.getOutputStream()));
            DataInputStream in = new DataInputStream(new BufferedInputStream(local.getInputStream()));
            MediaProtocol.writeHandshake(out, MediaProtocol.Role.PUBLISHER, session.ticket());
            if (in.readUnsignedByte() != 0) throw new IllegalStateException("Media ticket bị từ chối");
            local.setSoTimeout(0);
            while (running.get() && generation.get() == id) {
                CapturedFrame frame = latest.take();
                VisionMetadata vision = latestVision;
                MediaProtocol.writePublishedFrame(out, new MediaProtocol.PublishedFrame(
                        frame.sequence(), frame.capturedAtEpochMillis(), frame.jpeg(), vision));
            }
        } catch (Exception error) {
            if (generation.get() == id && running.get()) {
                LOGGER.log(Level.WARNING, "Không thể truyền camera tới media server "
                        + host + ":" + session.mediaPort(), error);
            }
        } finally {
            if (generation.get() == id) {
                running.set(false);
                activeTicket = null;
                socket = null;
            }
        }
    }

    @Override public synchronized void close() {
        generation.incrementAndGet();
        running.set(false);
        activeTicket = null;
        latest.clear();
        Socket current = socket;
        socket = null;
        if (current != null) try { current.close(); } catch (Exception ignored) { }
    }
}
