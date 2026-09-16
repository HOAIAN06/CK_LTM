package com.nihongoquest.client.network;

import com.nihongoquest.common.Message;
import com.nihongoquest.common.Protocol;

/**
 * GameClient quản lý kết nối TCP phía Client tới Game Server.
 * Controller không được tự tạo Socket; mọi thao tác mạng phải đi qua class này.
 *
 * Luồng dự kiến:
 * Client → TCP Socket → Server
 */
public class GameClient {

    // Socket đại diện cho một kết nối TCP giữa Client và Server.
    // private Socket socket;
    // private BufferedReader reader;
    // private PrintWriter writer;

    private ServerListener serverListener;
    private boolean connected;

    /**
     * Kết nối tới Server theo host và port.
     * TODO: Triển khai tạo Socket, InputStream, OutputStream.
     */
    public void connect(String host, int port) {
        // TODO: socket = new Socket(host, port);
        // TODO: khởi tạo reader/writer với encoding Protocol.ENCODING
        // TODO: khởi động ServerListener trên thread riêng
        this.connected = false;
        System.out.println("TODO: connect tới " + host + ":" + port
                + " (default port = " + Protocol.DEFAULT_PORT + ")");
    }

    /**
     * Ngắt kết nối với Server.
     * TODO: Đóng Socket và dừng ServerListener.
     */
    public void disconnect() {
        // TODO: đóng stream và socket an toàn
        this.connected = false;
        System.out.println("TODO: disconnect");
    }

    /**
     * Gửi một Message tới Server.
     * TODO: Serialize Message và ghi xuống OutputStream.
     */
    public void sendMessage(Message message) {
        // TODO: gửi message qua Socket
        System.out.println("TODO: sendMessage " + (message != null ? message.getType() : "null"));
    }

    public boolean isConnected() {
        return connected;
    }

    public ServerListener getServerListener() {
        return serverListener;
    }

    public void setServerListener(ServerListener serverListener) {
        this.serverListener = serverListener;
    }
}
