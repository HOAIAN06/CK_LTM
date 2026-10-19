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
        var payload = Payloads.question("ranked-1", 4, 30, 155, 3_000_000_000L,
                "どれ | chọn đáp án?\n", List.of(new Payloads.ChoiceData(30_000_000_001L, "A | một", 1)));

        Payloads.QuestionData question = Payloads.parseQuestion(payload);

        assertEquals("どれ | chọn đáp án?\n", question.content());
        assertEquals("A | một", question.choices().getFirst().content());
        assertEquals(3_000_000_000L, question.questionId());
        assertEquals(30_000_000_001L, question.choices().getFirst().choiceId());
        assertEquals("ranked-1", question.sessionId());
        assertEquals(4, question.attempt());
        assertEquals(155, question.matchRemainingSeconds());
    }

    @Test
    void questionPayloadContainsOnlyPublicFields() throws Exception {
        var node = Payloads.question("room", 1, 30, 180, 1,
                "Q", List.of(new Payloads.ChoiceData(11, "A", 1)));
        assertEquals(7, node.size());
        assertEquals(3, node.get("choices").get(0).size());
        for (String secret : List.of("correct", "is_correct", "correctAnswer", "correctChoiceId", "explanation")) {
            assertFalse(node.findValues(secret).iterator().hasNext());
        }
    }

    @Test
    void answersCarryDatabaseIdsAndRejectMalformedIdentifiers() {
        assertEquals(new Payloads.AnswerData("room", 2,
                        3_000_000_000L, 30_000_000_001L),
                Payloads.parseAnswer(Payloads.answer("room", 2,
                        3_000_000_000L, 30_000_000_001L)));
        ObjectMapper mapper = new ObjectMapper();
        for (String malformed : List.of("0", "null", "{}", "{\"questionId\":1,\"choiceId\":-1}",
                "{\"sessionId\":\"room\",\"attempt\":0,\"questionId\":1,\"choiceId\":11}",
                "{\"questionId\":1,\"choiceId\":1.5}", "{\"questionId\":1,\"choiceId\":\"11\"}")) {
            assertThrows(RuntimeException.class, () -> Payloads.parseAnswer(mapper.readTree(malformed)));
        }
    }

    @Test
    void credentialsAndGameResultsRoundTrip() {
        Payloads.Credentials credentials = Payloads.parseCredentials(
                Payloads.credentials("player_1", "mật-khẩu"));
        Payloads.AnswerResult answer = Payloads.parseAnswerResult(
                Payloads.answerResult("room", 1, 10, true, 12L, 12, 1));
        Payloads.GameOver game = Payloads.parseGameOver(
                Payloads.gameOver("WIN", 3, 1));

        assertEquals("player_1", credentials.username());
        assertEquals("mật-khẩu", credentials.password());
        assertTrue(answer.correct());
        assertEquals(12, answer.correctChoiceId());
        assertEquals("WIN", game.result());
        assertEquals(3, game.myScore());
    }

    @Test
    void quizSetRecordsRoundTripAsNestedJsonObjects() {
        Payloads.QuizSetEdit input = new Payloads.QuizSetEdit(
                12L, "Kanji N5", "Bộ đề demo", "N5",
                List.of(new Payloads.QuizQuestionEdit(21L, "山 là gì?", "Núi",
                        List.of(
                                new Payloads.QuizChoiceEdit(1L, "Núi", 1, true),
                                new Payloads.QuizChoiceEdit(2L, "Sông", 2, false),
                                new Payloads.QuizChoiceEdit(3L, "Biển", 3, false),
                                new Payloads.QuizChoiceEdit(4L, "Trời", 4, false)))));

        var json = Payloads.toJson(input);
        Payloads.QuizSetEdit output = Payloads.fromJson(json, Payloads.QuizSetEdit.class);

        assertTrue(json.isObject());
        assertTrue(json.get("questions").isArray());
        assertEquals(input, output);
    }

    @Test
    void quizRoomQuestionHidesAnswerAndLeaderboardRoundTrips() {
        Payloads.QuizQuestionData question = new Payloads.QuizQuestionData(
                "123456", "123456", 2, 10, "山 là gì?",
                List.of(new Payloads.ChoiceData(101, "Núi", 1)), 30, 120);
        var questionJson = Payloads.toJson(question);
        assertTrue(questionJson.findValues("correct").isEmpty());
        assertTrue(questionJson.findValues("correctChoiceId").isEmpty());
        assertEquals(question, Payloads.fromJson(questionJson, Payloads.QuizQuestionData.class));

        Payloads.QuizLeaderboardData board = new Payloads.QuizLeaderboardData(
                "123456", false, List.of(
                new Payloads.QuizLeaderboardEntry(1, 1, "an", 900, 1, true),
                new Payloads.QuizLeaderboardEntry(1, 2, "dinh", 900, 1, false)));
        assertEquals(board, Payloads.fromJson(
                Payloads.toJson(board), Payloads.QuizLeaderboardData.class));
    }

    @Test
    void profileLeaderboardAndHistoryUseObjectPayloads() {
        Payloads.PlayerStats profile = Payloads.parsePlayer(
                Payloads.player(1, "sakura", 4, 2, 1, 350, 20, 12));
        assertEquals(1, profile.draws());
        assertEquals(350, profile.totalScore());

        Payloads.LeaderboardData leaderboard = new Payloads.LeaderboardData(List.of(
                new Payloads.LeaderboardEntry(1, 1, "sakura", 4, 2, 1, 350)));
        assertEquals(leaderboard, Payloads.fromJson(
                Payloads.toJson(leaderboard), Payloads.LeaderboardData.class));

        Payloads.MatchHistoryData history = new Payloads.MatchHistoryData(List.of(
                new Payloads.MatchHistoryEntry(10, "tanaka", 5, 3,
                        "WIN", 180, "NORMAL", "2026-10-19T05:00:00Z")));
        assertEquals(history, Payloads.fromJson(
                Payloads.toJson(history), Payloads.MatchHistoryData.class));
    }
}
