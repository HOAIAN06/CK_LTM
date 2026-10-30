package com.nihongoquest.client.proctor;

import com.nihongoquest.common.media.MediaProtocol;
import com.nihongoquest.common.protocol.Payloads;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
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
    private volatile Socket socket;
    private volatile String activeTicket;

    public synchronized void connect(String host, Payloads.ProctorMediaSession session,
                                     Consumer<MediaProtocol.RelayedFrame> frames) {
        connect(host, session, frames, ignored -> { });
    }

    public synchronized void connect(String host, Payloads.ProctorMediaSession session,
                                     Consumer<MediaProtocol.RelayedFrame> frames,
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
                while (running.get() && generation.get() == id)
                    frames.accept(MediaProtocol.readRelayedFrame(input));
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

    @Override public synchronized void close() {
        generation.incrementAndGet();
        running.set(false);
        activeTicket = null;
        Socket current = socket;
        socket = null;
        if (current != null) try { current.close(); } catch (Exception ignored) { }
    }
}
