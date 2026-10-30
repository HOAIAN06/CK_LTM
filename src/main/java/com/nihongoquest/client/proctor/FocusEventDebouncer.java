package com.nihongoquest.client.proctor;

import com.nihongoquest.common.protocol.Payloads;

/** Monotonic focus timing, independent of wall-clock changes. */
public final class FocusEventDebouncer {
    private static final long ONE_SECOND = 1_000_000_000L;
    private static final long THREE_SECONDS = 3 * ONE_SECOND;
    private static final long COOLDOWN = 10 * ONE_SECOND;
    private long lostAt = -1;
    private long lastEvidenceAt = Long.MIN_VALUE;
    private boolean evidenceSent;

    public synchronized FocusEvent onFocusChanged(boolean focused, long nowNanos) {
        if (!focused) {
            if (lostAt < 0) lostAt = nowNanos;
            return null;
        }
        if (lostAt < 0) return null;
        long duration = Math.max(0, nowNanos - lostAt);
        lostAt = -1;
        boolean sent = evidenceSent;
        evidenceSent = false;
        if (sent || duration < ONE_SECOND) return null;
        return new FocusEvent(Payloads.ProctorSeverity.WARNING, millis(duration));
    }

    public synchronized FocusEvent onTick(long nowNanos) {
        if (lostAt < 0 || nowNanos - lostAt < THREE_SECONDS) return null;
        if (evidenceSent && nowNanos - lastEvidenceAt < COOLDOWN) return null;
        evidenceSent = true;
        lastEvidenceAt = nowNanos;
        return new FocusEvent(Payloads.ProctorSeverity.EVIDENCE,
                millis(nowNanos - lostAt));
    }

    public synchronized void reset() { lostAt = -1; evidenceSent = false; lastEvidenceAt = Long.MIN_VALUE; }

    private static int millis(long nanos) {
        return (int) Math.min(300_000, nanos / 1_000_000);
    }

    public record FocusEvent(Payloads.ProctorSeverity severity, int durationMillis) { }
}
