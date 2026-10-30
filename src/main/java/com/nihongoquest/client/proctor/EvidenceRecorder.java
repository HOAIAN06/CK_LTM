package com.nihongoquest.client.proctor;

import com.nihongoquest.common.media.MediaProtocol;
import com.nihongoquest.common.protocol.Payloads;
import org.bytedeco.javacv.FFmpegFrameRecorder;
import org.bytedeco.javacv.Java2DFrameConverter;
import org.bytedeco.ffmpeg.global.avcodec;

import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.FileStore;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/** Bounded JPEG history and event clips on the host machine. */
public final class EvidenceRecorder implements AutoCloseable {
    private static final long MAX_PLAYER_BYTES = 8L * 1024 * 1024;
    private static final long MAX_OPEN_CLIP_BYTES = 16L * 1024 * 1024;
    private static final long MIN_FREE_BYTES = 1024L * 1024 * 1024;
    private static final DateTimeFormatter NAME = DateTimeFormatter.ofPattern("HH-mm-ss")
            .withZone(ZoneId.systemDefault());
    private final Path session;
    private final Map<Long, Deque<Frame>> buffers = new HashMap<>();
    private final Map<Long, Clip> openClips = new HashMap<>();
    private final Map<Long, String> usernames = new ConcurrentHashMap<>();
    private final Map<Long, List<Map<String, Object>>> savedClips = new ConcurrentHashMap<>();
    private final List<Payloads.ProctorEventData> pendingEvents = new ArrayList<>();
    private boolean closed;
    private final Map<String, Path> images = new ConcurrentHashMap<>();
    private final Map<String, Path> clips = new ConcurrentHashMap<>();
    private final ScheduledExecutorService timer = Executors.newSingleThreadScheduledExecutor();
    private final ExecutorService encoders = Executors.newFixedThreadPool(2);
    private final Consumer<String> errorHandler;
    private volatile boolean writable = true;

    public EvidenceRecorder(String pin, Path base, Consumer<String> errorHandler) throws IOException {
        this.errorHandler = errorHandler;
        Files.createDirectories(base);
        session = base.resolve(DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss")
                .withZone(ZoneId.systemDefault()).format(Instant.now()) + "_PIN-" + pin
                + "-" + java.util.UUID.randomUUID().toString().substring(0, 8));
        Files.createDirectories(session);
        checkSpace();
        Files.writeString(session.resolve("session.json"), Payloads.toJson(Map.of(
                "pin", pin, "startedAt", Instant.now().toString())).toString());
        timer.scheduleAtFixedRate(this::finalizeExpired, 1, 1, TimeUnit.SECONDS);
    }

    public static Path defaultBase() {
        return Path.of(System.getProperty("user.home"), "Documents", "NihongoQuest-Proctoring");
    }

    public Path directory() { return session; }
    public boolean isWritable() { return writable; }
    public Path imageFor(String eventId) { return images.get(eventId); }
    public Path clipFor(String eventId) { return clips.get(eventId); }
    synchronized int bufferedFrameCount(long userId) {
        Deque<Frame> frames = buffers.get(userId);
        return frames == null ? 0 : frames.size();
    }
    synchronized long bufferedBytes(long userId) {
        Deque<Frame> frames = buffers.get(userId);
        return frames == null ? 0 : frames.stream().mapToLong(f -> f.jpeg.length).sum();
    }

    public synchronized void addFrame(MediaProtocol.RelayedFrame incoming) {
        Frame frame = new Frame(incoming.sequence(), incoming.serverReceivedEpochMillis(),
                incoming.jpeg().clone());
        Deque<Frame> buffer = buffers.computeIfAbsent(incoming.userId(), ignored -> new ArrayDeque<>());
        buffer.addLast(frame);
        long bytes = buffer.stream().mapToLong(item -> item.jpeg.length).sum();
        while (!buffer.isEmpty() && (bytes > MAX_PLAYER_BYTES
                || frame.at - buffer.getFirst().at > 15_000)) {
            bytes -= buffer.removeFirst().jpeg.length;
        }
        Clip clip = openClips.get(incoming.userId());
        if (clip != null && frame.at <= clip.deadline) clip.add(frame);
    }

    public synchronized void addEvent(Payloads.ProctorEventData event) {
        if (closed) return;
        pendingEvents.add(event);
        timer.schedule(() -> captureEvent(event), 500, TimeUnit.MILLISECONDS);
    }

    private synchronized void captureEvent(Payloads.ProctorEventData event) {
        if (!pendingEvents.remove(event) || !writable) return;
        try { checkSpace(); } catch (IOException error) { fail(error); return; }
        usernames.put(event.userId(), event.username());
        Deque<Frame> buffer = buffers.get(event.userId());
        Frame exact = null, closest = null;
        if (buffer != null) for (Frame frame : buffer) {
            if (frame.sequence == event.frameSequence()) exact = frame;
            if (closest == null || Math.abs(frame.at - event.serverReceivedAtEpochMillis())
                    < Math.abs(closest.at - event.serverReceivedAtEpochMillis())) closest = frame;
        }
        Frame snapshot = exact != null ? exact : closest;
        Clip clip = openClips.get(event.userId());
        if (clip == null) {
            clip = new Clip(event, event.serverReceivedAtEpochMillis() + 15_000);
            if (buffer != null) for (Frame frame : buffer) clip.add(frame);
            openClips.put(event.userId(), clip);
        } else {
            clip.events.add(event);
            clip.deadline = event.serverReceivedAtEpochMillis() + 15_000;
        }
        if (snapshot != null) {
            String name = fileBase(event);
            try {
                Path file = playerDirectory(event.userId()).resolve(name + ".jpg");
                Files.write(file, snapshot.jpeg);
                images.put(event.eventId(), file);
            }
            catch (IOException error) { fail(error); }
        }
    }

    private synchronized void finalizeExpired() {
        long now = System.currentTimeMillis();
        List<Map.Entry<Long, Clip>> done = openClips.entrySet().stream()
                .filter(entry -> entry.getValue().deadline <= now).toList();
        for (var entry : done) {
            openClips.remove(entry.getKey());
            submitClip(entry.getKey(), entry.getValue(), false);
        }
    }

    public synchronized void finishUser(long userId) {
        Clip clip = openClips.remove(userId);
        if (clip != null) submitClip(userId, clip, true);
    }

    private void submitClip(long userId, Clip clip, boolean incomplete) {
        if (!writable) return;
        encoders.submit(() -> encode(userId, clip, incomplete));
    }

    private void encode(long userId, Clip clip, boolean incomplete) {
        incomplete |= clip.truncated;
        try {
            checkSpace();
            Path player = playerDirectory(userId);
            if (clip.frames.isEmpty()) {
                saveClipMetadata(userId, player, "", true, true, clip.events);
                return;
            }
            String base = fileBase(clip.events.getFirst());
            Path part = player.resolve(base + ".part");
            Path mp4 = player.resolve(base + ".mp4");
            try (FFmpegFrameRecorder recorder = new FFmpegFrameRecorder(part.toFile(), 320, 240);
                 Java2DFrameConverter converter = new Java2DFrameConverter()) {
                recorder.setFormat("mp4");
                recorder.setVideoCodec(avcodec.AV_CODEC_ID_MPEG4);
                recorder.setFrameRate(5);
                recorder.setVideoBitrate(400_000);
                recorder.start();
                long last = Long.MIN_VALUE;
                for (Frame frame : clip.frames) {
                    if (last != Long.MIN_VALUE && frame.at - last < 180) continue;
                    var image = ImageIO.read(new ByteArrayInputStream(frame.jpeg));
                    if (image != null) recorder.record(converter.convert(image));
                    last = frame.at;
                }
                recorder.stop();
            }
            Files.move(part, mp4, StandardCopyOption.ATOMIC_MOVE,
                    StandardCopyOption.REPLACE_EXISTING);
            for (Payloads.ProctorEventData event : clip.events) clips.put(event.eventId(), mp4);
            saveClipMetadata(userId, player, mp4.getFileName().toString(),
                    incomplete, false, clip.events);
        } catch (Exception error) { fail(error); }
    }

    private void saveClipMetadata(long userId, Path player, String filename,
                                  boolean incomplete, boolean missingMedia,
                                  List<Payloads.ProctorEventData> events) throws IOException {
        synchronized (savedClips) {
            List<Map<String, Object>> all = savedClips.computeIfAbsent(userId,
                    ignored -> new ArrayList<>());
            all.add(Map.of("file", filename, "incomplete", incomplete,
                    "missingMedia", missingMedia, "events", List.copyOf(events)));
            Files.writeString(player.resolve("events.json"),
                    Payloads.toJson(Map.of("clips", all)).toString());
        }
    }

    private Path playerDirectory(long userId) throws IOException {
        String safe = sanitize(usernames.getOrDefault(userId, "user-" + userId));
        Path path = session.resolve("player-" + safe + "-" + userId).normalize();
        if (!path.startsWith(session)) throw new IOException("Invalid evidence path");
        Files.createDirectories(path);
        return path;
    }

    static String sanitize(String name) {
        String safe = name == null ? "unknown" : name.replaceAll("[<>:\"/\\\\|?*\\p{Cntrl}.]", "-")
                .replaceAll("-+", "-").strip();
        return safe.isEmpty() ? "unknown" : safe.substring(0, Math.min(60, safe.length()));
    }

    private static String fileBase(Payloads.ProctorEventData event) {
        return NAME.format(Instant.ofEpochMilli(event.serverReceivedAtEpochMillis()))
                + "_" + event.type() + "_" + event.eventId();
    }

    private void checkSpace() throws IOException {
        FileStore store = Files.getFileStore(session);
        if (store.getUsableSpace() < MIN_FREE_BYTES) throw new IOException("Ổ đĩa còn dưới 1 GiB trống");
    }

    private void fail(Exception error) {
        writable = false;
        errorHandler.accept("Không thể lưu bằng chứng: " + error.getMessage());
    }

    @Override public synchronized void close() {
        if (closed) return;
        closed = true;
        timer.shutdownNow();
        for (Payloads.ProctorEventData event : List.copyOf(pendingEvents)) captureEvent(event);
        for (var entry : openClips.entrySet()) submitClip(entry.getKey(), entry.getValue(), true);
        openClips.clear();
        encoders.shutdown();
    }

    private record Frame(long sequence, long at, byte[] jpeg) { }
    private static final class Clip {
        final List<Payloads.ProctorEventData> events = new ArrayList<>();
        final List<Frame> frames = new ArrayList<>();
        long frameBytes;
        boolean truncated;
        long deadline;
        void add(Frame frame) {
            frames.add(frame);
            frameBytes += frame.jpeg.length;
            while (frameBytes > MAX_OPEN_CLIP_BYTES && !frames.isEmpty()) {
                frameBytes -= frames.removeFirst().jpeg.length;
                truncated = true;
            }
        }
        Clip(Payloads.ProctorEventData first, long deadline) {
            events.add(first);
            this.deadline = deadline;
        }
    }
}
