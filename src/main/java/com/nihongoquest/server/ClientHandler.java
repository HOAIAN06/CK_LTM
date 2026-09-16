package com.nihongoquest.server;

import com.nihongoquest.common.Message;
import com.nihongoquest.common.MessageType;
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
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Pattern;

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

    public ClientHandler(Socket socket, MatchmakingManager matchmakingManager,
                         PlayerRepository playerRepository) {
        this.socket = socket;
        this.matchmakingManager = matchmakingManager;
        this.playerRepository = playerRepository;
        this.connected = false;
        this.queued = false;
        this.closed = new AtomicBoolean(false);
    }

    @Override
    public void run() {
        connected = true;
        Charset charset = Charset.forName(Protocol.ENCODING);
        try {
            reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), charset));
            writer = new PrintWriter(new OutputStreamWriter(socket.getOutputStream(), charset), true);

            String line;
            while (connected && (line = reader.readLine()) != null) {
                handleMessage(Message.fromWire(line));
            }
        } catch (IllegalArgumentException e) {
            System.err.println("Client gửi message không hợp lệ: " + e.getMessage());
        } catch (IOException e) {
            if (connected) {
                System.err.println("Mất kết nối client: " + e.getMessage());
            }
        } finally {
            close();
        }
    }

    private void handleMessage(Message message) {
        switch (message.getType()) {
            case REGISTER -> authenticate(message, true);
            case LOGIN -> authenticate(message, false);
            case FIND_MATCH -> matchmakingManager.enqueue(this);
            case CANCEL_MATCH -> matchmakingManager.dequeue(this);
            case ANSWER -> handleAnswer(message.getPayload());
            case DISCONNECT -> close();
            default -> System.out.println("Chưa xử lý message: " + message.getType());
        }
    }

    private void handleAnswer(String payload) {
        GameRoom room = currentRoom;
        if (room == null) {
            return;
        }
        try {
            room.handleAnswer(this, Integer.parseInt(payload));
        } catch (NumberFormatException e) {
            System.err.println("Đáp án không hợp lệ từ " + username + ": " + payload);
        }
    }

    private void authenticate(Message message, boolean registering) {
        MessageType okType = registering ? MessageType.REGISTER_OK : MessageType.LOGIN_OK;
        MessageType failType = registering ? MessageType.REGISTER_FAIL : MessageType.LOGIN_FAIL;
        String[] credentials = message.getPayload().split("\\|", 2);
        if (credentials.length != 2 || !isValid(credentials[0], credentials[1])) {
            send(new Message(failType, "BAD_REQUEST"));
            return;
        }

        try {
            AuthResult result = registering
                    ? playerRepository.register(credentials[0], credentials[1])
                    : playerRepository.login(credentials[0], credentials[1]);
            if (result.success()) {
                playerId = result.player().id();
                username = result.player().username();
                send(new Message(okType, result.player().toPayload()));
            } else {
                send(new Message(failType, result.reason()));
            }
        } catch (SQLException e) {
            System.err.println("Lỗi database khi xác thực: " + e.getMessage());
            send(new Message(failType, "DATABASE_ERROR"));
        }
    }

    private boolean isValid(String candidateUsername, String password) {
        return USERNAME_PATTERN.matcher(candidateUsername).matches() && password.length() >= 4;
    }

    /**
     * Gửi dữ liệu về Client.
     * TODO: Ghi xuống OutputStream của Socket.
     */
    public synchronized void send(Message message) {
        if (writer != null) {
            writer.println(message.toWire());
        }
    }

    /**
     * Đóng kết nối với Client này.
     * TODO: Đóng Socket an toàn.
     */
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
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
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

    public MatchmakingManager getMatchmakingManager() {
        return matchmakingManager;
    }
}
