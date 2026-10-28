package com.nihongoquest.server.network;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Danh sách user online trong RAM; mỗi tài khoản chỉ có một kết nối. */
public class OnlineUserRegistry {
    private final Map<Long, ClientHandler> users = new ConcurrentHashMap<>();

    public boolean login(long userId, ClientHandler handler) {
        ClientHandler existing = users.putIfAbsent(userId, handler);
        return existing == null || existing == handler;
    }

    public void logout(ClientHandler handler) {
        Long userId = handler.getPlayerId();
        if (userId != null) users.remove(userId, handler);
    }

    public ClientHandler find(long userId) {
        return users.get(userId);
    }

    public boolean isOnline(long userId) {
        ClientHandler handler = users.get(userId);
        return handler != null && handler.isConnected();
    }

    public boolean isBusy(long userId) {
        ClientHandler handler = users.get(userId);
        return handler != null && (handler.isQueued() || handler.getCurrentRoom() != null
                || handler.getCurrentQuizRoom() != null);
    }

    public int size() {
        return users.size();
    }
}
