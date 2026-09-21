package com.nihongoquest.server.dashboard;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nihongoquest.common.Message;
import com.nihongoquest.common.MessageType;
import com.nihongoquest.common.Payloads;
import com.nihongoquest.server.TrafficEvent;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class DashboardControllerTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Test
    void formatsValidFrameAndKeepsCredentialPayloadUnmasked() throws Exception {
        String wire = new Message(MessageType.LOGIN,
                Payloads.credentials("sakura", "secret123")).toWire();
        TrafficEvent event = new TrafficEvent(
                Instant.parse("2026-09-20T03:00:00Z"),
                TrafficEvent.Direction.RECEIVED, "127.0.0.1:5000", wire);

        JsonNode formatted = MAPPER.readTree(DashboardController.formatTraffic(event));

        assertEquals("127.0.0.1:5000", formatted.get("client").asText());
        assertEquals("LOGIN", formatted.at("/message/type").asText());
        assertEquals(Payloads.credentials("sakura", "secret123"),
                formatted.at("/message/payload").asText());
    }

    @Test
    void keepsMalformedFrameAsRawText() throws Exception {
        TrafficEvent event = new TrafficEvent(
                Instant.parse("2026-09-20T03:00:00Z"),
                TrafficEvent.Direction.RECEIVED, "127.0.0.1:5000", "not-json");

        JsonNode formatted = MAPPER.readTree(DashboardController.formatTraffic(event));

        assertFalse(formatted.get("validJson").asBoolean());
        assertEquals("not-json", formatted.get("raw").asText());
    }
}
