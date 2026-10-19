package com.nihongoquest.server.network;

import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.server.player.PlayerRepository;
import com.nihongoquest.server.player.PlayerRepository.AuthResult;
import com.nihongoquest.server.ranked.GameRoom;
import com.nihongoquest.server.ranked.MatchmakingManager;

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

    public ServerRequestRouter(MatchmakingManager matchmaking, PlayerRepository players,
                               OnlineUserRegistry onlineUsers) {
        this.matchmaking = matchmaking;
        this.players = players;
        this.onlineUsers = onlineUsers;
    }

    public void handle(ClientHandler client, Message message) {
        switch (message.getType()) {
            case REGISTER -> authenticate(client, message, true);
            case LOGIN -> authenticate(client, message, false);
            case FIND_MATCH -> matchmaking.enqueue(client);
            case CANCEL_MATCH -> matchmaking.dequeue(client);
            case ANSWER -> handleAnswer(client, message);
            case DISCONNECT -> client.close();
            case CONNECT -> client.reportActivity("TCP client sẵn sàng: " + client.getRemoteAddress());
            default -> LOGGER.fine("Chưa xử lý type=" + message.getType());
        }
    }

    public void disconnected(ClientHandler client) {
        matchmaking.disconnect(client);
        onlineUsers.logout(client);
    }

    private void handleAnswer(ClientHandler client, Message message) {
        GameRoom room = client.getCurrentRoom();
        if (room == null) return;
        try {
            Payloads.AnswerData answer = Payloads.parseAnswer(message.getPayload());
            room.handleAnswer(client, answer.questionId(), answer.choiceId());
        } catch (IllegalArgumentException e) {
            LOGGER.warning("Đáp án không hợp lệ từ " + client.getDisplayName());
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
        } catch (SQLException e) {
            LOGGER.warning("Lỗi database khi xác thực: " + e.getMessage());
            client.send(new Message(fail, "DATABASE_ERROR"));
        }
    }
}
