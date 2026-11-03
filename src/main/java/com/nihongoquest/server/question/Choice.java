package com.nihongoquest.server.question;

/** Database-independent, server-only choice including its answer key. */
public record Choice(long id, long questionId, String content, boolean correct, int position) { }
