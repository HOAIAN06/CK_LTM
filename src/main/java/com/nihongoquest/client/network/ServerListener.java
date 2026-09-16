package com.nihongoquest.client.network;

/**
 * ServerListener chạy trên thread riêng để nhận message từ Server.
 * Không được chạy vòng lặp nhận dữ liệu trên JavaFX Application Thread
 * vì read() có thể block giao diện.
 *
 * Sau khi nhận dữ liệu, class này sẽ chuyển cho GameClient / Controller xử lý.
 */
public class ServerListener implements Runnable {

    private final GameClient gameClient;
    private volatile boolean running;

    public ServerListener(GameClient gameClient) {
        this.gameClient = gameClient;
        this.running = false;
    }

    @Override
    public void run() {
        running = true;
        // TODO: vòng lặp đọc dữ liệu từ InputStream của Socket
        // TODO: parse thành Message rồi chuyển cho GameClient xử lý
        // TODO: cập nhật UI phải dùng Platform.runLater(...)
        System.out.println("TODO: ServerListener đang chờ message từ Server");
        while (running) {
            // Placeholder: tránh busy-loop khi chưa có Socket thật.
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                running = false;
            }
        }
    }

    /**
     * Dừng vòng lặp lắng nghe.
     */
    public void stop() {
        running = false;
    }

    public boolean isRunning() {
        return running;
    }

    public GameClient getGameClient() {
        return gameClient;
    }
}
