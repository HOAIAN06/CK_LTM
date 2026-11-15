/**
 * Transport surface for the main process.
 *
 * `docs/desktop/contracts.md` §4.1 fixes this import path: architecture consumes
 * `createControlChannel`, `ControlChannel` and `ControlChannelOptions` from `../net`.
 *
 * Everything here uses `node:net` / `node:buffer`, so it must never be imported by the renderer.
 */

export {
  DEFAULT_MAX_FRAME_BYTES,
  FrameReader,
  type FrameReaderOptions
} from './frame-reader'

export {
  CONTROL_CONNECT_TIMEOUT_MS,
  TransportFailure,
  createControlChannel,
  type ControlChannel,
  type ControlChannelOptions,
  type TransportError,
  type TransportErrorCode
} from './control-channel'
