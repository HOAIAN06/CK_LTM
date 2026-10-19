package com.nihongoquest.server.ranked;

import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.server.network.ClientHandler;
import com.nihongoquest.server.question.Question;
import com.nihongoquest.server.question.QuestionService;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ScheduledExecutorService;
import java.util.logging.Level;
import java.util.logging.Logger;

/** Ghép riêng người chọn cùng chế độ 3 phút hoặc 5 phút. */
public class MatchmakingManager {
    private static final Logger LOGGER = Logger.getLogger(MatchmakingManager.class.getName());

    private final Map<Integer, Deque<ClientHandler>> queues = Map.of(
            GameRoom.THREE_MINUTES, new ArrayDeque<>(),
            GameRoom.FIVE_MINUTES, new ArrayDeque<>());
    private final QuestionService questionService;
    private final MatchRepository matchRepository;
    private final ScheduledExecutorService scheduler;

    public MatchmakingManager(QuestionService questionService, MatchRepository matchRepository,
                              ScheduledExecutorService scheduler) {
        this.questionService = Objects.requireNonNull(questionService);
        this.matchRepository = Objects.requireNonNull(matchRepository);
        this.scheduler = Objects.requireNonNull(scheduler);
    }

    public synchronized void enqueue(ClientHandler client, int durationSeconds) {
        if (!client.isAuthenticated()) {
            client.send(new Message(MessageType.MATCH_ERROR, "NOT_AUTHENTICATED"));
            return;
        }
        if (!queues.containsKey(durationSeconds)) {
            client.send(new Message(MessageType.MATCH_ERROR, "INVALID_DURATION"));
            return;
        }
        if (client.getCurrentRoom() != null || client.getCurrentQuizRoom() != null) {
            client.send(new Message(MessageType.MATCH_ERROR, "ALREADY_MATCHED"));
            return;
        }
        if (client.isQueued()) {
            client.send(new Message(MessageType.MATCH_ERROR, "ALREADY_WAITING"));
            return;
        }

        queues.get(durationSeconds).offerLast(client);
        client.setQueued(true);
        client.send(new Message(MessageType.WAITING, ""));
        LOGGER.info(client.getUsername() + " đã vào hàng chờ " + durationSeconds
                + " giây. Hiện có: " + queues.get(durationSeconds).size());
        tryCreateMatch(durationSeconds);
    }

    public synchronized void dequeue(ClientHandler client) {
        if (client.getCurrentRoom() != null) {
            client.send(new Message(MessageType.MATCH_ERROR, "ALREADY_MATCHED"));
            return;
        }
        removeFromQueue(client);
        client.send(new Message(MessageType.MATCH_CANCELLED, ""));
    }

    public synchronized void tryCreateMatch(int durationSeconds) {
        Deque<ClientHandler> queue = queues.get(durationSeconds);
        if (queue == null) return;
        while (true) {
            ClientHandler player1 = pollValidClient(queue);
            if (player1 == null) return;
            ClientHandler player2 = pollValidClient(queue);
            if (player2 == null) {
                queue.addFirst(player1);
                return;
            }

            player1.setQueued(false);
            player2.setQueued(false);
            if (Objects.equals(player1.getPlayerId(), player2.getPlayerId())) {
                player1.send(new Message(MessageType.MATCH_ERROR, "SAME_USER"));
                player2.send(new Message(MessageType.MATCH_ERROR, "SAME_USER"));
                continue;
            }
            List<Question> questions;
            try {
                questions = questionService.getRankedQuestionsUpTo(null,
                        GameRoom.MAX_QUESTION_POOL, GameRoom.MIN_QUESTION_POOL);
            } catch (IllegalStateException e) {
                LOGGER.log(Level.WARNING, "Không thể tạo trận: lỗi ngân hàng câu hỏi", e);
                player1.send(new Message(MessageType.MATCH_ERROR, "QUESTIONS_UNAVAILABLE"));
                player2.send(new Message(MessageType.MATCH_ERROR, "QUESTIONS_UNAVAILABLE"));
                continue;
            }
            GameRoom room = new GameRoom(UUID.randomUUID().toString(), player1, player2,
                    questions, durationSeconds, matchRepository, scheduler);
            LOGGER.info("Đã tạo room " + room.getRoomId() + " (" + durationSeconds + " giây): "
                    + player1.getUsername() + " vs " + player2.getUsername());
            room.start();
        }
    }

    /** Tạo ngay một trận do lời mời bạn bè, không đi qua hàng chờ. */
    public synchronized void createDirectMatch(ClientHandler inviter, ClientHandler target,
                                               int durationSeconds) {
        if (!queues.containsKey(durationSeconds)) {
            throw new IllegalStateException("INVALID_DURATION");
        }
        if (!isAvailable(inviter) || !isAvailable(target)) {
            throw new IllegalStateException("TARGET_BUSY");
        }
        if (Objects.equals(inviter.getPlayerId(), target.getPlayerId())) {
            throw new IllegalStateException("SAME_USER");
        }
        List<Question> questions;
        try {
            questions = questionService.getRankedQuestionsUpTo(null,
                    GameRoom.MAX_QUESTION_POOL, GameRoom.MIN_QUESTION_POOL);
        } catch (IllegalStateException e) {
            throw new IllegalStateException("QUESTIONS_UNAVAILABLE", e);
        }
        GameRoom room = new GameRoom(UUID.randomUUID().toString(), inviter, target,
                questions, durationSeconds, matchRepository, scheduler);
        LOGGER.info("Tạo trận mời trực tiếp: " + inviter.getUsername()
                + " vs " + target.getUsername());
        room.start();
    }

    public synchronized void disconnect(ClientHandler client) {
        removeFromQueue(client);
    }

    private ClientHandler pollValidClient(Deque<ClientHandler> queue) {
        while (!queue.isEmpty()) {
            ClientHandler client = queue.pollFirst();
            if (client.isConnected() && client.isAuthenticated()
                    && client.getCurrentRoom() == null
                    && client.getCurrentQuizRoom() == null) {
                return client;
            }
            client.setQueued(false);
        }
        return null;
    }

    private boolean isAvailable(ClientHandler client) {
        return client != null && client.isConnected() && client.isAuthenticated()
                && !client.isQueued() && client.getCurrentRoom() == null
                && client.getCurrentQuizRoom() == null;
    }

    private void removeFromQueue(ClientHandler client) {
        boolean removed = queues.values().stream().anyMatch(queue -> queue.remove(client));
        if (removed) {
            client.setQueued(false);
            LOGGER.info(client.getUsername() + " đã rời hàng chờ. Còn lại: " + getWaitingCount());
        }
    }

    public synchronized int getWaitingCount() {
        return queues.values().stream().mapToInt(Deque::size).sum();
    }
}
