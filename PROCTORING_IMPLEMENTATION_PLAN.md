# Kế hoạch triển khai giám sát chống gian lận cho Quiz Room

## 1. Tóm tắt và quyết định đã chốt

Xây dựng chức năng giám sát hoàn toàn bằng ứng dụng JavaFX desktop, chạy trong LAN, ưu tiên Windows 10/11 x64:

- Chỉ áp dụng cho Quiz Room.
- Host bật giám sát thì không được tham gia trả lời.
- Không dùng React, trình duyệt, WebRTC, cloud hoặc dịch vụ Internet.
- Video đi qua cổng media TCP riêng `5001`; gameplay JSON tiếp tục dùng `5000`.
- Server chỉ xác thực và chuyển tiếp video, không lưu hoặc xử lý AI.
- Mỗi player gửi JPEG `320×240`, tối đa `5 FPS`, chất lượng mặc định `60%`.
- Host xem tối đa 20 camera bằng dashboard JavaFX có thanh cuộn.
- Người chơi được phép từ chối camera; host nhận trạng thái tương ứng.
- AI chạy cục bộ trên máy player, chỉ tạo cảnh báo; host quyết định.
- Không thu microphone.
- Mỗi cảnh báo lưu:
  - Toàn bộ khung hình JPEG.
  - Clip MP4 khoảng 15 giây trước và 15 giây sau cảnh báo.
- Không ghi video liên tục.
- Thư mục mặc định: `%USERPROFILE%\Documents\NihongoQuest-Proctoring`.
- Không thay đổi database; trạng thái giám sát chỉ tồn tại trong RAM và file bằng chứng trên máy host.
- TCP/media v1 không mã hóa vì hệ thống hiện tại cũng chạy plaintext trong LAN; ticket chỉ kiểm soát quyền truy cập, không cung cấp tính bí mật.
- Kế hoạch sẽ được lưu thành `PROCTORING_IMPLEMENTATION_PLAN.md` ở thư mục gốc dự án khi chuyển sang chế độ triển khai. Hiện chưa ghi file vì Plan Mode chỉ cho phép khảo sát, không cho sửa workspace.
- Baseline hiện tại: toàn bộ 81 test đang pass.

## 2. Thay đổi giao thức và trạng thái phòng

### Payload Quiz Room

Mở rộng các record:

```java
QuizRoomCreateRequest(
    long quizSetId,
    int durationMinutes,
    boolean hostPlays,
    boolean proctoringEnabled
)
```

Quy tắc:

- `proctoringEnabled=true && hostPlays=true` bị server từ chối với `PROCTORING_HOST_CANNOT_PLAY`.
- UI tự bỏ chọn và khóa `hostPlays` khi bật giám sát.
- Client cũ không gửi `proctoringEnabled` sẽ mặc định thành `false`.

```java
QuizLobbyPlayer(
    long userId,
    String username,
    boolean host,
    boolean playing,
    boolean connected,
    CameraStatus cameraStatus,
    CalibrationStatus calibrationStatus,
    int warningCount
)
```

```java
QuizLobbyData(
    String pin,
    String title,
    String hostUsername,
    boolean currentUserHost,
    boolean hostPlays,
    boolean proctoringEnabled,
    boolean started,
    int playerCount,
    List<QuizLobbyPlayer> members
)
```

```java
QuizRoomStarted(
    String pin,
    String title,
    int durationSeconds,
    boolean playing,
    boolean host,
    boolean proctoringEnabled
)
```

`QuizRejoinData` cũng bổ sung `proctoringEnabled`.

### Enum trạng thái

```java
CameraStatus {
    NOT_REQUIRED,
    NOT_APPLICABLE,
    INITIALIZING,
    READY,
    DENIED,
    NOT_FOUND,
    FAILED,
    LOST,
    BLOCKED,
    STOPPED
}

CalibrationStatus {
    NOT_REQUIRED,
    PENDING,
    READY,
    FAILED
}

ProctorEventType {
    NO_FACE,
    MULTIPLE_FACES,
    LOOKING_AWAY,
    PHONE_DETECTED,
    CAMERA_BLOCKED,
    APP_FOCUS_LOST,
    APP_MINIMIZED
}

ProctorSeverity {
    WARNING,
    EVIDENCE
}

MediaRole {
    PUBLISHER,
    HOST_SUBSCRIBER
}
```

### Message điều khiển mới

```text
PROCTOR_STATUS_REPORT       player → server
PROCTOR_STATUS_UPDATE       server → host
PROCTOR_EVENT_REPORT        player → server
PROCTOR_EVENT               server → host
PROCTOR_MEDIA_SESSION       server → player/host
```

Payload:

```java
ProctorStatusReport(
    String pin,
    CameraStatus cameraStatus,
    CalibrationStatus calibrationStatus,
    String detail,
    long observedAtEpochMillis
)
```

```java
ProctorStatusUpdate(
    String pin,
    long userId,
    String username,
    CameraStatus cameraStatus,
    CalibrationStatus calibrationStatus,
    boolean connected,
    int warningCount,
    long serverTimeEpochMillis
)
```

```java
ProctorEventReport(
    String pin,
    String eventId,
    ProctorEventType type,
    ProctorSeverity severity,
    long frameSequence,
    long occurredAtEpochMillis,
    int durationMillis,
    double confidence
)
```

```java
ProctorEventData(
    String pin,
    String eventId,
    long userId,
    String username,
    ProctorEventType type,
    ProctorSeverity severity,
    long frameSequence,
    long clientOccurredAtEpochMillis,
    long serverReceivedAtEpochMillis,
    int durationMillis,
    double confidence,
    int warningCount
)
```

```java
ProctorMediaSession(
    String pin,
    MediaRole role,
    int mediaPort,
    String ticket,
    long expiresAtEpochMillis
)
```

### Validation server

- Không tin `userId` từ client; luôn lấy danh tính từ `ClientHandler`.
- Chỉ player đang chơi trong đúng Quiz Room mới được báo trạng thái/sự kiện.
- Host không được gửi trạng thái camera.
- Phòng thường gửi proctor message sẽ nhận `PROCTORING_NOT_ENABLED`.
- `eventId` là UUID, tối đa 64 ký tự.
- `durationMillis`: `0..300000`.
- `confidence`: `0.0..1.0`.
- Mỗi player giữ tối đa 256 `eventId` gần nhất để loại duplicate.
- Sự kiện hợp lệ tăng `warningCount`.
- Status bất thường chỉ tăng count một lần khi chuyển trạng thái; report lặp lại không tăng.
- Status/event chỉ gửi host, không phát cho các player khác.
- `DENIED`, `NOT_FOUND`, `FAILED`, `LOST` không chặn host bắt đầu phòng.
- Disconnect chuyển trạng thái player thành `LOST`.
- Reconnect chuyển thành `INITIALIZING`, yêu cầu consent/camera lại và cấp media ticket mới.
- Media ticket phải được che thành `***` trong traffic log của Server Dashboard.

## 3. Các giai đoạn triển khai

### Phần 1 — Nền tảng giao thức và trạng thái Quiz Room

- Bổ sung payload, enum và message type mới.
- Thêm `proctoringEnabled` vào `QuizRoom`.
- `PlayerState` bổ sung camera state, calibration state, warning count và tập event ID chống trùng.
- Mở API nghiệp vụ:
  - `reportProctorStatus(client, report)`.
  - `reportProctorEvent(client, report)`.
- Router parse, validate và chuyển message tới `QuizRoomManager`.
- Host proctored vẫn được tính là host điều khiển nhưng không nằm trong player count.
- Giữ giới hạn hiện tại: tối đa 20 player cộng một host giám sát.
- Không thay đổi hành vi phòng thường.
- Cập nhật menu tạo phòng:
  - Checkbox `Bật giám sát camera`.
  - Khi chọn, tự bỏ chọn và disable `Host cũng tham gia`.
- Lobby hiển thị thông báo phòng đang được giám sát và trạng thái camera từng thành viên.

Điểm kiểm chứng:

- Phòng thường chạy như trước.
- Server từ chối tổ hợp host chơi + giám sát.
- Host giám sát không nhận `QUIZ_QUESTION`.
- Camera bị từ chối vẫn cho bắt đầu.

### Phần 2 — Vòng đời giám sát phía client

Tạo `ProctoringCoordinator` do `ClientApp` sở hữu:

- Bắt đầu khi player vào lobby có `proctoringEnabled=true`.
- Không bao giờ khởi động trên máy host.
- Hiện dialog consent nội bộ:
  - `Cho phép và mở camera`.
  - `Từ chối`.
- Dialog giải thích:
  - Camera được truyền cho host trong LAN.
  - AI chỉ tạo cảnh báo nghi vấn.
  - Ảnh và clip có thể được lưu trên máy host.
  - Không thu âm.
- Nếu đồng ý:
  - Mở camera mặc định index `0`.
  - Hiện preview nhỏ.
  - Chạy calibration 5 giây.
  - Báo `INITIALIZING`, sau đó `READY` hoặc lỗi.
- Nếu từ chối:
  - Báo `DENIED`.
  - Không mở camera.
  - Focus monitor vẫn hoạt động khi trận bắt đầu.
- Lobby có nút `Thử bật camera lại`.
- Camera đang chạy trong lobby chỉ phục vụ preview/calibration; chưa gửi video và chưa phát cảnh báo AI.
- Khi nhận `QUIZ_ROOM_START`:
  - Player bắt đầu media publisher, AI event engine và focus monitor.
  - Host chuyển sang Proctor Dashboard.
- Dừng và giải phóng đúng một lần khi leave, cancel, finish, logout, mất control connection hoặc `ClientApp.stop()`.

`GameClient` giữ handler màn hình hiện tại; `ClientApp.handleGlobalMessage()` chuyển các proctor message cần thiết tới coordinator trước khi tiếp tục xử lý lời mời hiện có.

### Phần 3 — Camera capture và pipeline frame

Dùng JavaCV/OpenCV Windows x64:

- Một capture thread duy nhất sở hữu camera.
- Capture tối đa `5 FPS`.
- Scale về `320×240`.
- Gán sequence tăng dần và timestamp cho từng frame.
- Tạo immutable `CapturedFrame`.
- Preview, AI và media publisher nhận bản sao/tham chiếu an toàn; không thành phần nào được block capture thread.
- AI dùng bounded queue kích thước 1; frame cũ bị bỏ nếu inference chưa xong.
- JPEG quality bắt đầu ở `60`.
- Hard limit `65,536 byte/frame`.
- Nếu quá giới hạn:
  - Thử giảm quality xuống `50`, rồi `40`.
  - Nếu vẫn quá giới hạn thì bỏ frame.
- Mất frame liên tục 2 giây sau khi từng `READY` → `CAMERA_LOST`.
- Thử mở lại camera mỗi 5 giây, tối đa ba lần liên tiếp; sau đó thử lại mỗi 30 giây.
- Không tự bật lại nếu người dùng đã chọn `DENIED`.

Dependencies Windows-first:

- `org.bytedeco:javacv:1.5.14`.
- OpenCV `4.14.0-1.5.14`, native classifier `windows-x86_64`.
- FFmpeg `8.1.2-1.5.14`, native classifier `windows-x86_64`.
- Không dùng `javacv-platform` trong bản phát hành vì artifact đó kéo binary của nhiều hệ điều hành.
- Linux chỉ được bổ sung sau bằng Maven profile `linux-x86_64`.

JavaCV cung cấp wrapper cho OpenCV/FFmpeg và cho phép tải binary theo platform. [JavaCV chính thức](https://github.com/bytedeco/javacv).

### Phần 4 — Media TCP server cổng 5001

`GameServer` mở thêm `ProctorMediaRelayServer` tại `5001`.

Control channel:

- `5000`: JSON gameplay, status, event và ticket.
- `5001`: binary JPEG media.
- Không đưa JPEG/base64 vào JSON.
- Server không decode và không lưu hình.

Ticket:

- Sinh bằng `SecureRandom`, 32 byte, Base64URL.
- Ràng buộc với room PIN, user ID và role.
- Hết hạn handshake sau 60 giây.
- Dùng một lần; reconnect cấp ticket mới và thu hồi ticket cũ.
- Ticket đã handshake thành công tiếp tục có hiệu lực tới khi socket đóng hoặc phòng kết thúc.

Binary protocol version 1:

```text
Handshake:
4 bytes magic = "NQMP"
1 byte version = 1
1 byte role = 1 publisher / 2 host subscriber
2 bytes ticketLength
N bytes UTF-8 ticket
```

Server trả một byte:

```text
0 = OK
1 = INVALID_MAGIC
2 = UNSUPPORTED_VERSION
3 = INVALID_TICKET
4 = EXPIRED_TICKET
5 = ROOM_CLOSED
```

Publisher frame:

```text
1 byte type = 0x10
8 bytes sequence
8 bytes captureEpochMillis
4 bytes jpegLength
N bytes jpeg
```

Host downstream frame:

```text
1 byte type = 0x11
8 bytes userId
8 bytes sequence
8 bytes serverReceivedEpochMillis
4 bytes jpegLength
N bytes jpeg
```

Giới hạn:

- Ticket tối đa 512 byte.
- JPEG tối đa 65,536 byte.
- Handshake timeout 10 giây.
- Packet không hợp lệ đóng socket.
- Mỗi player chỉ có một publisher; kết nối hợp lệ mới thay kết nối cũ.
- Mỗi room chỉ có một host subscriber.
- Writer host giữ `latest frame` theo từng user, không giữ queue vô hạn.
- Writer round-robin để một camera không chiếm toàn bộ bandwidth.
- Host chậm thì bỏ frame cũ; không block publisher hoặc gameplay.
- Media connection chạy trên virtual threads Java 21.
- Room finish/cancel/server stop đóng toàn bộ media socket và thu hồi ticket.

### Phần 5 — Proctor Dashboard JavaFX

Tạo route/controller/FXML riêng, không nhồi vào `QuizBattleController`.

Bố cục:

- Header: PIN, tên bộ đề, thời gian còn lại, số camera online, tổng cảnh báo.
- Toolbar:
  - `Tất cả`.
  - `Đang cảnh báo`.
  - `Mất camera`.
  - `Từ chối camera`.
  - Tìm username.
  - Mở thư mục bằng chứng.
- Camera grid:
  - `ScrollPane` chứa `TilePane`.
  - 3–4 tile mỗi hàng tùy chiều rộng cửa sổ.
  - Tối đa 20 tile.
  - Username, camera status, warning count và thumbnail.
  - Viền xanh/vàng/đỏ.
  - Click để phóng to; click lần nữa hoặc Escape để thu nhỏ.
- Timeline sự kiện:
  - Thời gian.
  - Username.
  - Loại cảnh báo.
  - Confidence.
  - Nút xem ảnh.
  - Nút mở clip khi clip đã hoàn tất.

Hiệu năng UI:

- Network thread chỉ thay `latest JPEG` theo user.
- Một JavaFX timer mỗi 200 ms lấy snapshot mới nhất cho toàn grid.
- Chỉ một `Platform.runLater` batch, không tạo 100 runnable/giây.
- Tile không thấy trong viewport vẫn giữ latest frame nhưng có thể giảm tần suất decode.
- Khi host reconnect, dựng lại tile/status/count từ `QuizLobbyData`.
- Host mất kết nối không làm dừng trận; server bỏ frame trong lúc không có subscriber.
- Khi host trở lại, video tiếp tục nhưng khoảng mất kết nối không thể khôi phục.

### Phần 6 — Rolling buffer và bằng chứng

Mỗi player trên máy host có một `EvidenceBuffer`:

- Lưu JPEG đã nén, không lưu raw RGB.
- Giữ tối đa 15 giây gần nhất.
- Hard cap `8 MiB/player`.
- Tổng tối đa khoảng `160 MiB` cho 20 player.
- Khi đạt cap, bỏ frame cũ nhất; clip có thể có pre-roll ngắn hơn 15 giây trong trường hợp JPEG quá lớn.

Khi nhận mọi cảnh báo:

1. Tìm frame có `frameSequence` tương ứng.
2. Nếu event tới trước media frame, chờ tối đa 500 ms.
3. Nếu vẫn không có, chọn frame gần timestamp nhận event nhất.
4. Snapshot buffer trước sự kiện.
5. Thu thêm frame tới 15 giây sau sự kiện.
6. Lưu full-frame JPEG.
7. Encode MP4 không audio trên executor riêng.
8. Ghi metadata JSON.

Cảnh báo chồng nhau:

- Nếu cùng player có event mới khi cửa sổ recording hiện tại còn mở, không tạo clip riêng.
- Thêm event vào metadata của clip đang mở.
- Kéo deadline đến 15 giây sau event cuối.
- Tên clip dùng event đầu; metadata chứa toàn bộ event.

MP4:

- `320×240`, `5 FPS`.
- Codec MPEG-4 Visual trong container MP4 để tránh phụ thuộc encoder GPL.
- Tối đa hai worker encode song song.
- Không encode trên FX, capture hoặc network thread.
- Ghi thành `.part`, đóng recorder thành công rồi atomic rename sang `.mp4`.
- Nếu camera mất hoặc phòng kết thúc trước đủ post-roll, finalize clip ngắn và ghi `"incomplete": true`.

Cấu trúc lưu:

```text
Documents/NihongoQuest-Proctoring/
└── 2026-10-28_09-30_PIN-483921/
    ├── session.json
    ├── player-nguyen-van-a/
    │   ├── 09-42-15_LOOKING_AWAY.mp4
    │   ├── 09-42-15_LOOKING_AWAY.jpg
    │   └── events.json
    └── player-tran-van-b/
```

Quy tắc file:

- Sanitize username, chống `..`, slash và ký tự Windows không hợp lệ.
- Không ghi ra ngoài thư mục session.
- Kiểm tra dung lượng trước khi bắt đầu.
- Dưới 1 GiB trống hoặc có lỗi ghi:
  - Dừng tạo bằng chứng mới.
  - Hiện banner đỏ cho host.
  - Gameplay vẫn tiếp tục.
- Host được chọn thư mục khác; mặc định luôn là Documents.

### Phần 7 — AI chống gian lận

Chạy hoàn toàn local bằng OpenCV DNN, CPU-only; không Python, cloud hoặc download model khi chạy.

Model gaze từ Intel Open Model Zoo:

- `face-detection-retail-0005`.
- `facial-landmarks-35-adas-0002`.
- `head-pose-estimation-adas-0001`.
- `gaze-estimation-adas-0002`.

Pipeline chính thức sử dụng face detection, facial landmarks, head pose và hai eye crop để tạo gaze vector. [Open Model Zoo gaze pipeline](https://github.com/openvinotoolkit/open_model_zoo/blob/master/demos/gaze_estimation_demo/cpp/README.md). Model gaze nhận hai crop mắt `60×60` cùng yaw/pitch/roll và trả vector nhìn 3D. [Gaze model](https://github.com/openvinotoolkit/open_model_zoo/blob/master/models/intel/gaze-estimation-adas-0002/README.md).

Phone detector:

- `YOLOX-tiny` ONNX, COCO class `cell phone`.
- Chạy bằng OpenCV DNN, không thêm runtime AI thứ hai.
- YOLOX dùng giấy phép Apache 2.0. [YOLOX chính thức](https://github.com/Megvii-BaseDetection/YOLOX).

Model và license được đóng gói trong installer để chạy không Internet. Open Model Zoo cũng dùng Apache 2.0. [Open Model Zoo](https://github.com/openvinotoolkit/open_model_zoo).

Ngưỡng mặc định:

- Calibration:
  - 5 giây trong lobby.
  - Yêu cầu đúng một mặt.
  - Lấy median gaze vector và head angles làm baseline.
  - Không calibration được → `FAILED`, vẫn cho thi và dùng baseline trung tính.
- `NO_FACE`:
  - Trigger sau 2 giây liên tục.
  - Clear sau 1 giây có đúng một mặt.
  - Cooldown lặp 10 giây.
- `MULTIPLE_FACES`:
  - Trigger sau 1 giây có từ hai mặt.
  - Clear sau 2 giây chỉ còn một mặt.
  - Cooldown 10 giây.
- `LOOKING_AWAY`:
  - Gaze lệch quá 25° ngang hoặc 20° dọc, hoặc head yaw quá 25°/pitch quá 20°.
  - Trigger sau 2 giây liên tục.
  - Clear sau 1 giây trở lại vùng hợp lệ.
  - Cooldown 10 giây.
- `PHONE_DETECTED`:
  - Chạy detector 1–2 FPS tại `416×416`.
  - Confidence tối thiểu `0.55`.
  - Trigger sau hai lần detect liên tiếp.
  - Clear sau ba lần không detect.
  - Cooldown 10 giây.
- `CAMERA_BLOCKED`:
  - Mean luminance dưới 20, hoặc stddev dưới 8, hoặc frame gần như đứng yên.
  - Trigger sau 3 giây.
  - Clear sau 2 giây frame bình thường.
- AI face/gaze chạy tối đa 5 FPS.
- Mọi event là “nghi vấn”, không phải kết luận gian lận.

### Phần 8 — Theo dõi rời ứng dụng

Dùng JavaFX `Stage.focusedProperty()` và `iconifiedProperty()`:

- Dưới 1 giây mất focus: bỏ qua.
- Từ 1 đến dưới 3 giây:
  - Khi focus trở lại, phát một `APP_FOCUS_LOST/WARNING`.
  - Client hiện toast tự động.
  - Host lưu ảnh và clip như mọi cảnh báo khác.
- Đạt 3 giây:
  - Phát `APP_FOCUS_LOST/EVIDENCE` ngay tại mốc 3 giây.
  - Khi focus trở lại không phát thêm event trùng.
- Minimize:
  - Phát `APP_MINIMIZED/EVIDENCE` ngay lập tức.
- Event giống nhau đang kéo dài chỉ lặp sau cooldown 10 giây.
- Không chụp desktop, không đọc nội dung ứng dụng khác và không cần JNA trong v1.
- Client toast hiển thị 3–5 giây và được rate-limit 10 giây.

### Phần 9 — Cảnh báo phía player

Toast không chặn thao tác trả lời:

```text
Cảnh báo: Không phát hiện khuôn mặt.
Sự kiện đã được gửi tới host.
```

```text
Cảnh báo: Bạn đã rời khỏi cửa sổ làm bài.
Sự kiện đã được gửi tới host.
```

Quy tắc:

- Hiển thị trên JavaFX Application Thread.
- Không dùng modal dialog khi trận đang chạy.
- Cảnh báo giống nhau không lặp UI quá một lần mỗi 10 giây.
- Camera denied/not found/lost dùng status banner riêng, không spam toast.
- Không tiết lộ confidence hoặc chi tiết kỹ thuật cho player.

### Phần 10 — Đóng gói Windows và tài liệu

- Build Windows x64 bằng JDK 21.
- Tạo `jpackage app-image` trước; MSI/EXE là bước sau khi runtime ổn định.
- Bundle:
  - Java runtime.
  - JavaFX.
  - OpenCV/FFmpeg Windows native.
  - Toàn bộ model AI.
  - Third-party licenses.
- Bản cài chạy không Internet.
- Windows Firewall chỉ cần mở inbound trên máy Java server:
  - TCP `5000`.
  - TCP `5001`.
- Máy host/player chỉ tạo outbound connection.
- Cập nhật:
  - README: yêu cầu camera, hai port, thư mục evidence.
  - Architecture: control/media/AI/recording.
  - Protocol: payload/message/binary media format.
  - Database docs: xác nhận không có migration.
- Linux được để giai đoạn sau:
  - Thêm classifier/profile `linux-x86_64`.
  - Test camera backend và jpackage Linux.
  - Không thay đổi giao thức.

## 4. Kế hoạch kiểm thử

### Unit test

- JSON round-trip cho toàn bộ payload/enum mới.
- Client request cũ thiếu `proctoringEnabled` mặc định false.
- Reject host chơi cùng proctoring.
- Validate status, event type, confidence, duration và UUID.
- Event duplicate không tăng warning count.
- Media ticket bị redact khỏi traffic log.
- Binary codec encode/decode, frame quá lớn, ticket sai/hết hạn.
- Một publisher/player và một subscriber/room.
- Latest-frame/drop policy không tăng bộ nhớ.
- Evidence buffer:
  - Evict đúng 15 giây.
  - Hard cap 8 MiB.
  - Event overlap được merge.
  - Filename Unicode và ký tự Windows.
  - Partial clip.
  - Disk full.
- Event debouncer dùng fake monotonic clock:
  - 0.9/1.0/3.0 giây focus.
  - Face/gaze/phone thresholds.
  - Clear hysteresis.
  - Cooldown.
- Calibration median, outlier và fallback.

### Integration test

- Host proctored + 20 player join được.
- Host không nhận câu hỏi.
- Player denied/not found/lost vẫn cho start.
- Status/event chỉ tới host.
- Client không giả được user ID.
- Disconnect/reconnect phát ticket mới.
- Ticket cũ bị thu hồi.
- Room finish/cancel đóng media session.
- Phòng thường không thay đổi.
- Synthetic 20 publisher × 5 FPS trong ít nhất 10 phút:
  - Gameplay control vẫn phản hồi.
  - Memory bounded.
  - Host chậm chỉ làm drop video.
  - Không có queue tăng vô hạn.
- Event tới trước/sau media frame vẫn chọn được snapshot gần nhất.
- Clip MP4 và JPEG mở được bằng ứng dụng mặc định Windows.

### UI/FXML test

- Toàn bộ FXML cũ và mới load thành công.
- Hai checkbox loại trừ nhau.
- Consent accept/deny/retry.
- Host proctored route tới dashboard.
- Player route tới battle.
- 20 tile render trong ScrollPane.
- Filter và phóng to hoạt động.
- Reconnect host dựng lại trạng thái.
- Mọi update từ background thread được marshal qua JavaFX thread.
- Leave/cancel/finish release camera đúng một lần.

### Manual Windows acceptance

- Camera mặc định, camera bận, không có camera, rút/cắm lại.
- Alt+Tab, minimize và focus trở lại.
- Một mặt, không mặt, hai mặt, quay đầu, nhìn lệch.
- Điện thoại thật ở nhiều khoảng cách/ánh sáng.
- Host xem 20 stream, scroll và phóng to không treo UI.
- Tạo cảnh báo liên tiếp và kiểm tra merge clip.
- Mất Wi-Fi/control socket/media socket.
- Host mất kết nối rồi đăng nhập lại.
- Ổ đĩa gần đầy.
- Đường dẫn Windows có Unicode.
- Chạy bản đóng gói khi máy không có Internet.

## 5. Tiêu chí hoàn thành

- Quiz Room thường giữ nguyên toàn bộ hành vi.
- Host bật giám sát không thể tham gia trả lời.
- Tối đa 20 player truyền camera qua LAN tới dashboard JavaFX host.
- Camera denial/loss không chặn thi và được báo rõ.
- Không có microphone, browser, React, WebRTC hoặc cloud.
- Mỗi cảnh báo tạo ảnh toàn khung và MP4 pre/post khoảng 15 giây.
- AI phát hiện đủ bốn nhóm: mặt, hướng nhìn, điện thoại, camera bị che.
- Focus/minimize tạo cảnh báo tự động.
- Không tự trừ điểm hoặc loại player.
- UI quiz không bị block bởi capture, AI, network hoặc encoding.
- Memory, queue và thread không tăng liên tục.
- 81 test hiện tại cùng toàn bộ test mới đều pass.
- Bản Windows x64 chạy được hoàn toàn offline trong LAN.
