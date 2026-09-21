package com.nihongoquest.common;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Message là model đại diện một gói tin trao đổi giữa Client và Server.
 * Một application frame JSON trao đổi giữa client và server.
 */
public class Message {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private MessageType type;
    private String payload;

    public Message() {
    }

    public Message(MessageType type, String payload) {
        this.type = type;
        this.payload = payload;
    }

    public MessageType getType() {
        return type;
    }

    public void setType(MessageType type) {
        this.type = type;
    }

    public String getPayload() {
        return payload;
    }

    public void setPayload(String payload) {
        this.payload = payload;
    }

    public String toWire() {
        try {
            return MAPPER.writeValueAsString(this);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Không thể mã hóa message JSON", e);
        }
    }

    public static Message fromWire(String line) {
        if (line == null || line.isBlank()) {
            throw new IllegalArgumentException("Message rỗng");
        }

        try {
            Message message = MAPPER.readValue(line, Message.class);
            if (message.type == null) {
                throw new IllegalArgumentException("Message thiếu type");
            }
            if (message.payload == null) {
                message.payload = "";
            }
            return message;
        } catch (JsonProcessingException | IllegalArgumentException e) {
            throw new IllegalArgumentException("Message JSON không hợp lệ", e);
        }
    }
}
