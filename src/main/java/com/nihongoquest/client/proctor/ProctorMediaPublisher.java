package com.nihongoquest.client.proctor;

import com.nihongoquest.common.protocol.Payloads;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.atomic.AtomicBoolean;

/** Binary media-channel publisher. A one-element queue guarantees latest-frame semantics. */
public final class ProctorMediaPublisher implements AutoCloseable {
    private final ArrayBlockingQueue<CapturedFrame> latest = new ArrayBlockingQueue<>(1);
    private final AtomicBoolean running = new AtomicBoolean();
    private Socket socket;

    public void connect(String host, Payloads.ProctorMediaSession session) {
        close();
        running.set(true);
        Thread.ofVirtual().name("proctor-media-publisher").start(() -> run(host, session));
    }

    public void offer(CapturedFrame frame) {
        if (!latest.offer(frame)) {
            latest.poll();
            latest.offer(frame);
        }
    }

    private void run(String host, Payloads.ProctorMediaSession session) {
        try (Socket local = new Socket()) {
            socket = local;
            local.connect(new InetSocketAddress(host, session.mediaPort()), 5_000);
            local.setSoTimeout(10_000);
            DataOutputStream out = new DataOutputStream(new BufferedOutputStream(local.getOutputStream()));
            DataInputStream in = new DataInputStream(new BufferedInputStream(local.getInputStream()));
            byte[] ticket = session.ticket().getBytes(StandardCharsets.UTF_8);
            out.writeBytes("NQMP"); out.writeByte(1); out.writeByte(1);
            out.writeShort(ticket.length); out.write(ticket); out.flush();
            if (in.readUnsignedByte() != 0) throw new IllegalStateException("Media ticket bị từ chối");
            local.setSoTimeout(0);
            while (running.get()) {
                CapturedFrame frame = latest.take();
                out.writeByte(0x10);
                out.writeLong(frame.sequence());
                out.writeLong(frame.capturedAtEpochMillis());
                out.writeInt(frame.jpeg().length);
                out.write(frame.jpeg());
                out.flush();
            }
        } catch (Exception ignored) {
            // Control channel will issue a fresh one-use ticket on reconnect.
        } finally {
            running.set(false);
        }
    }

    @Override public void close() {
        running.set(false);
        latest.clear();
        if (socket != null) try { socket.close(); } catch (Exception ignored) { }
    }
}
