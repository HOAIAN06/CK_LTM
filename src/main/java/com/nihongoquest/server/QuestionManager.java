package com.nihongoquest.server;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * QuestionManager quản lý ngân hàng câu hỏi phía Server.
 * Đọc questions.json, lưu danh sách câu hỏi và cung cấp snapshot cho GameRoom.
 */
public class QuestionManager {

    private static final Pattern OBJECT_PATTERN =
            Pattern.compile("\\{(.*?)}", Pattern.DOTALL);
    private static final Pattern JSON_STRING_PATTERN =
            Pattern.compile("\"((?:\\\\.|[^\"\\\\])*)\"");

    private final List<Question> questions = new ArrayList<>();
    private int nextQuestionIndex;

    /**
     * Tải câu hỏi từ file resources/questions/questions.json.
     */
    public synchronized void loadQuestions() {
        try (InputStream input = QuestionManager.class.getResourceAsStream(
                "/questions/questions.json")) {
            if (input == null) {
                throw new IllegalStateException("Không tìm thấy questions.json");
            }
            String json = new String(input.readAllBytes(), StandardCharsets.UTF_8);
            List<Question> loaded = parseQuestions(json);
            if (loaded == null || loaded.isEmpty() || loaded.stream().anyMatch(q -> !q.isValid())) {
                throw new IllegalStateException("questions.json không có câu hỏi hợp lệ");
            }
            questions.clear();
            questions.addAll(loaded);
            nextQuestionIndex = 0;
            System.out.println("Đã tải " + questions.size() + " câu hỏi");
        } catch (IOException e) {
            throw new IllegalStateException("Không thể đọc questions.json", e);
        }
    }

    private List<Question> parseQuestions(String json) {
        List<Question> loaded = new ArrayList<>();
        Matcher objectMatcher = OBJECT_PATTERN.matcher(json);
        while (objectMatcher.find()) {
            String object = objectMatcher.group(1);
            int id = extractInt(object, "id");
            String text = extractString(object, "questionText");
            List<String> answers = extractAnswers(object);
            int correctAnswer = extractInt(object, "correctAnswer");
            loaded.add(new Question(id, text, answers, correctAnswer));
        }
        return loaded;
    }

    private int extractInt(String object, String field) {
        Matcher matcher = Pattern.compile(
                "\"" + Pattern.quote(field) + "\"\\s*:\\s*(-?\\d+)")
                .matcher(object);
        if (!matcher.find()) {
            throw new IllegalStateException("Thiếu trường " + field + " trong questions.json");
        }
        return Integer.parseInt(matcher.group(1));
    }

    private String extractString(String object, String field) {
        Matcher matcher = Pattern.compile(
                "\"" + Pattern.quote(field)
                        + "\"\\s*:\\s*\"((?:\\\\.|[^\"\\\\])*)\"")
                .matcher(object);
        if (!matcher.find()) {
            throw new IllegalStateException("Thiếu trường " + field + " trong questions.json");
        }
        return unescape(matcher.group(1));
    }

    private List<String> extractAnswers(String object) {
        Matcher arrayMatcher = Pattern.compile(
                "\"answers\"\\s*:\\s*\\[(.*?)]", Pattern.DOTALL)
                .matcher(object);
        if (!arrayMatcher.find()) {
            throw new IllegalStateException("Thiếu answers trong questions.json");
        }
        List<String> answers = new ArrayList<>();
        Matcher stringMatcher = JSON_STRING_PATTERN.matcher(arrayMatcher.group(1));
        while (stringMatcher.find()) {
            answers.add(unescape(stringMatcher.group(1)));
        }
        return answers;
    }

    private String unescape(String value) {
        StringBuilder result = new StringBuilder();
        for (int i = 0; i < value.length(); i++) {
            char current = value.charAt(i);
            if (current != '\\') {
                result.append(current);
                continue;
            }
            if (++i >= value.length()) {
                throw new IllegalStateException("Chuỗi JSON không hợp lệ");
            }
            char escaped = value.charAt(i);
            switch (escaped) {
                case '"', '\\', '/' -> result.append(escaped);
                case 'b' -> result.append('\b');
                case 'f' -> result.append('\f');
                case 'n' -> result.append('\n');
                case 'r' -> result.append('\r');
                case 't' -> result.append('\t');
                case 'u' -> {
                    if (i + 4 >= value.length()) {
                        throw new IllegalStateException("Unicode JSON không hợp lệ");
                    }
                    result.append((char) Integer.parseInt(
                            value.substring(i + 1, i + 5), 16));
                    i += 4;
                }
                default -> throw new IllegalStateException(
                        "Ký tự escape JSON không hợp lệ: \\" + escaped);
            }
        }
        return result.toString();
    }

    /**
     * Lấy câu hỏi tiếp theo cho một GameRoom.
     */
    public synchronized Question getNextQuestion() {
        if (questions.isEmpty()) {
            return null;
        }
        Question question = questions.get(nextQuestionIndex);
        nextQuestionIndex = (nextQuestionIndex + 1) % questions.size();
        return question;
    }

    /**
     * Mỗi room dùng một snapshot riêng theo đúng thứ tự trong file.
     */
    public synchronized List<Question> getQuestions() {
        return List.copyOf(questions);
    }

    /**
     * Số lượng câu hỏi đang có trong ngân hàng.
     */
    public synchronized int getQuestionCount() {
        return questions.size();
    }
}
