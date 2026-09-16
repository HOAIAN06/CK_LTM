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

    // TODO: Thêm phương thức serialize/deserialize khi thống nhất format gửi qua Socket.
}
