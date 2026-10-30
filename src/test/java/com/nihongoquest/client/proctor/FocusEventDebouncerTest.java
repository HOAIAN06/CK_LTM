package com.nihongoquest.client.proctor;

import com.nihongoquest.common.protocol.Payloads;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class FocusEventDebouncerTest {
    private static final long SECOND = 1_000_000_000L;

    @Test void ignoresShortLossAndWarnsOnReturnAfterOneSecond() {
        FocusEventDebouncer focus = new FocusEventDebouncer();
        focus.onFocusChanged(false, SECOND);
        assertNull(focus.onFocusChanged(true, SECOND + 900_000_000));
        focus.onFocusChanged(false, 2 * SECOND);
        var event = focus.onFocusChanged(true, 3 * SECOND);
        assertEquals(Payloads.ProctorSeverity.WARNING, event.severity());
        assertEquals(1_000, event.durationMillis());
    }

    @Test void emitsEvidenceAtThreeSecondsWithoutDuplicateOnReturn() {
        FocusEventDebouncer focus = new FocusEventDebouncer();
        focus.onFocusChanged(false, SECOND);
        assertNull(focus.onTick(SECOND + 2_999_000_000L));
        var event = focus.onTick(4 * SECOND);
        assertEquals(Payloads.ProctorSeverity.EVIDENCE, event.severity());
        assertEquals(3_000, event.durationMillis());
        assertNull(focus.onTick(5 * SECOND));
        assertNull(focus.onFocusChanged(true, 5 * SECOND));
    }

    @Test void repeatsSustainedLossAfterCooldown() {
        FocusEventDebouncer focus = new FocusEventDebouncer();
        focus.onFocusChanged(false, SECOND);
        assertNotNull(focus.onTick(4 * SECOND));
        assertNull(focus.onTick(13 * SECOND));
        assertNotNull(focus.onTick(14 * SECOND));
    }
}
