package com.nihongoquest.client.model;

import java.util.ArrayList;
import java.util.List;

/**
 * Question là model câu hỏi trắc nghiệm phía Client.
 * Dùng để hiển thị câu hỏi và các đáp án trên màn Battle.
 * Đáp án đúng do Server quyết định; Client không tự chấm điểm.
 */
public class Question {

    private int id;
    private String questionText;
    private List<String> answers;
    private int correctAnswer;

    public Question() {
        this.answers = new ArrayList<>();
    }

    public Question(int id, String questionText, List<String> answers, int correctAnswer) {
        this.id = id;
        this.questionText = questionText;
        this.answers = answers != null ? answers : new ArrayList<>();
        this.correctAnswer = correctAnswer;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getQuestionText() {
        return questionText;
    }

    public void setQuestionText(String questionText) {
        this.questionText = questionText;
    }

    public List<String> getAnswers() {
        return answers;
    }

    public void setAnswers(List<String> answers) {
        this.answers = answers;
    }

    public int getCorrectAnswer() {
        return correctAnswer;
    }

    public void setCorrectAnswer(int correctAnswer) {
        this.correctAnswer = correctAnswer;
    }
}
