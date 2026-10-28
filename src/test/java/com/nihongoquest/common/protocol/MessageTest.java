package com.nihongoquest.common.protocol;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class MessageTest {

    @Test
    void jsonFramePreservesSeparatorsUnicodeAndEscapedNewlines() {
        String payload = "Câu hỏi | đáp án\n日本語";
        Message decoded = Message.fromWire(new Message(MessageType.QUESTION, payload).toWire());

        assertEquals(MessageType.QUESTION, decoded.getType());
        assertEquals(payload, decoded.payloadText());
    }

    @Test
    void rejectsBlankAndMalformedFrames() {
        assertThrows(IllegalArgumentException.class, () -> Message.fromWire(" "));
        assertThrows(IllegalArgumentException.class, () -> Message.fromWire("not-json"));
        assertThrows(IllegalArgumentException.class,
                () -> Message.fromWire("{\"payload\":\"x\"}"));
    }
}
