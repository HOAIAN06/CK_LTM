package com.nihongoquest.client.network;

import com.nihongoquest.common.protocol.Message;
import com.nihongoquest.common.protocol.MessageType;
import com.nihongoquest.common.protocol.Protocol;
import com.fasterxml.jackson.databind.JsonNode;
import com.nihongoquest.common.protocol.Payloads;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.Charset;
import java.util.function.Consumer;

/** Quản lý duy nhất một kết nối TCP từ client tới server. */
public class GameClient {

    private Socket socket;
    private BufferedReader reader;
    private PrintWriter writer;
    private ServerListener listener;
    private volatile boolean connected;
    private Consumer<Message> messageHandler = message -> { };
    private Consumer<String> errorHandler = error -> { };

    public synchronized void connect(String host, int port) throws IOException {
        if (connected) {
            return;
        }
        Charset charset = Charset.forName(Protocol.ENCODING);
        Socket newSocket = new Socket();
        try {
            newSocket.connect(new InetSocketAddress(host, port), 5_000);
            reader = new BufferedReader(new InputStreamReader(newSocket.getInputStream(), charset));
            writer = new PrintWriter(new OutputStreamWriter(newSocket.getOutputStream(), charset), true);
            socket = newSocket;
        } catch (IOException e) {
            try {
                newSocket.close();
            } catch (IOException ignored) {
                // Giữ lại lỗi kết nối ban đầu.
            }
            throw e;
        }
        connected = true;

        listener = new ServerListener(this);
        Thread thread = new Thread(listener, "tcp-server-listener");
        thread.setDaemon(true);
        thread.start();
        send(MessageType.CONNECT, "");
    }

    public synchronized void disconnect() {
        try {
            if (connected) {
                send(MessageType.DISCONNECT, "");
            }
        } catch (IllegalStateException ignored) {
            // Kết nối đã lỗi; vẫn đóng socket cục bộ.
        } finally {
            closeSocket();
        }
    }

    public void findMatch(int durationSeconds) {
        send(MessageType.FIND_MATCH, Payloads.findMatch(durationSeconds));
    }

    public void register(String username, String password) {
        send(MessageType.REGISTER,
                com.nihongoquest.common.protocol.Payloads.credentials(username, password));
    }

    public void login(String username, String password) {
        send(MessageType.LOGIN,
                com.nihongoquest.common.protocol.Payloads.credentials(username, password));
    }

    public void cancelMatch() {
        send(MessageType.CANCEL_MATCH, "");
    }

    public void sendAnswer(String sessionId, int attempt, long questionId, long choiceId) {
        send(MessageType.ANSWER,
                Payloads.answer(sessionId, attempt, questionId, choiceId));
    }

    public void listQuizSets(String scope) {
        send(MessageType.QUIZ_SET_LIST,
                Payloads.toJson(new Payloads.QuizSetListRequest(scope)));
    }

    public void getQuizSet(long quizSetId) {
        send(MessageType.QUIZ_SET_GET,
                Payloads.toJson(new Payloads.QuizSetId(quizSetId)));
    }

    public void saveQuizSet(Payloads.QuizSetEdit quizSet) {
        send(MessageType.QUIZ_SET_SAVE, Payloads.toJson(quizSet));
    }

    public void publishQuizSet(long quizSetId, boolean published) {
        send(MessageType.QUIZ_SET_PUBLISH,
                Payloads.toJson(new Payloads.QuizSetPublishRequest(quizSetId, published)));
    }

    public void deleteQuizSet(long quizSetId) {
        send(MessageType.QUIZ_SET_DELETE,
                Payloads.toJson(new Payloads.QuizSetId(quizSetId)));
    }

    public void redispatch(Message message) {
        messageHandler.accept(message);
    }

    Message read() throws IOException {
        String line = reader.readLine();
        return line == null ? null : Message.fromWire(line);
    }

    void receive(Message message) {
        messageHandler.accept(message);
    }

    void connectionLost(String reason) {
        if (!connected) {
            return;
        }
        closeSocket();
        errorHandler.accept(reason);
    }

    private synchronized void send(MessageType type, JsonNode payload) {
        if (!connected || writer == null) {
            throw new IllegalStateException("Chưa kết nối tới server");
        }
        writer.println(new Message(type, payload).toWire());
        if (writer.checkError()) {
            throw new IllegalStateException("Không thể gửi dữ liệu tới server");
        }
    }

    private synchronized void send(MessageType type, String payload) {
        if (!connected || writer == null) {
            throw new IllegalStateException("Chưa kết nối tới server");
        }
        writer.println(new Message(type, payload).toWire());
        if (writer.checkError()) {
            throw new IllegalStateException("Không thể gửi dữ liệu tới server");
        }
    }

    private synchronized void closeSocket() {
        connected = false;
        if (listener != null) {
            listener.stop();
        }
        try {
            if (socket != null) {
                socket.close();
            }
        } catch (IOException ignored) {
            // Socket đã đóng.
        }
    }

    public void setMessageHandler(Consumer<Message> handler) {
        messageHandler = handler != null ? handler : message -> { };
    }

    public void setConnectionErrorHandler(Consumer<String> handler) {
        errorHandler = handler != null ? handler : error -> { };
    }

    public boolean isConnected() {
        return connected;
    }
}
