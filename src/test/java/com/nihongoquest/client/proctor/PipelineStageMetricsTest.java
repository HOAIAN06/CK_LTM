package com.nihongoquest.client.proctor;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PipelineStageMetricsTest {
    @Test
    void snapshotReportsCompletedDroppedLatencyAndBytesThenResets() {
        PipelineStageMetrics metrics = new PipelineStageMetrics("test");
        metrics.offered();
        metrics.offered();
        metrics.dropped();
        metrics.completed(2_000_000, 1_000);

        PipelineStageMetrics.Snapshot first = metrics.snapshotAndReset();
        assertEquals(2, first.offered());
        assertEquals(1, first.completed());
        assertEquals(1, first.dropped());
        assertEquals(1_000, first.bytes());
        assertEquals(2, first.averageMillis(), .01);
        assertTrue(first.fps() > 0);

        PipelineStageMetrics.Snapshot second = metrics.snapshotAndReset();
        assertEquals(0, second.offered());
        assertEquals(0, second.completed());
        assertEquals(0, second.dropped());
    }
}
