package com.nihongoquest.client.model;

/**
 * Player là model đại diện một người chơi phía Client.
 * Chỉ lưu dữ liệu hiển thị; không chứa business logic trận đấu.
 */
public class Player {

    private long id;
    private String username;
    private int score;
    private int wins;
    private int losses;
    private int questionsAnswered;
    private int correctAnswers;

    public Player() {
    }

    public Player(String username, int score) {
        this.username = username;
        this.score = score;
    }

    public Player(long id, String username, int wins, int losses,
                  int questionsAnswered, int correctAnswers) {
        this.id = id;
        this.username = username;
        this.wins = wins;
        this.losses = losses;
        this.questionsAnswered = questionsAnswered;
        this.correctAnswers = correctAnswers;
    }

    public long getId() {
        return id;
    }

    public void setId(long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public int getWins() {
        return wins;
    }

    public int getLosses() {
        return losses;
    }

    public int getQuestionsAnswered() {
        return questionsAnswered;
    }

    public int getCorrectAnswers() {
        return correctAnswers;
    }
}
