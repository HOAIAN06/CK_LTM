package com.nihongoquest.common.media;

import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.EOFException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/** Binary protocol used only for proctoring camera frames. */
public final class MediaProtocol {
    public static final int MAGIC = 0x4E514D50; // NQMP
    /** Version 2 adds normalized vision metadata to every relayed frame. */
    public static final int VERSION = 2;
    public static final int MAX_TICKET_BYTES = 512;
    /** 720p high quality frames need more than the original 64 KiB ceiling. */
    public static final int MAX_JPEG_BYTES = 524_288;
    private static final int MAX_FACES = 6;
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
    public record PublishedFrame(long sequence, long captureEpochMillis, byte[] jpeg,
                                 VisionMetadata vision) {
        public PublishedFrame(long sequence, long captureEpochMillis, byte[] jpeg) {
            this(sequence, captureEpochMillis, jpeg, VisionMetadata.unavailable(sequence));
        }
    }
    public record RelayedFrame(long userId, long sequence,
                               long serverReceivedEpochMillis, byte[] jpeg,
                               VisionMetadata vision) {
        public RelayedFrame(long userId, long sequence, long serverReceivedEpochMillis,
                            byte[] jpeg) {
            this(userId, sequence, serverReceivedEpochMillis, jpeg,
                    VisionMetadata.unavailable(sequence));
        }
    }

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
        writeVision(output, frame.vision());
        output.flush();
    }

    public static PublishedFrame readPublishedFrame(DataInputStream input) throws IOException {
        int type = input.readUnsignedByte();
        if (type != FRAME_PUBLISH) throw new IOException("Unsupported publisher frame: " + type);
        long sequence = input.readLong();
        long timestamp = input.readLong();
        byte[] jpeg = readJpeg(input);
        return new PublishedFrame(sequence, timestamp, jpeg, readVision(input, sequence));
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
        writeVision(output, frame.vision());
    }

    public static RelayedFrame readRelayedFrame(DataInputStream input) throws IOException {
        int type = input.readUnsignedByte();
        if (type != FRAME_SUBSCRIBE) throw new IOException("Unsupported relay frame: " + type);
        long userId = input.readLong();
        long sequence = input.readLong();
        long timestamp = input.readLong();
        byte[] jpeg = readJpeg(input);
        return new RelayedFrame(userId, sequence, timestamp, jpeg, readVision(input, sequence));
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

    private static void writeVision(DataOutputStream output, VisionMetadata vision) throws IOException {
        VisionMetadata value = vision == null ? VisionMetadata.unavailable(0) : vision;
        output.writeLong(value.frameSequence());
        output.writeLong(value.analysedAtEpochMillis());
        output.writeByte(value.attention().ordinal());
        output.writeDouble(value.gazeX());
        output.writeDouble(value.gazeY());
        output.writeFloat((float) value.confidence());
        List<VisionMetadata.FaceBox> faces = value.faces();
        output.writeByte(Math.min(MAX_FACES, faces.size()));
        for (int index = 0; index < Math.min(MAX_FACES, faces.size()); index++) {
            VisionMetadata.FaceBox face = faces.get(index);
            output.writeFloat((float) face.x()); output.writeFloat((float) face.y());
            output.writeFloat((float) face.width()); output.writeFloat((float) face.height());
            output.writeFloat((float) face.leftEyeX()); output.writeFloat((float) face.leftEyeY());
            output.writeFloat((float) face.rightEyeX()); output.writeFloat((float) face.rightEyeY());
        }
    }

    private static VisionMetadata readVision(DataInputStream input, long fallbackSequence)
            throws IOException {
        long sequence = input.readLong();
        long analysedAt = input.readLong();
        int attention = input.readUnsignedByte();
        VisionMetadata.Attention[] values = VisionMetadata.Attention.values();
        VisionMetadata.Attention state = attention < values.length ? values[attention]
                : VisionMetadata.Attention.UNKNOWN;
        double gazeX = input.readDouble();
        double gazeY = input.readDouble();
        double confidence = input.readFloat();
        int count = input.readUnsignedByte();
        if (count > MAX_FACES) throw new IOException("Too many vision face boxes");
        List<VisionMetadata.FaceBox> faces = new ArrayList<>(count);
        for (int index = 0; index < count; index++) {
            faces.add(new VisionMetadata.FaceBox(input.readFloat(), input.readFloat(),
                    input.readFloat(), input.readFloat(), input.readFloat(), input.readFloat(),
                    input.readFloat(), input.readFloat()));
        }
        return new VisionMetadata(sequence <= 0 ? fallbackSequence : sequence, analysedAt, faces,
                gazeX, gazeY, state, confidence);
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
