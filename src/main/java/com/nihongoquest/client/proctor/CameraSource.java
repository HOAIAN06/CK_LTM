package com.nihongoquest.client.proctor;

import java.util.function.Consumer;

/** Nguồn frame có thể thay bằng fake trong kiểm thử lifecycle camera. */
interface CameraSource extends AutoCloseable {
    void start();
    @Override void close();
}

@FunctionalInterface
interface CameraSourceFactory {
    CameraSource create(Consumer<CapturedFrame> frames,
                        Consumer<CameraCaptureService.Failure> failures);
}
