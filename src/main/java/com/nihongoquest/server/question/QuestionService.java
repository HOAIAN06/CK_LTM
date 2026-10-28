package com.nihongoquest.server.question;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.logging.Logger;

/** Validates database questions before a room can publish them. */
public class QuestionService {
    private static final Logger LOGGER = Logger.getLogger(QuestionService.class.getName());
    private final QuestionRepository repository;

    public QuestionService(QuestionRepository repository) {
        this.repository = Objects.requireNonNull(repository);
    }

    public List<Question> getRankedQuestions(String level, int count) {
        if (count <= 0) {
            throw new IllegalArgumentException("Ranked question count must be positive");
        }
        return getRankedQuestionsUpTo(level, count, count);
    }

    /** Lấy tối đa max câu; vẫn cho tạo trận khi database có ít nhất min câu hợp lệ. */
    public List<Question> getRankedQuestionsUpTo(String level, int max, int min) {
        if (min <= 0 || max < min) {
            throw new IllegalArgumentException("Ranked question limits are invalid");
        }
        List<Question> valid = new ArrayList<>();
        Set<Long> examined = new LinkedHashSet<>();
        try {
            while (valid.size() < max) {
                List<Question> candidates = repository.findRandomQuestions(level, max - valid.size(), examined);
                int previousSize = examined.size();
                for (Question question : candidates) {
                    if (question != null && examined.add(question.getId()) && isValidForRanked(question)) {
                        valid.add(question);
                        if (valid.size() == max) {
                            break;
                        }
                    }
                }
                if (examined.size() == previousSize) {
                    break;
                }
            }
            if (valid.size() < min) {
                throw new IllegalStateException("Not enough valid Ranked questions: minimum="
                        + min + ", found=" + valid.size() + ", level=" + level);
            }
            return List.copyOf(valid);
        } catch (SQLException e) {
            LOGGER.warning("Cannot load Ranked questions from database (SQLState=" + e.getSQLState() + ")");
            throw new IllegalStateException("Không thể tải câu hỏi Ranked từ database", e);
        }
    }

    public Question getQuestion(long questionId) {
        try {
            Question question = repository.findById(questionId);
            if (question == null) {
                throw new IllegalStateException("Question id=" + questionId + " not found or inactive");
            }
            if (!isValidForRanked(question)) {
                throw new IllegalStateException("Question id=" + questionId + " is invalid for Ranked");
            }
            return question;
        } catch (SQLException e) {
            throw new IllegalStateException("Cannot load question id=" + questionId + " from database", e);
        }
    }

    public boolean isValidForRanked(Question question) {
        String error = validationError(question);
        if (error != null) {
            LOGGER.warning("Invalid question id=" + (question == null ? "null" : question.getId()) + ": " + error);
        }
        return error == null;
    }

    private String validationError(Question question) {
        if (question == null || question.getId() <= 0) {
            return "question must exist with a positive ID";
        }
        if (question.getContent() == null || question.getContent().isBlank()) {
            return "content is blank";
        }
        if (question.getChoices().size() != 4) {
            return "expected 4 choices but found " + question.getChoices().size();
        }
        Set<Integer> positions = new HashSet<>();
        Set<Long> ids = new HashSet<>();
        int correct = 0;
        for (Choice choice : question.getChoices()) {
            if (choice == null || choice.id() <= 0 || !ids.add(choice.id())
                    || choice.questionId() != question.getId()) {
                return "choices must have unique positive IDs and belong to this question";
            }
            if (choice.content() == null || choice.content().isBlank()) {
                return "choice content is blank";
            }
            if (choice.position() < 1 || !positions.add(choice.position())) {
                return "choice positions must be positive and unique";
            }
            if (choice.correct()) {
                correct++;
            }
        }
        return correct == 1 ? null : "expected exactly 1 correct answer but found " + correct;
    }
}
