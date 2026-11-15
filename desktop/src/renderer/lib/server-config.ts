/**
 * Cấu hình máy chủ của màn hình đăng nhập.
 *
 * Chỉ host + port được persist (`localStorage`), đúng như `ClientConfig` bên JavaFX đọc
 * từ `db.properties`; mật khẩu không bao giờ đi vào đây. Giá trị đọc lên được kiểm tra
 * lại bằng cùng luật với `validateHost`/`parsePort` nên dữ liệu hỏng không thể làm UI lỗi.
 */
import { DEFAULT_PORT, parsePort, validateHost } from './validation'
import { readStoredJson, STORAGE_KEYS, writeStoredJson } from './storage'

export interface ServerTarget {
  host: string
  port: string
}

export const DEFAULT_SERVER_TARGET: ServerTarget = {
  host: 'localhost',
  port: String(DEFAULT_PORT)
}

function isServerTarget(value: unknown): value is ServerTarget {
  if (typeof value !== 'object' || value === null) return false
  const record = value as { host?: unknown; port?: unknown }
  if (typeof record.host !== 'string' || typeof record.port !== 'string') return false
  return validateHost(record.host) === null && parsePort(record.port) !== null
}

export function readServerTarget(): ServerTarget {
  const stored = readStoredJson(STORAGE_KEYS.server, isServerTarget)
  if (!stored) return { ...DEFAULT_SERVER_TARGET }
  return { host: stored.host.trim(), port: String(parsePort(stored.port) ?? DEFAULT_PORT) }
}

export function writeServerTarget(target: ServerTarget): void {
  const port = parsePort(target.port)
  const host = target.host.trim()
  if (port === null || validateHost(host) !== null) return
  writeStoredJson(STORAGE_KEYS.server, { host, port: String(port) } satisfies ServerTarget)
}

/** Nhãn hiển thị `host:port` đã chuẩn hoá. */
export function describeServerTarget(target: ServerTarget): string {
  return `${target.host.trim()}:${target.port.trim()}`
}
