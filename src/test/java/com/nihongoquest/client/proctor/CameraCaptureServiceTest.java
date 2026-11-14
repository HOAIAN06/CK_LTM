package com.nihongoquest.client.proctor;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CameraCaptureServiceTest {
    @Test
    void defaultProfileIsCompatibleWithLanDemoAndCommonWindowsWebcams() {
        assertEquals(640, CameraCaptureService.WIDTH);
        assertEquals(480, CameraCaptureService.HEIGHT);
        assertTrue(CameraCaptureService.TARGET_FPS <= 15);
        assertEquals("MJPG", CameraCaptureService.WINDOWS_CAPTURE_FORMAT);
    }
}
