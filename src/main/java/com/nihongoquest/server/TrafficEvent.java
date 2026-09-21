package com.nihongoquest.server;

import java.time.Instant;

/** Một JSON frame được trao đổi giữa server và client. */
public record TrafficEvent(
        Instant timestamp,
        Direction direction,
        String client,
        String json) {

    public enum Direction {
        RECEIVED,
        SENT
    }
}
