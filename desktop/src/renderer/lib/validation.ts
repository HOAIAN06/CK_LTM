/**
 * Luật kiểm tra dữ liệu form, khớp đúng hợp đồng của server.
 *
 * - Username: `[a-zA-Z0-9_]{3,20}` (`ServerRequestRouter.USERNAME_PATTERN`).
 * - Mật khẩu: tối thiểu 4 ký tự.
 * - Host/port: mirror `sanitizeHost` / `parsePort` của main process, để người dùng nhận
 *   lỗi ngay tại field thay vì lỗi IPC khó hiểu.
 *
 * Client chỉ kiểm tra hình dạng dữ liệu; quyền quyết định vẫn ở server.
 */
import type { FormField } from './error-codes'

export type AuthMode = 'login' | 'register'

export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/
export const MIN_PASSWORD_LENGTH = 4
export const DEFAULT_PORT = 5000
export const MAX_HOST_LENGTH = 255
export const FORBIDDEN_HOST_CHARS = '/\\@?#'

export const USERNAME_HINT = '3–20 ký tự: chữ, số hoặc dấu gạch dưới'
export const PASSWORD_HINT = 'Tối thiểu 4 ký tự'
export const CONFIRM_HINT = 'Gõ lại đúng mật khẩu ở trên'

export type FieldErrors = Partial<Record<FormField, string>>

export function validateUsername(rawUsername: string): string | null {
  const username = rawUsername.trim()
  if (username.length === 0) return 'Nhập username của bạn'
  if (!USERNAME_PATTERN.test(username)) {
    return 'Username gồm 3-20 chữ, số hoặc dấu gạch dưới'
  }
  return null
}

export function validatePassword(password: string): string | null {
  if (password.length === 0) return 'Nhập mật khẩu'
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`
  }
  return null
}

export function validateConfirmPassword(password: string, confirm: string): string | null {
  if (confirm.length === 0) return 'Nhập lại mật khẩu để xác nhận'
  if (password !== confirm) return 'Mật khẩu xác nhận không khớp'
  return null
}

export interface AuthFormInput {
  mode: AuthMode
  username: string
  password: string
  confirm: string
}

/** Trả về các lỗi theo field; object rỗng nghĩa là hợp lệ. */
export function validateAuthForm(input: AuthFormInput): FieldErrors {
  const errors: FieldErrors = {}

  const usernameError = validateUsername(input.username)
  if (usernameError) errors.username = usernameError

  const passwordError = validatePassword(input.password)
  if (passwordError) errors.password = passwordError

  if (input.mode === 'register') {
    const confirmError = validateConfirmPassword(input.password, input.confirm)
    if (confirmError) errors.confirm = confirmError
  }

  return errors
}

/** `localhost`, IPv4 hoặc hostname nội bộ; cùng luật với `sanitizeHost` của main. */
export function validateHost(rawHost: string): string | null {
  const host = rawHost.trim()
  if (host.length === 0) return 'Địa chỉ server không được để trống'
  if (host.length > MAX_HOST_LENGTH) return 'Địa chỉ server quá dài'
  for (const char of host) {
    const code = char.codePointAt(0)
    if (code === undefined || code < 0x21 || code > 0x7e) {
      return 'Địa chỉ server không được chứa khoảng trắng hoặc ký tự lạ'
    }
    if (FORBIDDEN_HOST_CHARS.includes(char)) {
      return `Địa chỉ server không được chứa ${FORBIDDEN_HOST_CHARS.split('').join(' ')}`
    }
  }
  return null
}

/** `"5000"` → `5000`; chuỗi rỗng/sai/ngoài 1..65535 → `null`. */
export function parsePort(rawPort: string): number | null {
  const trimmed = rawPort.trim()
  if (!/^\d{1,5}$/.test(trimmed)) return null
  const port = Number(trimmed)
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null
  return port
}

export function validatePort(rawPort: string): string | null {
  if (rawPort.trim().length === 0) return 'Nhập cổng của server'
  if (parsePort(rawPort) === null) return 'Cổng phải là số từ 1 đến 65535'
  return null
}

export function validateServerTarget(host: string, port: string): FieldErrors {
  const errors: FieldErrors = {}
  const hostError = validateHost(host)
  if (hostError) errors.host = hostError
  const portError = validatePort(port)
  if (portError) errors.port = portError
  return errors
}

/** Thứ tự focus khi submit: field đầu tiên có lỗi. */
export const FIELD_ORDER: ReadonlyArray<FormField> = [
  'username',
  'password',
  'confirm',
  'host',
  'port'
]

export function firstInvalidField(errors: FieldErrors): FormField | null {
  for (const field of FIELD_ORDER) {
    if (errors[field]) return field
  }
  return null
}
