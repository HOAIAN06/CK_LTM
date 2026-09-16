package com.nihongoquest.client.model;

/**
 * GameState lưu trạng thái trận đấu phía Client để hiển thị lên UI.
 * Không xử lý business logic; chỉ giữ dữ liệu nhận từ Server.
 */
public class GameState {

    private Player opponent;
    private Question currentQuestion;
    private int myScore;
    private int opponentScore;

    public GameState() {
    }

    public Player getOpponent() {
        return opponent;
    }

    public void setOpponent(Player opponent) {
        this.opponent = opponent;
    }

    public Question getCurrentQuestion() {
        return currentQuestion;
    }

    public void setCurrentQuestion(Question currentQuestion) {
        this.currentQuestion = currentQuestion;
    }

    public int getMyScore() {
        return myScore;
    }

    public void setMyScore(int myScore) {
        this.myScore = myScore;
    }

    public int getOpponentScore() {
        return opponentScore;
    }

    public void setOpponentScore(int opponentScore) {
        this.opponentScore = opponentScore;
    }
}
