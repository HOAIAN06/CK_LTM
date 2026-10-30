package com.nihongoquest.server.network;

import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Payloads;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.net.Socket;

import static org.junit.jupiter.api.Assertions.*;

class ClientHandlerTrafficTest {
    @Test void redactsMediaTicketFromTrafficWire() throws Exception {
        ClientHandler handler = new ClientHandler(new Socket());
        Method method = ClientHandler.class.getDeclaredMethod("safeWire", Message.class);
        method.setAccessible(true);
        String token = "very-secret-media-ticket";
        Message message = new Message(MessageType.PROCTOR_MEDIA_SESSION,
                Payloads.toJson(new Payloads.ProctorMediaSession("123456",
                        Payloads.MediaRole.PUBLISHER, 5001, token, 12345)));
        String wire = (String) method.invoke(handler, message);
        assertFalse(wire.contains(token));
        assertTrue(wire.contains("***"));
    }
}
