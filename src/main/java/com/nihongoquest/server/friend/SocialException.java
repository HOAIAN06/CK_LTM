package com.nihongoquest.server.friend;

public class SocialException extends RuntimeException {
    private final String code;

    public SocialException(String code) {
        super(code);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
