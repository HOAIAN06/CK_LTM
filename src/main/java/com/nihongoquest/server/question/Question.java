package com.nihongoquest.server.question;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

/** Server-only snapshot; never serialize this model directly to a client. */
public final class Question {
    private final long id;
    private final String content;
    private final String category;
    private final String level;
    private final String explanation;
    private final List<Choice> choices;

    public Question(long id, String content, String category, String level,
                    String explanation, List<Choice> choices) {
        this.id = id;
        this.content = content;
        this.category = category;
        this.level = level;
        this.explanation = explanation;
        // Keep malformed data inspectable by the service, which logs its question ID.
        List<Choice> ordered = new ArrayList<>(choices == null ? List.of() : choices);
        ordered.sort(Comparator.nullsLast(Comparator.comparingInt(Choice::position)));
        this.choices = Collections.unmodifiableList(ordered);
    }

    public long getId() { return id; }
    public String getContent() { return content; }
    public String getCategory() { return category; }
    public String getLevel() { return level; }
    public String getExplanation() { return explanation; }
    public List<Choice> getChoices() { return choices; }

    public int indexOfChoice(long choiceId) {
        for (int i = 0; i < choices.size(); i++) {
            if (choices.get(i).id() == choiceId) {
                return i;
            }
        }
        return -1;
    }

    /** Used only for the existing post-answer feedback payload. */
    public int getCorrectAnswerIndex() {
        for (int i = 0; i < choices.size(); i++) {
            if (choices.get(i).correct()) {
                return i;
            }
        }
        throw new IllegalStateException("Question id=" + id + " has no correct answer");
    }
}
