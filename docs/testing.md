# Kiểm thử

## Mỗi thay đổi

```powershell
.\mvnw.cmd clean test
```

Trên Windows có thể dùng launcher chung:

```powershell
.\scripts\run.ps1 -Mode test
```

## Kịch bản bắt buộc cho lỗi hiện tại

1. Host tạo phòng có giám sát.
2. Player join bằng PIN.
3. Camera READY.
4. Camera denied/not found/đóng giữa lobby.
5. Host vẫn start được.
6. Player vào câu hỏi và nhận cảnh báo.
7. Reconnect hoặc leave không làm kẹt trạng thái.

## Test hiệu năng

Chạy 2 client trước, ghi CPU/RAM/FPS/latency/queue depth/drop count; sau đó lặp với 6 client. Không đánh giá chỉ bằng cảm giác.

Lọc `proctor_pipeline` trong `logs/client.log*` và so sánh các stage:

- `camera-capture`, `jpeg-encode`: FPS nguồn và chi phí encode.
- `network-send`, `network-receive`: FPS, Mbps và nghẽn truyền.
- `jpeg-decode`: chi phí giải mã phía host.
- `ai-inference`: tốc độ AI và số frame bị bỏ theo latest-frame policy.

Tiêu chí cần ghi cho mỗi cấu hình: số client, Windows, CPU/RAM, camera, resolution,
FPS từng stage, `avgMs`, `maxMs`, `dropped`, độ mượt UI và false positive quan sát được.

## Baseline gần nhất

- 2026-11-15: **124 test pass** trên JDK 21 (`mvnw -o clean test` với wrapper LF tạm),
  0 failure/error/skip, `BUILD SUCCESS`. Đây là baseline hiện tại.
- 2026-11-03 P2: 120 test pass trên JDK 21 (mốc lịch sử).
- Có test policy lobby cho mọi camera state, server start không phụ thuộc camera và lifecycle timeout/stale callback bằng fake camera.
- Có test Ranked trong `GameRoomTest` (tiến độ độc lập, timeout, disconnect, hòa, ghép trận)
  và `MatchRepositoryTest`/`MatchRepositoryHistoryTest` (transaction, thống kê, lịch sử).
- Có test metrics, giới hạn retry, evidence `UNKNOWN` và chất lượng frame tối/phẳng.
- 16 màn hình client được load, apply CSS và layout ở viewport 980×680.
- `UiThemeTest` kiểm tra các state bắt buộc: hover, pressed, focus, disabled,
  loading, empty, success, error, answer đúng/sai và camera warning.

## Checklist UI thủ công

1. Windows 10 và 11, scale 100% và 125%.
2. Login 880×600; authenticated 1024×680 và 1180×760.
3. Tab bằng bàn phím: focus ring luôn nhìn thấy; Enter/Space kích hoạt đúng.
4. Kiểm tra loading/empty/error/success, button disabled và text dài tiếng Việt.
5. Chuyển sidebar, trả lời đúng/sai và mở dashboard không giật hoặc che nội dung.
