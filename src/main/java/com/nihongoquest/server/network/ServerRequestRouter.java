package com.nihongoquest.server.network;

import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.server.player.PlayerRepository;
import com.nihongoquest.server.player.PlayerRepository.AuthResult;
import com.nihongoquest.server.ranked.GameRoom;
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
    private final QuizSetService quizSets;
    private final QuizRoomManager quizRooms;

    public ServerRequestRouter(MatchmakingManager matchmaking, PlayerRepository players,
                               OnlineUserRegistry onlineUsers, QuizSetService quizSets,
                               QuizRoomManager quizRooms) {
        this.matchmaking = matchmaking;
        this.players = players;
        this.onlineUsers = onlineUsers;
        this.quizSets = quizSets;
        this.quizRooms = quizRooms;
    }

    public void handle(ClientHandler client, Message message) {
        switch (message.getType()) {
            case REGISTER -> authenticate(client, message, true);
            case LOGIN -> authenticate(client, message, false);
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
            case QUIZ_ROOM_LEAVE -> handleQuizAction(client, quizRooms::leave);
            case QUIZ_ROOM_CANCEL -> handleQuizAction(client, quizRooms::cancel);
            case DISCONNECT -> client.close();
            case CONNECT -> client.reportActivity("TCP client sẵn sàng: " + client.getRemoteAddress());
            default -> LOGGER.fine("Chưa xử lý type=" + message.getType());
        }
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
            if (!registering) quizRooms.reconnect(client);
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
