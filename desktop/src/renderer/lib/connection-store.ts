/**
 * Nguồn sự thật duy nhất của UI về kết nối + định tuyến message toàn cục.
 *
 * Hình mẫu lấy từ `ClientApp` của client JavaFX:
 * - `PROFILE_DATA` (và `LOGIN_OK`) là **push** của máy chủ: cập nhật hồ sơ đang hiển thị.
 * - Mất socket khi đã đăng nhập = phiên kết thúc: xoá hồ sơ và bật cờ `connectionLost`
 *   để router đưa người dùng về màn hình kết nối lại (không tự động reconnect — D-021).
 * - Message không thuộc phần định tuyến chung được chuyển cho các listener của màn hình
 *   đang mở (login, home…), đúng vai của `setMessageHandler` theo từng màn hình bên JavaFX.
 *
 * Không store nào giữ mật khẩu. `send()` không log frame.
 */
import { create } from 'zustand'
import type {
  ConnectionStatus,
  NqEvent,
  NqResult,
  TransportError
} from '@shared/ipc'
import { createIdleConnectionStatus, NQ_ERROR } from '@shared/ipc'
import type { OutboundMessage, ServerMessage } from '@shared/protocol'
import { getBridge } from './bridge'
import { useSessionStore } from './session-store'

export interface ConnectionUiState {
  /** Trạng thái main process báo xuống; UI chỉ hiển thị, không tự suy diễn. */
  status: ConnectionStatus
  /** Lỗi transport gần nhất (đã được main làm sạch), dùng cho tooltip/chi tiết. */
  transportError: TransportError | null
  /** Mã lỗi gần nhất mà UI cần hiển thị; `null` khi đã xử lý xong. */
  lastError: string | null
  /** Một lệnh `connect` đang chạy (main cũng phát `status: connecting`). */
  connecting: boolean
  /** Đã từng kết nối và vừa mất kết nối khi đang đăng nhập. */
  connectionLost: boolean
}

export interface ConnectionActions {
  connect: (host: string, port: number) => Promise<NqResult>
  disconnect: () => Promise<void>
  /** Gửi một frame protocol; không bao giờ ném lỗi, luôn trả `{ ok, error }`. */
  send: (frame: OutboundMessage) => Promise<NqResult>
  /** Đọc lại trạng thái từ main (main là nguồn sự thật). */
  syncStatus: () => Promise<void>
  handleEvent: (event: NqEvent) => void
  clearError: () => void
  dismissConnectionLost: () => void
  /** Đăng xuất: xoá phiên, gửi `DISCONNECT` rồi đóng socket. */
  signOut: () => Promise<void>
}

export type ConnectionStore = ConnectionUiState & ConnectionActions

export const initialConnectionState: ConnectionUiState = {
  status: createIdleConnectionStatus(),
  transportError: null,
  lastError: null,
  connecting: false,
  connectionLost: false
}

type MessageListener = (message: ServerMessage) => void

const messageListeners = new Set<MessageListener>()

/**
 * Đăng ký nhận message máy chủ cho màn hình đang mở.
 * Trả về hàm huỷ đăng ký; dùng qua `useServerMessage`.
 */
export function subscribeServerMessages(listener: MessageListener): () => void {
  messageListeners.add(listener)
  return () => {
    messageListeners.delete(listener)
  }
}

/** Chỉ những trạng thái này mới thực sự kết thúc một phiên đang mở. */
const TERMINAL_STATES = new Set<ConnectionStatus['state']>(['idle', 'disconnected', 'error'])

function errorCode(result: NqResult): string {
  return result.error ?? NQ_ERROR.sendFailed
}

export const useConnectionStore = create<ConnectionStore>()((set, get) => ({
  ...initialConnectionState,

  connect: async (host, port) => {
    set({ connecting: true, lastError: null })
    try {
      const result = await getBridge().connect({ host, port })
      if (!result.ok) {
        set({ connecting: false, lastError: errorCode(result) })
        return result
      }
      set({ connecting: false })
      return { ok: true }
    } catch {
      // Bridge thật không ném lỗi qua IPC, nhưng preload lỗi vẫn có thể reject.
      set({ connecting: false, lastError: NQ_ERROR.connectFailed })
      return { ok: false, error: NQ_ERROR.connectFailed }
    }
  },

  disconnect: async () => {
    try {
      await getBridge().disconnect()
    } catch {
      set({ lastError: NQ_ERROR.sendFailed })
    }
  },

  send: async (frame) => {
    try {
      const result = await getBridge().send(frame)
      if (!result.ok) set({ lastError: errorCode(result) })
      return result
    } catch {
      set({ lastError: NQ_ERROR.sendFailed })
      return { ok: false, error: NQ_ERROR.sendFailed }
    }
  },

  syncStatus: async () => {
    try {
      const status = await getBridge().getStatus()
      set({ status })
    } catch {
      // Stub offline trả `idle`; bridge lỗi thì giữ trạng thái hiện tại.
    }
  },

  handleEvent: (event) => {
    const kind = event.kind

    if (kind === 'status' && event.status) {
      const next = event.status
      const previous = get().status
      const patch: Partial<ConnectionUiState> = { status: next }

      const lostSocket = previous.state === 'connected' && TERMINAL_STATES.has(next.state)
      if (lostSocket && useSessionStore.getState().player !== null) {
        // Socket đóng = phiên trên server đã bị dọn; không thể tiếp tục bằng dữ liệu cũ.
        useSessionStore.getState().clear()
        patch.connectionLost = true
      }

      if (next.state === 'connected') {
        patch.lastError = null
        patch.transportError = null
        patch.connectionLost = false
      }

      set(patch)
      return
    }

    if (kind === 'transport-error' && event.error) {
      set({ transportError: event.error, lastError: event.error.code || NQ_ERROR.sendFailed })
      return
    }

    if (kind === 'message' && event.message) {
      const message = event.message

      // Push hồ sơ: mirror `ClientApp.updateCurrentPlayer`.
      if (message.type === 'PROFILE_DATA') {
        useSessionStore.getState().setPlayer(message.payload)
      } else if (message.type === 'LOGIN_OK') {
        useSessionStore.getState().setPlayer(message.payload)
        set({ connectionLost: false })
      }

      for (const listener of messageListeners) {
        try {
          listener(message)
        } catch (error) {
          // Một màn hình lỗi không được chặn các màn hình khác nhận message.
          // DEV: log **loại message** để lỗi trong listener không bị nuốt im lặng (đã từng
          // che một bug của store bộ đề). Không bao giờ log payload: nó có thể chứa
          // username/mật khẩu/PIN/ticket.
          if (import.meta.env.DEV) {
            const name = error instanceof Error ? error.name : typeof error
            console.error(`[nq] message listener threw while handling ${message.type} (${name})`)
          }
        }
      }
    }
  },

  clearError: () => set({ lastError: null, transportError: null }),

  dismissConnectionLost: () => set({ connectionLost: false }),

  signOut: async () => {
    const hadSession = useSessionStore.getState().player !== null
    useSessionStore.getState().clear()
    set({ connectionLost: false, lastError: null, transportError: null, connecting: false })

    if (!hadSession && get().status.state !== 'connected') {
      return
    }

    try {
      // Gửi ý định rõ ràng trước khi đóng socket (main cũng gửi DISCONNECT khi teardown).
      await getBridge().send({ type: 'DISCONNECT', payload: '' })
    } catch {
      // Socket đã đóng thì thôi; main dọn kênh ở bước dưới.
    }

    await get().disconnect()
    await get().syncStatus()
  }
}))

/** Reset về trạng thái ban đầu (test + sau khi đăng xuất hoàn toàn). */
export function resetConnectionStore(): void {
  useConnectionStore.setState(initialConnectionState)
}
