import { describe, expect, it } from 'vitest'
import {
  firstInvalidField,
  parsePort,
  validateAuthForm,
  validateConfirmPassword,
  validateHost,
  validatePassword,
  validateServerTarget,
  validateUsername
} from './validation'

describe('validateUsername', () => {
  it('accepts 3–20 letters, digits and underscores', () => {
    expect(validateUsername('abc')).toBeNull()
    expect(validateUsername('minh_anh_02')).toBeNull()
    expect(validateUsername('a'.repeat(20))).toBeNull()
    expect(validateUsername('  an_nguyen  ')).toBeNull()
  })

  it('rejects anything the server would reject', () => {
    expect(validateUsername('')).toContain('Nhập username')
    expect(validateUsername('ab')).toContain('3-20')
    expect(validateUsername('a'.repeat(21))).toContain('3-20')
    expect(validateUsername('an nguyen')).toContain('3-20')
    expect(validateUsername('an-nguyen')).toContain('3-20')
    expect(validateUsername('an.nguyen')).toContain('3-20')
    expect(validateUsername('日本語です')).toContain('3-20')
  })
})

describe('validatePassword', () => {
  it('requires at least 4 characters', () => {
    expect(validatePassword('')).toContain('Nhập mật khẩu')
    expect(validatePassword('123')).toContain('ít nhất 4')
    expect(validatePassword('1234')).toBeNull()
    expect(validatePassword('mật-khẩu-dài')).toBeNull()
  })
})

describe('validateConfirmPassword', () => {
  it('requires a matching confirmation', () => {
    expect(validateConfirmPassword('1234', '')).toContain('Nhập lại mật khẩu')
    expect(validateConfirmPassword('1234', '12345')).toContain('không khớp')
    expect(validateConfirmPassword('1234', '1234')).toBeNull()
  })
})

describe('validateAuthForm', () => {
  it('only checks the confirm field in register mode', () => {
    const login = validateAuthForm({
      mode: 'login',
      username: 'minh_anh',
      password: '1234',
      confirm: 'khác'
    })
    expect(login).toEqual({})

    const register = validateAuthForm({
      mode: 'register',
      username: 'minh_anh',
      password: '1234',
      confirm: 'khác'
    })
    expect(register.confirm).toContain('không khớp')
  })

  it('reports every invalid field at once so focus can pick the first', () => {
    const errors = validateAuthForm({ mode: 'register', username: 'ab', password: '1', confirm: '' })
    expect(Object.keys(errors).sort()).toEqual(['confirm', 'password', 'username'])
    expect(firstInvalidField(errors)).toBe('username')
    expect(firstInvalidField({ password: 'x', confirm: 'y' })).toBe('password')
    expect(firstInvalidField({})).toBeNull()
  })
})

describe('validateHost', () => {
  it('accepts hosts the IPC validator accepts', () => {
    expect(validateHost('localhost')).toBeNull()
    expect(validateHost('192.168.1.10')).toBeNull()
    expect(validateHost('  nq-server.lan ')).toBeNull()
    expect(validateHost('::1')).toBeNull()
  })

  it('rejects empty, spaced, path-like or non-ASCII hosts', () => {
    expect(validateHost('')).toBeTruthy()
    expect(validateHost('   ')).toBeTruthy()
    expect(validateHost('local host')).toBeTruthy()
    expect(validateHost('host/path')).toBeTruthy()
    expect(validateHost('user@host')).toBeTruthy()
    expect(validateHost('host?x')).toBeTruthy()
    expect(validateHost('máy-chủ')).toBeTruthy()
    expect(validateHost('a'.repeat(256))).toBeTruthy()
  })
})

describe('parsePort', () => {
  it('parses decimal ports inside 1..65535', () => {
    expect(parsePort('5000')).toBe(5000)
    expect(parsePort(' 5000 ')).toBe(5000)
    expect(parsePort('1')).toBe(1)
    expect(parsePort('65535')).toBe(65535)
  })

  it('rejects out-of-range and non-numeric values', () => {
    expect(parsePort('0')).toBeNull()
    expect(parsePort('65536')).toBeNull()
    expect(parsePort('')).toBeNull()
    expect(parsePort('12a')).toBeNull()
    expect(parsePort('-1')).toBeNull()
    expect(parsePort('5000.5')).toBeNull()
  })
})

describe('validateServerTarget', () => {
  it('returns field-level errors for the server form', () => {
    expect(validateServerTarget('localhost', '5000')).toEqual({})
    const errors = validateServerTarget('', 'abc')
    expect(errors.host).toBeTruthy()
    expect(errors.port).toBeTruthy()
  })
})
