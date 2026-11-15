import { describe, expect, it } from 'vitest'
import { UI_ERROR, describeErrorCode, errorCodeLabel, sanitizeErrorCode } from './error-codes'

describe('describeErrorCode', () => {
  it('maps documented auth codes to Vietnamese copy', () => {
    expect(describeErrorCode('INVALID_CREDENTIALS').title).toBe('Sai username hoặc mật khẩu')
    expect(describeErrorCode('USERNAME_TAKEN').title).toBe('Username đã được sử dụng')
    expect(describeErrorCode('ALREADY_ONLINE').title).toContain('đăng nhập ở nơi khác')
    expect(describeErrorCode('DATABASE_ERROR').title).toContain('database')
    expect(describeErrorCode('BAD_REQUEST').title).toBe('Thông tin đăng nhập không hợp lệ')
    expect(describeErrorCode('ALREADY_AUTHENTICATED').title).toContain('phiên đăng nhập cũ')
    expect(describeErrorCode('ALREADY_AUTHENTICATED').description).toContain('Ngắt kết nối')
  })

  it('maps transport and bridge codes', () => {
    expect(describeErrorCode('CONNECT_TIMEOUT').title).toBe('Máy chủ không phản hồi')
    expect(describeErrorCode('UNTRUSTED_SENDER').title).toContain('bảo mật')
    expect(describeErrorCode('BRIDGE_UNAVAILABLE').title).toContain('cầu nối')
    expect(describeErrorCode('NOT_CONNECTED').title).toContain('Chưa kết nối')
    expect(describeErrorCode(UI_ERROR.requestTimeout).title).toBe('Máy chủ chưa trả lời')
  })

  it('normalises case and surrounding whitespace', () => {
    expect(describeErrorCode('  invalid_credentials  ').title).toBe('Sai username hoặc mật khẩu')
    expect(describeErrorCode('username_taken').field).toBe('username')
  })

  it('tells the UI which field to focus for server-side auth errors', () => {
    expect(describeErrorCode('USERNAME_TAKEN').field).toBe('username')
    expect(describeErrorCode('INVALID_CREDENTIALS').field).toBe('password')
    expect(describeErrorCode('INVALID_HOST').field).toBe('host')
    expect(describeErrorCode('INVALID_PORT').field).toBe('port')
  })

  it('maps quiz-set, quiz-room and social codes instead of leaking raw codes', () => {
    expect(describeErrorCode('NOT_OWNER').title).toContain('chủ sở hữu')
    expect(describeErrorCode('INVALID_QUIZ').title).toContain('Bộ đề')
    expect(describeErrorCode('QUIZ_NOT_PUBLISHED').title).toContain('chưa được xuất bản')
    expect(describeErrorCode('TARGET_OFFLINE').title).toContain('ngoại tuyến')
    expect(describeErrorCode('TARGET_BUSY').title).toContain('đang bận')
    expect(describeErrorCode('NOT_QUIZ_HOST').title).toContain('host')
    expect(describeErrorCode('INVITE_EXPIRED').title).toContain('hết hạn')
    expect(describeErrorCode('NOT_ENOUGH_PLAYERS').title).toContain('đủ người')
    expect(describeErrorCode('PROCTORING_HOST_CANNOT_PLAY').title).toContain('giám sát')
  })

  it('falls back safely for unknown or malformed codes', () => {    const unknown = describeErrorCode('SOMETHING_NEW')
    expect(unknown.title).toBe('Đã xảy ra lỗi không xác định')
    expect(unknown.description).toContain('SOMETHING_NEW')

    expect(describeErrorCode(undefined).title).toBe('Đã xảy ra lỗi không xác định')
    expect(describeErrorCode(null).title).toBe('Đã xảy ra lỗi không xác định')
    expect(describeErrorCode('').title).toBe('Đã xảy ra lỗi không xác định')
    expect(describeErrorCode('<script>alert(1)</script>').description).not.toContain('<script>')
  })
})

describe('sanitizeErrorCode', () => {
  it('keeps only protocol-shaped codes', () => {
    expect(sanitizeErrorCode('USERNAME_TAKEN')).toBe('USERNAME_TAKEN')
    expect(sanitizeErrorCode(' username_taken ')).toBe('USERNAME_TAKEN')
    expect(sanitizeErrorCode('bad code')).toBeNull()
    expect(sanitizeErrorCode('a'.repeat(65))).toBeNull()
    expect(sanitizeErrorCode(42)).toBeNull()
  })
})

describe('errorCodeLabel', () => {
  it('returns the cleaned code or null', () => {
    expect(errorCodeLabel('connect_timeout')).toBe('CONNECT_TIMEOUT')
    expect(errorCodeLabel('nope!')).toBeNull()
    expect(errorCodeLabel(null)).toBeNull()
  })
})
