package com.nihongoquest.server;

import com.nihongoquest.common.Message;
import com.nihongoquest.common.MessageType;
import com.nihongoquest.common.Payloads;
import com.nihongoquest.common.Protocol;
import com.nihongoquest.server.db.PlayerRepository;
import com.nihongoquest.server.db.PlayerRepository.AuthResult;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.Socket;
import java.nio.charset.Charset;
import java.sql.SQLException;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;
import java.util.regex.Pattern;
import java.util.logging.Logger;

/**
 * ClientHandler đại diện một Client đang kết nối tới Server.
 * Mỗi connection có một ClientHandler riêng:
 * Client A → ClientHandler A
 * Client B → ClientHandler B
 *
 * Socket đại diện cho một kết nối TCP giữa Client và Server.
 * Class này đọc message từ Client, gửi message về Client,
 * và chuyển FIND_MATCH tới MatchmakingManager.
 */
public class ClientHandler implements Runnable {

    private static final Logger LOGGER = Logger.getLogger(ClientHandler.class.getName());

    private static final Pattern USERNAME_PATTERN = Pattern.compile("[a-zA-Z0-9_]{3,20}");
    private final Socket socket;
    private final MatchmakingManager matchmakingManager;
    private final PlayerRepository playerRepository;
    private BufferedReader reader;
    private PrintWriter writer;
    private Long playerId;
    private String username;
    private volatile boolean connected;
    private volatile boolean queued;
    private volatile GameRoom currentRoom;
    private final AtomicBoolean closed;
    private volatile Instant lastActivity;
    private final Instant connectedAt;
    private final Consumer<String> activityListener;
    private final Consumer<TrafficEvent> trafficListener;
    private final Consumer<ClientHandler> closeListener;

    public ClientHandler(Socket socket, MatchmakingManager matchmakingManager,
                         PlayerRepository playerRepository, Consumer<String> activityListener,
                         Consumer<TrafficEvent> trafficListener,
                         Consumer<ClientHandler> closeListener) {
        this.socket = socket;
        this.matchmakingManager = matchmakingManager;
        this.playerRepository = playerRepository;
        this.connected = false;
        this.queued = false;
        this.closed = new AtomicBoolean(false);
        this.lastActivity = Instant.now();
        this.connectedAt = Instant.now();
        this.activityListener = activityListener;
        this.trafficListener = trafficListener;
        this.closeListener = closeListener;
    }

    @Override
    public void run() {
        connected = true;
        Charset charset = Charset.forName(Protocol.ENCODING);
        try {
            reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), charset));
            writer = new PrintWriter(new OutputStreamWriter(socket.getOutputStream(), charset), true);
            String line;
            while (connected) {
                line = reader.readLine();
                if (line == null) {
                    break;
                }
                lastActivity = Instant.now();
                reportTraffic(TrafficEvent.Direction.RECEIVED, line);
                handleMessage(Message.fromWire(line));
            }
        } catch (IllegalArgumentException e) {
            LOGGER.warning("Client " + socket.getRemoteSocketAddress()
                    + " gửi message không hợp lệ: " + e.getMessage());
        } catch (IOException e) {
            if (connected) {
                LOGGER.warning("Mất kết nối client=" + socket.getRemoteSocketAddress()
                        + ": " + e.getMessage());
            }
        } finally {
            close();
        }
    }

    private void handleMessage(Message message) {
        switch (message.getType()) {
            case REGISTER -> authenticate(message, true);
            case LOGIN -> authenticate(message, false);
            case FIND_MATCH -> {
                reportActivity(getDisplayName() + " bắt đầu tìm trận");
                matchmakingManager.enqueue(this);
            }
            case CANCEL_MATCH -> {
                reportActivity(getDisplayName() + " hủy tìm trận");
                matchmakingManager.dequeue(this);
            }
            case ANSWER -> handleAnswer(message.getPayload());
            case DISCONNECT -> close();
            case CONNECT -> reportActivity("TCP client sẵn sàng: " + getRemoteAddress());
            default -> LOGGER.fine("Chưa xử lý message type=" + message.getType()
                    + " user=" + username);
        }
    }

    private void handleAnswer(String payload) {
        GameRoom room = currentRoom;
        if (room == null) {
            return;
        }
        try {
            int answerIndex = Integer.parseInt(payload);
            reportActivity(getDisplayName() + " gửi đáp án trong trận " + room.getRoomId());
            room.handleAnswer(this, answerIndex);
        } catch (NumberFormatException e) {
            LOGGER.warning("Đáp án không hợp lệ từ " + username + ": " + payload);
        }
    }

    private void authenticate(Message message, boolean registering) {
        MessageType okType = registering ? MessageType.REGISTER_OK : MessageType.LOGIN_OK;
        MessageType failType = registering ? MessageType.REGISTER_FAIL : MessageType.LOGIN_FAIL;
        Payloads.Credentials credentials;
        try {
            credentials = Payloads.parseCredentials(message.getPayload());
        } catch (IllegalArgumentException e) {
            send(new Message(failType, "BAD_REQUEST"));
            return;
        }
        if (!isValid(credentials.username(), credentials.password())) {
            send(new Message(failType, "BAD_REQUEST"));
            return;
        }

        try {
            AuthResult result = registering
                    ? playerRepository.register(credentials.username(), credentials.password())
                    : playerRepository.login(credentials.username(), credentials.password());
            if (result.success()) {
                if (!registering) {
                    playerId = result.player().id();
                    username = result.player().username();
                }
                send(new Message(okType, result.player().toPayload()));
                reportActivity(result.player().username()
                        + (registering ? " đăng ký thành công" : " đăng nhập thành công"));
            } else {
                send(new Message(failType, result.reason()));
                reportActivity("Đăng nhập thất bại từ " + getRemoteAddress());
            }
        } catch (SQLException e) {
            LOGGER.warning("Lỗi database khi xác thực user=" + username + ": " + e.getMessage());
            send(new Message(failType, "DATABASE_ERROR"));
        }
    }

    private boolean isValid(String candidateUsername, String password) {
        return USERNAME_PATTERN.matcher(candidateUsername).matches() && password.length() >= 4;
    }

    /** Gửi một JSON frame về client. */
    public synchronized void send(Message message) {
        if (writer != null) {
            String json = message.toWire();
            writer.println(json);
            reportTraffic(TrafficEvent.Direction.SENT, json);
        }
    }

    /** Đóng kết nối và giải phóng tất cả tài nguyên liên quan. */
    public void close() {
        if (!closed.compareAndSet(false, true)) {
            return;
        }
        connected = false;
        matchmakingManager.disconnect(this);
        GameRoom room = currentRoom;
        currentRoom = null;
        if (room != null) {
            room.playerDisconnected(this);
        }
        try {
            socket.close();
        } catch (IOException ignored) {
            // Socket đã đóng.
        }
        closeListener.accept(this);
    }

    public String getUsername() {
        return username;
    }

    public Long getPlayerId() {
        return playerId;
    }

    public boolean isAuthenticated() {
        return playerId != null;
    }

    public boolean isQueued() {
        return queued;
    }

    void setQueued(boolean queued) {
        this.queued = queued;
    }

    public GameRoom getCurrentRoom() {
        return currentRoom;
    }

    void setCurrentRoom(GameRoom currentRoom) {
        this.currentRoom = currentRoom;
    }

    void clearCurrentRoom(GameRoom room) {
        if (currentRoom == room) {
            currentRoom = null;
        }
    }

    public boolean isConnected() {
        return connected;
    }

    public String getRemoteAddress() {
        return String.valueOf(socket.getRemoteSocketAddress());
    }

    public Instant getConnectedAt() {
        return connectedAt;
    }

    public Instant getLastActivity() {
        return lastActivity;
    }

    public String getDisplayName() {
        return username == null ? getRemoteAddress() : username;
    }

    public String getStatusText() {
        if (!connected) {
            return "Đã ngắt kết nối";
        }
        if (currentRoom != null) {
            return "Đang thi đấu";
        }
        if (queued) {
            return "Đang chờ ghép trận";
        }
        if (isAuthenticated()) {
            return "Trực tuyến";
        }
        return "Chưa đăng nhập";
    }

    void reportActivity(String message) {
        activityListener.accept(message);
    }

    private void reportTraffic(TrafficEvent.Direction direction, String json) {
        trafficListener.accept(new TrafficEvent(
                Instant.now(), direction, getDisplayName(), json));
    }
}
