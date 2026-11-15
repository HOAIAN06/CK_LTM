/**
 * Java ↔ TypeScript protocol compatibility checks.
 *
 * These tests read the real Java sources and compare them with the mirrored constants. They live
 * under `src/main/net` (not `src/shared/protocol`) because they need `node:fs`; the shared folder
 * is also compiled for the renderer by `tsconfig.web.json`.
 *
 * The `/tmp` verification sandbox only receives a copy of `desktop/`, so the Java tree is absent
 * there and the checks skip. Set `NQ_REPO_ROOT` to the repository root to force them anywhere:
 *
 *   NQ_REPO_ROOT=$PWD bash desktop/scripts/verify-linux.sh protocol \
 *     npx vitest run src/main/net/protocol-compat.test.ts
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  MEDIA_ACK_EXPIRED_TICKET,
  MEDIA_ACK_INVALID_MAGIC,
  MEDIA_ACK_INVALID_TICKET,
  MEDIA_ACK_OK,
  MEDIA_ACK_ROOM_CLOSED,
  MEDIA_ACK_UNSUPPORTED_VERSION,
  MEDIA_FRAME_PUBLISH,
  MEDIA_FRAME_SUBSCRIBE,
  MEDIA_HANDSHAKE_TIMEOUT_MILLIS,
  MEDIA_MAGIC,
  MEDIA_MAX_FACES,
  MEDIA_MAX_JPEG_BYTES,
  MEDIA_MAX_TICKET_BYTES,
  MEDIA_ROLE_CODES,
  MEDIA_VERSION,
  MESSAGE_TYPES,
  VISION_ATTENTION_ORDER
} from '@shared/protocol'

const MESSAGE_TYPE_JAVA = 'src/main/java/com/nihongoquest/common/protocol/MessageType.java'
const MEDIA_PROTOCOL_JAVA = 'src/main/java/com/nihongoquest/common/media/MediaProtocol.java'
const VISION_METADATA_JAVA = 'src/main/java/com/nihongoquest/common/media/VisionMetadata.java'

function resolveRepoSibling(relativePath: string): string {
  const root = process.env.NQ_REPO_ROOT
  if (root !== undefined && root.length > 0) {
    return resolve(root, relativePath)
  }
  return fileURLToPath(new URL(`../../../../${relativePath}`, import.meta.url))
}

const messageTypeJavaPath = resolveRepoSibling(MESSAGE_TYPE_JAVA)
const mediaProtocolJavaPath = resolveRepoSibling(MEDIA_PROTOCOL_JAVA)
const visionMetadataJavaPath = resolveRepoSibling(VISION_METADATA_JAVA)

const javaAvailable =
  existsSync(messageTypeJavaPath) &&
  existsSync(mediaProtocolJavaPath) &&
  existsSync(visionMetadataJavaPath)

function readJava(path: string): string {
  return readFileSync(path, 'utf8')
}

function readJavaMessageTypes(): string[] {
  const source = readJava(messageTypeJavaPath)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
  const body = source.slice(source.indexOf('{') + 1, source.lastIndexOf('}'))
  return body
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => /^[A-Z0-9_]+$/.test(entry))
}

function javaIntConstants(source: string): Map<string, number> {
  const constants = new Map<string, number>()
  const pattern = /static final int ([A-Z0-9_]+) = ([^;]+);/g
  for (const match of source.matchAll(pattern)) {
    const name = match[1]
    const raw = match[2].trim().replace(/_/g, '')
    const value = Number(raw)
    if (!Number.isNaN(value)) {
      constants.set(name, value)
    }
  }
  return constants
}

function javaAttentionOrder(source: string): string[] {
  const enumStart = source.indexOf('public enum Attention')
  const enumBody = source.slice(enumStart, source.indexOf('}', enumStart))
  return enumBody
    .slice(enumBody.indexOf('{') + 1)
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => /^[A-Z0-9_]+$/.test(entry))
}

describe('Java sources', () => {
  it('are readable when NQ_REPO_ROOT is set (otherwise the cross-checks skip)', () => {
    if (process.env.NQ_REPO_ROOT === undefined) {
      return
    }
    // Explicitly requested: fail loudly instead of silently skipping.
    expect(javaAvailable).toBe(true)
    expect(readJavaMessageTypes()).toHaveLength(71)
  })
})

describe('MessageType.java compatibility', () => {
  it('mirrors every constant in declaration order', () => {
    if (!javaAvailable) {
      // Sandbox without the Java tree: `message-types.test.ts` still pins the literal contract.
      return
    }
    expect(MESSAGE_TYPES).toEqual(readJavaMessageTypes())
  })
})

describe('MediaProtocol.java compatibility', () => {
  it('mirrors MAGIC, VERSION, limits and frame codes', () => {
    if (!javaAvailable) {
      return
    }
    const java = javaIntConstants(readJava(mediaProtocolJavaPath))
    expect(java.get('MAGIC')).toBe(MEDIA_MAGIC)
    expect(java.get('VERSION')).toBe(MEDIA_VERSION)
    expect(java.get('MAX_TICKET_BYTES')).toBe(MEDIA_MAX_TICKET_BYTES)
    expect(java.get('MAX_JPEG_BYTES')).toBe(MEDIA_MAX_JPEG_BYTES)
    expect(java.get('MAX_FACES')).toBe(MEDIA_MAX_FACES)
    expect(java.get('HANDSHAKE_TIMEOUT_MILLIS')).toBe(MEDIA_HANDSHAKE_TIMEOUT_MILLIS)
    expect(java.get('FRAME_PUBLISH')).toBe(MEDIA_FRAME_PUBLISH)
    expect(java.get('FRAME_SUBSCRIBE')).toBe(MEDIA_FRAME_SUBSCRIBE)
  })

  it('mirrors every ACK code', () => {
    if (!javaAvailable) {
      return
    }
    const java = javaIntConstants(readJava(mediaProtocolJavaPath))
    expect(java.get('ACK_OK')).toBe(MEDIA_ACK_OK)
    expect(java.get('ACK_INVALID_MAGIC')).toBe(MEDIA_ACK_INVALID_MAGIC)
    expect(java.get('ACK_UNSUPPORTED_VERSION')).toBe(MEDIA_ACK_UNSUPPORTED_VERSION)
    expect(java.get('ACK_INVALID_TICKET')).toBe(MEDIA_ACK_INVALID_TICKET)
    expect(java.get('ACK_EXPIRED_TICKET')).toBe(MEDIA_ACK_EXPIRED_TICKET)
    expect(java.get('ACK_ROOM_CLOSED')).toBe(MEDIA_ACK_ROOM_CLOSED)
  })

  it('mirrors the role byte codes', () => {
    if (!javaAvailable) {
      return
    }
    const source = readJava(mediaProtocolJavaPath)
    const match = /PUBLISHER\s*\(\s*(\d+)\s*\)\s*,\s*HOST_SUBSCRIBER\s*\(\s*(\d+)\s*\)/.exec(source)
    expect(match).not.toBeNull()
    expect(Number(match?.[1])).toBe(MEDIA_ROLE_CODES.PUBLISHER)
    expect(Number(match?.[2])).toBe(MEDIA_ROLE_CODES.HOST_SUBSCRIBER)
  })
})

describe('VisionMetadata.java compatibility', () => {
  it('mirrors the attention ordinal order', () => {
    if (!javaAvailable) {
      return
    }
    expect([...VISION_ATTENTION_ORDER]).toEqual(javaAttentionOrder(readJava(visionMetadataJavaPath)))
  })
})
