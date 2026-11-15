/**
 * TCP control channel for the NihongoQuest desktop client (main process only).
 *
 * Wire contract: one UTF-8 JSON envelope per line, exactly like the JavaFX `GameClient`:
 *   {"type":"<MessageType>","payload":<object|string|null>}\n
 *
 * This module is a transport, not a game client:
 *  - it never interprets payloads and never decides gameplay state (the Java server does);
 *  - it does not auto-reconnect (the renderer decides, with visible status);
 *  - it never logs credentials, PINs or media tickets. Payload bytes never appear in errors.
 *
 * The renderer must not import this file: `node:net` lives in the main process, and the
 * renderer only sees `window.nq` from the preload bridge.
 */

import { createConnection, type Socket } from 'node:net'
import type { ConnectionState, ConnectionStatus } from '@shared/ipc'
import {
  decodeMessage,
  encodeMessage,
  isProtocolError,
  type OutboundMessage,
  type ServerMessage
} from '@shared/protocol'
import { DEFAULT_MAX_FRAME_BYTES, FrameReader } from './frame-reader'

/** Contract value from `docs/desktop/contracts.md` (Java `GameClient` also uses 5 s). */
export const CONTROL_CONNECT_TIMEOUT_MS = 5_000

/** Best-effort FIN flush before a hard close. */
const DISCONNECT_FLUSH_TIMEOUT_MS = 2_000

const MAX_ERROR_LENGTH = 300

export type TransportErrorCode =
  | 'INVALID_OPTIONS'
  | 'ALREADY_CONNECTED'
  | 'CONNECT_IN_PROGRESS'
  | 'CONNECT_CANCELLED'
  | 'CONNECT_TIMEOUT'
  | 'CONNECT_FAILED'
  | 'NOT_CONNECTED'
  | 'SEND_FAILED'
  | 'INVALID_FRAME'
  | 'CONNECTION_LOST'
  | 'PROTOCOL_ERROR'
  | 'FRAME_TOO_LARGE'
  | 'HANDLER_FAILED'

/** Payload-free transport failure. Safe to forward to the renderer. */
export interface TransportError {
  code: TransportErrorCode
  message: string
}

export interface ControlChannelOptions {
  onMessage: (message: ServerMessage) => void
  onStatus: (status: ConnectionStatus) => void
  onError: (error: TransportError) => void
}

/** Transport surface consumed by `src/main/ipc/register-control-handlers.ts`. */
export interface ControlChannel {
  connect(host: string, port: number): Promise<void>
  disconnect(): Promise<void>
  send(frame: OutboundMessage): void
  isConnected(): boolean
  /** Snapshot used by `nq:status` and tests; the renderer never sees this object directly. */
  getStatus(): ConnectionStatus
}

export class TransportFailure extends Error {
  readonly code: TransportErrorCode

  constructor(code: TransportErrorCode, message: string) {
    super(message)
    this.name = 'TransportFailure'
    this.code = code
    Object.setPrototypeOf(this, TransportFailure.prototype)
  }
}

type Phase = 'idle' | 'connecting' | 'connected' | 'closing'

class TcpControlChannel implements ControlChannel {
  private phase: Phase = 'idle'
  private socket: Socket | null = null
  private reader = new FrameReader({ maxFrameBytes: DEFAULT_MAX_FRAME_BYTES })
  private connectTimer: NodeJS.Timeout | null = null
  private closeTimer: NodeJS.Timeout | null = null
  private connectResolve: (() => void) | null = null
  private connectReject: ((reason: Error) => void) | null = null
  private disconnectWaiters: Array<() => void> = []

  private host: string | null = null
  private port: number | null = null
  private lastError: string | null = null
  private connectedAt: number | null = null
  /** Last state published through `onStatus`, so `getStatus()` cannot drift from it. */
  private state: ConnectionState = 'idle'

  constructor(private readonly options: ControlChannelOptions) {}

  async connect(rawHost: string, rawPort: number): Promise<void> {
    if (this.phase === 'connecting') {
      throw new TransportFailure('CONNECT_IN_PROGRESS', 'Đang kết nối tới server')
    }
    if (this.phase === 'connected' || this.phase === 'closing') {
      throw new TransportFailure('ALREADY_CONNECTED', 'Đã có kết nối tới server')
    }

    const host = normaliseHost(rawHost)
    if (host === null || !Number.isInteger(rawPort) || rawPort < 1 || rawPort > 65_535) {
      throw new TransportFailure('INVALID_OPTIONS', 'Địa chỉ hoặc cổng server không hợp lệ')
    }

    this.phase = 'connecting'
    this.host = host
    this.port = rawPort
    this.lastError = null
    this.connectedAt = null
    this.reader.reset()
    this.notifyStatus('connecting')

    await new Promise<void>((resolve, reject) => {
      this.connectResolve = resolve
      this.connectReject = reject

      let socket: Socket
      try {
        socket = createConnection({ host, port: rawPort })
      } catch (error) {
        this.failConnect('CONNECT_FAILED', describeError(error, 'Không thể kết nối tới server'))
        return
      }

      this.socket = socket
      socket.setNoDelay(true)

      this.connectTimer = setTimeout(() => {
        this.connectTimer = null
        this.failConnect('CONNECT_TIMEOUT', 'Hết thời gian kết nối tới server')
      }, CONTROL_CONNECT_TIMEOUT_MS)
      this.connectTimer.unref()

      socket.once('connect', () => this.handleConnect())
      socket.on('data', (chunk: Buffer) => this.handleData(chunk))
      socket.on('error', (error: Error) => this.handleSocketError(error))
      socket.on('close', () => this.handleClose())
    })
  }

  async disconnect(): Promise<void> {
    if (this.phase === 'idle') return

    if (this.phase === 'connecting') {
      this.clearConnectTimer()
      const reject = this.connectReject
      this.connectResolve = null
      this.connectReject = null
      this.phase = 'idle'
      this.connectedAt = null
      this.destroySocket()
      reject?.(new TransportFailure('CONNECT_CANCELLED', 'Đã huỷ kết nối'))
      this.notifyStatus('disconnected')
      return
    }

    if (this.phase === 'closing') {
      await new Promise<void>((resolve) => this.disconnectWaiters.push(resolve))
      return
    }

    this.phase = 'closing'
    const socket = this.socket
    const done = new Promise<void>((resolve) => this.disconnectWaiters.push(resolve))

    if (socket === null || socket.destroyed) {
      this.finishDisconnect()
      return done
    }

    try {
      // Same courtesy frame as `GameClient.disconnect()`: the server can clean the session up
      // immediately instead of waiting for the socket close.
      socket.write(`${encodeMessage({ type: 'DISCONNECT', payload: '' })}\n`, 'utf8')
    } catch {
      // Broken pipe: the close below still tears the socket down.
    }

    socket.end()
    this.closeTimer = setTimeout(() => {
      this.closeTimer = null
      this.socket?.destroy()
      this.finishDisconnect()
    }, DISCONNECT_FLUSH_TIMEOUT_MS)
    this.closeTimer.unref()

    await done
  }

  send(frame: OutboundMessage): void {
    if (this.phase !== 'connected' || this.socket === null || this.socket.destroyed) {
      throw new TransportFailure('NOT_CONNECTED', 'Chưa kết nối tới server')
    }

    let line: string
    try {
      line = encodeMessage(frame)
    } catch (error) {
      const message = isProtocolError(error) ? error.message : 'Frame không hợp lệ'
      throw new TransportFailure('INVALID_FRAME', message)
    }

    try {
      // Control frames are small; Node buffers the write and reports async socket errors.
      this.socket.write(`${line}\n`, 'utf8')
    } catch {
      const failure = new TransportFailure('SEND_FAILED', 'Không gửi được dữ liệu tới server')
      this.failConnected(failure.code, failure.message)
      throw failure
    }
  }

  isConnected(): boolean {
    return this.phase === 'connected' && this.socket !== null && !this.socket.destroyed
  }

  getStatus(): ConnectionStatus {
    return {
      state: this.state,
      host: this.host,
      port: this.port,
      lastError: this.lastError,
      connectedAt: this.connectedAt
    }
  }

  /* ---------------------------------------------------------------- */
  /* Socket lifecycle                                                  */
  /* ---------------------------------------------------------------- */

  private handleConnect(): void {
    if (this.phase !== 'connecting') {
      this.destroySocket()
      return
    }

    this.clearConnectTimer()
    this.phase = 'connected'
    this.connectedAt = Date.now()
    this.lastError = null
    this.notifyStatus('connected')

    const resolve = this.connectResolve
    this.connectResolve = null
    this.connectReject = null
    resolve?.()
  }

  private handleData(chunk: Buffer): void {
    if (this.phase !== 'connected') return

    let lines: string[]
    try {
      lines = this.reader.push(chunk)
    } catch (error) {
      // Framing failures desynchronize the byte stream: they are fatal.
      this.failProtocol(error)
      return
    }

    for (const line of lines) {
      let message: ServerMessage
      try {
        message = decodeMessage(line)
      } catch (error) {
        // A complete-but-undecodable line does NOT desynchronize the stream, so report it and
        // keep reading. Unknown-but-valid JSON must never kill an otherwise healthy session.
        this.reportDecodeFailure(error)
        continue
      }

      try {
        this.options.onMessage(message)
      } catch {
        // A renderer/bridge bug must not tear down an otherwise healthy TCP session.
        this.reportError('HANDLER_FAILED', 'Không xử lý được message từ server')
      }
    }
  }

  private reportDecodeFailure(error: unknown): void {
    const message = isProtocolError(error) ? error.message : 'Frame từ server không hợp lệ'
    this.reportError('PROTOCOL_ERROR', message)
  }

  private handleSocketError(error: Error): void {
    const message = describeError(error, 'Lỗi kết nối tới server')
    if (this.phase === 'connecting') {
      this.failConnect('CONNECT_FAILED', message)
    } else if (this.phase === 'connected') {
      this.failConnected('CONNECTION_LOST', message)
    }
  }

  private handleClose(): void {
    this.clearConnectTimer()
    this.socket = null

    if (this.phase === 'connecting') {
      this.failConnect('CONNECT_FAILED', 'Không thể kết nối tới server')
      return
    }
    if (this.phase === 'connected') {
      this.failConnected('CONNECTION_LOST', 'Server đã đóng kết nối')
      return
    }
    if (this.phase === 'closing') {
      this.finishDisconnect()
    }
  }

  /* ---------------------------------------------------------------- */
  /* Failure paths                                                     */
  /* ---------------------------------------------------------------- */

  private failConnect(code: TransportErrorCode, message: string): void {
    if (this.phase !== 'connecting') return

    this.clearConnectTimer()
    const reject = this.connectReject
    this.connectResolve = null
    this.connectReject = null
    this.phase = 'idle'
    this.connectedAt = null
    this.lastError = message
    this.destroySocket()
    this.reportError(code, message)
    this.notifyStatus('error')
    reject?.(new TransportFailure(code, message))
  }

  private failConnected(code: TransportErrorCode, message: string): void {
    if (this.phase !== 'connected') return

    this.phase = 'idle'
    this.connectedAt = null
    this.lastError = message
    this.destroySocket()
    this.reportError(code, message)
    this.notifyStatus('error')
    this.resolveDisconnectWaiters()
  }

  private failProtocol(error: unknown): void {
    if (isProtocolError(error)) {
      const code: TransportErrorCode =
        error.code === 'FRAME_TOO_LARGE' ? 'FRAME_TOO_LARGE' : 'PROTOCOL_ERROR'
      this.failConnected(code, error.message)
      return
    }
    this.failConnected('PROTOCOL_ERROR', 'Frame từ server không hợp lệ')
  }

  private finishDisconnect(): void {
    if (this.phase !== 'closing') return

    this.clearCloseTimer()
    this.phase = 'idle'
    this.connectedAt = null
    this.socket = null
    this.notifyStatus('disconnected')
    this.resolveDisconnectWaiters()
  }

  /* ---------------------------------------------------------------- */
  /* Helpers                                                           */
  /* ---------------------------------------------------------------- */

  private notifyStatus(state: ConnectionState): void {
    this.state = state
    const status: ConnectionStatus = {
      state,
      host: this.host,
      port: this.port,
      lastError: this.lastError,
      connectedAt: this.connectedAt
    }
    try {
      this.options.onStatus(status)
    } catch {
      // Status is advisory; a consumer bug cannot stop the socket loop.
    }
  }

  private reportError(code: TransportErrorCode, message: string): void {
    const safeMessage = message.replace(/[\r\n]+/g, ' ').trim().slice(0, MAX_ERROR_LENGTH)
    try {
      this.options.onError({ code, message: safeMessage })
    } catch {
      // Same rationale as notifyStatus.
    }
  }

  private resolveDisconnectWaiters(): void {
    const waiters = this.disconnectWaiters
    this.disconnectWaiters = []
    for (const resolve of waiters) resolve()
  }

  private destroySocket(): void {
    const socket = this.socket
    this.socket = null
    socket?.destroy()
  }

  private clearConnectTimer(): void {
    if (this.connectTimer !== null) {
      clearTimeout(this.connectTimer)
      this.connectTimer = null
    }
  }

  private clearCloseTimer(): void {
    if (this.closeTimer !== null) {
      clearTimeout(this.closeTimer)
      this.closeTimer = null
    }
  }
}

function normaliseHost(value: string): string | null {
  if (typeof value !== 'string') return null
  let host = value.trim()
  if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1)
  if (host.length === 0 || host.length > 253) return null
  if (host.includes(' ') || host.includes('/') || host.includes('@')) return null
  return host
}

function describeError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) return error.message
  return fallback
}

/** Create the single TCP control channel owned by the main process. */
export function createControlChannel(options: ControlChannelOptions): ControlChannel {
  if (
    typeof options?.onMessage !== 'function' ||
    typeof options.onStatus !== 'function' ||
    typeof options.onError !== 'function'
  ) {
    throw new TypeError('createControlChannel cần onMessage, onStatus và onError')
  }
  return new TcpControlChannel(options)
}
