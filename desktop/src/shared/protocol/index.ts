/**
 * Public protocol surface shared by the main process, preload bridge and renderer.
 *
 * Everything here is either:
 *  - a compile-time type, or
 *  - a runtime helper with no Node/Electron dependency (`codec`, media constants, type guards).
 *
 * The TCP framer lives in `src/main/net/frame-reader.ts` because it uses `node:buffer` and is
 * only ever needed by the main process.
 *
 * Renderer code must only use `import type` from this barrel, so bundlers do not pull
 * main-process concerns into the UI bundle.
 */

export * from './message-types'
export * from './payloads'
export * from './codec'
export * from './media'
