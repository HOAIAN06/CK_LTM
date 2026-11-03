package com.nihongoquest.client.quiz;

import com.nihongoquest.common.protocol.Payloads;

import java.util.List;

final class QuizRoomUi {
    private QuizRoomUi() { }

    static boolean canHostStart(Payloads.QuizLobbyData lobby, boolean requestPending) {
        return lobby != null && lobby.currentUserHost() && !requestPending
                && connectedPlayerCount(lobby.members()) >= 2;
    }

    static int connectedPlayerCount(List<Payloads.QuizLobbyPlayer> members) {
        if (members == null) return 0;
        return (int) members.stream()
                .filter(Payloads.QuizLobbyPlayer::playing)
                .filter(Payloads.QuizLobbyPlayer::connected)
                .count();
    }

    static String lobbyStatus(Payloads.QuizLobbyData lobby, boolean requestPending) {
        if (requestPending) return "Đang bắt đầu phòng...";
        if (lobby.currentUserHost() && connectedPlayerCount(lobby.members()) < 2) {
            return "Cần ít nhất 2 người chơi đang kết nối để bắt đầu.";
        }
        if (lobby.proctoringEnabled()) {
            List<Payloads.CameraStatus> statuses = lobby.members().stream()
                    .filter(Payloads.QuizLobbyPlayer::playing)
                    .filter(Payloads.QuizLobbyPlayer::connected)
                    .map(Payloads.QuizLobbyPlayer::cameraStatus)
                    .filter(status -> status != null
                            && status != Payloads.CameraStatus.NOT_APPLICABLE
                            && status != Payloads.CameraStatus.NOT_REQUIRED)
                    .toList();
            if (statuses.stream().anyMatch(status -> status == Payloads.CameraStatus.DENIED)) {
                return "Có người chơi từ chối camera; phòng vẫn có thể bắt đầu.";
            }
            if (statuses.stream().anyMatch(QuizRoomUi::cameraUnavailable)) {
                return "Có camera không khả dụng; phòng vẫn có thể bắt đầu.";
            }
            if (statuses.stream().anyMatch(status -> status == Payloads.CameraStatus.INITIALIZING)) {
                return "Camera đang khởi tạo; host vẫn có thể bắt đầu.";
            }
            if (!statuses.isEmpty() && statuses.stream()
                    .allMatch(status -> status == Payloads.CameraStatus.READY)) {
                return "Camera của người chơi đã sẵn sàng.";
            }
        }
        return lobby.currentUserHost() ? "Phòng đã sẵn sàng để bắt đầu."
                : "Đang chờ host bắt đầu...";
    }

    private static boolean cameraUnavailable(Payloads.CameraStatus status) {
        return status == Payloads.CameraStatus.NOT_FOUND
                || status == Payloads.CameraStatus.FAILED
                || status == Payloads.CameraStatus.LOST
                || status == Payloads.CameraStatus.BLOCKED
                || status == Payloads.CameraStatus.STOPPED;
    }

    static String errorText(String code) {
        return switch (code) {
            case "ROOM_NOT_FOUND", "INVALID_PIN" -> "Không tìm thấy phòng với PIN này.";
            case "ROOM_STARTED" -> "Phòng đã bắt đầu, không thể tham gia mới.";
            case "ROOM_FULL" -> "Phòng đã đủ số người chơi cho chế độ hiện tại (tối đa 6 khi giám sát HD).";
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
