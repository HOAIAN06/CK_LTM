package com.nihongoquest.server;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;

class QuestionManagerTest {

    @Test
    void loadsQuestionsWithJacksonAndValidatesThem() {
        QuestionManager manager = new QuestionManager();
        manager.loadQuestions();

        assertFalse(manager.getQuestions().isEmpty());
        manager.getQuestions().forEach(question -> {
            if (!question.isValid()) {
                throw new AssertionError("Invalid question loaded");
            }
        });
    }
}
