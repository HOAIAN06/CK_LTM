package com.nihongoquest.client.proctor;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ProctorAiRuleTest {
    @Test void triggerClearAndCooldownDoNotDuplicateWarnings() {
        ProctorAiEngine.Rule rule = new ProctorAiEngine.Rule(2_000, 1_000);
        assertFalse(rule.update(true, 1_000));
        assertFalse(rule.update(true, 2_999));
        assertTrue(rule.update(true, 3_000));
        assertFalse(rule.update(false, 3_100));
        assertFalse(rule.update(false, 4_100));
        assertFalse(rule.update(true, 4_200));
        assertFalse(rule.update(true, 6_200));
        assertTrue(rule.update(true, 13_000));
    }
}
