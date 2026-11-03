# Troubleshooting

Khi gặp lỗi, ghi vào `docs/AI_LOG.md` thay vì chỉ mô tả bằng cảm giác.

Thông tin cần có: thời gian, commit/branch, vai trò, room PIN đã che một phần, bước tái hiện, trạng thái UI, trạng thái camera, message cuối cùng, exception/stack trace, số client, JDK, Windows, camera device và kết quả test.

Nếu lobby kẹt, kiểm tra tuần tự: join response → lobby update → coordinator start → camera callback → status report → media session → UI state transition. Mỗi bước phải có timeout hoặc lỗi hiển thị.
