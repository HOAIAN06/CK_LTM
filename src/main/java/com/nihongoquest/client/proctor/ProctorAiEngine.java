package com.nihongoquest.client.proctor;

import com.nihongoquest.common.protocol.Payloads;
import com.nihongoquest.common.media.VisionMetadata;
import org.bytedeco.opencv.opencv_core.Mat;
import org.bytedeco.opencv.opencv_core.Rect;
import org.bytedeco.opencv.opencv_core.Scalar;
import org.bytedeco.opencv.opencv_core.Size;
import org.bytedeco.opencv.opencv_dnn.Net;

import java.awt.image.BufferedImage;
import java.awt.image.DataBufferByte;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.BiConsumer;
import java.util.function.Consumer;

import static org.bytedeco.opencv.global.opencv_core.CV_8UC3;
import static org.bytedeco.opencv.global.opencv_core.CV_32F;
import static org.bytedeco.opencv.global.opencv_dnn.DNN_BACKEND_OPENCV;
import static org.bytedeco.opencv.global.opencv_dnn.DNN_TARGET_CPU;
import static org.bytedeco.opencv.global.opencv_dnn.blobFromImage;
import static org.bytedeco.opencv.global.opencv_dnn.readNetFromONNX;

/** CPU-only OpenCV DNN analysis; one worker and one replace-old-frame slot. */
public final class ProctorAiEngine implements AutoCloseable {
    private final ArrayBlockingQueue<CapturedFrame> queue = new ArrayBlockingQueue<>(1);
    private final AtomicBoolean running = new AtomicBoolean();
    private final BiConsumer<Payloads.ProctorEventType, CapturedFrame> events;
    private final Consumer<VisionMetadata> vision;
    private final Net face, landmarks, head, gaze, phone;
    private final Rule noFace = new Rule(2_000, 1_000);
    private final Rule multiple = new Rule(1_000, 2_000);
    private final Rule looking = new Rule(2_000, 1_000);
    private final Rule blocked = new Rule(3_000, 2_000);
    private final List<Double> yawCalibration = new ArrayList<>();
    private final List<Double> pitchCalibration = new ArrayList<>();
    private final List<Double> headYawCalibration = new ArrayList<>();
    private final List<Double> headPitchCalibration = new ArrayList<>();
    private boolean calibrationInvalid;
    private long calibrationStart;
    private volatile Payloads.CalibrationStatus calibration = Payloads.CalibrationStatus.PENDING;
    private volatile boolean ready;
    private volatile boolean active;
    private double yawBaseline, pitchBaseline, headYawBaseline, headPitchBaseline;
    private int phoneHits, phoneMisses;
    private boolean phoneActive;
    private long lastPhoneEvent = -1, lastPhoneCheck;
    private Thread worker;

    public ProctorAiEngine(BiConsumer<Payloads.ProctorEventType, CapturedFrame> events) throws IOException {
        this(events, ignored -> { });
    }

    public ProctorAiEngine(BiConsumer<Payloads.ProctorEventType, CapturedFrame> events,
                           Consumer<VisionMetadata> vision) throws IOException {
        this.events = events;
        this.vision = vision;
        face = loadOnnx("face-detection-retail-0005");
        landmarks = loadOnnx("facial-landmarks-35-adas-0002");
        head = loadOnnx("head-pose-estimation-adas-0001");
        gaze = loadOnnx("gaze-estimation-adas-0002");
        try { phone = readNetFromONNX(resource("yolox_tiny.onnx")); }
        catch (Exception error) { throw new IOException("Cannot load phone detector", error); }
        for (Net net : new Net[]{face, landmarks, head, gaze, phone}) {
            net.setPreferableBackend(DNN_BACKEND_OPENCV);
            net.setPreferableTarget(DNN_TARGET_CPU);
        }
    }

    private static byte[] resource(String file) throws IOException {
        try (var in = ProctorAiEngine.class.getResourceAsStream("/models/proctoring/" + file)) {
            if (in == null) throw new IOException("Missing AI model: " + file);
            return in.readAllBytes();
        }
    }

    private static Net loadOnnx(String name) throws IOException {
        try { return readNetFromONNX(resource(name + ".onnx")); }
        catch (Exception error) { throw new IOException("Cannot load AI model " + name, error); }
    }

    public synchronized void startCalibration() {
        yawCalibration.clear(); pitchCalibration.clear();
        headYawCalibration.clear(); headPitchCalibration.clear(); calibrationInvalid = false;
        calibrationStart = System.currentTimeMillis();
        calibration = Payloads.CalibrationStatus.PENDING;
        ready = false;
        start();
    }

    public void start() {
        if (!running.compareAndSet(false, true)) return;
        worker = Thread.ofPlatform().daemon().name("proctor-ai").start(this::loop);
    }

    public Payloads.CalibrationStatus calibrationStatus() { return calibration; }
    public void setActive(boolean active) { this.active = active; }

    public void offer(CapturedFrame frame) {
        if (!queue.offer(frame)) { queue.poll(); queue.offer(frame); }
    }

    private void loop() {
        try {
            while (running.get()) {
                try { analyze(queue.take()); }
                catch (InterruptedException error) { Thread.currentThread().interrupt(); return; }
                catch (Exception ignored) { calibration = Payloads.CalibrationStatus.FAILED; ready = true; }
            }
        } finally {
            face.close(); landmarks.close(); head.close(); gaze.close(); phone.close();
        }
    }

    private synchronized void analyze(CapturedFrame frame) {
        long now = frame.capturedAtEpochMillis();
        try (Mat image = imageMat(frame.image())) {
            List<Rect> faces = detectFaces(image);
            double[] angles = faces.size() == 1 ? estimateAngles(image, faces.getFirst()) : null;
            if (calibration == Payloads.CalibrationStatus.PENDING) {
                if (faces.size() == 1) {
                    yawCalibration.add(angles[0]); pitchCalibration.add(angles[1]);
                    headYawCalibration.add(angles[2]); headPitchCalibration.add(angles[3]);
                } else calibrationInvalid = true;
                if (now - calibrationStart >= 5_000) {
                    if (!calibrationInvalid && yawCalibration.size() >= 5) {
                        yawBaseline = median(yawCalibration);
                        pitchBaseline = median(pitchCalibration);
                        headYawBaseline = median(headYawCalibration);
                        headPitchBaseline = median(headPitchCalibration);
                        calibration = Payloads.CalibrationStatus.READY;
                    } else calibration = Payloads.CalibrationStatus.FAILED;
                    ready = true;
                }
                publishVision(frame, image, faces, angles, VisionMetadata.Attention.UNKNOWN);
                return;
            }
            if (!ready || !active) {
                publishVision(frame, image, faces, angles, VisionMetadata.Attention.UNKNOWN);
                return;
            }
            fire(noFace.update(faces.isEmpty(), now), Payloads.ProctorEventType.NO_FACE, frame);
            fire(multiple.update(faces.size() >= 2, now), Payloads.ProctorEventType.MULTIPLE_FACES, frame);
            VisionMetadata.Attention attention = faces.isEmpty() ? VisionMetadata.Attention.NO_FACE
                    : faces.size() >= 2 ? VisionMetadata.Attention.MULTIPLE_FACES
                    : VisionMetadata.Attention.LOOKING_AT_SCREEN;
            if (faces.size() == 1) {
                boolean away = Math.abs(angles[0] - yawBaseline) > 25
                        || Math.abs(angles[1] - pitchBaseline) > 20
                        || Math.abs(angles[2] - headYawBaseline) > 25
                        || Math.abs(angles[3] - headPitchBaseline) > 20;
                fire(looking.update(away, now), Payloads.ProctorEventType.LOOKING_AWAY, frame);
                if (away) attention = VisionMetadata.Attention.LOOKING_AWAY;
            } else looking.update(false, now);
            if (now - lastPhoneCheck >= 500) {
                lastPhoneCheck = now;
                updatePhone(detectPhone(image), now, frame);
            }
            if (phoneActive) attention = VisionMetadata.Attention.PHONE;
            publishVision(frame, image, faces, angles, attention);
        }
    }

    private void publishVision(CapturedFrame frame, Mat image, List<Rect> faces, double[] angles,
                               VisionMetadata.Attention attention) {
        List<VisionMetadata.FaceBox> boxes = new ArrayList<>();
        for (Rect face : faces) {
            double x = face.x() / (double) image.cols();
            double y = face.y() / (double) image.rows();
            double width = face.width() / (double) image.cols();
            double height = face.height() / (double) image.rows();
            boxes.add(new VisionMetadata.FaceBox(x, y, width, height,
                    x + width * .33, y + height * .42, x + width * .67, y + height * .42));
        }
        double gazeX = angles == null ? 0 : Math.max(-1, Math.min(1, angles[0] / 30));
        double gazeY = angles == null ? 0 : Math.max(-1, Math.min(1, angles[1] / 25));
        vision.accept(new VisionMetadata(frame.sequence(), frame.capturedAtEpochMillis(), boxes,
                gazeX, gazeY, attention, faces.isEmpty() ? .8 : .9));
    }

    private List<Rect> detectFaces(Mat image) {
        try (Mat blob = blobFromImage(image, 1, new Size(300, 300), new Scalar(),
                false, false, CV_32F)) {
            face.setInput(blob);
            try (Mat output = face.forward()) {
                FloatBuffer values = floats(output);
                List<Rect> result = new ArrayList<>();
                for (int offset = 0; offset + 6 < values.limit(); offset += 7) {
                    if (values.get(offset) < 0 || values.get(offset + 2) < .55) continue;
                    int x = Math.max(0, Math.min(image.cols() - 1,
                            Math.round(values.get(offset + 3) * image.cols())));
                    int y = Math.max(0, Math.min(image.rows() - 1,
                            Math.round(values.get(offset + 4) * image.rows())));
                    int right = Math.max(x + 1, Math.min(image.cols(),
                            Math.round(values.get(offset + 5) * image.cols())));
                    int bottom = Math.max(y + 1, Math.min(image.rows(),
                            Math.round(values.get(offset + 6) * image.rows())));
                    result.add(new Rect(x, y, right - x, bottom - y));
                }
                return result;
            }
        }
    }

    private double[] estimateAngles(Mat image, Rect rect) {
        try (Mat roi = new Mat(image, rect);
             Mat headBlob = blobFromImage(roi, 1, new Size(60, 60), new Scalar(),
                     false, false, CV_32F)) {
            head.setInput(headBlob);
            double yaw, pitch, roll;
            try (Mat y = head.forward("fc_y"); Mat p = head.forward("fc_p");
                 Mat r = head.forward("fc_r")) {
                yaw = floats(y).get(0); pitch = floats(p).get(0); roll = floats(r).get(0);
            }
            landmarks.setInput(headBlob);
            try (Mat points = landmarks.forward()) {
                FloatBuffer coordinates = floats(points);
                // p0/p1 and p2/p3 are the left/right eye corners.
                Mat left = cropEye(image, rect,
                        (coordinates.get(0) + coordinates.get(2)) / 2,
                        (coordinates.get(1) + coordinates.get(3)) / 2);
                Mat right = cropEye(image, rect,
                        (coordinates.get(4) + coordinates.get(6)) / 2,
                        (coordinates.get(5) + coordinates.get(7)) / 2);
                try (left; right;
                     Mat leftBlob = blobFromImage(left, 1, new Size(60, 60), new Scalar(),
                             false, false, CV_32F);
                     Mat rightBlob = blobFromImage(right, 1, new Size(60, 60), new Scalar(),
                             false, false, CV_32F);
                     Mat pose = new Mat(1, 3, CV_32F)) {
                    pose.data().capacity(12).limit(12).asByteBuffer().order(ByteOrder.nativeOrder())
                            .asFloatBuffer().put(new float[]{(float) yaw, (float) pitch, (float) roll});
                    gaze.setInput(leftBlob, "left_eye_image", 1, new Scalar());
                    gaze.setInput(rightBlob, "right_eye_image", 1, new Scalar());
                    gaze.setInput(pose, "head_pose_angles", 1, new Scalar());
                    try (Mat vector = gaze.forward()) {
                        FloatBuffer v = floats(vector);
                        double gx = v.get(0), gy = v.get(1), gz = v.get(2);
                        double gazeYaw = Math.toDegrees(Math.atan2(gx, Math.abs(gz)));
                        double gazePitch = Math.toDegrees(Math.atan2(gy, Math.abs(gz)));
                        return new double[]{gazeYaw, gazePitch, yaw, pitch};
                    }
                }
            }
        }
    }

    private static Mat cropEye(Mat image, Rect face, float nx, float ny) {
        int side = Math.max(12, Math.min(face.width(), face.height()) / 3);
        int cx = face.x() + Math.round(nx * face.width());
        int cy = face.y() + Math.round(ny * face.height());
        int x = Math.max(0, Math.min(image.cols() - side, cx - side / 2));
        int y = Math.max(0, Math.min(image.rows() - side, cy - side / 2));
        return new Mat(image, new Rect(x, y, side, side));
    }

    private boolean detectPhone(Mat image) {
        try (Mat blob = blobFromImage(image, 1, new Size(416, 416), new Scalar(),
                false, false, CV_32F)) {
            phone.setInput(blob);
            try (Mat output = phone.forward()) {
                FloatBuffer data = floats(output);
                int rows = data.limit() / 85;
                for (int row = 0; row < rows; row++) {
                    int at = row * 85;
                    if (data.get(at + 4) * data.get(at + 5 + 67) >= .55f) return true;
                }
                return false;
            }
        }
    }

    private void updatePhone(boolean detected, long now, CapturedFrame frame) {
        if (detected) { phoneHits++; phoneMisses = 0; }
        else { phoneMisses++; phoneHits = 0; }
        if (!phoneActive && phoneHits >= 2
                && (lastPhoneEvent < 0 || now - lastPhoneEvent >= 10_000)) {
            phoneActive = true;
            lastPhoneEvent = now;
            events.accept(Payloads.ProctorEventType.PHONE_DETECTED, frame);
        } else if (phoneActive && phoneMisses >= 3) phoneActive = false;
        else if (phoneActive && detected && now - lastPhoneEvent >= 10_000) {
            lastPhoneEvent = now;
            events.accept(Payloads.ProctorEventType.PHONE_DETECTED, frame);
        }
    }

    private static Mat imageMat(BufferedImage image) {
        byte[] data = ((DataBufferByte) image.getRaster().getDataBuffer()).getData();
        Mat mat = new Mat(image.getHeight(), image.getWidth(), CV_8UC3);
        mat.data().capacity(data.length).limit(data.length).put(data);
        return mat;
    }

    private static FloatBuffer floats(Mat mat) {
        long bytes = mat.total() * mat.elemSize();
        return mat.data().capacity(bytes).limit(bytes).asByteBuffer()
                .order(ByteOrder.nativeOrder()).asFloatBuffer();
    }

    private static double median(List<Double> values) {
        List<Double> sorted = values.stream().sorted().toList();
        return sorted.get(sorted.size() / 2);
    }

    private void fire(boolean triggered, Payloads.ProctorEventType type, CapturedFrame frame) {
        if (triggered) events.accept(type, frame);
    }

    @Override public void close() {
        running.set(false);
        if (worker != null) worker.interrupt();
        else { face.close(); landmarks.close(); head.close(); gaze.close(); phone.close(); }
        queue.clear();
    }

    static final class Rule {
        private final long triggerMs, clearMs;
        private long activeSince, clearSince, lastFired = -1;
        private boolean active;
        Rule(long triggerMs, long clearMs) { this.triggerMs = triggerMs; this.clearMs = clearMs; }
        boolean update(boolean condition, long now) {
            if (condition) {
                clearSince = 0;
                if (activeSince == 0) activeSince = now;
                if (now - activeSince >= triggerMs
                        && (lastFired < 0 || now - lastFired >= 10_000)) {
                    active = true; lastFired = now; return true;
                }
            } else {
                activeSince = 0;
                if (clearSince == 0) clearSince = now;
                if (now - clearSince >= clearMs) active = false;
            }
            return false;
        }
    }
}
