package com.nihongoquest.client.network;

import com.nihongoquest.common.Message;
import com.nihongoquest.common.MessageType;
import com.nihongoquest.common.Protocol;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.Socket;
import java.nio.charset.Charset;
import java.util.function.Consumer;

/**
 * GameClient quản lý kết nối TCP phía Client tới Game Server.
 * Controller không được tự tạo Socket; mọi thao tác mạng phải đi qua class này.
 *
 * Luồng dự kiến:
 * Client → TCP Socket → Server
 */
public class GameClient {

    private Socket socket;
    private BufferedReader reader;
    private PrintWriter writer;
    private ServerListener serverListener;
    private Thread listenerThread;
    private volatile boolean connected;
    private Consumer<Message> messageHandler = message -> { };
    private Consumer<String> connectionErrorHandler = error -> { };

    /**
     * Kết nối tới Server theo host và port.
     * TODO: Triển khai tạo Socket, InputStream, OutputStream.
     */
    public synchronized void connect(String host, int port) throws IOException {
        if (connected) {
            return;
        }
        Charset charset = Charset.forName(Protocol.ENCODING);
        socket = new Socket(host, port);
        reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), charset));
        writer = new PrintWriter(new OutputStreamWriter(socket.getOutputStream(), charset), true);
        connected = true;
        serverListener = new ServerListener(this);
        listenerThread = new Thread(serverListener, "server-listener");
        listenerThread.setDaemon(true);
        listenerThread.start();
    }

    /**
     * Ngắt kết nối với Server.
     * TODO: Đóng Socket và dừng ServerListener.
     */
    public synchronized void disconnect() {
        if (connected && writer != null) {
            writer.println(new Message(MessageType.DISCONNECT, "").toWire());
        }
        this.connected = false;
        if (serverListener != null) {
            serverListener.stop();
        }
        try {
            if (socket != null) {
                socket.close();
            }
        } catch (IOException ignored) {
            // Socket đã đóng.
        }
    }

    /**
     * Gửi một Message tới Server.
     * TODO: Serialize Message và ghi xuống OutputStream.
     */
    public synchronized void sendMessage(Message message) {
        if (!connected || writer == null) {
            throw new IllegalStateException("Chưa kết nối tới server");
        }
        writer.println(message.toWire());
        if (writer.checkError()) {
            throw new IllegalStateException("Không thể gửi message tới server");
        }
    }

    public void register(String username, String password) {
        sendMessage(new Message(MessageType.REGISTER, username + "|" + password));
    }

    public void login(String username, String password) {
        sendMessage(new Message(MessageType.LOGIN, username + "|" + password));
    }

    public void findMatch() {
        sendMessage(new Message(MessageType.FIND_MATCH, ""));
    }

    public void cancelMatch() {
        sendMessage(new Message(MessageType.CANCEL_MATCH, ""));
    }

    public void sendAnswer(int answerIndex) {
        if (answerIndex < 0 || answerIndex > 3) {
            throw new IllegalArgumentException("Chỉ số đáp án phải từ 0 đến 3");
        }
        sendMessage(new Message(MessageType.ANSWER, Integer.toString(answerIndex)));
    }

    /**
     * Chuyển tiếp message tới handler hiện tại sau khi một scene vừa thay đổi.
     */
    public void redispatch(Message message) {
        messageHandler.accept(message);
    }

    Message readMessage() throws IOException {
        String line = reader.readLine();
        return line == null ? null : Message.fromWire(line);
    }

    void receive(Message message) {
        messageHandler.accept(message);
    }

    void connectionLost(String error) {
        connected = false;
        connectionErrorHandler.accept(error);
    }

    public void setMessageHandler(Consumer<Message> messageHandler) {
        this.messageHandler = messageHandler != null ? messageHandler : message -> { };
    }

    public void setConnectionErrorHandler(Consumer<String> handler) {
        this.connectionErrorHandler = handler != null ? handler : error -> { };
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
