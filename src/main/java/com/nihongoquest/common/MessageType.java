package com.nihongoquest.common;

/**
 * MessageType định nghĩa các loại message trao đổi giữa client và server.
 */
public enum MessageType {
    CONNECT,
    REGISTER,
    REGISTER_OK,
    REGISTER_FAIL,
    LOGIN,
    LOGIN_OK,
    LOGIN_FAIL,
    FIND_MATCH,
    CANCEL_MATCH,
    WAITING,
    MATCH_CANCELLED,
    MATCH_ERROR,
    MATCH_FOUND,
    QUESTION,
    ANSWER,
    ANSWER_RESULT,
    SCORE_UPDATE,
    GAME_OVER,
    DISCONNECT
}
