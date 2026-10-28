package com.nihongoquest.server;

import com.nihongoquest.server.ranked.MatchmakingManager;
import com.nihongoquest.server.ranked.MatchRepository;
import com.nihongoquest.server.network.ClientHandler;
import com.nihongoquest.server.network.OnlineUserRegistry;
import com.nihongoquest.server.network.ServerRequestRouter;
import com.nihongoquest.server.network.TrafficEvent;
import com.nihongoquest.server.question.QuestionRepository;
import com.nihongoquest.server.question.QuestionService;
import com.nihongoquest.server.quiz.QuizSetRepository;
import com.nihongoquest.server.quiz.QuizSetService;
import com.nihongoquest.server.quizroom.QuizRoomManager;

import com.nihongoquest.common.protocol.Protocol;
import com.nihongoquest.server.database.Database;
import com.nihongoquest.server.player.PlayerRepository;
import com.nihongoquest.server.friend.FriendshipRepository;
import com.nihongoquest.server.friend.SocialService;
import com.nihongoquest.server.media.ProctorMediaRelay;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
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
    private final QuestionService questionService;
    private final PlayerRepository playerRepository;
    private final MatchRepository matchRepository;
    private final OnlineUserRegistry onlineUsers;
    private final ServerRequestRouter requestRouter;
    private final QuizRoomManager quizRoomManager;
    private final ScheduledExecutorService scheduler;
    private final ProctorMediaRelay mediaRelay;
    private volatile boolean running;
    private ServerSocket serverSocket;
    private ExecutorService clientExecutor;
    private final Set<ClientHandler> clients = ConcurrentHashMap.newKeySet();
    private final List<Consumer<String>> activityListeners = new CopyOnWriteArrayList<>();
    private final List<Consumer<TrafficEvent>> trafficListeners = new CopyOnWriteArrayList<>();

    public GameServer() {
        Database database = new Database();
        this.questionService = new QuestionService(new QuestionRepository(database));
        this.playerRepository = new PlayerRepository(database);
        this.matchRepository = new MatchRepository(database);
        this.scheduler = Executors.newScheduledThreadPool(4, task -> {
            Thread thread = new Thread(task, "game-timer");
            thread.setDaemon(true);
            return thread;
        });
        this.onlineUsers = new OnlineUserRegistry();
        this.mediaRelay = new ProctorMediaRelay();
        this.matchmakingManager = new MatchmakingManager(
                questionService, matchRepository, scheduler);
        QuizSetService quizSetService = new QuizSetService(new QuizSetRepository(database));
        this.quizRoomManager = new QuizRoomManager(quizSetService, scheduler);
        SocialService socialService = new SocialService(new FriendshipRepository(database),
                onlineUsers, matchmakingManager, quizRoomManager, scheduler);
        this.requestRouter = new ServerRequestRouter(
                matchmakingManager, playerRepository, onlineUsers, matchRepository,
                quizSetService, quizRoomManager, socialService);
        this.running = false;
    }

    /**
     * Khởi động server trên cổng chỉ định.
     */
    public void start(int port) {
        running = true;
        try {
            serverSocket = new ServerSocket(port);
            int mediaPort = port == 0 ? 0
                    : (port == Protocol.DEFAULT_PORT ? Protocol.DEFAULT_MEDIA_PORT : port + 1);
            mediaRelay.start(mediaPort);
            clientExecutor = Executors.newFixedThreadPool(50, task -> {
                Thread thread = new Thread(task, "client-handler");
                thread.setDaemon(true);
                return thread;
            });
            LOGGER.info("GameServer đang lắng nghe tại cổng " + port);
            publishActivity("Server đã khởi động tại cổng " + port
                    + "; media tại cổng " + mediaRelay.getLocalPort());
            while (running) {
                Socket clientSocket = serverSocket.accept();
                ClientHandler handler = new ClientHandler(
                        clientSocket, requestRouter,
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
                mediaRelay.close();
                if (serverSocket != null) {
                    try {
                        serverSocket.close();
                    } catch (IOException ignored) {
                        // Preserve the original startup failure.
                    }
                }
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
        quizRoomManager.shutdown();
        mediaRelay.close();
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

    public QuestionService getQuestionService() {
        return questionService;
    }

    public ProctorMediaRelay getMediaRelay() { return mediaRelay; }

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
        return (int) clients.stream().filter(client -> client.getCurrentRoom() != null
                || (client.getCurrentQuizRoom() != null
                    && client.getCurrentQuizRoom().isRunning())).count();
    }

    public int getActiveRoomCount() {
        int rankedRooms = (int) clients.stream()
                .map(ClientHandler::getCurrentRoom)
                .filter(room -> room != null && !room.isFinished())
                .distinct()
                .count();
        return rankedRooms + quizRoomManager.activeRoomCount();
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
