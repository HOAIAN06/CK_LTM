package com.nihongoquest.server;

import com.nihongoquest.common.Protocol;
import com.nihongoquest.server.db.Database;
import com.nihongoquest.server.db.PlayerRepository;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;

/**
 * GameServer là entry point phía Server.
 * Sau này mở ServerSocket, lắng nghe Client, accept connection và tạo ClientHandler.
 *
 * ServerSocket dùng để mở một cổng TCP và chờ Client kết nối.
 */
public class GameServer {

    private MatchmakingManager matchmakingManager;
    private QuestionManager questionManager;
    private final PlayerRepository playerRepository;
    private volatile boolean running;
    private ServerSocket serverSocket;

    public GameServer() {
        this.questionManager = new QuestionManager();
        this.matchmakingManager = new MatchmakingManager(questionManager);
        this.playerRepository = new PlayerRepository(new Database());
        this.running = false;
    }

    /**
     * Khởi động Server trên cổng chỉ định.
     * TODO: Tạo ServerSocket, vòng lặp accept(), tạo ClientHandler cho mỗi kết nối.
     */
    public void start(int port) {
        questionManager.loadQuestions();
        running = true;
        try {
            serverSocket = new ServerSocket(port);
            System.out.println("GameServer đang lắng nghe tại cổng " + port);
            while (running) {
                Socket clientSocket = serverSocket.accept();
                ClientHandler handler = new ClientHandler(
                        clientSocket, matchmakingManager, playerRepository);
                new Thread(handler, "client-" + clientSocket.getRemoteSocketAddress()).start();
            }
        } catch (IOException e) {
            if (running) {
                throw new IllegalStateException("Không thể chạy GameServer", e);
            }
        } finally {
            running = false;
        }
    }

    /**
     * Dừng Server.
     * TODO: Đóng ServerSocket và dọn dẹp tài nguyên.
     */
    public void stop() {
        running = false;
        if (serverSocket != null) {
            try {
                serverSocket.close();
            } catch (IOException ignored) {
                // Server đang dừng.
            }
        }
        System.out.println("Đã dừng GameServer");
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
