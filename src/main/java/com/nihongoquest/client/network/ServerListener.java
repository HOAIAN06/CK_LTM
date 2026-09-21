package com.nihongoquest.client.network;

import com.nihongoquest.common.Message;

import java.io.IOException;

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
        while (running) {
            try {
                Message message = gameClient.read();
                if (message == null) {
                    if (running) {
                        gameClient.connectionLost("Server đã đóng kết nối");
                    }
                    break;
                }
                gameClient.receive(message);
            } catch (IOException | IllegalArgumentException e) {
                if (running) {
                    gameClient.connectionLost("Mất kết nối: " + e.getMessage());
                }
                break;
            }
        }
        running = false;
    }

    public void stop() {
        running = false;
    }
}
