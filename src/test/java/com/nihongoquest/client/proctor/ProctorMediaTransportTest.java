package com.nihongoquest.client.proctor;

import com.nihongoquest.common.media.MediaProtocol;
import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.server.media.ProctorMediaRelay;
import org.junit.jupiter.api.Test;

import java.awt.image.BufferedImage;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class ProctorMediaTransportTest {
    @Test
    void clientPublisherAndSubscriberRelayAFrameAndIgnoreDuplicateConnect() throws Exception {
        byte[] jpeg = {1, 2, 3, 4};
        try (ProctorMediaRelay relay = new ProctorMediaRelay();
             ProctorMediaPublisher publisher = new ProctorMediaPublisher();
             ProctorMediaSubscriber subscriber = new ProctorMediaSubscriber()) {
            relay.start(0);
            var hostTicket = relay.issueTicket("123456", 1,
                    MediaProtocol.Role.HOST_SUBSCRIBER);
            var playerTicket = relay.issueTicket("123456", 2,
                    MediaProtocol.Role.PUBLISHER);
            var hostSession = new Payloads.ProctorMediaSession("123456",
                    Payloads.MediaRole.HOST_SUBSCRIBER, relay.getLocalPort(),
                    hostTicket.token(), hostTicket.expiresAtEpochMillis());
            var playerSession = new Payloads.ProctorMediaSession("123456",
                    Payloads.MediaRole.PUBLISHER, relay.getLocalPort(),
                    playerTicket.token(), playerTicket.expiresAtEpochMillis());
            LinkedBlockingQueue<MediaProtocol.RelayedFrame> frames = new LinkedBlockingQueue<>();

            subscriber.connect("127.0.0.1", hostSession, frames::offer);
            subscriber.connect("127.0.0.1", hostSession, frames::offer);
            publisher.connect("127.0.0.1", playerSession);
            publisher.connect("127.0.0.1", playerSession);
            publisher.offer(new CapturedFrame(17, 1_000, jpeg,
                    new BufferedImage(1, 1, BufferedImage.TYPE_3BYTE_BGR)));

            MediaProtocol.RelayedFrame received = frames.poll(5, TimeUnit.SECONDS);
            assertNotNull(received);
            assertEquals(2, received.userId());
            assertEquals(17, received.sequence());
            assertArrayEquals(jpeg, received.jpeg());
        }
    }
}
