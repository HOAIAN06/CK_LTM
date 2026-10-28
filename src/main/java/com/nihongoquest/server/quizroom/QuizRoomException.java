package com.nihongoquest.server.quizroom;

/** Mã lỗi nghiệp vụ của phòng Quiz. */
public class QuizRoomException extends RuntimeException {
    private final String code;

    public QuizRoomException(String code) {
        super(code);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
