package com.nihongoquest.client.quiz;

final class QuizRoomUi {
    private QuizRoomUi() { }

    static String errorText(String code) {
        return switch (code) {
            case "ROOM_NOT_FOUND", "INVALID_PIN" -> "Không tìm thấy phòng với PIN này.";
            case "ROOM_STARTED" -> "Phòng đã bắt đầu, không thể tham gia mới.";
            case "ROOM_FULL" -> "Phòng đã đủ 20 người chơi.";
            case "NOT_ENOUGH_PLAYERS" -> "Cần ít nhất 2 người chơi để bắt đầu.";
            case "NOT_HOST" -> "Chỉ host mới được thực hiện thao tác này.";
            case "QUIZ_NOT_PUBLISHED" -> "Bộ đề chưa được xuất bản.";
            case "INVALID_DURATION" -> "Thời lượng phải từ 1 đến 15 phút.";
            case "BUSY" -> "Bạn đang ở hàng chờ hoặc một phòng khác.";
            case "DATABASE_ERROR" -> "Không thể tải bộ đề từ database.";
            case "NOT_IN_ROOM" -> "Bạn không còn ở trong phòng này.";
            default -> "Không thể thực hiện thao tác phòng Quiz.";
        };
    }
}
