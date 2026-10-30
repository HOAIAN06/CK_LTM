package com.nihongoquest.client.proctor;

import com.nihongoquest.common.media.MediaProtocol;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class EvidenceRecorderTest {
    @TempDir Path directory;

    @Test void evictsFramesOlderThanFifteenSeconds() throws Exception {
        try (EvidenceRecorder recorder = new EvidenceRecorder("123456", directory, error -> fail(error))) {
            recorder.addFrame(new MediaProtocol.RelayedFrame(2, 1, 1_000, new byte[]{1}));
            recorder.addFrame(new MediaProtocol.RelayedFrame(2, 2, 17_000, new byte[]{2}));
            assertEquals(1, recorder.bufferedFrameCount(2));
        }
    }

    @Test void sanitizesWindowsPathCharactersAndKeepsUnicode() {
        String safe = EvidenceRecorder.sanitize("Nguyễn../\\:*?<>|\"/Văn");
        assertTrue(safe.contains("Nguyễn"));
        assertFalse(safe.contains(".."));
        assertFalse(safe.matches(".*[<>:\"/\\\\|?*].*"));
    }

    @Test void enforcesEightMiBPerPlayer() throws Exception {
        try (EvidenceRecorder recorder = new EvidenceRecorder("123456", directory, error -> fail(error))) {
            for (int i = 0; i < 140; i++) recorder.addFrame(
                    new MediaProtocol.RelayedFrame(2, i, 1_000 + i * 100,
                            new byte[65_536]));
            assertTrue(recorder.bufferedBytes(2) <= 8L * 1024 * 1024);
            assertEquals(128, recorder.bufferedFrameCount(2));
        }
    }
}
