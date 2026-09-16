package com.nihongoquest.common;

/**
 * Message là model đại diện một gói tin trao đổi giữa Client và Server.
 * Sau này có thể chứa loại message (MessageType) và nội dung (payload).
 * Hiện tại chỉ là skeleton để hai thành viên thống nhất giao diện chung.
 */
public class Message {

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
        return type.name() + Protocol.SEPARATOR + (payload == null ? "" : payload);
    }

    public static Message fromWire(String line) {
        if (line == null || line.isBlank()) {
            throw new IllegalArgumentException("Message rỗng");
        }

        String[] parts = line.split("\\" + Protocol.SEPARATOR, 2);
        MessageType type = MessageType.valueOf(parts[0]);
        String payload = parts.length == 2 ? parts[1] : "";
        return new Message(type, payload);
    }
}
