package com.nihongoquest.common;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PayloadsTest {

    @Test
    void questionPayloadPreservesPipeAndNewlineInContent() {
        String payload = Payloads.question(0, 1, 30,
                "どれ | chọn đáp án?\n", List.of("A | một", "B", "C", "D"));

        Payloads.QuestionData question = Payloads.parseQuestion(payload);

        assertEquals("どれ | chọn đáp án?\n", question.questionText());
        assertEquals("A | một", question.answers().getFirst());
    }

    @Test
    void credentialsAndGameResultsRoundTrip() {
        Payloads.Credentials credentials = Payloads.parseCredentials(
                Payloads.credentials("player_1", "mật-khẩu"));
        Payloads.AnswerResult answer = Payloads.parseAnswerResult(
                Payloads.answerResult(true, 2, 2));
        Payloads.GameOver game = Payloads.parseGameOver(
                Payloads.gameOver("WIN", 3, 1));

        assertEquals("player_1", credentials.username());
        assertEquals("mật-khẩu", credentials.password());
        assertTrue(answer.correct());
        assertEquals(2, answer.correctIndex());
        assertEquals("WIN", game.result());
        assertEquals(3, game.myScore());
    }
}
