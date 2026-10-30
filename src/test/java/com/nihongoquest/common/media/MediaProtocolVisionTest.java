package com.nihongoquest.common.media;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MediaProtocolVisionTest {
    @Test
    void relayedFrameCarriesNormalizedFaceAndGazeMetadata() throws Exception {
        VisionMetadata vision = new VisionMetadata(17, 1234,
                List.of(new VisionMetadata.FaceBox(.1, .2, .3, .4, .2, .3, .35, .3)),
                -.6, .25, VisionMetadata.Attention.LOOKING_AWAY, .91);
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (DataOutputStream output = new DataOutputStream(bytes)) {
            MediaProtocol.writeRelayedFrame(output, new MediaProtocol.RelayedFrame(
                    42, 17, 1300, new byte[]{1, 2, 3}, vision));
        }
        MediaProtocol.RelayedFrame read = MediaProtocol.readRelayedFrame(new DataInputStream(
                new ByteArrayInputStream(bytes.toByteArray())));
        assertEquals(42, read.userId());
        assertEquals(VisionMetadata.Attention.LOOKING_AWAY, read.vision().attention());
        assertEquals(1, read.vision().faces().size());
        assertEquals(-.6, read.vision().gazeX(), .0001);
    }
}
