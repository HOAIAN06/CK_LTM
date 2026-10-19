package com.nihongoquest.common.protocol;

import org.junit.jupiter.api.Test;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PayloadsTest {

    @Test
    void questionPayloadPreservesPipeAndNewlineInContent() {
        String payload = Payloads.question(0, 1, 30, 3_000_000_000L,
                "どれ | chọn đáp án?\n", List.of(new Payloads.ChoiceData(30_000_000_001L, "A | một", 1)));

        Payloads.QuestionData question = Payloads.parseQuestion(payload);

        assertEquals("どれ | chọn đáp án?\n", question.content());
        assertEquals("A | một", question.choices().getFirst().content());
        assertEquals(3_000_000_000L, question.questionId());
        assertEquals(30_000_000_001L, question.choices().getFirst().choiceId());
    }

    @Test
    void questionPayloadContainsOnlyPublicFields() throws Exception {
        var node = new ObjectMapper().readTree(Payloads.question(0, 3, 30, 1,
                "Q", List.of(new Payloads.ChoiceData(11, "A", 1))));
        assertEquals(6, node.size());
        assertEquals(3, node.get("choices").get(0).size());
        for (String secret : List.of("correct", "is_correct", "correctAnswer", "correctChoiceId", "explanation")) {
            assertFalse(node.findValues(secret).iterator().hasNext());
        }
    }

    @Test
    void answersCarryDatabaseIdsAndRejectMalformedIdentifiers() {
        assertEquals(new Payloads.AnswerData(3_000_000_000L, 30_000_000_001L),
                Payloads.parseAnswer(Payloads.answer(3_000_000_000L, 30_000_000_001L)));
        for (String malformed : List.of("0", "null", "{}", "{\"questionId\":1,\"choiceId\":-1}",
                "{\"questionId\":1,\"choiceId\":1.5}", "{\"questionId\":1,\"choiceId\":\"11\"}")) {
            assertThrows(IllegalArgumentException.class, () -> Payloads.parseAnswer(malformed));
        }
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
