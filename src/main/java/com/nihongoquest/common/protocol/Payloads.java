package com.nihongoquest.common.protocol;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.List;

/** JSON payload builders/parsers shared by both TCP endpoints. */
public final class Payloads {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private Payloads() {
    }

    public static JsonNode credentials(String username, String password) {
        ObjectNode node = MAPPER.createObjectNode();
        node.put("username", username);
        node.put("password", password);
        return write(node);
    }

    public static Credentials parseCredentials(JsonNode payload) {
        JsonNode node = requireObject(payload);
        return new Credentials(requiredText(node, "username"), requiredText(node, "password"));
    }

    public static JsonNode player(long id, String username, int wins, int losses,
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

    public static PlayerStats parsePlayer(JsonNode payload) {
        JsonNode node = requireObject(payload);
        return new PlayerStats(node.get("id").asLong(), requiredText(node, "username"),
                node.get("wins").asInt(), node.get("losses").asInt(),
                node.get("questionsAnswered").asInt(), node.get("correctAnswers").asInt());
    }

    public static JsonNode findMatch(int durationSeconds) {
        return write(new FindMatchRequest(durationSeconds));
    }

    public static FindMatchRequest parseFindMatch(JsonNode payload) {
        return fromJson(payload, FindMatchRequest.class);
    }

    public static JsonNode matchFound(String roomId, String opponent, int durationSeconds) {
        ObjectNode node = MAPPER.createObjectNode();
        node.put("roomId", roomId);
        node.put("opponent", opponent);
        node.put("durationSeconds", durationSeconds);
        return write(node);
    }

    public static MatchFound parseMatchFound(JsonNode payload) {
        JsonNode node = requireObject(payload);
        return new MatchFound(requiredText(node, "roomId"), requiredText(node, "opponent"),
                node.get("durationSeconds").asInt());
    }

    public static JsonNode question(String sessionId, int attempt, int questionDurationSeconds,
                                    int matchRemainingSeconds, long questionId,
                                    String content, List<ChoiceData> choices) {
        ObjectNode node = MAPPER.createObjectNode();
        node.put("sessionId", sessionId);
        node.put("attempt", attempt);
        node.put("questionDurationSeconds", questionDurationSeconds);
        node.put("matchRemainingSeconds", matchRemainingSeconds);
        node.put("questionId", questionId);
        node.put("content", content);
        // Explicit public DTO: no server model or answer key can be serialized here.
        node.set("choices", MAPPER.valueToTree(choices));
        return write(node);
    }

    public static QuestionData parseQuestion(JsonNode payload) {
        JsonNode node = requireObject(payload);
        return new QuestionData(requiredText(node, "sessionId"), requiredPositiveInt(node, "attempt"),
                requiredPositiveId(node, "questionId"), requiredText(node, "content"),
                MAPPER.convertValue(node.get("choices"), MAPPER.getTypeFactory()
                        .constructCollectionType(List.class, ChoiceData.class)),
                requiredPositiveInt(node, "questionDurationSeconds"),
                requiredPositiveInt(node, "matchRemainingSeconds"));
    }

    public static JsonNode answer(String sessionId, int attempt, long questionId, long choiceId) {
        if (sessionId == null || sessionId.isBlank() || attempt <= 0
                || questionId <= 0 || choiceId <= 0) {
            throw new IllegalArgumentException("Question and choice IDs must be positive");
        }
        ObjectNode node = MAPPER.createObjectNode();
        node.put("sessionId", sessionId);
        node.put("attempt", attempt);
        node.put("questionId", questionId);
        node.put("choiceId", choiceId);
        return write(node);
    }

    public static AnswerData parseAnswer(JsonNode payload) {
        JsonNode node = requireObject(payload);
        return new AnswerData(requiredText(node, "sessionId"), requiredPositiveInt(node, "attempt"),
                requiredPositiveId(node, "questionId"), requiredPositiveId(node, "choiceId"));
    }

    private static long requiredPositiveId(JsonNode node, String field) {
        JsonNode value = node == null ? null : node.get(field);
        if (value == null || !value.isIntegralNumber() || !value.canConvertToLong() || value.longValue() <= 0) {
            throw new IllegalArgumentException("Payload có ID không hợp lệ: " + field);
        }
        return value.longValue();
    }

    public static JsonNode answerResult(String sessionId, int attempt, long questionId,
                                        boolean correct, Long chosenChoiceId,
                                        long correctChoiceId, int scoreAwarded) {
        ObjectNode node = MAPPER.createObjectNode();
        node.put("sessionId", sessionId);
        node.put("attempt", attempt);
        node.put("questionId", questionId);
        node.put("correct", correct);
        if (chosenChoiceId == null) node.putNull("chosenChoiceId");
        else node.put("chosenChoiceId", chosenChoiceId);
        node.put("correctChoiceId", correctChoiceId);
        node.put("scoreAwarded", scoreAwarded);
        return write(node);
    }

    private static int requiredPositiveInt(JsonNode node, String field) {
        JsonNode value = node == null ? null : node.get(field);
        if (value == null || !value.isIntegralNumber() || !value.canConvertToInt()
                || value.intValue() <= 0) {
            throw new IllegalArgumentException("Payload có số không hợp lệ: " + field);
        }
        return value.intValue();
    }

    public static AnswerResult parseAnswerResult(JsonNode payload) {
        JsonNode node = requireObject(payload);
        JsonNode chosen = node.get("chosenChoiceId");
        return new AnswerResult(requiredText(node, "sessionId"), node.get("attempt").asInt(),
                requiredPositiveId(node, "questionId"), node.get("correct").asBoolean(),
                chosen == null || chosen.isNull() ? null : chosen.asLong(),
                requiredPositiveId(node, "correctChoiceId"), node.get("scoreAwarded").asInt());
    }

    public static JsonNode scores(int mine, int opponent) {
        ObjectNode node = MAPPER.createObjectNode();
        node.put("myScore", mine);
        node.put("opponentScore", opponent);
        return write(node);
    }

    public static Scores parseScores(JsonNode payload) {
        JsonNode node = requireObject(payload);
        return new Scores(node.get("myScore").asInt(), node.get("opponentScore").asInt());
    }

    public static JsonNode gameOver(String result, int mine, int opponent) {
        ObjectNode node = MAPPER.createObjectNode();
        node.put("result", result);
        node.put("myScore", mine);
        node.put("opponentScore", opponent);
        return write(node);
    }

    public static GameOver parseGameOver(JsonNode payload) {
        JsonNode node = requireObject(payload);
        return new GameOver(requiredText(node, "result"), node.get("myScore").asInt(),
                node.get("opponentScore").asInt());
    }

    /** Chuyển một record DTO thành JSON object để gửi qua TCP. */
    public static JsonNode toJson(Object value) {
        if (value == null) {
            throw new IllegalArgumentException("Payload không được null");
        }
        return write(value);
    }

    /** Đọc JSON object thành record DTO dùng chung giữa client và server. */
    public static <T> T fromJson(JsonNode payload, Class<T> type) {
        requireObject(payload);
        try {
            return MAPPER.treeToValue(payload, type);
        } catch (Exception e) {
            throw new IllegalArgumentException("Payload không đúng định dạng " + type.getSimpleName(), e);
        }
    }

    private static String requiredText(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || !value.isTextual()) {
            throw new IllegalArgumentException("Payload thiếu trường " + field);
        }
        return value.textValue();
    }

    private static JsonNode requireObject(JsonNode payload) {
        if (payload == null || !payload.isObject()) {
            throw new IllegalArgumentException("Payload phải là JSON object");
        }
        return payload;
    }

    private static JsonNode write(Object value) {
        return MAPPER.valueToTree(value);
    }

    public record Credentials(String username, String password) { }
    public record PlayerStats(long id, String username, int wins, int losses,
                              int questionsAnswered, int correctAnswers) { }
    public record FindMatchRequest(int durationSeconds) { }
    public record MatchFound(String roomId, String opponent, int durationSeconds) { }
    public record ChoiceData(long choiceId, String content, int position) { }
    public record QuestionData(String sessionId, int attempt, long questionId,
                               String content, List<ChoiceData> choices,
                               int questionDurationSeconds, int matchRemainingSeconds) { }
    public record AnswerData(String sessionId, int attempt, long questionId, long choiceId) { }
    public record AnswerResult(String sessionId, int attempt, long questionId, boolean correct,
                               Long chosenChoiceId, long correctChoiceId, int scoreAwarded) { }
    public record Scores(int myScore, int opponentScore) { }
    public record GameOver(String result, int myScore, int opponentScore) { }
    public record QuizSetListRequest(String scope) { }
    public record QuizSetId(long quizSetId) { }
    public record QuizSetPublishRequest(long quizSetId, boolean published) { }
    public record QuizSetSaved(long quizSetId) { }
    public record QuizSetSummary(long id, long ownerId, String ownerUsername,
                                 String title, String description, String level,
                                 boolean published, int questionCount, boolean ownedByMe) { }
    public record QuizChoiceEdit(Long id, String content, int position, boolean correct) { }
    public record QuizQuestionEdit(Long id, String content, String explanation,
                                   List<QuizChoiceEdit> choices) { }
    public record QuizSetEdit(Long id, String title, String description, String level,
                              List<QuizQuestionEdit> questions) { }
    public record QuizSetListData(List<QuizSetSummary> items) { }
}
