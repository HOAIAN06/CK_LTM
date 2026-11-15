/**
 * Bề mặt API công khai của preload — chỉ là kiểu, không có code chạy.
 *
 * Vì sao khai báo `window.nq` nằm ở `@shared/ipc` chứ không ở đây:
 * `tsconfig.web.json` chỉ include `src/renderer/**` và `src/shared/**`, nên một
 * `declare global` đặt trong `src/preload` sẽ không đến được code React. Vì vậy phần
 * augmentation nằm cạnh định nghĩa `NqBridge` trong `src/shared/ipc.ts` (một nguồn duy nhất),
 * còn file này re-export lại toàn bộ hợp đồng để tra cứu và để test import.
 *
 * Quy tắc khi sửa hợp đồng:
 * 1. Sửa `src/shared/ipc.ts` (architecture sở hữu).
 * 2. Nếu là thay đổi breaking, cập nhật `docs/desktop/architecture.md` và báo orchestrator
 *    để renderer/camera cập nhật theo.
 *
 * Lưu ý: `MediaFrame`/`MediaFrameMeta`/`NqMediaBridge` được export để giai đoạn camera dùng,
 * nhưng `NqBridge` **không** có `media` — xem lý do trong `src/shared/ipc.ts`.
 */
export type {
  AppInfo,
  ConnectOptions,
  ConnectionState,
  ConnectionStatus,
  IpcChannel,
  MediaFrame,
  MediaFrameMeta,
  NqBridge,
  NqErrorCode,
  NqEvent,
  NqMediaBridge,
  NqPlatform,
  NqResult,
  OutboundMessage,
  ServerMessage,
  TransportError
} from '@shared/ipc'
