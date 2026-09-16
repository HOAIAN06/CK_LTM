package com.nihongoquest.server;

import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;

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

    // Hàng chờ tìm trận — ConcurrentLinkedQueue an toàn khi nhiều thread cùng truy cập.
    private final Queue<ClientHandler> waitingQueue;

    public MatchmakingManager() {
        this.waitingQueue = new ConcurrentLinkedQueue<>();
    }

    /**
     * Thêm Client vào hàng chờ tìm trận.
     * TODO: Nếu đủ 2 người thì tạo GameRoom và thông báo MATCH_FOUND.
     */
    public void enqueue(ClientHandler client) {
        waitingQueue.offer(client);
        System.out.println("TODO: Thêm Client vào hàng chờ. Hiện có: " + waitingQueue.size());
        // TODO: tryCreateMatch();
    }

    /**
     * Gỡ Client khỏi hàng chờ (khi hủy tìm trận hoặc disconnect).
     */
    public void dequeue(ClientHandler client) {
        waitingQueue.remove(client);
        System.out.println("TODO: Gỡ Client khỏi hàng chờ. Còn lại: " + waitingQueue.size());
    }

    /**
     * Thử ghép cặp khi đủ 2 Client trong hàng chờ.
     * TODO: Lấy 2 Client, tạo GameRoom, gửi MATCH_FOUND.
     */
    public void tryCreateMatch() {
        // TODO: if (waitingQueue.size() >= 2) { ... new GameRoom(...) }
        System.out.println("TODO: tryCreateMatch");
    }

    public int getWaitingCount() {
        return waitingQueue.size();
    }
}
