package com.nihongoquest.server;

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

    // private Socket socket;
    // private BufferedReader reader;
    // private PrintWriter writer;

    private final MatchmakingManager matchmakingManager;
    private String username;
    private boolean connected;

    public ClientHandler(MatchmakingManager matchmakingManager) {
        this.matchmakingManager = matchmakingManager;
        this.connected = false;
    }

    @Override
    public void run() {
        connected = true;
        // TODO: vòng lặp đọc message từ Client
        // TODO: xử lý CONNECT, FIND_MATCH, CANCEL_MATCH, ANSWER, DISCONNECT
        System.out.println("TODO: ClientHandler đang xử lý một Client");
    }

    /**
     * Gửi dữ liệu về Client.
     * TODO: Ghi xuống OutputStream của Socket.
     */
    public void send(String data) {
        System.out.println("TODO: Gửi tới Client: " + data);
    }

    /**
     * Đóng kết nối với Client này.
     * TODO: Đóng Socket an toàn.
     */
    public void close() {
        connected = false;
        System.out.println("TODO: Đóng ClientHandler");
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public boolean isConnected() {
        return connected;
    }

    public MatchmakingManager getMatchmakingManager() {
        return matchmakingManager;
    }
}
