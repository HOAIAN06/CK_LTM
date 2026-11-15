/**
 * Preload script — bề mặt duy nhất renderer được phép chạm vào.
 *
 * Nguyên tắc:
 * - Chỉ dùng `contextBridge` + `ipcRenderer`; không expose `ipcRenderer`, `require`,
 *   `process` hay bất kỳ API Node/Electron nào cho page.
 * - Mỗi lời gọi là một hàm có kiểu rõ ràng, không phải một kênh IPC tự do.
 * - Không xử lý nghiệp vụ: chỉ chuyển tiếp tới main process đã được kiểm tra.
 * - **Chỉ expose những gì main đã có handler**: `connect`, `disconnect`, `send`, `getStatus`,
 *   `onEvent`, `app`, và (từ giai đoạn camera) `media` — xem `./media.ts`. Handler media nằm ở
 *   `src/main/ipc/register-media-handlers.ts`; nếu `src/main/index.ts` chưa gọi
 *   `registerMediaHandlers()` thì mọi lệnh media trả `{ ok:false, error:'MEDIA_UNAVAILABLE' }`
 *   (fail closed) chứ không ném lỗi kỹ thuật vào UI.
 *
 * File chạy trong sandbox (webPreferences.sandbox = true), nên chỉ những module
 * Electron cho phép mới tồn tại; mọi import khác sẽ làm preload chết ngay.
 */
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import {
  IPC_CHANNELS,
  type AppInfo,
  type ConnectOptions,
  type ConnectionStatus,
  type NqBridge,
  type NqEvent,
  type NqPlatform,
  type NqResult,
  type OutboundMessage
} from '@shared/ipc'
import type { NqMediaApi } from '@shared/media-ipc'
import { createMediaBridge } from './media'

const APP_VERSION_ARG = '--nq-app-version='
const APP_PACKAGED_ARG = '--nq-app-packaged='

/** Main truyền version qua `webPreferences.additionalArguments` (xem main/window.ts). */
function readProcessArg(prefix: string): string | null {
  const argv = Array.isArray(process.argv) ? process.argv : []
  const match = argv.find((arg) => arg.startsWith(prefix))
  if (!match) return null
  const value = match.slice(prefix.length)
  return value.length > 0 ? value : null
}

const appInfo: AppInfo = {
  version: readProcessArg(APP_VERSION_ARG) ?? '0.0.0',
  platform: process.platform as NqPlatform,
  packaged: readProcessArg(APP_PACKAGED_ARG) === '1'
}

/** Đăng ký một listener IPC và trả về hàm huỷ — renderer không bao giờ thấy `ipcRenderer`. */
function subscribe<T>(channel: string, listener: (payload: T) => void): () => void {
  const handler = (_event: IpcRendererEvent, payload: T): void => {
    listener(payload)
  }
  ipcRenderer.on(channel, handler)
  return () => {
    ipcRenderer.removeListener(channel, handler)
  }
}

const bridge: NqBridge & { media: NqMediaApi } = {
  connect(options: ConnectOptions): Promise<NqResult> {
    return ipcRenderer.invoke(IPC_CHANNELS.connect, options)
  },

  disconnect(): Promise<void> {
    return ipcRenderer.invoke(IPC_CHANNELS.disconnect)
  },

  send(frame: OutboundMessage): Promise<NqResult> {
    return ipcRenderer.invoke(IPC_CHANNELS.send, frame)
  },

  getStatus(): Promise<ConnectionStatus> {
    return ipcRenderer.invoke(IPC_CHANNELS.status)
  },

  onEvent(listener: (event: NqEvent) => void): () => void {
    return subscribe<NqEvent>(IPC_CHANNELS.event, listener)
  },

  // `window.nq.media` — additive so với hợp đồng Phase 2; renderer đọc qua
  // `readMediaBridge()` vì `NqBridge` (shared/ipc.ts, architecture sở hữu) chưa khai báo field
  // này. Runtime luôn có mặt; main fail closed bằng `MEDIA_UNAVAILABLE` nếu chưa nối handler.
  media: createMediaBridge(),

  app: appInfo
}

// Bất biến bảo mật: nếu context isolation không bật thì không expose gì cả.
if (!process.contextIsolated) {
  throw new Error('Context isolation bị tắt — từ chối expose window.nq')
}

contextBridge.exposeInMainWorld('nq', bridge)
