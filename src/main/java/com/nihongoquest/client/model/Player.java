package com.nihongoquest.client.model;

/**
 * Player là model đại diện một người chơi phía Client.
 * Chỉ lưu dữ liệu hiển thị; không chứa business logic trận đấu.
 */
public class Player {

    private String username;
    private int score;

    public Player() {
    }

    public Player(String username, int score) {
        this.username = username;
        this.score = score;
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
}
