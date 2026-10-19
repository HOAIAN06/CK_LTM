package com.nihongoquest.server.question;

import com.nihongoquest.server.database.Database;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/** In-memory test bank; attempts to open a real database connection fail the test. */
public final class QuestionFixtures {
    private QuestionFixtures() { }

    public static Database offlineDatabase() {
        return new Database() {
            @Override
            public java.sql.Connection getConnection() {
                throw new AssertionError("Tests must not connect to a database");
            }
        };
    }

    public static Question question(long id, int count, int correctCount) {
        List<Choice> choices = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            choices.add(new Choice(id * 10 + i + 1, id, "選択肢 " + (i + 1), i < correctCount, i + 1));
        }
        return new Question(id, "意味は？", "VOCABULARY", "N5", "Explanation must stay on server", choices);
    }

    public static class Bank extends QuestionRepository {
        public final List<List<Long>> exclusions = new ArrayList<>();
        private final List<Question> questions;

        public Bank(List<Question> questions) {
            super(offlineDatabase());
            this.questions = List.copyOf(questions);
        }

        @Override
        public List<Question> findRandomQuestions(String level, int limit, Collection<Long> excluded)
                throws SQLException {
            exclusions.add(List.copyOf(excluded));
            return questions.stream().filter(q -> !excluded.contains(q.getId()))
                    .filter(q -> level == null || level.equals(q.getLevel())).limit(limit).toList();
        }

        @Override
        public Question findById(long id) {
            return questions.stream().filter(q -> q.getId() == id).findFirst().orElse(null);
        }
    }
}
