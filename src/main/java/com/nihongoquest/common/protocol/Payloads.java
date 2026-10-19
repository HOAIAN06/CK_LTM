package com.nihongoquest.common.protocol;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.List;

/** JSON payload builders/parsers shared by both TCP endpoints. */
public final class Payloads {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private Payloads() {
    }

    public static String credentials(String username, String password) {
        ObjectNode node = MAPPER.createObjectNode();
        node.put("username", username);
        node.put("password", password);
        return write(node);
    }

    public static Credentials parseCredentials(String payload) {
        JsonNode node = read(payload);
        return new Credentials(requiredText(node, "username"), requiredText(node, "password"));
    }

    public static String player(long id, String username, int wins, int losses,
                                int questionsAnswered, int correctAnswers) {
        ObjectNode node = MAPPER.createObjectNode();
        node.put("id", id);
        node.put("username", username);
        node.put("wins", wins);
        node.put("losses", losses);
        node.put("questionsAnswered", questionsAnswered);
        node.put("correctAnswers", correctAnswers);
        return write(node);
    }

    public static PlayerStats parsePlayer(String payload) {
        JsonNode node = read(payload);
        return new PlayerStats(node.get("id").asLong(), requiredText(node, "username"),
                node.get("wins").asInt(), node.get("losses").asInt(),
                node.get("questionsAnswered").asInt(), node.get("correctAnswers").asInt());
    }

    public static String matchFound(String roomId, String opponent) {
        ObjectNode node = MAPPER.createObjectNode();
        node.put("roomId", roomId);
        node.put("opponent", opponent);
        return write(node);
    }

    public static MatchFound parseMatchFound(String payload) {
        JsonNode node = read(payload);
        return new MatchFound(requiredText(node, "roomId"), requiredText(node, "opponent"));
    }

    public static String question(int round, int total, int duration, long questionId,
                                  String content, List<ChoiceData> choices) {
        ObjectNode node = MAPPER.createObjectNode();
        node.put("round", round);
        node.put("totalQuestions", total);
        node.put("durationSeconds", duration);
        node.put("questionId", questionId);
        node.put("content", content);
        // Explicit public DTO: no server model or answer key can be serialized here.
        node.set("choices", MAPPER.valueToTree(choices));
        return write(node);
    }

    public static QuestionData parseQuestion(String payload) {
        JsonNode node = read(payload);
        return new QuestionData(node.get("round").asInt(), node.get("totalQuestions").asInt(),
                node.get("durationSeconds").asInt(), requiredPositiveId(node, "questionId"),
                requiredText(node, "content"),
                MAPPER.convertValue(node.get("choices"), MAPPER.getTypeFactory()
                        .constructCollectionType(List.class, ChoiceData.class)));
    }

    public static String answer(long questionId, long choiceId) {
        if (questionId <= 0 || choiceId <= 0) {
            throw new IllegalArgumentException("Question and choice IDs must be positive");
        }
        ObjectNode node = MAPPER.createObjectNode();
        node.put("questionId", questionId);
        node.put("choiceId", choiceId);
        return write(node);
    }

    public static AnswerData parseAnswer(String payload) {
        JsonNode node = read(payload);
        return new AnswerData(requiredPositiveId(node, "questionId"), requiredPositiveId(node, "choiceId"));
    }

    private static long requiredPositiveId(JsonNode node, String field) {
        JsonNode value = node == null ? null : node.get(field);
        if (value == null || !value.isIntegralNumber() || !value.canConvertToLong() || value.longValue() <= 0) {
            throw new IllegalArgumentException("Payload có ID không hợp lệ: " + field);
        }
        return value.longValue();
    }

    public static String answerResult(boolean correct, int chosen, int answer) {
        ObjectNode node = MAPPER.createObjectNode();
        node.put("correct", correct);
        node.put("chosenIndex", chosen);
        node.put("correctIndex", answer);
        return write(node);
    }

    public static AnswerResult parseAnswerResult(String payload) {
        JsonNode node = read(payload);
        return new AnswerResult(node.get("correct").asBoolean(),
                node.get("chosenIndex").asInt(), node.get("correctIndex").asInt());
    }

    public static String scores(int mine, int opponent) {
        ObjectNode node = MAPPER.createObjectNode();
        node.put("myScore", mine);
        node.put("opponentScore", opponent);
        return write(node);
    }

    public static Scores parseScores(String payload) {
        JsonNode node = read(payload);
        return new Scores(node.get("myScore").asInt(), node.get("opponentScore").asInt());
    }

    public static String gameOver(String result, int mine, int opponent) {
        ObjectNode node = MAPPER.createObjectNode();
        node.put("result", result);
        node.put("myScore", mine);
        node.put("opponentScore", opponent);
        return write(node);
    }

    public static GameOver parseGameOver(String payload) {
        JsonNode node = read(payload);
        return new GameOver(requiredText(node, "result"), node.get("myScore").asInt(),
                node.get("opponentScore").asInt());
    }

    private static String requiredText(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || !value.isTextual()) {
            throw new IllegalArgumentException("Payload thiếu trường " + field);
        }
        return value.textValue();
    }

    private static JsonNode read(String payload) {
        try {
            return MAPPER.readTree(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Payload JSON không hợp lệ", e);
        }
    }

    private static String write(Object value) {
        try {
            return MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Không thể tạo payload JSON", e);
        }
    }

    public record Credentials(String username, String password) { }
    public record PlayerStats(long id, String username, int wins, int losses,
                              int questionsAnswered, int correctAnswers) { }
    public record MatchFound(String roomId, String opponent) { }
    public record ChoiceData(long choiceId, String content, int position) { }
    public record QuestionData(int round, int totalQuestions, int durationSeconds,
                               long questionId, String content, List<ChoiceData> choices) { }
    public record AnswerData(long questionId, long choiceId) { }
    public record AnswerResult(boolean correct, int chosenIndex, int correctIndex) { }
    public record Scores(int myScore, int opponentScore) { }
    public record GameOver(String result, int myScore, int opponentScore) { }
}
