package com.nihongoquest.server.quiz;

/** Lỗi nghiệp vụ ngắn gọn để client có thể hiển thị thông báo phù hợp. */
public class QuizSetException extends RuntimeException {
    private final String code;

    public QuizSetException(String code) {
        super(code);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
