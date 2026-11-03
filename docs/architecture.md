# Kiến trúc

## Module

- `client`: JavaFX, controller, navigation, camera capture và proctor AI.
- `server`: TCP server, router, room manager, timer, repository và media relay.
- `common`: message, enum, payload và media metadata dùng chung.

## Luồng mạng

```text
TCP socket → ClientHandler → ServerRequestRouter → Manager/Service → Repository/Room
```

Gameplay dùng JSON mỗi dòng. Media camera dùng relay riêng. Server giữ authority cho đáp án, điểm, thời gian và trạng thái phòng.

## Luồng camera dự kiến

```text
CameraCaptureService
  → frame queue giới hạn
  → ProctorAiEngine / ProctorMediaPublisher
  → TCP media relay
  → host subscriber / dashboard
```

Camera, AI và media không được chạy trên JavaFX Application Thread.
