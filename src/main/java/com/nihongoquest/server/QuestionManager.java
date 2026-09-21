package com.nihongoquest.server;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Logger;

/**
 * QuestionManager quản lý ngân hàng câu hỏi phía Server.
 * Đọc questions.json, lưu danh sách câu hỏi và cung cấp snapshot cho GameRoom.
 */
public class QuestionManager {

    private static final Logger LOGGER = Logger.getLogger(QuestionManager.class.getName());

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final List<Question> questions = new ArrayList<>();

    /**
     * Tải câu hỏi từ file resources/questions/questions.json.
     */
    public synchronized void loadQuestions() {
        try (InputStream input = QuestionManager.class.getResourceAsStream(
                "/questions/questions.json")) {
            if (input == null) {
                throw new IllegalStateException("Không tìm thấy questions.json");
            }
            List<Question> loaded = MAPPER.readValue(input, new TypeReference<>() { });
            if (loaded == null || loaded.isEmpty() || loaded.stream().anyMatch(q -> !q.isValid())) {
                throw new IllegalStateException("questions.json không có câu hỏi hợp lệ");
            }
            questions.clear();
            questions.addAll(loaded);
            LOGGER.info("Đã tải " + questions.size() + " câu hỏi");
        } catch (IOException | RuntimeException e) {
            throw new IllegalStateException("Không thể đọc questions.json", e);
        }
    }

    /**
     * Mỗi room dùng một snapshot riêng theo đúng thứ tự trong file.
     */
    public synchronized List<Question> getQuestions() {
        return List.copyOf(questions);
    }

}
