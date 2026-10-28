package com.nihongoquest.common.protocol;

/**
 * Protocol chứa các quy ước giao tiếp Client ↔ Server qua TCP Socket.
 * Quy định cổng mặc định và encoding của bản tin.
 */
public final class Protocol {

    /** Cổng TCP mặc định mà Server lắng nghe và Client kết nối tới. */
    public static final int DEFAULT_PORT = 5000;

    /** Cổng nhị phân riêng dùng để relay camera giám sát trong LAN. */
    public static final int DEFAULT_MEDIA_PORT = 5001;

    /** Mỗi bản tin là một dòng JSON mã hóa UTF-8. */
    public static final String ENCODING = "UTF-8";

    private Protocol() {
        // Không tạo instance.
    }
}
