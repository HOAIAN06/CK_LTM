package com.nihongoquest.server;

import com.nihongoquest.common.Message;
import com.nihongoquest.common.MessageType;
import com.nihongoquest.server.db.PlayerRepository;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Objects;
import java.util.UUID;
import java.util.logging.Logger;

/**
 * MatchmakingManager quản lý hàng chờ tìm trận.
 *
 * Luồng dự kiến:
 * Player A, Player B → MatchmakingManager → GameRoom
 *
 * Sau này dùng Queue&lt;ClientHandler&gt; hoặc ConcurrentLinkedQueue&lt;ClientHandler&gt;
 * để xếp hàng Client đang FIND_MATCH. Khi đủ 2 người thì tạo GameRoom.
 */
public class MatchmakingManager {

    private static final Logger LOGGER = Logger.getLogger(MatchmakingManager.class.getName());

    private final Deque<ClientHandler> waitingQueue;
    private final QuestionManager questionManager;
    private final PlayerRepository playerRepository;

    public MatchmakingManager(QuestionManager questionManager, PlayerRepository playerRepository) {
        this.waitingQueue = new ArrayDeque<>();
        this.questionManager = Objects.requireNonNull(questionManager);
        this.playerRepository = playerRepository;
    }

    /**
     * Thêm client vào hàng chờ tìm trận.
     */
    public synchronized void enqueue(ClientHandler client) {
        if (!client.isAuthenticated()) {
            client.send(new Message(MessageType.MATCH_ERROR, "NOT_AUTHENTICATED"));
            return;
        }
        if (client.getCurrentRoom() != null) {
            client.send(new Message(MessageType.MATCH_ERROR, "ALREADY_MATCHED"));
            return;
        }
        if (client.isQueued()) {
            client.send(new Message(MessageType.MATCH_ERROR, "ALREADY_WAITING"));
            return;
        }

        waitingQueue.offerLast(client);
        client.setQueued(true);
        client.send(new Message(MessageType.WAITING, ""));
        LOGGER.info(client.getUsername() + " đã vào hàng chờ. Hiện có: "
                + waitingQueue.size());
        tryCreateMatch();
    }

    /**
     * Gỡ Client khỏi hàng chờ (khi hủy tìm trận hoặc disconnect).
     */
    public synchronized void dequeue(ClientHandler client) {
        if (client.getCurrentRoom() != null) {
            client.send(new Message(MessageType.MATCH_ERROR, "ALREADY_MATCHED"));
            return;
        }
        removeFromQueue(client);
        client.send(new Message(MessageType.MATCH_CANCELLED, ""));
    }

    /**
     * Thử ghép cặp khi đủ 2 client trong hàng chờ.
     */
    public synchronized void tryCreateMatch() {
        while (true) {
            ClientHandler player1 = pollValidClient();
            if (player1 == null) {
                return;
            }
            ClientHandler player2 = pollValidClient();
            if (player2 == null) {
                waitingQueue.addFirst(player1);
                return;
            }

            player1.setQueued(false);
            player2.setQueued(false);
            GameRoom room = new GameRoom(
                    UUID.randomUUID().toString(), player1, player2,
                    questionManager.getQuestions(), playerRepository);
            LOGGER.info("Đã tạo room " + room.getRoomId() + ": "
                    + player1.getUsername() + " vs " + player2.getUsername());
            room.start();
        }
    }

    public synchronized void disconnect(ClientHandler client) {
        removeFromQueue(client);
    }

    private ClientHandler pollValidClient() {
        while (!waitingQueue.isEmpty()) {
            ClientHandler client = waitingQueue.pollFirst();
            if (client.isConnected() && client.isAuthenticated()
                    && client.getCurrentRoom() == null) {
                return client;
            }
            client.setQueued(false);
        }
        return null;
    }

    private void removeFromQueue(ClientHandler client) {
        if (waitingQueue.remove(client)) {
            client.setQueued(false);
            LOGGER.info(client.getUsername()
                    + " đã rời hàng chờ. Còn lại: " + waitingQueue.size());
        }
    }

    public synchronized int getWaitingCount() {
        return waitingQueue.size();
    }
}
