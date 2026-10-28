package com.nihongoquest.server.network;

import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.server.player.PlayerRepository;
import com.nihongoquest.server.player.PlayerRepository.AuthResult;
import com.nihongoquest.server.friend.SocialException;
import com.nihongoquest.server.friend.SocialService;
import com.nihongoquest.server.ranked.GameRoom;
import com.nihongoquest.server.ranked.MatchRepository;
import com.nihongoquest.server.ranked.MatchmakingManager;
import com.nihongoquest.server.quiz.QuizSetException;
import com.nihongoquest.server.quiz.QuizSetService;
import com.nihongoquest.server.quizroom.QuizRoomException;
import com.nihongoquest.server.quizroom.QuizRoomManager;

import java.sql.SQLException;
import java.util.regex.Pattern;
import java.util.logging.Logger;

/** Switch giao thức duy nhất phía server; nghiệp vụ được chuyển cho manager/repository. */
public class ServerRequestRouter {
    private static final Logger LOGGER = Logger.getLogger(ServerRequestRouter.class.getName());
    private static final Pattern USERNAME_PATTERN = Pattern.compile("[a-zA-Z0-9_]{3,20}");

    private final MatchmakingManager matchmaking;
    private final PlayerRepository players;
    private final OnlineUserRegistry onlineUsers;
    private final MatchRepository matches;
    private final SocialService social;
    private final QuizSetService quizSets;
    private final QuizRoomManager quizRooms;

    public ServerRequestRouter(MatchmakingManager matchmaking, PlayerRepository players,
                               OnlineUserRegistry onlineUsers, MatchRepository matches,
                               QuizSetService quizSets,
                               QuizRoomManager quizRooms, SocialService social) {
        this.matchmaking = matchmaking;
        this.players = players;
        this.onlineUsers = onlineUsers;
        this.matches = matches;
        this.social = social;
        this.quizSets = quizSets;
        this.quizRooms = quizRooms;
    }

    public void handle(ClientHandler client, Message message) {
        switch (message.getType()) {
            case REGISTER -> authenticate(client, message, true);
            case LOGIN -> authenticate(client, message, false);
            case PROFILE_GET -> handleProfileGet(client);
            case LEADERBOARD_GET -> handleLeaderboardGet(client);
            case MATCH_HISTORY_GET -> handleMatchHistoryGet(client);
            case USER_SEARCH -> handleUserSearch(client, message);
            case FRIEND_REQUEST_SEND -> handleFriendRequestSend(client, message);
            case FRIEND_REQUEST_LIST -> handleSocialAction(client, () -> social.sendRequests(client));
            case FRIEND_REQUEST_RESPOND -> handleFriendRequestRespond(client, message);
            case FRIEND_LIST -> handleSocialAction(client, () -> social.sendFriendList(client));
            case FRIEND_REMOVE -> handleFriendRemove(client, message);
            case GAME_INVITE_SEND -> handleGameInviteSend(client, message);
            case GAME_INVITE_RESPOND -> handleGameInviteRespond(client, message);
            case FIND_MATCH -> handleFindMatch(client, message);
            case CANCEL_MATCH -> matchmaking.dequeue(client);
            case ANSWER -> handleAnswer(client, message);
            case QUIZ_SET_LIST -> handleQuizSetList(client, message);
            case QUIZ_SET_GET -> handleQuizSetGet(client, message);
            case QUIZ_SET_SAVE -> handleQuizSetSave(client, message);
            case QUIZ_SET_PUBLISH -> handleQuizSetPublish(client, message);
            case QUIZ_SET_DELETE -> handleQuizSetDelete(client, message);
            case QUIZ_ROOM_CREATE -> handleQuizRoomCreate(client, message);
            case QUIZ_ROOM_JOIN -> handleQuizRoomJoin(client, message);
            case QUIZ_ROOM_START -> handleQuizAction(client, quizRooms::start);
            case QUIZ_ANSWER -> handleQuizAnswer(client, message);
            case PROCTOR_STATUS_REPORT -> handleProctorStatus(client, message);
            case PROCTOR_EVENT_REPORT -> handleProctorEvent(client, message);
            case QUIZ_ROOM_LEAVE -> handleQuizAction(client, quizRooms::leave);
            case QUIZ_ROOM_CANCEL -> handleQuizAction(client, quizRooms::cancel);
            case DISCONNECT -> client.close();
            case CONNECT -> client.reportActivity("TCP client sẵn sàng: " + client.getRemoteAddress());
            default -> LOGGER.fine("Chưa xử lý type=" + message.getType());
        }
    }

    private void handleProfileGet(ClientHandler client) {
        if (!requireQueryLogin(client)) return;
        try {
            client.send(new Message(MessageType.PROFILE_DATA,
                    players.findProfile(client.getPlayerId()).toPayload()));
        } catch (SQLException e) {
            databaseQueryError(client, e);
        }
    }

    private void handleLeaderboardGet(ClientHandler client) {
        if (!requireQueryLogin(client)) return;
        try {
            var entries = players.findLeaderboard(10).stream()
                    .map(player -> new Payloads.LeaderboardEntry(
                            player.rank(), player.userId(), player.username(), player.wins(),
                            player.losses(), player.draws(), player.totalScore()))
                    .toList();
            client.send(new Message(MessageType.LEADERBOARD_DATA,
                    Payloads.toJson(new Payloads.LeaderboardData(entries))));
        } catch (SQLException e) {
            databaseQueryError(client, e);
        }
    }

    private void handleMatchHistoryGet(ClientHandler client) {
        if (!requireQueryLogin(client)) return;
        try {
            var entries = matches.findHistory(client.getPlayerId(), 100).stream()
                    .map(match -> new Payloads.MatchHistoryEntry(
                            match.matchId(), match.opponentUsername(), match.myScore(),
                            match.opponentScore(), match.result(), match.durationSeconds(),
                            match.endReason(), match.playedAt()))
                    .toList();
            client.send(new Message(MessageType.MATCH_HISTORY_DATA,
                    Payloads.toJson(new Payloads.MatchHistoryData(entries))));
        } catch (SQLException e) {
            databaseQueryError(client, e);
        }
    }

    private boolean requireQueryLogin(ClientHandler client) {
        if (client.isAuthenticated()) return true;
        client.send(new Message(MessageType.QUERY_ERROR, "NOT_AUTHENTICATED"));
        return false;
    }

    private void databaseQueryError(ClientHandler client, SQLException error) {
        LOGGER.warning("Loi database khi truy van: " + error.getMessage());
        client.send(new Message(MessageType.QUERY_ERROR, "DATABASE_ERROR"));
    }

    private void handleUserSearch(ClientHandler client, Message message) {
        handleSocial(client, () -> social.search(client, Payloads.fromJson(
                message.getPayload(), Payloads.UserSearchRequest.class)));
    }

    private void handleFriendRequestSend(ClientHandler client, Message message) {
        handleSocial(client, () -> social.sendFriendRequest(client, Payloads.fromJson(
                message.getPayload(), Payloads.FriendTarget.class).userId()));
    }

    private void handleFriendRequestRespond(ClientHandler client, Message message) {
        handleSocial(client, () -> social.respondRequest(client, Payloads.fromJson(
                message.getPayload(), Payloads.FriendRequestReply.class)));
    }

    private void handleFriendRemove(ClientHandler client, Message message) {
        handleSocial(client, () -> social.removeFriend(client, Payloads.fromJson(
                message.getPayload(), Payloads.FriendTarget.class).userId()));
    }

    private void handleGameInviteSend(ClientHandler client, Message message) {
        handleSocial(client, () -> social.sendGameInvite(client, Payloads.fromJson(
                message.getPayload(), Payloads.GameInviteSend.class)));
    }

    private void handleGameInviteRespond(ClientHandler client, Message message) {
        handleSocial(client, () -> social.respondGameInvite(client, Payloads.fromJson(
                message.getPayload(), Payloads.GameInviteRespond.class)));
    }

    private void handleSocialAction(ClientHandler client, SqlAction action) {
        handleSocial(client, action);
    }

    private void handleSocial(ClientHandler client, SqlAction action) {
        if (!client.isAuthenticated()) {
            sendSocialError(client, "NOT_AUTHENTICATED");
            return;
        }
        try {
            action.run();
        } catch (SocialException e) {
            sendSocialError(client, e.getCode());
        } catch (IllegalArgumentException | NullPointerException e) {
            sendSocialError(client, "BAD_REQUEST");
        } catch (SQLException e) {
            LOGGER.warning("Loi database social: " + e.getMessage());
            sendSocialError(client, "DATABASE_ERROR");
        }
    }

    private void sendSocialError(ClientHandler client, String code) {
        client.send(new Message(MessageType.SOCIAL_ERROR, code));
    }

    @FunctionalInterface
    private interface SqlAction {
        void run() throws SQLException;
    }

    private void handleQuizSetList(ClientHandler client, Message message) {
        if (!requireLogin(client)) return;
        try {
            Payloads.QuizSetListRequest request = Payloads.fromJson(
                    message.getPayload(), Payloads.QuizSetListRequest.class);
            client.send(new Message(MessageType.QUIZ_SET_LIST_RESULT,
                    Payloads.toJson(quizSets.list(client.getPlayerId(), request.scope()))));
        } catch (QuizSetException e) {
            sendQuizError(client, e.getCode());
        } catch (IllegalArgumentException e) {
            sendQuizError(client, "BAD_REQUEST");
        } catch (SQLException e) {
            databaseQuizError(client, e);
        }
    }

    private void handleQuizSetGet(ClientHandler client, Message message) {
        if (!requireLogin(client)) return;
        try {
            Payloads.QuizSetId request = Payloads.fromJson(
                    message.getPayload(), Payloads.QuizSetId.class);
            client.send(new Message(MessageType.QUIZ_SET_DETAIL,
                    Payloads.toJson(quizSets.get(client.getPlayerId(), request.quizSetId()))));
        } catch (QuizSetException e) {
            sendQuizError(client, e.getCode());
        } catch (IllegalArgumentException e) {
            sendQuizError(client, "BAD_REQUEST");
        } catch (SQLException e) {
            databaseQuizError(client, e);
        }
    }

    private void handleQuizSetSave(ClientHandler client, Message message) {
        if (!requireLogin(client)) return;
        try {
            Payloads.QuizSetEdit request = Payloads.fromJson(
                    message.getPayload(), Payloads.QuizSetEdit.class);
            long id = quizSets.save(client.getPlayerId(), request);
            client.send(new Message(MessageType.QUIZ_SET_SAVED,
                    Payloads.toJson(new Payloads.QuizSetSaved(id))));
        } catch (QuizSetException e) {
            sendQuizError(client, e.getCode());
        } catch (IllegalArgumentException e) {
            sendQuizError(client, "BAD_REQUEST");
        } catch (SQLException e) {
            databaseQuizError(client, e);
        }
    }

    private void handleQuizSetPublish(ClientHandler client, Message message) {
        if (!requireLogin(client)) return;
        try {
            Payloads.QuizSetPublishRequest request = Payloads.fromJson(
                    message.getPayload(), Payloads.QuizSetPublishRequest.class);
            quizSets.publish(client.getPlayerId(), request.quizSetId(), request.published());
            client.send(new Message(MessageType.QUIZ_SET_PUBLISHED, Payloads.toJson(request)));
        } catch (QuizSetException e) {
            sendQuizError(client, e.getCode());
        } catch (IllegalArgumentException e) {
            sendQuizError(client, "BAD_REQUEST");
        } catch (SQLException e) {
            databaseQuizError(client, e);
        }
    }

    private void handleQuizSetDelete(ClientHandler client, Message message) {
        if (!requireLogin(client)) return;
        try {
            Payloads.QuizSetId request = Payloads.fromJson(
                    message.getPayload(), Payloads.QuizSetId.class);
            quizSets.delete(client.getPlayerId(), request.quizSetId());
            client.send(new Message(MessageType.QUIZ_SET_DELETED, Payloads.toJson(request)));
        } catch (QuizSetException e) {
            sendQuizError(client, e.getCode());
        } catch (IllegalArgumentException e) {
            sendQuizError(client, "BAD_REQUEST");
        } catch (SQLException e) {
            databaseQuizError(client, e);
        }
    }

    private boolean requireLogin(ClientHandler client) {
        if (client.isAuthenticated()) return true;
        sendQuizError(client, "NOT_AUTHENTICATED");
        return false;
    }

    private void sendQuizError(ClientHandler client, String code) {
        client.send(new Message(MessageType.QUIZ_SET_ERROR, code));
    }

    private void databaseQuizError(ClientHandler client, SQLException error) {
        LOGGER.warning("Lỗi database bộ đề: " + error.getMessage());
        sendQuizError(client, "DATABASE_ERROR");
    }

    public void disconnected(ClientHandler client) {
        matchmaking.disconnect(client);
        quizRooms.disconnected(client);
        social.onLogout(client);
        onlineUsers.logout(client);
    }

    private void handleAnswer(ClientHandler client, Message message) {
        GameRoom room = client.getCurrentRoom();
        if (room == null) return;
        try {
            Payloads.AnswerData answer = Payloads.parseAnswer(message.getPayload());
            room.handleAnswer(client, answer);
        } catch (IllegalArgumentException e) {
            LOGGER.warning("Đáp án không hợp lệ từ " + client.getDisplayName());
        }
    }

    private void handleFindMatch(ClientHandler client, Message message) {
        try {
            Payloads.FindMatchRequest request = Payloads.parseFindMatch(message.getPayload());
            matchmaking.enqueue(client, request.durationSeconds());
        } catch (IllegalArgumentException | NullPointerException e) {
            client.send(new Message(MessageType.MATCH_ERROR, "INVALID_DURATION"));
        }
    }

    private void authenticate(ClientHandler client, Message message, boolean registering) {
        MessageType ok = registering ? MessageType.REGISTER_OK : MessageType.LOGIN_OK;
        MessageType fail = registering ? MessageType.REGISTER_FAIL : MessageType.LOGIN_FAIL;
        if (client.isAuthenticated()) {
            client.send(new Message(fail, "ALREADY_AUTHENTICATED"));
            return;
        }
        Payloads.Credentials credentials;
        try {
            credentials = Payloads.parseCredentials(message.getPayload());
        } catch (IllegalArgumentException e) {
            client.send(new Message(fail, "BAD_REQUEST"));
            return;
        }
        if (!USERNAME_PATTERN.matcher(credentials.username()).matches()
                || credentials.password().length() < 4) {
            client.send(new Message(fail, "BAD_REQUEST"));
            return;
        }
        try {
            AuthResult result = registering
                    ? players.register(credentials.username(), credentials.password())
                    : players.login(credentials.username(), credentials.password());
            if (!result.success()) {
                client.send(new Message(fail, result.reason()));
                return;
            }
            if (!registering) {
                if (!onlineUsers.login(result.player().id(), client)) {
                    client.send(new Message(fail, "ALREADY_ONLINE"));
                    return;
                }
                client.setAuthenticatedPlayer(result.player().id(), result.player().username());
            }
            client.send(new Message(ok, result.player().toPayload()));
            if (!registering) {
                quizRooms.reconnect(client);
                social.onLogin(client);
            }
        } catch (SQLException e) {
            LOGGER.warning("Lỗi database khi xác thực: " + e.getMessage());
            client.send(new Message(fail, "DATABASE_ERROR"));
        }
    }

    private void handleQuizRoomCreate(ClientHandler client, Message message) {
        try {
            Payloads.QuizRoomCreateRequest request = Payloads.fromJson(
                    message.getPayload(), Payloads.QuizRoomCreateRequest.class);
            quizRooms.create(client, request);
        } catch (QuizRoomException e) {
            sendQuizRoomError(client, e.getCode());
        } catch (IllegalArgumentException e) {
            sendQuizRoomError(client, "BAD_REQUEST");
        } catch (SQLException e) {
            LOGGER.warning("Lỗi database khi tạo phòng Quiz: " + e.getMessage());
            sendQuizRoomError(client, "DATABASE_ERROR");
        }
    }

    private void handleQuizRoomJoin(ClientHandler client, Message message) {
        try {
            Payloads.QuizRoomJoinRequest request = Payloads.fromJson(
                    message.getPayload(), Payloads.QuizRoomJoinRequest.class);
            quizRooms.join(client, request.pin());
        } catch (QuizRoomException e) {
            sendQuizRoomError(client, e.getCode());
        } catch (IllegalArgumentException e) {
            sendQuizRoomError(client, "BAD_REQUEST");
        }
    }

    private void handleQuizAnswer(ClientHandler client, Message message) {
        try {
            Payloads.QuizAnswerData answer = Payloads.fromJson(
                    message.getPayload(), Payloads.QuizAnswerData.class);
            quizRooms.answer(client, answer);
        } catch (QuizRoomException e) {
            sendQuizRoomError(client, e.getCode());
        } catch (IllegalArgumentException e) {
            sendQuizRoomError(client, "BAD_REQUEST");
        }
    }

    private void handleProctorStatus(ClientHandler client, Message message) {
        try {
            Payloads.ProctorStatusReport report = Payloads.fromJson(
                    message.getPayload(), Payloads.ProctorStatusReport.class);
            quizRooms.reportProctorStatus(client, report);
        } catch (QuizRoomException e) {
            sendQuizRoomError(client, e.getCode());
        } catch (IllegalArgumentException | NullPointerException e) {
            sendQuizRoomError(client, "BAD_REQUEST");
        }
    }

    private void handleProctorEvent(ClientHandler client, Message message) {
        try {
            Payloads.ProctorEventReport report = Payloads.fromJson(
                    message.getPayload(), Payloads.ProctorEventReport.class);
            quizRooms.reportProctorEvent(client, report);
        } catch (QuizRoomException e) {
            sendQuizRoomError(client, e.getCode());
        } catch (IllegalArgumentException | NullPointerException e) {
            sendQuizRoomError(client, "BAD_REQUEST");
        }
    }

    private void handleQuizAction(ClientHandler client,
                                  java.util.function.Consumer<ClientHandler> action) {
        try {
            action.accept(client);
        } catch (QuizRoomException e) {
            sendQuizRoomError(client, e.getCode());
        }
    }

    private void sendQuizRoomError(ClientHandler client, String code) {
        client.send(new Message(MessageType.QUIZ_ERROR, code));
    }
}
