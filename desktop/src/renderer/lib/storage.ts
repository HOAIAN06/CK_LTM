/**
 * Truy cập `localStorage` an toàn.
 *
 * `localStorage` có thể ném lỗi (chế độ riêng tư, quota, policy) hoặc trả dữ liệu
 * hỏng do phiên bản trước ghi vào. Mọi hàm ở đây nuốt lỗi và trả giá trị mặc định,
 * vì một theme hay host sai không được phép làm sập UI.
 *
 * Không bao giờ ghi mật khẩu/ticket/PIN vào đây.
 */

export const STORAGE_KEYS = {
  theme: 'nq.theme',
  server: 'nq.server'
} as const

export function readStoredString(key: string): string | null {
  try {
    const value = window.localStorage.getItem(key)
    return typeof value === 'string' ? value : null
  } catch {
    return null
  }
}

export function writeStoredString(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Bỏ qua: giá trị chỉ là tuỳ chọn hiển thị, không phải dữ liệu nghiệp vụ.
  }
}

export function readStoredJson<T>(key: string, isValid: (value: unknown) => value is T): T | null {
  const raw = readStoredString(key)
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isValid(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeStoredJson(key: string, value: unknown): void {
  try {
    writeStoredString(key, JSON.stringify(value))
  } catch {
    // Payload không serialize được thì bỏ qua, không làm hỏng luồng UI.
  }
}

export function removeStored(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Bỏ qua.
  }
}
