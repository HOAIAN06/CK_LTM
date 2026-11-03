# Execution Plan

## Phase 1 — Observability

Thêm log có correlation ID cho join/lobby/camera/start; tái hiện lỗi với 2 client; ghi state transition.

Trạng thái: code và test tự động đã hoàn thành; kiểm tra webcam/LAN thật còn chờ.

## Phase 2 — Correctness

Tách điều kiện camera khỏi điều kiện start quiz; thêm timeout/fallback; sửa cleanup và reconnect; bổ sung test.

Trạng thái: hoàn thành.

## Phase 3 — Performance

Đo pipeline camera; giới hạn queue; bỏ frame cũ; điều chỉnh capture/encode/network/AI theo số liệu.

Trạng thái: instrumentation/backpressure đã hoàn thành; chưa chốt cấu hình vì còn thiếu benchmark camera thật.

## Phase 4 — Detection quality

Calibrate threshold, debounce, evidence và UNKNOWN; test các tình huống ánh sáng, quay mặt, camera che và mất camera.

Trạng thái: đã có debounce, cooldown, confidence threshold, evidence và `UNKNOWN` cho frame
tối/phẳng; calibration threshold bằng dữ liệu thực tế còn chờ benchmark.

## Phase 5 — UI

Chuẩn hóa design tokens, làm lại từng màn hình, thêm animation và kiểm tra Windows 10/11.

Mỗi phase phải cập nhật `PROGRESS.md`, `TASKS.md` và `docs/AI_LOG.md`.
