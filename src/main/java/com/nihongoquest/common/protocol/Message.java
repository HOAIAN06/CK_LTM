package com.nihongoquest.common.protocol;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.NullNode;
import com.fasterxml.jackson.databind.node.TextNode;

/**
 * Message là model đại diện một gói tin trao đổi giữa Client và Server.
 * Một application frame JSON trao đổi giữa client và server.
 */
public class Message {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private MessageType type;
    private JsonNode payload;

    public Message() {
    }

    public Message(MessageType type, JsonNode payload) {
        this.type = type;
        this.payload = payload == null ? NullNode.getInstance() : payload;
    }

    /** Dùng cho các payload trạng thái ngắn như DATABASE_ERROR. */
    public Message(MessageType type, String payload) {
        this(type, payload == null || payload.isEmpty()
                ? NullNode.getInstance() : TextNode.valueOf(payload));
    }

    public MessageType getType() {
        return type;
    }

    public void setType(MessageType type) {
        this.type = type;
    }

    public JsonNode getPayload() {
        return payload;
    }

    public void setPayload(JsonNode payload) {
        this.payload = payload == null ? NullNode.getInstance() : payload;
    }

    public String payloadText() {
        return payload == null || payload.isNull() ? "" : payload.asText();
    }

    public <T> T payloadAs(Class<T> type) {
        try {
            return MAPPER.treeToValue(payload, type);
        } catch (JsonProcessingException | IllegalArgumentException e) {
            throw new IllegalArgumentException("Payload JSON không hợp lệ", e);
        }
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
            if (message.payload == null) message.payload = NullNode.getInstance();
            return message;
        } catch (JsonProcessingException | IllegalArgumentException e) {
            throw new IllegalArgumentException("Message JSON không hợp lệ", e);
        }
    }
}
