package com.nihongoquest.server.friend;

import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.server.network.ClientHandler;
import com.nihongoquest.server.network.OnlineUserRegistry;
import com.nihongoquest.server.question.QuestionFixtures;
import com.nihongoquest.server.question.QuestionService;
import com.nihongoquest.server.quiz.QuizSetRepository;
import com.nihongoquest.server.quiz.QuizSetService;
import com.nihongoquest.server.quizroom.QuizRoomManager;
import com.nihongoquest.server.ranked.MatchRepository;
import com.nihongoquest.server.ranked.MatchmakingManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.net.Socket;
import java.sql.SQLException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Delayed;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import static com.nihongoquest.server.question.QuestionFixtures.question;
import static org.junit.jupiter.api.Assertions.*;

class SocialServiceTest {
    private RecordingScheduler scheduler;
    private OnlineUserRegistry online;
    private FakeQuizRooms quizRooms;
    private SocialService social;
    private StubClient sender;
    private StubClient target;

    @BeforeEach
    void setUp() {
        scheduler = new RecordingScheduler();
        online = new OnlineUserRegistry();
        MatchmakingManager matchmaking = new MatchmakingManager(
                new QuestionService(new QuestionFixtures.Bank(List.of(
                        question(1, 4, 1), question(2, 4, 1), question(3, 4, 1)))),
                new FakeMatches(), scheduler);
        quizRooms = new FakeQuizRooms(scheduler);
        social = new SocialService(new FakeFriendships(), online, matchmaking, quizRooms, scheduler);
        sender = new StubClient(1);
        target = new StubClient(2);
        assertTrue(online.login(1, sender));
        assertTrue(online.login(2, target));
    }

    @AfterEach
    void tearDown() {
        scheduler.shutdownNow();
    }

    @Test
    void acceptedRankedInviteCreatesDirectMatchWithoutQueue() throws Exception {
        social.sendGameInvite(sender, new Payloads.GameInviteSend(2, "RANKED", 180, null));
        Payloads.GameInviteReceived invite = target.invite();
        assertTrue(invite.expiresAtEpochMillis() > System.currentTimeMillis());
        assertEquals(60, scheduler.firstDelaySeconds);

        social.respondGameInvite(target, new Payloads.GameInviteRespond(invite.inviteId(), true));

        assertNotNull(sender.getCurrentRoom());
        assertSame(sender.getCurrentRoom(), target.getCurrentRoom());
        assertNotNull(sender.first(MessageType.MATCH_FOUND));
        assertEquals("ACCEPTED", target.lastStatus().status());
    }

    @Test
    void quizInviteRequiresHostAndJoinsOnAccept() throws Exception {
        quizRooms.host = false;
        assertEquals("NOT_QUIZ_HOST", assertThrows(SocialException.class,
                () -> social.sendGameInvite(sender,
                        new Payloads.GameInviteSend(2, "QUIZ", 0, "123456"))).getCode());

        quizRooms.host = true;
        social.sendGameInvite(sender, new Payloads.GameInviteSend(2, "QUIZ", 0, "123456"));
        Payloads.GameInviteReceived invite = target.invite();
        social.respondGameInvite(target, new Payloads.GameInviteRespond(invite.inviteId(), true));

        assertSame(target, quizRooms.joined);
        assertEquals("123456", quizRooms.joinedPin);
    }

    @Test
    void rejectsOfflineBusyAndExpiredInvites() throws Exception {
        online.logout(target);
        assertEquals("TARGET_OFFLINE", assertThrows(SocialException.class,
                () -> social.sendGameInvite(sender,
                        new Payloads.GameInviteSend(2, "RANKED", 180, null))).getCode());

        assertTrue(online.login(2, target));
        target.setQueued(true);
        assertEquals("TARGET_BUSY", assertThrows(SocialException.class,
                () -> social.sendGameInvite(sender,
                        new Payloads.GameInviteSend(2, "RANKED", 180, null))).getCode());
        target.setQueued(false);

        social.sendGameInvite(sender, new Payloads.GameInviteSend(2, "RANKED", 180, null));
        String inviteId = target.invite().inviteId();
        scheduler.runFirst();
        assertEquals("EXPIRED", target.lastStatus().status());
        assertEquals("INVITE_EXPIRED", assertThrows(SocialException.class,
                () -> social.respondGameInvite(target,
                        new Payloads.GameInviteRespond(inviteId, true))).getCode());
    }

    private static final class FakeFriendships extends FriendshipRepository {
        FakeFriendships() { super(QuestionFixtures.offlineDatabase()); }
        @Override public boolean areFriends(long first, long second) { return true; }
        @Override public List<UserRow> findFriends(long userId) { return List.of(); }
    }

    private static final class FakeQuizRooms extends QuizRoomManager {
        boolean host = true;
        ClientHandler joined;
        String joinedPin;

        FakeQuizRooms(RecordingScheduler scheduler) {
            super(new QuizSetService(new QuizSetRepository(QuestionFixtures.offlineDatabase())), scheduler);
        }

        @Override public boolean isHostOfLobby(ClientHandler client, String pin) { return host; }
        @Override public void joinFromInvite(ClientHandler client, String pin) {
            joined = client;
            joinedPin = pin;
        }
    }

    private static final class FakeMatches extends MatchRepository {
        FakeMatches() { super(QuestionFixtures.offlineDatabase()); }
        @Override public void saveResult(MatchResult first, MatchResult second, int duration,
                                         EndReason reason, Long forfeiting) throws SQLException { }
    }

    private static final class StubClient extends ClientHandler {
        final List<Message> messages = new CopyOnWriteArrayList<>();
        StubClient(long id) {
            super(new Socket());
            setAuthenticatedPlayer(id, "player" + id);
        }
        @Override public boolean isConnected() { return true; }
        @Override public void send(Message message) { messages.add(message); }
        Message first(MessageType type) {
            return messages.stream().filter(message -> message.getType() == type)
                    .findFirst().orElse(null);
        }
        Payloads.GameInviteReceived invite() {
            Message message = messages.stream()
                    .filter(item -> item.getType() == MessageType.GAME_INVITE_RECEIVED)
                    .reduce((first, second) -> second).orElseThrow();
            return Payloads.fromJson(message.getPayload(), Payloads.GameInviteReceived.class);
        }
        Payloads.GameInviteStatus lastStatus() {
            Message message = messages.stream()
                    .filter(item -> item.getType() == MessageType.GAME_INVITE_STATUS)
                    .reduce((first, second) -> second).orElseThrow();
            return Payloads.fromJson(message.getPayload(), Payloads.GameInviteStatus.class);
        }
    }

    private static final class RecordingScheduler extends ScheduledThreadPoolExecutor {
        Runnable firstTask;
        long firstDelaySeconds;
        RecordingScheduler() { super(1); }
        @Override public ScheduledFuture<?> schedule(Runnable command, long delay, TimeUnit unit) {
            if (firstTask == null) {
                firstTask = command;
                firstDelaySeconds = unit.toSeconds(delay);
            }
            return new NoopFuture();
        }
        void runFirst() { firstTask.run(); }
    }

    private static final class NoopFuture implements ScheduledFuture<Object> {
        @Override public long getDelay(TimeUnit unit) { return 0; }
        @Override public int compareTo(Delayed other) { return 0; }
        @Override public boolean cancel(boolean mayInterruptIfRunning) { return true; }
        @Override public boolean isCancelled() { return false; }
        @Override public boolean isDone() { return false; }
        @Override public Object get() { return null; }
        @Override public Object get(long timeout, TimeUnit unit) { return null; }
    }
}
