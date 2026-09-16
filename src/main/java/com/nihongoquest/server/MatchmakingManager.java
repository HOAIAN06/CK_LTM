package com.nihongoquest.server;

import com.nihongoquest.common.Message;
import com.nihongoquest.common.MessageType;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Objects;
import java.util.UUID;

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

    private final Deque<ClientHandler> waitingQueue;
    private final QuestionManager questionManager;

    public MatchmakingManager() {
        this(createLoadedQuestionManager());
    }

    public MatchmakingManager(QuestionManager questionManager) {
        this.waitingQueue = new ArrayDeque<>();
        this.questionManager = Objects.requireNonNull(questionManager);
    }

    /**
     * Thêm Client vào hàng chờ tìm trận.
     * TODO: Nếu đủ 2 người thì tạo GameRoom và thông báo MATCH_FOUND.
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
        System.out.println(client.getUsername() + " đã vào hàng chờ. Hiện có: "
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
     * Thử ghép cặp khi đủ 2 Client trong hàng chờ.
     * TODO: Lấy 2 Client, tạo GameRoom, gửi MATCH_FOUND.
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
                    questionManager.getQuestions());
            System.out.println("Đã tạo room " + room.getRoomId() + ": "
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
            System.out.println(client.getUsername()
                    + " đã rời hàng chờ. Còn lại: " + waitingQueue.size());
        }
    }

    public synchronized int getWaitingCount() {
        return waitingQueue.size();
    }

    private static QuestionManager createLoadedQuestionManager() {
        QuestionManager manager = new QuestionManager();
        manager.loadQuestions();
        return manager;
    }
}
