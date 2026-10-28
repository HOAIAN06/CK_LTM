package com.nihongoquest.server.media;

import com.nihongoquest.common.media.MediaProtocol;
import com.nihongoquest.common.media.MediaProtocol.Handshake;
import com.nihongoquest.common.media.MediaProtocol.PublishedFrame;
import com.nihongoquest.common.media.MediaProtocol.RelayedFrame;
import com.nihongoquest.common.media.MediaProtocol.Role;
import com.nihongoquest.common.protocol.Payloads.MediaRole;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Authenticated LAN relay for proctoring JPEG frames. It never decodes or persists media.
 */
public final class ProctorMediaRelay implements AutoCloseable {
    private static final Logger LOGGER = Logger.getLogger(ProctorMediaRelay.class.getName());
    private static final Duration DEFAULT_TICKET_TTL = Duration.ofSeconds(60);

    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, TicketGrant> tickets = new ConcurrentHashMap<>();
    private final Map<String, RoomRelay> rooms = new ConcurrentHashMap<>();
    private final AtomicBoolean running = new AtomicBoolean();

    private ServerSocket serverSocket;
    private Thread acceptThread;
    private ExecutorService connectionExecutor;

    public synchronized void start(int port) throws IOException {
        if (!running.compareAndSet(false, true)) return;
        try {
            serverSocket = new ServerSocket(port);
            connectionExecutor = Executors.newVirtualThreadPerTaskExecutor();
            acceptThread = Thread.ofPlatform().daemon(true).name("proctor-media-accept").start(
                    this::acceptLoop);
        } catch (IOException | RuntimeException error) {
            running.set(false);
            closeQuietly(serverSocket);
            serverSocket = null;
            throw error;
        }
    }

    public int getLocalPort() {
        ServerSocket socket = serverSocket;
        return socket == null ? -1 : socket.getLocalPort();
    }

    public boolean isRunning() { return running.get(); }

    public Ticket issueTicket(String roomPin, long userId, Role role) {
        return issueTicket(roomPin, userId, role, DEFAULT_TICKET_TTL);
    }

    public Ticket issueTicket(String roomPin, long userId, Role role, Duration ttl) {
        if (roomPin == null || roomPin.isBlank() || userId <= 0 || role == null
                || ttl == null || ttl.isZero() || ttl.isNegative()) {
            throw new IllegalArgumentException("Invalid media ticket request");
        }
        RoomRelay room = rooms.computeIfAbsent(roomPin, RoomRelay::new);
        room.authorize(userId);
        // Reconnect always invalidates an unconsumed ticket for the same identity/role.
        tickets.entrySet().removeIf(entry -> {
            TicketGrant grant = entry.getValue();
            return grant.roomPin.equals(roomPin) && grant.userId == userId && grant.role == role;
        });
        byte[] random = new byte[32];
        String token;
        do {
            secureRandom.nextBytes(random);
            token = Base64.getUrlEncoder().withoutPadding().encodeToString(random);
        } while (tickets.containsKey(token));
        Instant expiresAt = Instant.now().plus(ttl);
        tickets.put(token, new TicketGrant(roomPin, userId, role, expiresAt));
        return new Ticket(token, expiresAt.toEpochMilli());
    }

    /** Adapter for the JSON control-channel enum without leaking it into the binary protocol. */
    public Ticket issueTicket(String roomPin, long userId, MediaRole role) {
        return issueTicket(roomPin, userId, toBinaryRole(role));
    }

    public Ticket issueTicket(String roomPin, long userId, MediaRole role, Duration ttl) {
        return issueTicket(roomPin, userId, toBinaryRole(role), ttl);
    }

    private static Role toBinaryRole(MediaRole role) {
        if (role == null) throw new IllegalArgumentException("Media role is required");
        return switch (role) {
            case PUBLISHER -> Role.PUBLISHER;
            case HOST_SUBSCRIBER -> Role.HOST_SUBSCRIBER;
        };
    }

    public void revokeUser(String roomPin, long userId) {
        tickets.entrySet().removeIf(entry -> entry.getValue().roomPin.equals(roomPin)
                && entry.getValue().userId == userId);
        RoomRelay room = rooms.get(roomPin);
        if (room != null) room.revokeUser(userId);
    }

    public void removeUser(String roomPin, long userId) {
        revokeUser(roomPin, userId);
    }

    public void closeRoom(String roomPin) {
        tickets.entrySet().removeIf(entry -> entry.getValue().roomPin.equals(roomPin));
        RoomRelay room = rooms.remove(roomPin);
        if (room != null) room.close();
    }

    private void acceptLoop() {
        while (running.get()) {
            try {
                Socket socket = serverSocket.accept();
                connectionExecutor.submit(() -> handleConnection(socket));
            } catch (SocketException error) {
                if (running.get()) LOGGER.log(Level.WARNING, "Media accept failed", error);
                break;
            } catch (IOException error) {
                if (running.get()) LOGGER.log(Level.WARNING, "Media accept failed", error);
            } catch (RuntimeException error) {
                LOGGER.log(Level.WARNING, "Cannot dispatch media connection", error);
            }
        }
    }

    private void handleConnection(Socket socket) {
        try (socket;
             DataInputStream input = new DataInputStream(new BufferedInputStream(
                     socket.getInputStream()));
             DataOutputStream output = new DataOutputStream(new BufferedOutputStream(
                     socket.getOutputStream()))) {
            socket.setSoTimeout(MediaProtocol.HANDSHAKE_TIMEOUT_MILLIS);
            Handshake handshake;
            try {
                handshake = MediaProtocol.readHandshake(input);
            } catch (MediaProtocol.HandshakeException error) {
                acknowledge(output, error.acknowledgement());
                return;
            }
            TicketGrant grant = consumeTicket(handshake.ticket(), handshake.role());
            if (grant == null) {
                acknowledge(output, MediaProtocol.ACK_INVALID_TICKET);
                return;
            }
            if (grant.expiresAt.isBefore(Instant.now())) {
                acknowledge(output, MediaProtocol.ACK_EXPIRED_TICKET);
                return;
            }
            RoomRelay room = rooms.get(grant.roomPin);
            if (room == null || room.closed) {
                acknowledge(output, MediaProtocol.ACK_ROOM_CLOSED);
                return;
            }
            if (grant.role == Role.PUBLISHER) {
                if (!room.attachPublisher(grant.userId, socket)) {
                    acknowledge(output, MediaProtocol.ACK_ROOM_CLOSED);
                    return;
                }
                acknowledge(output, MediaProtocol.ACK_OK);
                socket.setSoTimeout(0);
                room.runPublisher(grant.userId, socket, input);
            } else {
                if (!room.attachHost(socket)) {
                    acknowledge(output, MediaProtocol.ACK_ROOM_CLOSED);
                    return;
                }
                acknowledge(output, MediaProtocol.ACK_OK);
                socket.setSoTimeout(0);
                room.runHostSubscriber(grant.userId, socket, output);
            }
        } catch (IOException error) {
            if (running.get()) LOGGER.log(Level.FINE, "Media connection closed", error);
        }
    }

    private TicketGrant consumeTicket(String token, Role role) {
        TicketGrant grant = tickets.remove(token);
        return grant != null && grant.role == role ? grant : null;
    }

    private static void acknowledge(DataOutputStream output, int acknowledgement)
            throws IOException {
        output.writeByte(acknowledgement);
        output.flush();
    }

    @Override
    public synchronized void close() {
        running.set(false);
        closeQuietly(serverSocket);
        serverSocket = null;
        rooms.values().forEach(RoomRelay::close);
        rooms.clear();
        tickets.clear();
        if (connectionExecutor != null) connectionExecutor.shutdownNow();
        connectionExecutor = null;
        acceptThread = null;
    }

    public void stop() {
        close();
    }

    private static void closeQuietly(AutoCloseable closeable) {
        if (closeable == null) return;
        try {
            closeable.close();
        } catch (Exception ignored) {
            // Best effort during shutdown/replacement.
        }
    }

    public record Ticket(String token, long expiresAtEpochMillis) { }

    private record TicketGrant(String roomPin, long userId, Role role, Instant expiresAt) { }

    private static final class RoomRelay {
        private final String pin;
        private final Object monitor = new Object();
        private final Map<Long, Socket> publishers = new HashMap<>();
        private final Map<Long, RelayedFrame> latestFrames = new HashMap<>();
        private final Set<Long> revokedUsers = new HashSet<>();
        private volatile Socket hostSocket;
        private volatile boolean closed;

        RoomRelay(String pin) { this.pin = pin; }

        void authorize(long userId) {
            synchronized (monitor) {
                if (!closed) revokedUsers.remove(userId);
            }
        }

        boolean attachPublisher(long userId, Socket socket) {
            synchronized (monitor) {
                if (closed || revokedUsers.contains(userId)) return false;
                Socket previous = publishers.put(userId, socket);
                if (previous != socket) closeQuietly(previous);
                return true;
            }
        }

        void runPublisher(long userId, Socket socket, DataInputStream input) throws IOException {
            try {
                while (!closed && !socket.isClosed()) {
                    PublishedFrame frame = MediaProtocol.readPublishedFrame(input);
                    synchronized (monitor) {
                        if (hostSocket != null && !hostSocket.isClosed()) {
                            latestFrames.put(userId, new RelayedFrame(userId, frame.sequence(),
                                    System.currentTimeMillis(), frame.jpeg()));
                            monitor.notifyAll();
                        }
                    }
                }
            } finally {
                synchronized (monitor) {
                    publishers.remove(userId, socket);
                    latestFrames.remove(userId);
                }
            }
        }

        boolean attachHost(Socket socket) {
            synchronized (monitor) {
                if (closed) return false;
                Socket previous = hostSocket;
                hostSocket = socket;
                latestFrames.clear();
                if (previous != socket) closeQuietly(previous);
                return true;
            }
        }

        void runHostSubscriber(long hostUserId, Socket socket, DataOutputStream output)
                throws IOException {
            try {
                while (!closed && !socket.isClosed() && hostSocket == socket) {
                    List<RelayedFrame> batch;
                    synchronized (monitor) {
                        while (!closed && hostSocket == socket && latestFrames.isEmpty()) {
                            try {
                                monitor.wait(1_000L);
                            } catch (InterruptedException interrupted) {
                                Thread.currentThread().interrupt();
                                return;
                            }
                        }
                        batch = new ArrayList<>(latestFrames.values());
                        latestFrames.clear();
                    }
                    batch.sort(Comparator.comparingLong(RelayedFrame::userId));
                    for (RelayedFrame frame : batch) {
                        MediaProtocol.writeRelayedFrame(output, frame);
                    }
                    if (!batch.isEmpty()) output.flush();
                }
            } finally {
                synchronized (monitor) {
                    if (hostSocket == socket) hostSocket = null;
                    latestFrames.clear();
                    monitor.notifyAll();
                }
            }
        }

        void revokeUser(long userId) {
            synchronized (monitor) {
                revokedUsers.add(userId);
                closeQuietly(publishers.remove(userId));
                latestFrames.remove(userId);
            }
        }

        void close() {
            synchronized (monitor) {
                if (closed) return;
                closed = true;
                closeQuietly(hostSocket);
                hostSocket = null;
                publishers.values().forEach(ProctorMediaRelay::closeQuietly);
                publishers.clear();
                latestFrames.clear();
                revokedUsers.clear();
                monitor.notifyAll();
            }
        }

        @Override public String toString() { return "RoomRelay[pin=" + pin + "]"; }
    }
}
