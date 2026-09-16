package com.nihongoquest.common;

/**
 * Protocol chứa các quy ước giao tiếp Client ↔ Server qua TCP Socket.
 * Ví dụ: cổng mặc định, encoding, ký tự phân tách message.
 * Không chứa logic parser phức tạp ở giai đoạn skeleton.
 */
public final class Protocol {

    /** Cổng TCP mặc định mà Server lắng nghe và Client kết nối tới. */
    public static final int DEFAULT_PORT = 5000;

    /** Encoding dùng khi đọc/ghi dữ liệu trên Socket. */
    public static final String ENCODING = "UTF-8";

    /** Ký tự phân tách các phần trong một message dạng text (dự kiến). */
    public static final String SEPARATOR = "|";

    private Protocol() {
        // Class chỉ chứa constant; không cho phép tạo instance.
    }
}
