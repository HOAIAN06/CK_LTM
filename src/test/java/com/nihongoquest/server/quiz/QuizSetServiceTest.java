package com.nihongoquest.server.quiz;

import com.nihongoquest.common.protocol.Payloads;
import org.junit.jupiter.api.Test;

import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class QuizSetServiceTest {

    @Test
    void draftMayBeEmptyButPublishingNeedsThreeValidQuestions() throws SQLException {
        FakeRepository repository = new FakeRepository();
        QuizSetService service = new QuizSetService(repository);
        Payloads.QuizSetEdit emptyDraft = new Payloads.QuizSetEdit(
                null, "  Từ vựng N5  ", null, "n5", List.of());

        long savedId = service.save(7, emptyDraft);

        assertEquals(99, savedId);
        assertEquals("Từ vựng N5", repository.saved.title());
        assertEquals("N5", repository.saved.level());
        repository.stored = new QuizSetRepository.StoredQuizSet(7, false,
                new Payloads.QuizSetEdit(99L, "Từ vựng", "", "N5", List.of(validQuestion())));
        QuizSetException error = assertThrows(QuizSetException.class,
                () -> service.publish(7, 99, true));
        assertEquals("INVALID_QUIZ", error.getCode());
        assertFalse(repository.published);
    }

    @Test
    void publishesThreeValidQuestionsAndRejectsAnotherOwner() throws SQLException {
        FakeRepository repository = new FakeRepository();
        List<Payloads.QuizQuestionEdit> questions = List.of(
                validQuestion(), validQuestion(), validQuestion());
        repository.stored = new QuizSetRepository.StoredQuizSet(7, false,
                new Payloads.QuizSetEdit(5L, "Ngữ pháp", "", "N4", questions));
        QuizSetService service = new QuizSetService(repository);

        service.publish(7, 5, true);
        assertTrue(repository.published);

        QuizSetException error = assertThrows(QuizSetException.class,
                () -> service.publish(8, 5, true));
        assertEquals("NOT_OWNER", error.getCode());
    }

    @Test
    void rejectsMalformedChoicesAndPrivateSetFromAnotherUser() {
        Payloads.QuizQuestionEdit malformed = new Payloads.QuizQuestionEdit(
                null, "Câu hỏi", "", List.of(
                new Payloads.QuizChoiceEdit(null, "A", 1, true),
                new Payloads.QuizChoiceEdit(null, "B", 1, false),
                new Payloads.QuizChoiceEdit(null, "C", 3, false),
                new Payloads.QuizChoiceEdit(null, "D", 4, false)));
        assertEquals("INVALID_QUIZ", assertThrows(QuizSetException.class,
                () -> QuizSetService.validate(new Payloads.QuizSetEdit(
                        null, "Đề", "", "N5", List.of(malformed)), false)).getCode());

        FakeRepository repository = new FakeRepository();
        repository.stored = new QuizSetRepository.StoredQuizSet(7, false,
                new Payloads.QuizSetEdit(5L, "Đề", "", "N5", List.of()));
        QuizSetService service = new QuizSetService(repository);
        assertEquals("NOT_OWNER", assertThrows(QuizSetException.class,
                () -> service.get(8, 5)).getCode());
    }

    private static Payloads.QuizQuestionEdit validQuestion() {
        return new Payloads.QuizQuestionEdit(null, "日本語 là gì?", "Tiếng Nhật", List.of(
                new Payloads.QuizChoiceEdit(null, "Tiếng Nhật", 1, true),
                new Payloads.QuizChoiceEdit(null, "Tiếng Anh", 2, false),
                new Payloads.QuizChoiceEdit(null, "Tiếng Việt", 3, false),
                new Payloads.QuizChoiceEdit(null, "Tiếng Hàn", 4, false)));
    }

    private static class FakeRepository extends QuizSetRepository {
        private Payloads.QuizSetEdit saved;
        private StoredQuizSet stored;
        private boolean published;

        FakeRepository() {
            super(null);
        }

        @Override
        public long save(long ownerId, Payloads.QuizSetEdit quizSet) {
            saved = quizSet;
            return 99;
        }

        @Override
        public Optional<StoredQuizSet> findById(long quizSetId) {
            return Optional.ofNullable(stored);
        }

        @Override
        public void setPublished(long quizSetId, long ownerId, boolean value) {
            published = value;
        }
    }
}
