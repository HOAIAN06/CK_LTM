package com.nihongoquest.server.media;

import com.nihongoquest.common.media.MediaProtocol;
import com.nihongoquest.common.media.MediaProtocol.PublishedFrame;
import com.nihongoquest.common.media.MediaProtocol.RelayedFrame;
import com.nihongoquest.common.media.MediaProtocol.Role;
import com.nihongoquest.common.protocol.Payloads.MediaRole;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.net.Socket;
import java.time.Duration;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ProctorMediaRelayTest {
    private final ProctorMediaRelay relay = new ProctorMediaRelay();

    @AfterEach
    void tearDown() {
        relay.close();
    }

    @Test
    void relaysLatestPublisherFrameToAuthenticatedHost() throws Exception {
        relay.start(0);
        var hostTicket = relay.issueTicket("123456", 1, Role.HOST_SUBSCRIBER);
        var playerTicket = relay.issueTicket("123456", 2, Role.PUBLISHER);

        try (Connection host = connect(hostTicket.token(), Role.HOST_SUBSCRIBER);
             Connection player = connect(playerTicket.token(), Role.PUBLISHER)) {
            byte[] jpeg = {1, 2, 3, 4};
            MediaProtocol.writePublishedFrame(player.output,
                    new PublishedFrame(17, 1_000, jpeg));

            RelayedFrame received = MediaProtocol.readRelayedFrame(host.input);
            assertEquals(2, received.userId());
            assertEquals(17, received.sequence());
            assertArrayEquals(jpeg, received.jpeg());
        }
    }

    @Test
    void ticketIsSingleUseAndRoleBound() throws Exception {
        relay.start(0);
        var ticket = relay.issueTicket("123456", 2, Role.PUBLISHER);
        try (Connection ignored = connect(ticket.token(), Role.PUBLISHER)) {
            // First handshake consumes it.
        }
        try (Socket socket = new Socket("127.0.0.1", relay.getLocalPort());
             DataInputStream input = new DataInputStream(socket.getInputStream());
             DataOutputStream output = new DataOutputStream(socket.getOutputStream())) {
            MediaProtocol.writeHandshake(output, Role.PUBLISHER, ticket.token());
            assertEquals(MediaProtocol.ACK_INVALID_TICKET, input.readUnsignedByte());
        }
    }

    @Test
    void rejectsExpiredTicketAndOversizedFrame() throws Exception {
        relay.start(0);
        var ticket = relay.issueTicket("123456", 2, Role.PUBLISHER,
                Duration.ofNanos(1));
        Thread.sleep(2);
        try (Socket socket = new Socket("127.0.0.1", relay.getLocalPort());
             DataInputStream input = new DataInputStream(socket.getInputStream());
             DataOutputStream output = new DataOutputStream(socket.getOutputStream())) {
            MediaProtocol.writeHandshake(output, Role.PUBLISHER, ticket.token());
            assertEquals(MediaProtocol.ACK_EXPIRED_TICKET, input.readUnsignedByte());
        }
        assertThrows(IllegalArgumentException.class,
                () -> MediaProtocol.writePublishedFrame(new DataOutputStream(
                        java.io.OutputStream.nullOutputStream()),
                        new PublishedFrame(1, 1,
                                new byte[MediaProtocol.MAX_JPEG_BYTES + 1])));
    }

    @Test
    void issuingReplacementRevokesOldTicketAndSupportsControlRoleEnum() throws Exception {
        relay.start(0);
        var oldTicket = relay.issueTicket("123456", 2, MediaRole.PUBLISHER);
        var newTicket = relay.issueTicket("123456", 2, MediaRole.PUBLISHER);

        try (Socket socket = new Socket("127.0.0.1", relay.getLocalPort());
             DataInputStream input = new DataInputStream(socket.getInputStream());
             DataOutputStream output = new DataOutputStream(socket.getOutputStream())) {
            MediaProtocol.writeHandshake(output, Role.PUBLISHER, oldTicket.token());
            assertEquals(MediaProtocol.ACK_INVALID_TICKET, input.readUnsignedByte());
        }
        try (Connection ignored = connect(newTicket.token(), Role.PUBLISHER)) {
            // Replacement ticket remains valid.
        }
    }

    @Test
    void removeUserClosesPublisherAndRevokesUnconsumedTickets() throws Exception {
        relay.start(0);
        var connectedTicket = relay.issueTicket("123456", 2, Role.PUBLISHER);
        var pendingTicket = relay.issueTicket("123456", 3, Role.PUBLISHER);
        try (Connection connected = connect(connectedTicket.token(), Role.PUBLISHER)) {
            relay.removeUser("123456", 2);
            assertEquals(-1, connected.input.read());
        }
        try (Socket socket = new Socket("127.0.0.1", relay.getLocalPort());
             DataInputStream input = new DataInputStream(socket.getInputStream());
             DataOutputStream output = new DataOutputStream(socket.getOutputStream())) {
            relay.removeUser("123456", 3);
            MediaProtocol.writeHandshake(output, Role.PUBLISHER, pendingTicket.token());
            assertEquals(MediaProtocol.ACK_INVALID_TICKET, input.readUnsignedByte());
        }
    }

    @Test
    void revokingHostClosesSubscriberSocket() throws Exception {
        relay.start(0);
        var ticket = relay.issueTicket("123456", 1, Role.HOST_SUBSCRIBER);
        try (Connection host = connect(ticket.token(), Role.HOST_SUBSCRIBER)) {
            relay.revokeUser("123456", 1);
            assertEquals(-1, host.input.read());
        }
    }

    @Test
    void publisherDisconnectRequestsFreshTicketForSameIdentity() throws Exception {
        relay.start(0);
        LinkedBlockingQueue<Long> disconnected = new LinkedBlockingQueue<>();
        relay.setMediaDisconnectListener((pin, userId) -> disconnected.offer(userId));
        var ticket = relay.issueTicket("123456", 2, Role.PUBLISHER);
        try (Connection publisher = connect(ticket.token(), Role.PUBLISHER)) {
            publisher.socket.close();
        }
        assertEquals(2L, disconnected.poll(2, TimeUnit.SECONDS));
    }

    private Connection connect(String ticket, Role role) throws Exception {
        Socket socket = new Socket("127.0.0.1", relay.getLocalPort());
        socket.setSoTimeout(5_000);
        DataInputStream input = new DataInputStream(new BufferedInputStream(
                socket.getInputStream()));
        DataOutputStream output = new DataOutputStream(new BufferedOutputStream(
                socket.getOutputStream()));
        MediaProtocol.writeHandshake(output, role, ticket);
        assertEquals(MediaProtocol.ACK_OK, input.readUnsignedByte());
        return new Connection(socket, input, output);
    }

    private record Connection(Socket socket, DataInputStream input, DataOutputStream output)
            implements AutoCloseable {
        @Override public void close() throws Exception { socket.close(); }
    }
}
