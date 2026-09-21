package com.nihongoquest.server;

import com.nihongoquest.common.Protocol;
import com.nihongoquest.server.db.Database;
import com.nihongoquest.server.db.PlayerRepository;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;
import java.util.logging.Logger;

/**
 * GameServer là entry point phía Server.
 * Sau này mở ServerSocket, lắng nghe Client, accept connection và tạo ClientHandler.
 *
 * ServerSocket dùng để mở một cổng TCP và chờ Client kết nối.
 */
public class GameServer {

    private static final Logger LOGGER = Logger.getLogger(GameServer.class.getName());

    private MatchmakingManager matchmakingManager;
    private QuestionManager questionManager;
    private final PlayerRepository playerRepository;
    private volatile boolean running;
    private ServerSocket serverSocket;
    private ExecutorService clientExecutor;
    private final Set<ClientHandler> clients = ConcurrentHashMap.newKeySet();
    private final List<Consumer<String>> activityListeners = new CopyOnWriteArrayList<>();
    private final List<Consumer<TrafficEvent>> trafficListeners = new CopyOnWriteArrayList<>();

    public GameServer() {
        this.questionManager = new QuestionManager();
        this.playerRepository = new PlayerRepository(new Database());
        this.matchmakingManager = new MatchmakingManager(questionManager, playerRepository);
        this.running = false;
    }

    /**
     * Khởi động server trên cổng chỉ định.
     */
    public void start(int port) {
        questionManager.loadQuestions();
        running = true;
        try {
            serverSocket = new ServerSocket(port);
            clientExecutor = Executors.newFixedThreadPool(50, task -> {
                Thread thread = new Thread(task, "client-handler");
                thread.setDaemon(true);
                return thread;
            });
            LOGGER.info("GameServer đang lắng nghe tại cổng " + port);
            publishActivity("Server đã khởi động tại cổng " + port);
            while (running) {
                Socket clientSocket = serverSocket.accept();
                ClientHandler handler = new ClientHandler(
                        clientSocket, matchmakingManager, playerRepository,
                        this::publishActivity, this::publishTraffic, this::clientDisconnected);
                clients.add(handler);
                publishActivity("Kết nối mới: " + clientSocket.getRemoteSocketAddress());
                try {
                    clientExecutor.submit(handler);
                } catch (RejectedExecutionException e) {
                    handler.close();
                }
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
     * Dừng server và dọn dẹp tài nguyên.
     */
    public void stop() {
        running = false;
        clients.forEach(ClientHandler::close);
        clients.clear();
        if (serverSocket != null) {
            try {
                serverSocket.close();
            } catch (IOException ignored) {
                // Server đang dừng.
            }
        }
        if (clientExecutor != null) {
            clientExecutor.shutdownNow();
        }
        LOGGER.info("Đã dừng GameServer");
        publishActivity("Server đã dừng");
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

    public void addActivityListener(Consumer<String> listener) {
        activityListeners.add(listener);
    }

    public void removeActivityListener(Consumer<String> listener) {
        activityListeners.remove(listener);
    }

    public void addTrafficListener(Consumer<TrafficEvent> listener) {
        trafficListeners.add(listener);
    }

    public void removeTrafficListener(Consumer<TrafficEvent> listener) {
        trafficListeners.remove(listener);
    }

    public List<ClientSnapshot> getClientSnapshots() {
        return clients.stream()
                .map(client -> new ClientSnapshot(
                        client,
                        client.getUsername() == null ? "Chưa đăng nhập" : client.getUsername(),
                        client.getRemoteAddress(),
                        client.getStatusText(),
                        client.getConnectedAt(),
                        client.getLastActivity()))
                .sorted(Comparator.comparing(ClientSnapshot::connectedAt))
                .toList();
    }

    public int getAuthenticatedCount() {
        return (int) clients.stream().filter(ClientHandler::isAuthenticated).count();
    }

    public int getPlayingCount() {
        return (int) clients.stream().filter(client -> client.getCurrentRoom() != null).count();
    }

    public int getActiveRoomCount() {
        return (int) clients.stream()
                .map(ClientHandler::getCurrentRoom)
                .filter(room -> room != null && !room.isFinished())
                .distinct()
                .count();
    }

    public void disconnectClient(ClientHandler client) {
        if (client != null && clients.contains(client)) {
            publishActivity("Quản trị viên ngắt kết nối " + client.getDisplayName());
            client.close();
        }
    }

    private void clientDisconnected(ClientHandler client) {
        clients.remove(client);
        publishActivity(client.getDisplayName() + " đã ngắt kết nối");
    }

    private void publishActivity(String message) {
        LOGGER.info(message);
        activityListeners.forEach(listener -> listener.accept(message));
    }

    private void publishTraffic(TrafficEvent event) {
        trafficListeners.forEach(listener -> listener.accept(event));
    }

    public record ClientSnapshot(
            ClientHandler handler,
            String username,
            String address,
            String status,
            Instant connectedAt,
            Instant lastActivity) {
    }

    /**
     * Chạy Server độc lập với Client.
     */
    public static void main(String[] args) {
        GameServer server = new GameServer();
        server.start(Protocol.DEFAULT_PORT);
    }
}
