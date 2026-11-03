package com.nihongoquest.client.quiz;

import com.nihongoquest.common.protocol.Payloads;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class QuizRoomUiTest {

    @Test
    void cameraStateNeverBlocksEligibleHostFromStarting() {
        List<Payloads.CameraStatus> states = List.of(
                Payloads.CameraStatus.READY,
                Payloads.CameraStatus.INITIALIZING,
                Payloads.CameraStatus.DENIED,
                Payloads.CameraStatus.NOT_FOUND,
                Payloads.CameraStatus.FAILED,
                Payloads.CameraStatus.LOST,
                Payloads.CameraStatus.BLOCKED,
                Payloads.CameraStatus.STOPPED);

        for (Payloads.CameraStatus state : states) {
            assertTrue(QuizRoomUi.canHostStart(lobby(true, state, true, true), false),
                    () -> "Camera state must not block start: " + state);
        }
    }

    @Test
    void roleConnectionCountAndPendingRequestControlStart() {
        Payloads.QuizLobbyData eligible = lobby(true, Payloads.CameraStatus.READY, true, true);
        assertFalse(QuizRoomUi.canHostStart(eligible, true));
        assertFalse(QuizRoomUi.canHostStart(
                lobby(false, Payloads.CameraStatus.READY, true, true), false));
        assertFalse(QuizRoomUi.canHostStart(
                lobby(true, Payloads.CameraStatus.READY, true, false), false));
    }

    @Test
    void cameraFailureMessageExplainsThatQuizCanContinue() {
        String denied = QuizRoomUi.lobbyStatus(
                lobby(true, Payloads.CameraStatus.DENIED, true, true), false);
        String failed = QuizRoomUi.lobbyStatus(
                lobby(true, Payloads.CameraStatus.FAILED, true, true), false);
        String initializing = QuizRoomUi.lobbyStatus(
                lobby(true, Payloads.CameraStatus.INITIALIZING, true, true), false);

        assertTrue(denied.contains("vẫn có thể bắt đầu"));
        assertTrue(failed.contains("vẫn có thể bắt đầu"));
        assertTrue(initializing.contains("vẫn có thể bắt đầu"));
    }

    private static Payloads.QuizLobbyData lobby(boolean host,
                                                Payloads.CameraStatus cameraStatus,
                                                boolean firstConnected,
                                                boolean secondConnected) {
        List<Payloads.QuizLobbyPlayer> members = List.of(
                new Payloads.QuizLobbyPlayer(1, "host", true, false, true,
                        Payloads.CameraStatus.NOT_APPLICABLE,
                        Payloads.CalibrationStatus.NOT_REQUIRED, 0),
                new Payloads.QuizLobbyPlayer(2, "player1", false, true, firstConnected,
                        cameraStatus, Payloads.CalibrationStatus.PENDING, 0),
                new Payloads.QuizLobbyPlayer(3, "player2", false, true, secondConnected,
                        cameraStatus, Payloads.CalibrationStatus.PENDING, 0));
        return new Payloads.QuizLobbyData("123456", "Demo", "host", host,
                false, true, false, 2, members);
    }
}
