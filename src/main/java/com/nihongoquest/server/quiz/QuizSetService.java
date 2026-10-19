package com.nihongoquest.server.quiz;

import com.nihongoquest.common.protocol.Payloads;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/** Nghiệp vụ quản lý draft và xuất bản bộ đề. */
public class QuizSetService {
    private static final Set<String> LEVELS = Set.of("N5", "N4", "N3", "N2", "N1");
    private final QuizSetRepository repository;

    public QuizSetService(QuizSetRepository repository) {
        this.repository = repository;
    }

    public Payloads.QuizSetListData list(long userId, String scope) throws SQLException {
        if ("OWN".equalsIgnoreCase(scope)) {
            return new Payloads.QuizSetListData(repository.listOwned(userId));
        }
        if ("PUBLISHED".equalsIgnoreCase(scope)) {
            return new Payloads.QuizSetListData(repository.listPublished(userId));
        }
        throw new QuizSetException("BAD_REQUEST");
    }

    public Payloads.QuizSetEdit get(long userId, long quizSetId) throws SQLException {
        if (quizSetId <= 0) throw new QuizSetException("BAD_REQUEST");
        QuizSetRepository.StoredQuizSet stored = repository.findById(quizSetId)
                .orElseThrow(() -> new QuizSetException("NOT_FOUND"));
        if (!stored.published() && stored.ownerId() != userId) {
            throw new QuizSetException("NOT_OWNER");
        }
        return stored.data();
    }

    public long save(long userId, Payloads.QuizSetEdit input) throws SQLException {
        return repository.save(userId, validate(input, false));
    }

    public void publish(long userId, long quizSetId, boolean published) throws SQLException {
        if (quizSetId <= 0) throw new QuizSetException("BAD_REQUEST");
        if (published) {
            QuizSetRepository.StoredQuizSet stored = repository.findById(quizSetId)
                    .orElseThrow(() -> new QuizSetException("NOT_FOUND"));
            if (stored.ownerId() != userId) throw new QuizSetException("NOT_OWNER");
            validate(stored.data(), true);
        }
        repository.setPublished(quizSetId, userId, published);
    }

    public void delete(long userId, long quizSetId) throws SQLException {
        if (quizSetId <= 0) throw new QuizSetException("BAD_REQUEST");
        repository.delete(quizSetId, userId);
    }

    /** Draft có thể chưa có câu hỏi; câu đã thêm phải luôn đủ bốn lựa chọn. */
    static Payloads.QuizSetEdit validate(Payloads.QuizSetEdit input, boolean publishing) {
        if (input == null) throw new QuizSetException("BAD_REQUEST");
        String title = clean(input.title());
        String description = clean(input.description());
        String level = clean(input.level()).toUpperCase(Locale.ROOT);
        if (title.isEmpty() || title.length() > 100 || !LEVELS.contains(level)) {
            throw new QuizSetException("INVALID_QUIZ");
        }
        List<Payloads.QuizQuestionEdit> source = input.questions() == null
                ? List.of() : input.questions();
        if (publishing && source.size() < 3) throw new QuizSetException("INVALID_QUIZ");

        List<Payloads.QuizQuestionEdit> questions = new ArrayList<>();
        for (Payloads.QuizQuestionEdit question : source) {
            questions.add(validateQuestion(question));
        }
        return new Payloads.QuizSetEdit(input.id(), title, description, level, List.copyOf(questions));
    }

    private static Payloads.QuizQuestionEdit validateQuestion(Payloads.QuizQuestionEdit question) {
        if (question == null || clean(question.content()).isEmpty()
                || question.choices() == null || question.choices().size() != 4) {
            throw new QuizSetException("INVALID_QUIZ");
        }
        Set<Integer> positions = new HashSet<>();
        int correctCount = 0;
        List<Payloads.QuizChoiceEdit> choices = new ArrayList<>();
        for (Payloads.QuizChoiceEdit choice : question.choices()) {
            if (choice == null || clean(choice.content()).isEmpty()
                    || choice.position() < 1 || choice.position() > 4
                    || !positions.add(choice.position())) {
                throw new QuizSetException("INVALID_QUIZ");
            }
            if (choice.correct()) correctCount++;
            choices.add(new Payloads.QuizChoiceEdit(
                    choice.id(), clean(choice.content()), choice.position(), choice.correct()));
        }
        if (correctCount != 1 || positions.size() != 4) {
            throw new QuizSetException("INVALID_QUIZ");
        }
        choices.sort(Comparator.comparingInt(Payloads.QuizChoiceEdit::position));
        return new Payloads.QuizQuestionEdit(question.id(), clean(question.content()),
                clean(question.explanation()), List.copyOf(choices));
    }

    private static String clean(String value) {
        return value == null ? "" : value.trim();
    }
}
