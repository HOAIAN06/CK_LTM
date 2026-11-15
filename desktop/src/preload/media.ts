/**
 * Preload bridge cho kênh media (`window.nq.media`).
 *
 * Nguyên tắc giống `preload/index.ts`:
 * - Chỉ expose hàm có kiểu rõ ràng; renderer không bao giờ thấy `ipcRenderer`.
 * - Không xử lý nghiệp vụ: chỉ chuyển tiếp tới main process đã kiểm tra.
 * - **Fail closed**: nếu main chưa đăng ký handler media (`registerMediaHandlers()` chưa được
 *   gọi trong `src/main/index.ts`), `ipcRenderer.invoke` reject với chuỗi nội bộ của Electron.
 *   Bridge bắt lỗi đó và trả `{ ok: false, error: 'MEDIA_UNAVAILABLE' }` — UI hiển thị trạng
 *   thái "camera chưa khả dụng" thay vì ném chuỗi kỹ thuật khó hiểu lên màn hình.
 * - Ticket chỉ đi **vào** main trong `startPublish`/`startSubscribe`; không hàm nào trả ticket.
 */
import { ipcRenderer, type IpcRendererEvent } from 'electron'
import {
  MEDIA_ERROR,
  NQ_MEDIA_CHANNELS,
  createMediaStatusSnapshot,
  type MediaCommandResult,
  type MediaInboundFrame,
  type MediaPublishFrameRequest,
  type MediaSessionTarget,
  type MediaStatusSnapshot,
  type NqMediaApi
} from '@shared/media-ipc'

function subscribe<T>(channel: string, listener: (payload: T) => void): () => void {
  const handler = (_event: IpcRendererEvent, payload: T): void => {
    listener(payload)
  }
  ipcRenderer.on(channel, handler)
  return () => {
    ipcRenderer.removeListener(channel, handler)
  }
}

/** Mọi lệnh invoke đều nuốt rejection: renderer chỉ thấy `MediaCommandResult`. */
async function invokeResult(
  channel: string,
  payload?: unknown
): Promise<MediaCommandResult> {
  try {
    const result = await ipcRenderer.invoke(channel, payload)
    if (typeof result === 'object' && result !== null && 'ok' in result) {
      return result as MediaCommandResult
    }
    return { ok: false, error: MEDIA_ERROR.unavailable }
  } catch {
    return { ok: false, error: MEDIA_ERROR.unavailable }
  }
}

async function invokeVoid(channel: string): Promise<void> {
  try {
    await ipcRenderer.invoke(channel)
  } catch {
    // Kênh media chưa có handler: dừng là no-op, không ném lỗi vào UI.
  }
}

export function createMediaBridge(): NqMediaApi {
  return {
    startPublish(target: MediaSessionTarget): Promise<MediaCommandResult> {
      return invokeResult(NQ_MEDIA_CHANNELS.startPublish, target)
    },

    stopPublish(): Promise<void> {
      return invokeVoid(NQ_MEDIA_CHANNELS.stopPublish)
    },

    startSubscribe(target: MediaSessionTarget): Promise<MediaCommandResult> {
      return invokeResult(NQ_MEDIA_CHANNELS.startSubscribe, target)
    },

    stopSubscribe(): Promise<void> {
      return invokeVoid(NQ_MEDIA_CHANNELS.stopSubscribe)
    },

    publishFrame(frame: MediaPublishFrameRequest): Promise<MediaCommandResult> {
      return invokeResult(NQ_MEDIA_CHANNELS.publishFrame, frame)
    },

    async getStatus(): Promise<MediaStatusSnapshot> {
      try {
        const result = await ipcRenderer.invoke(NQ_MEDIA_CHANNELS.status)
        if (typeof result === 'object' && result !== null && 'publisher' in result) {
          return result as MediaStatusSnapshot
        }
        return createMediaStatusSnapshot(Date.now())
      } catch {
        return createMediaStatusSnapshot(Date.now())
      }
    },

    onFrame(listener: (frame: MediaInboundFrame) => void): () => void {
      return subscribe<MediaInboundFrame>(NQ_MEDIA_CHANNELS.frame, listener)
    },

    onStatus(listener: (status: MediaStatusSnapshot) => void): () => void {
      return subscribe<MediaStatusSnapshot>(NQ_MEDIA_CHANNELS.status, listener)
    }
  }
}
