package com.nihongoquest.client.profile;

/** Hồ sơ chỉ đọc mà client nhận từ server sau khi đăng nhập. */
public record Player(long id, String username, int wins, int losses,
                     int questionsAnswered, int correctAnswers) {

    public String getUsername() {
        return username;
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
