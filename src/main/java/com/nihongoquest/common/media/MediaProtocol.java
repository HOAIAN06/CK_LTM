package com.nihongoquest.common.media;

import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.EOFException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/** Binary protocol used only for proctoring camera frames. */
public final class MediaProtocol {
    public static final int MAGIC = 0x4E514D50; // NQMP
    public static final int VERSION = 1;
    public static final int MAX_TICKET_BYTES = 512;
    public static final int MAX_JPEG_BYTES = 65_536;
    public static final int HANDSHAKE_TIMEOUT_MILLIS = 10_000;

    public static final int FRAME_PUBLISH = 0x10;
    public static final int FRAME_SUBSCRIBE = 0x11;

    public static final int ACK_OK = 0;
    public static final int ACK_INVALID_MAGIC = 1;
    public static final int ACK_UNSUPPORTED_VERSION = 2;
    public static final int ACK_INVALID_TICKET = 3;
    public static final int ACK_EXPIRED_TICKET = 4;
    public static final int ACK_ROOM_CLOSED = 5;

    private MediaProtocol() { }

    public enum Role {
        PUBLISHER(1), HOST_SUBSCRIBER(2);

        private final int code;

        Role(int code) { this.code = code; }
        public int code() { return code; }

        public static Role fromCode(int code) {
            for (Role role : values()) if (role.code == code) return role;
            return null;
        }
    }

    public record Handshake(Role role, String ticket) { }
    public record PublishedFrame(long sequence, long captureEpochMillis, byte[] jpeg) { }
    public record RelayedFrame(long userId, long sequence,
                               long serverReceivedEpochMillis, byte[] jpeg) { }

    public static void writeHandshake(DataOutputStream output, Role role, String ticket)
            throws IOException {
        byte[] bytes = ticket == null ? new byte[0] : ticket.getBytes(StandardCharsets.UTF_8);
        if (bytes.length == 0 || bytes.length > MAX_TICKET_BYTES) {
            throw new IllegalArgumentException("Media ticket has invalid length");
        }
        output.writeInt(MAGIC);
        output.writeByte(VERSION);
        output.writeByte(role.code());
        output.writeShort(bytes.length);
        output.write(bytes);
        output.flush();
    }

    public static Handshake readHandshake(DataInputStream input) throws IOException {
        int magic = input.readInt();
        if (magic != MAGIC) throw new HandshakeException(ACK_INVALID_MAGIC);
        int version = input.readUnsignedByte();
        if (version != VERSION) throw new HandshakeException(ACK_UNSUPPORTED_VERSION);
        Role role = Role.fromCode(input.readUnsignedByte());
        if (role == null) throw new HandshakeException(ACK_INVALID_TICKET);
        int length = input.readUnsignedShort();
        if (length == 0 || length > MAX_TICKET_BYTES) {
            throw new HandshakeException(ACK_INVALID_TICKET);
        }
        byte[] bytes = input.readNBytes(length);
        if (bytes.length != length) throw new EOFException("Incomplete media ticket");
        return new Handshake(role, new String(bytes, StandardCharsets.UTF_8));
    }

    public static void writePublishedFrame(DataOutputStream output, PublishedFrame frame)
            throws IOException {
        requireJpeg(frame.jpeg());
        output.writeByte(FRAME_PUBLISH);
        output.writeLong(frame.sequence());
        output.writeLong(frame.captureEpochMillis());
        output.writeInt(frame.jpeg().length);
        output.write(frame.jpeg());
        output.flush();
    }

    public static PublishedFrame readPublishedFrame(DataInputStream input) throws IOException {
        int type = input.readUnsignedByte();
        if (type != FRAME_PUBLISH) throw new IOException("Unsupported publisher frame: " + type);
        long sequence = input.readLong();
        long timestamp = input.readLong();
        byte[] jpeg = readJpeg(input);
        return new PublishedFrame(sequence, timestamp, jpeg);
    }

    public static void writeRelayedFrame(DataOutputStream output, RelayedFrame frame)
            throws IOException {
        requireJpeg(frame.jpeg());
        output.writeByte(FRAME_SUBSCRIBE);
        output.writeLong(frame.userId());
        output.writeLong(frame.sequence());
        output.writeLong(frame.serverReceivedEpochMillis());
        output.writeInt(frame.jpeg().length);
        output.write(frame.jpeg());
    }

    public static RelayedFrame readRelayedFrame(DataInputStream input) throws IOException {
        int type = input.readUnsignedByte();
        if (type != FRAME_SUBSCRIBE) throw new IOException("Unsupported relay frame: " + type);
        long userId = input.readLong();
        long sequence = input.readLong();
        long timestamp = input.readLong();
        return new RelayedFrame(userId, sequence, timestamp, readJpeg(input));
    }

    private static byte[] readJpeg(DataInputStream input) throws IOException {
        int length = input.readInt();
        if (length <= 0 || length > MAX_JPEG_BYTES) {
            throw new IOException("JPEG frame exceeds protocol limit: " + length);
        }
        byte[] jpeg = input.readNBytes(length);
        if (jpeg.length != length) throw new EOFException("Incomplete JPEG frame");
        return jpeg;
    }

    private static void requireJpeg(byte[] jpeg) {
        if (jpeg == null || jpeg.length == 0 || jpeg.length > MAX_JPEG_BYTES) {
            throw new IllegalArgumentException("JPEG frame exceeds protocol limit");
        }
    }

    public static final class HandshakeException extends IOException {
        private final int acknowledgement;

        public HandshakeException(int acknowledgement) {
            super("Invalid media handshake: " + acknowledgement);
            this.acknowledgement = acknowledgement;
        }

        public int acknowledgement() { return acknowledgement; }
    }
}
