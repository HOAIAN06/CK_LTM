package com.nihongoquest.server.network;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.server.ranked.GameRoom;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;
import java.util.logging.Logger;

/** Một kết nối TCP: đọc frame, gửi frame và giữ thông tin phiên đã đăng nhập. */
public class ClientHandler implements Runnable {
    private static final Logger LOGGER = Logger.getLogger(ClientHandler.class.getName());

    private final Socket socket;
    private final ServerRequestRouter router;
    private final Consumer<String> activityListener;
    private final Consumer<TrafficEvent> trafficListener;
    private final Consumer<ClientHandler> closeListener;
    private final AtomicBoolean closed = new AtomicBoolean();
    private final Instant connectedAt = Instant.now();

    private BufferedReader reader;
    private PrintWriter writer;
    private volatile boolean connected;
    private volatile boolean queued;
    private volatile Long playerId;
    private volatile String username;
    private volatile GameRoom currentRoom;
    private volatile Instant lastActivity = Instant.now();

    public ClientHandler(Socket socket, ServerRequestRouter router,
                         Consumer<String> activityListener,
                         Consumer<TrafficEvent> trafficListener,
                         Consumer<ClientHandler> closeListener) {
        this.socket = socket;
        this.router = router;
        this.activityListener = activityListener;
        this.trafficListener = trafficListener;
        this.closeListener = closeListener;
    }

    /** Constructor tối thiểu cho test double không mở luồng TCP. */
    protected ClientHandler(Socket socket) {
        this(socket, null, ignored -> { }, ignored -> { }, ignored -> { });
    }

    @Override
    public void run() {
        connected = true;
        try {
            reader = new BufferedReader(new InputStreamReader(
                    socket.getInputStream(), StandardCharsets.UTF_8));
            writer = new PrintWriter(new OutputStreamWriter(
                    socket.getOutputStream(), StandardCharsets.UTF_8), true);
            String line;
            while (connected && (line = reader.readLine()) != null) {
                lastActivity = Instant.now();
                Message message = Message.fromWire(line);
                reportTraffic(TrafficEvent.Direction.RECEIVED, safeWire(message));
                router.handle(this, message);
            }
        } catch (IllegalArgumentException e) {
            LOGGER.warning("Client gửi JSON không hợp lệ: " + e.getMessage());
        } catch (IOException e) {
            if (connected) LOGGER.warning("Mất kết nối " + getRemoteAddress() + ": " + e.getMessage());
        } finally {
            close();
        }
    }

    public synchronized void send(Message message) {
        if (writer == null || closed.get()) return;
        String wire = message.toWire();
        writer.println(wire);
        reportTraffic(TrafficEvent.Direction.SENT, safeWire(message));
    }

    public void close() {
        if (!closed.compareAndSet(false, true)) return;
        connected = false;
        if (router != null) router.disconnected(this);
        GameRoom room = currentRoom;
        currentRoom = null;
        if (room != null) room.playerDisconnected(this);
        try {
            socket.close();
        } catch (IOException ignored) {
            // Socket đã đóng.
        }
        closeListener.accept(this);
    }

    private String safeWire(Message message) {
        if (message.getType() != MessageType.LOGIN && message.getType() != MessageType.REGISTER) {
            return message.toWire();
        }
        JsonNode payload = message.getPayload().deepCopy();
        if (payload instanceof ObjectNode object) object.put("password", "***");
        return new Message(message.getType(), payload).toWire();
    }

    private void reportTraffic(TrafficEvent.Direction direction, String json) {
        trafficListener.accept(new TrafficEvent(Instant.now(), direction, getDisplayName(), json));
    }

    public void setAuthenticatedPlayer(long playerId, String username) {
        this.playerId = playerId;
        this.username = username;
    }

    public Long getPlayerId() { return playerId; }
    public String getUsername() { return username; }
    public boolean isAuthenticated() { return playerId != null; }
    public boolean isQueued() { return queued; }
    public void setQueued(boolean queued) { this.queued = queued; }
    public GameRoom getCurrentRoom() { return currentRoom; }
    public void setCurrentRoom(GameRoom room) { currentRoom = room; }
    public void clearCurrentRoom(GameRoom room) { if (currentRoom == room) currentRoom = null; }
    public boolean isConnected() { return connected; }
    public Instant getConnectedAt() { return connectedAt; }
    public Instant getLastActivity() { return lastActivity; }
    public String getRemoteAddress() { return String.valueOf(socket.getRemoteSocketAddress()); }
    public String getDisplayName() { return username == null ? getRemoteAddress() : username; }

    public String getStatusText() {
        if (!connected) return "Đã ngắt kết nối";
        if (currentRoom != null) return "Đang thi đấu";
        if (queued) return "Đang chờ ghép trận";
        return isAuthenticated() ? "Trực tuyến" : "Chưa đăng nhập";
    }

    public void reportActivity(String message) { activityListener.accept(message); }
}
