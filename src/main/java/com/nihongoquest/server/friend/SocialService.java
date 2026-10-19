package com.nihongoquest.server.friend;

import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.server.network.ClientHandler;
import com.nihongoquest.server.network.OnlineUserRegistry;
import com.nihongoquest.server.quizroom.QuizRoomException;
import com.nihongoquest.server.quizroom.QuizRoomManager;
import com.nihongoquest.server.ranked.GameRoom;
import com.nihongoquest.server.ranked.MatchmakingManager;

import java.sql.SQLException;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/** Nghiệp vụ bạn bè và lời mời tạm thời trong RAM. */
public class SocialService {
    static final int INVITE_SECONDS = 60;

    private final FriendshipRepository friendships;
    private final OnlineUserRegistry onlineUsers;
    private final MatchmakingManager matchmaking;
    private final QuizRoomManager quizRooms;
    private final ScheduledExecutorService scheduler;
    private final Map<String, GameInvite> invites = new ConcurrentHashMap<>();

    public SocialService(FriendshipRepository friendships, OnlineUserRegistry onlineUsers,
                         MatchmakingManager matchmaking, QuizRoomManager quizRooms,
                         ScheduledExecutorService scheduler) {
        this.friendships = friendships;
        this.onlineUsers = onlineUsers;
        this.matchmaking = matchmaking;
        this.quizRooms = quizRooms;
        this.scheduler = scheduler;
    }

    public void search(ClientHandler client, Payloads.UserSearchRequest request) throws SQLException {
        String query = request == null || request.query() == null ? "" : request.query().trim();
        if (query.isEmpty() || query.length() > 20) throw new SocialException("INVALID_QUERY");
        var users = friendships.searchUsers(client.getPlayerId(), query).stream()
                .map(user -> new Payloads.UserSearchItem(user.userId(), user.username(),
                        onlineUsers.isOnline(user.userId()), onlineUsers.isBusy(user.userId())))
                .toList();
        client.send(new Message(MessageType.USER_SEARCH_RESULT,
                Payloads.toJson(new Payloads.UserSearchData(users))));
    }

    public void sendFriendRequest(ClientHandler client, long targetUserId) throws SQLException {
        requireOtherUser(client, targetUserId);
        if (!friendships.sendRequest(client.getPlayerId(), targetUserId)) {
            throw new SocialException("REQUEST_EXISTS");
        }
        client.send(new Message(MessageType.FRIEND_REQUEST_SENT,
                Payloads.toJson(new Payloads.FriendTarget(targetUserId))));
        ClientHandler target = onlineUsers.find(targetUserId);
        if (target != null && target.isConnected()) sendRequests(target);
    }

    public void sendRequests(ClientHandler client) throws SQLException {
        var requests = friendships.findIncomingRequests(client.getPlayerId()).stream()
                .map(user -> new Payloads.FriendRequestItem(user.userId(), user.username()))
                .toList();
        client.send(new Message(MessageType.FRIEND_REQUEST_LIST,
                Payloads.toJson(new Payloads.FriendRequestListData(requests))));
    }

    public void respondRequest(ClientHandler client, Payloads.FriendRequestReply reply)
            throws SQLException {
        requireOtherUser(client, reply.userId());
        if (!friendships.respond(client.getPlayerId(), reply.userId(), reply.accept())) {
            throw new SocialException("REQUEST_NOT_FOUND");
        }
        client.send(new Message(MessageType.FRIEND_REQUEST_RESPOND,
                Payloads.toJson(reply)));
        sendRequests(client);
        if (reply.accept()) sendFriendList(client);
        ClientHandler requester = onlineUsers.find(reply.userId());
        if (requester != null && requester.isConnected()) {
            if (reply.accept()) sendFriendList(requester);
            else requester.send(new Message(MessageType.FRIEND_REQUEST_RESPOND,
                    Payloads.toJson(reply)));
        }
    }

    public void sendFriendList(ClientHandler client) throws SQLException {
        var friends = friendships.findFriends(client.getPlayerId()).stream()
                .map(friend -> new Payloads.FriendItem(friend.userId(), friend.username(),
                        onlineUsers.isOnline(friend.userId()), onlineUsers.isBusy(friend.userId())))
                .toList();
        client.send(new Message(MessageType.FRIEND_LIST,
                Payloads.toJson(new Payloads.FriendListData(friends))));
    }

    public void removeFriend(ClientHandler client, long friendId) throws SQLException {
        requireOtherUser(client, friendId);
        if (!friendships.remove(client.getPlayerId(), friendId)) {
            throw new SocialException("FRIEND_NOT_FOUND");
        }
        client.send(new Message(MessageType.FRIEND_REMOVED,
                Payloads.toJson(new Payloads.FriendTarget(friendId))));
        ClientHandler friend = onlineUsers.find(friendId);
        if (friend != null && friend.isConnected()) sendFriendList(friend);
    }

    public void sendGameInvite(ClientHandler sender, Payloads.GameInviteSend request)
            throws SQLException {
        requireOtherUser(sender, request.targetUserId());
        if (!friendships.areFriends(sender.getPlayerId(), request.targetUserId())) {
            throw new SocialException("NOT_FRIENDS");
        }
        ClientHandler target = onlineUsers.find(request.targetUserId());
        if (target == null || !target.isConnected()) throw new SocialException("TARGET_OFFLINE");
        if (onlineUsers.isBusy(request.targetUserId()) || hasPendingInvite(request.targetUserId())) {
            throw new SocialException("TARGET_BUSY");
        }

        String type = request.type() == null ? "" : request.type().trim().toUpperCase();
        if ("RANKED".equals(type)) {
            if (onlineUsers.isBusy(sender.getPlayerId())) throw new SocialException("SENDER_BUSY");
            if (request.durationSeconds() != GameRoom.THREE_MINUTES
                    && request.durationSeconds() != GameRoom.FIVE_MINUTES) {
                throw new SocialException("INVALID_DURATION");
            }
        } else if ("QUIZ".equals(type)) {
            if (!quizRooms.isHostOfLobby(sender, request.roomPin())) {
                throw new SocialException("NOT_QUIZ_HOST");
            }
        } else {
            throw new SocialException("INVALID_INVITE_TYPE");
        }

        long expiresAt = Instant.now().plusSeconds(INVITE_SECONDS).toEpochMilli();
        GameInvite invite = new GameInvite(UUID.randomUUID().toString(), sender.getPlayerId(),
                sender.getUsername(), target.getPlayerId(), type, request.durationSeconds(),
                request.roomPin(), expiresAt);
        invites.put(invite.id(), invite);
        scheduler.schedule(() -> expire(invite.id()), INVITE_SECONDS, TimeUnit.SECONDS);
        target.send(new Message(MessageType.GAME_INVITE_RECEIVED,
                Payloads.toJson(invite.toPayload())));
        sendInviteStatus(sender, invite.id(), "SENT");
    }

    public void respondGameInvite(ClientHandler target, Payloads.GameInviteRespond response)
            throws SQLException {
        GameInvite invite = invites.remove(response.inviteId());
        if (invite == null || invite.targetUserId() != target.getPlayerId()
                || invite.expiresAtEpochMillis() <= System.currentTimeMillis()) {
            throw new SocialException("INVITE_EXPIRED");
        }
        ClientHandler sender = onlineUsers.find(invite.senderUserId());
        if (!response.accept()) {
            sendInviteStatus(target, invite.id(), "REJECTED");
            if (sender != null) sendInviteStatus(sender, invite.id(), "REJECTED");
            return;
        }
        if (sender == null || !sender.isConnected()) throw new SocialException("SENDER_OFFLINE");
        if (!friendships.areFriends(sender.getPlayerId(), target.getPlayerId())) {
            throw new SocialException("NOT_FRIENDS");
        }
        try {
            if ("RANKED".equals(invite.type())) {
                matchmaking.createDirectMatch(sender, target, invite.durationSeconds());
            } else {
                if (!quizRooms.isHostOfLobby(sender, invite.roomPin())) {
                    throw new SocialException("ROOM_STARTED");
                }
                quizRooms.joinFromInvite(target, invite.roomPin());
            }
        } catch (QuizRoomException e) {
            throw new SocialException(e.getCode());
        } catch (IllegalStateException e) {
            throw new SocialException(e.getMessage());
        }
        sendInviteStatus(target, invite.id(), "ACCEPTED");
        sendInviteStatus(sender, invite.id(), "ACCEPTED");
    }

    public void onLogin(ClientHandler client) {
        broadcastPresence(client.getPlayerId(), true);
    }

    public void onLogout(ClientHandler client) {
        Long userId = client.getPlayerId();
        if (userId == null) return;
        broadcastPresence(userId, false);
        invites.values().stream()
                .filter(invite -> invite.senderUserId() == userId || invite.targetUserId() == userId)
                .toList()
                .forEach(invite -> cancelForDisconnect(invite, userId));
    }

    private void broadcastPresence(long userId, boolean online) {
        try {
            for (FriendshipRepository.UserRow friend : friendships.findFriends(userId)) {
                ClientHandler target = onlineUsers.find(friend.userId());
                if (target != null && target.isConnected()) {
                    target.send(new Message(MessageType.PRESENCE_UPDATE,
                            Payloads.toJson(new Payloads.PresenceData(
                                    userId, online, online && onlineUsers.isBusy(userId)))));
                }
            }
        } catch (SQLException ignored) {
            // Presence là dữ liệu phụ; lỗi DB không làm ngắt phiên đăng nhập.
        }
    }

    private void expire(String inviteId) {
        GameInvite invite = invites.remove(inviteId);
        if (invite == null) return;
        sendInviteStatus(onlineUsers.find(invite.senderUserId()), invite.id(), "EXPIRED");
        sendInviteStatus(onlineUsers.find(invite.targetUserId()), invite.id(), "EXPIRED");
    }

    private void cancelForDisconnect(GameInvite invite, long disconnectedUserId) {
        if (!invites.remove(invite.id(), invite)) return;
        long otherId = invite.senderUserId() == disconnectedUserId
                ? invite.targetUserId() : invite.senderUserId();
        sendInviteStatus(onlineUsers.find(otherId), invite.id(), "CANCELLED");
    }

    private boolean hasPendingInvite(long targetUserId) {
        long now = System.currentTimeMillis();
        return invites.values().stream().anyMatch(invite ->
                invite.targetUserId() == targetUserId && invite.expiresAtEpochMillis() > now);
    }

    private void sendInviteStatus(ClientHandler client, String inviteId, String status) {
        if (client != null && client.isConnected()) {
            client.send(new Message(MessageType.GAME_INVITE_STATUS,
                    Payloads.toJson(new Payloads.GameInviteStatus(inviteId, status))));
        }
    }

    private void requireOtherUser(ClientHandler client, long userId) {
        if (!client.isAuthenticated()) throw new SocialException("NOT_AUTHENTICATED");
        if (userId <= 0 || userId == client.getPlayerId()) {
            throw new SocialException("INVALID_USER");
        }
    }

    record GameInvite(String id, long senderUserId, String senderUsername,
                      long targetUserId, String type, int durationSeconds,
                      String roomPin, long expiresAtEpochMillis) {
        Payloads.GameInviteReceived toPayload() {
            return new Payloads.GameInviteReceived(id, senderUserId, senderUsername,
                    type, durationSeconds, roomPin, expiresAtEpochMillis);
        }
    }
}
