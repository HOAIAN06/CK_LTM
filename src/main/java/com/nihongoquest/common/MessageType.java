package com.nihongoquest.common;

/**
 * MessageType định nghĩa các loại message trao đổi giữa Client và Server.
 * Đây là protocol dự kiến; chưa cần triển khai đầy đủ ở giai đoạn skeleton.
 */
public enum MessageType {
    CONNECT,
    FIND_MATCH,
    CANCEL_MATCH,
    MATCH_FOUND,
    QUESTION,
    ANSWER,
    ANSWER_RESULT,
    SCORE_UPDATE,
    GAME_OVER,
    DISCONNECT
}
