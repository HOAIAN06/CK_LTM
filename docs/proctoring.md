# Camera và phát hiện gian lận

## Mục tiêu

Camera phải ổn định, có thể chẩn đoán và không khóa quiz. Phát hiện gian lận là cảnh báo hỗ trợ host, không phải phán quyết tuyệt đối.

## Trạng thái tối thiểu

`INITIALIZING`, `READY`, `DENIED`, `NOT_FOUND`, `FAILED`, `LOST`, `STOPPED`, `BLOCKED`, `NOT_REQUIRED` phải có mapping UI và log.

## Quy tắc lỗi

- Camera lỗi không được giữ lobby ở loading vô hạn.
- Frame đầu tiên có timeout 10 giây; hết hạn chuyển `FAILED` và retry.
- Tự retry tối đa 3 lần, cách nhau 5 giây; hết giới hạn có nút thử lại thủ công.
- Host có thể bắt đầu nếu player không có camera; dashboard hiển thị player đó là camera unavailable.
- Mọi event cần timestamp, user, room, trạng thái, frame sequence nếu có và nguyên nhân.
- Mỗi lần mở camera có attempt ID; frame/failure từ attempt cũ bị bỏ qua.

## Runtime log

- Source run: `logs/client.log*`, `logs/server.log*`.
- Packaged app: `%USERPROFILE%\.nihongoquest\logs`.
- Chỉ ghi state transition, không ghi nội dung frame, media ticket hoặc password.

## Hiệu năng cần đo

Runtime log `proctor_pipeline` hiện đo riêng capture, JPEG encode, network send/receive,
JPEG decode và AI inference theo cửa sổ 5 giây. Mỗi dòng có `offered`, `completed`,
`dropped`, `fps`, `avgMs`, `maxMs` và `mbps`. VideoCanvas hiển thị render FPS.

Kiểm thử trước với 2 client trên Windows 10/11, sau đó 6 client. Chưa xem 45 FPS
là cấu hình cuối cho tới khi có số đo camera thật.

## Độ tin cậy phát hiện

Không dùng một frame để kết luận. Detector giữ confidence threshold, rule phải đủ thời gian
liên tục và event có cooldown 10 giây. Frame tối/phẳng là `UNKNOWN`: không được cộng dồn
vào cảnh báo. Ảnh/clip evidence vẫn là dữ liệu để host kiểm tra lại, không phải phán quyết tự động.
