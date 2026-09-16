package com.nihongoquest.server;

import com.nihongoquest.common.Protocol;

/**
 * GameServer là entry point phía Server.
 * Sau này mở ServerSocket, lắng nghe Client, accept connection và tạo ClientHandler.
 *
 * ServerSocket dùng để mở một cổng TCP và chờ Client kết nối.
 */
public class GameServer {

    private MatchmakingManager matchmakingManager;
    private QuestionManager questionManager;
    private boolean running;

    public GameServer() {
        this.matchmakingManager = new MatchmakingManager();
        this.questionManager = new QuestionManager();
        this.running = false;
    }

    /**
     * Khởi động Server trên cổng chỉ định.
     * TODO: Tạo ServerSocket, vòng lặp accept(), tạo ClientHandler cho mỗi kết nối.
     */
    public void start(int port) {
        running = true;
        System.out.println("TODO: GameServer lắng nghe tại cổng " + port);
        // TODO: ServerSocket serverSocket = new ServerSocket(port);
        // TODO: while (running) { Socket clientSocket = serverSocket.accept(); ... }
    }

    /**
     * Dừng Server.
     * TODO: Đóng ServerSocket và dọn dẹp tài nguyên.
     */
    public void stop() {
        running = false;
        System.out.println("TODO: Dừng GameServer");
    }

    public MatchmakingManager getMatchmakingManager() {
        return matchmakingManager;
    }

    public QuestionManager getQuestionManager() {
        return questionManager;
    }

    public boolean isRunning() {
        return running;
    }

    /**
     * Chạy Server độc lập với Client.
     */
    public static void main(String[] args) {
        GameServer server = new GameServer();
        server.start(Protocol.DEFAULT_PORT);
    }
}
