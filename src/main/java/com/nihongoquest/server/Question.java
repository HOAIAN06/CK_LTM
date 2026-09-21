package com.nihongoquest.server;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Câu hỏi đầy đủ chỉ tồn tại trên Server, bao gồm cả đáp án đúng.
 */
public class Question {

    private final int id;
    private final String questionText;
    private final List<String> answers;
    private final int correctAnswer;

    @JsonCreator
    public Question(@JsonProperty("id") int id,
                    @JsonProperty("questionText") String questionText,
                    @JsonProperty("answers") List<String> answers,
                    @JsonProperty("correctAnswer") int correctAnswer) {
        this.id = id;
        this.questionText = questionText;
        this.answers = List.copyOf(answers);
        this.correctAnswer = correctAnswer;
    }

    public int getId() {
        return id;
    }

    public String getQuestionText() {
        return questionText;
    }

    public List<String> getAnswers() {
        return answers;
    }

    public int getCorrectAnswer() {
        return correctAnswer;
    }

    public boolean isValid() {
        return questionText != null && !questionText.isBlank()
                && answers != null && answers.size() == 4
                && answers.stream().allMatch(answer -> answer != null && !answer.isBlank())
                && correctAnswer >= 0 && correctAnswer < answers.size();
    }
}
