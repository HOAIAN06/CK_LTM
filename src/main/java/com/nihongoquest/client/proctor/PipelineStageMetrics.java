package com.nihongoquest.client.proctor;

import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.LongAdder;

/** Lightweight windowed metrics for one frame-processing stage. */
final class PipelineStageMetrics {
    private final String stage;
    private final LongAdder offered = new LongAdder();
    private final LongAdder completed = new LongAdder();
    private final LongAdder dropped = new LongAdder();
    private final LongAdder bytes = new LongAdder();
    private final LongAdder durationNanos = new LongAdder();
    private final AtomicLong maxDurationNanos = new AtomicLong();
    private final AtomicLong windowStartedNanos = new AtomicLong(System.nanoTime());

    PipelineStageMetrics(String stage) { this.stage = stage; }

    void offered() { offered.increment(); }
    void dropped() { dropped.increment(); }

    void completed(long elapsedNanos, long byteCount) {
        completed.increment();
        durationNanos.add(Math.max(0, elapsedNanos));
        bytes.add(Math.max(0, byteCount));
        maxDurationNanos.accumulateAndGet(Math.max(0, elapsedNanos), Math::max);
    }

    Snapshot snapshotAndReset() {
        long now = System.nanoTime();
        long started = windowStartedNanos.getAndSet(now);
        long offeredCount = offered.sumThenReset();
        long completedCount = completed.sumThenReset();
        long droppedCount = dropped.sumThenReset();
        long byteCount = bytes.sumThenReset();
        long elapsed = durationNanos.sumThenReset();
        long max = maxDurationNanos.getAndSet(0);
        double windowSeconds = Math.max(1, now - started) / 1_000_000_000d;
        return new Snapshot(stage, offeredCount, completedCount, droppedCount, byteCount,
                completedCount == 0 ? 0 : elapsed / 1_000_000d / completedCount,
                max / 1_000_000d, completedCount / windowSeconds,
                byteCount * 8d / 1_000_000d / windowSeconds);
    }

    record Snapshot(String stage, long offered, long completed, long dropped, long bytes,
                    double averageMillis, double maxMillis, double fps, double megabitsPerSecond) {
        boolean hasActivity() { return offered > 0 || completed > 0 || dropped > 0; }

        String logLine() {
            return String.format(java.util.Locale.ROOT,
                    "stage=%s offered=%d completed=%d dropped=%d fps=%.1f avgMs=%.2f maxMs=%.2f mbps=%.2f",
                    stage, offered, completed, dropped, fps, averageMillis, maxMillis,
                    megabitsPerSecond);
        }
    }
}
