package com.nihongoquest.client.profile;

import javafx.scene.control.Label;

import java.util.Locale;

/** Điền dữ liệu người chơi vào thẻ hồ sơ nhỏ dùng chung trên các màn hình client. */
public final class ProfilePresenter {

    private ProfilePresenter() {
    }

    public static void populate(Player player, Label avatar, Label username, Label summary) {
        avatar.setText(player.getUsername().substring(0, 1).toUpperCase(Locale.ROOT));
        username.setText(player.getUsername());
        summary.setText(player.getWins() + " thắng  •  " + player.getLosses() + " thua  •  "
                + accuracy(player) + "% đúng");
    }

    static int accuracy(Player player) {
        if (player.getQuestionsAnswered() == 0) {
            return 0;
        }
        return (int) Math.round(player.getCorrectAnswers() * 100.0
                / player.getQuestionsAnswered());
    }
}
