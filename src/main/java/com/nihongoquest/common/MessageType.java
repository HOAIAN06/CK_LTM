package com.nihongoquest.common;

/**
 * MessageType định nghĩa các loại message trao đổi giữa Client và Server.
 * Đây là protocol dự kiến; chưa cần triển khai đầy đủ ở giai đoạn skeleton.
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
    PLAYER_FINISHED,
    GAME_OVER,
    DISCONNECT
}
