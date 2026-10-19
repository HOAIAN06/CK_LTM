package com.nihongoquest.client.profile;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ProfilePresenterTest {

    @Test
    void calculatesRoundedAccuracy() {
        Player player = new Player(1, "sakura", 4, 2, 1, 120, 6, 4);

        assertEquals(67, ProfilePresenter.accuracy(player));
    }

    @Test
    void returnsZeroAccuracyBeforeAnyAnswer() {
        Player player = new Player(1, "sakura", 0, 0, 0, 0, 0, 0);

        assertEquals(0, ProfilePresenter.accuracy(player));
    }
}
