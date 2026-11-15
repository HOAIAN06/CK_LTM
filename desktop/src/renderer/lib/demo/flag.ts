/**
 * Cờ "chế độ xem thử" — tách khỏi fixture để chrome của app (badge trên title bar)
 * không phải kéo cả fixture vào bundle production.
 *
 * Cờ này chỉ được bật bởi `lib/demo/fixture.ts`, và file đó bị loại khỏi bản build
 * production bằng `import.meta.env.DEV`.
 */
let active = false

export function setDemoMode(value: boolean): void {
  active = value
}

export function isDemoMode(): boolean {
  return active
}
