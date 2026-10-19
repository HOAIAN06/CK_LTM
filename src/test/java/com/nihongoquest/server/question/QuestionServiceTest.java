package com.nihongoquest.server.question;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;

import static com.nihongoquest.server.question.QuestionFixtures.question;
import static org.junit.jupiter.api.Assertions.*;

class QuestionServiceTest {
    private final QuestionService service = new QuestionService(new QuestionFixtures.Bank(List.of()));

    @Test
    void acceptsFourChoicesWithExactlyOneCorrectAnswer() {
        assertTrue(service.isValidForRanked(question(1, 4, 1)));
    }

    @ParameterizedTest
    @CsvSource({"3,1", "4,2", "4,0", "5,1"})
    void rejectsInvalidChoiceCountsAndAnswerKeys(int choices, int correct) {
        assertFalse(service.isValidForRanked(question(15, choices, correct)));
    }

    @Test
    void rejectsDuplicateOrNonpositivePositionsAndWrongQuestionOwnership() {
        List<Choice> original = question(1, 4, 1).getChoices();
        for (Choice replacement : List.of(
                new Choice(14, 1, "D", false, 1),
                new Choice(14, 1, "D", false, 0),
                new Choice(14, 2, "D", false, 4),
                new Choice(11, 1, "D", false, 4))) {
            List<Choice> choices = new ArrayList<>(original);
            choices.set(3, replacement);
            assertFalse(service.isValidForRanked(new Question(1, "Q", "KANJI", null, null, choices)));
        }
    }

    @Test
    void rejectsBlankQuestionAndChoiceContentAndMissingQuestions() {
        assertFalse(service.isValidForRanked(null));
        assertFalse(service.isValidForRanked(new Question(1, " ", "KANJI", null, null,
                question(1, 4, 1).getChoices())));
        List<Choice> choices = new ArrayList<>(question(1, 4, 1).getChoices());
        choices.set(2, new Choice(13, 1, "\n", false, 3));
        assertFalse(service.isValidForRanked(new Question(1, "Q", "KANJI", null, null, choices)));
        choices.set(2, null);
        assertFalse(service.isValidForRanked(new Question(1, "Q", "KANJI", null, null, choices)));
    }

    @Test
    void fillsRequestedCountWithoutReusingRejectedQuestions() {
        var bank = new QuestionFixtures.Bank(List.of(question(1, 3, 1), question(2, 4, 1),
                question(3, 4, 2), question(4, 4, 1), question(5, 4, 1)));
        List<Question> result = new QuestionService(bank).getRankedQuestions("N5", 3);
        assertEquals(List.of(2L, 4L, 5L), result.stream().map(Question::getId).toList());
        assertEquals(List.of(1L, 2L, 3L), bank.exclusions.get(1));
        assertThrows(UnsupportedOperationException.class, () -> result.clear());
    }

    @Test
    void fillsTenQuestionsEvenWhenTheInitialBatchContainsInvalidData() {
        List<Question> bank = new ArrayList<>();
        bank.add(question(1, 3, 1));
        for (int i = 2; i <= 11; i++) bank.add(question(i, 4, 1));
        assertEquals(10, new QuestionService(new QuestionFixtures.Bank(bank)).getRankedQuestions(null, 10).size());
    }

    @Test
    void failsClearlyWhenBankIsExhaustedOrLevelHasNoQuestions() {
        var subject = new QuestionService(new QuestionFixtures.Bank(List.of(question(1, 4, 1))));
        assertTrue(assertThrows(IllegalStateException.class,
                () -> subject.getRankedQuestions(null, 3)).getMessage().contains("minimum=3, found=1"));
        assertThrows(IllegalStateException.class, () -> subject.getRankedQuestions("N1", 1));
        assertThrows(IllegalArgumentException.class, () -> subject.getRankedQuestions(null, 0));
        assertThrows(IllegalStateException.class, () -> subject.getQuestion(99));
        assertEquals(1, subject.getQuestion(1).getId());
    }

    @Test
    void rankedPoolAcceptsBetweenMinimumAndMaximumQuestions() {
        List<Question> fiveQuestions = java.util.stream.LongStream.rangeClosed(1, 5)
                .mapToObj(id -> question(id, 4, 1)).toList();
        List<Question> result = new QuestionService(new QuestionFixtures.Bank(fiveQuestions))
                .getRankedQuestionsUpTo(null, 10, 3);
        assertEquals(5, result.size());
    }

    @Test
    void wrapsDatabaseFailuresWithTheirCause() {
        SQLException failure = new SQLException("Database unavailable", "08001");
        var bank = new QuestionFixtures.Bank(List.of()) {
            @Override
            public List<Question> findRandomQuestions(String level, int limit, Collection<Long> excluded)
                    throws SQLException { throw failure; }
        };
        assertSame(failure, assertThrows(IllegalStateException.class,
                () -> new QuestionService(bank).getRankedQuestions(null, 3)).getCause());
    }

    @Test
    void keepsChoicesOrderedAndImmutableWithoutLosingTheirIds() {
        List<Choice> choices = new ArrayList<>(question(3_000_000_000L, 4, 1).getChoices());
        Collections.reverse(choices);
        Question snapshot = new Question(3_000_000_000L, "Q", "KANJI", null, null, choices);
        choices.clear();
        assertEquals(List.of(1, 2, 3, 4), snapshot.getChoices().stream().map(Choice::position).toList());
        assertEquals(0, snapshot.indexOfChoice(30_000_000_001L));
        assertEquals(-1, snapshot.indexOfChoice(999));
        assertEquals(0, snapshot.getCorrectAnswerIndex());
        assertThrows(UnsupportedOperationException.class, () -> snapshot.getChoices().clear());
    }
}
