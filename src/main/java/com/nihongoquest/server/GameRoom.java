package com.nihongoquest.server;

/**
 * GameRoom đại diện một trận đấu 1v1 trên Server.
 * Quản lý Player 1, Player 2, câu hỏi, điểm, vòng hiện tại và kết quả trận.
 *
 * Server là bên quyết định câu hỏi, đáp án đúng, điểm và người thắng.
 * Client chỉ nhận dữ liệu và hiển thị.
 */
public class GameRoom {

    private ClientHandler player1;
    private ClientHandler player2;
    private int player1Score;
    private int player2Score;
    private int currentRound;
    private boolean finished;

    public GameRoom(ClientHandler player1, ClientHandler player2) {
        this.player1 = player1;
        this.player2 = player2;
        this.player1Score = 0;
        this.player2Score = 0;
        this.currentRound = 0;
        this.finished = false;
    }

    /**
     * Bắt đầu trận đấu.
     * TODO: Lấy câu hỏi từ QuestionManager và gửi QUESTION tới cả hai Client.
     */
    public void start() {
        System.out.println("TODO: Bắt đầu GameRoom");
    }

    /**
     * Xử lý đáp án từ một Client.
     * TODO: So sánh với đáp án đúng, cập nhật điểm, gửi ANSWER_RESULT / SCORE_UPDATE.
     */
    public void handleAnswer(ClientHandler from, int answerIndex) {
        System.out.println("TODO: Xử lý đáp án từ Client, index = " + answerIndex);
        // Client không tự tính kết quả — logic nằm ở đây (Server).
    }

    /**
     * Kết thúc trận và gửi GAME_OVER.
     * TODO: Xác định winner, gửi kết quả về cả hai Client.
     */
    public void endGame() {
        finished = true;
        System.out.println("TODO: GAME_OVER");
    }

    public ClientHandler getPlayer1() {
        return player1;
    }

    public ClientHandler getPlayer2() {
        return player2;
    }

    public int getPlayer1Score() {
        return player1Score;
    }

    public int getPlayer2Score() {
        return player2Score;
    }

    public int getCurrentRound() {
        return currentRound;
    }

    public boolean isFinished() {
        return finished;
    }
}
