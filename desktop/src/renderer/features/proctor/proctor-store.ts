/**
 * Proctor coordinator phía renderer — bản Electron của `ProctoringCoordinator` (JavaFX).
 *
 * Vì sao là store app-scoped chứ không phải state của route: ticket media **dùng một lần** và
 * server chỉ cấp lại khi phòng bắt đầu, khi reconnect, hoặc khi kênh media ngắt. Nếu socket
 * publisher/subscriber sống theo route thì việc đi từ `/quiz/lobby` sang `/quiz/battle` sẽ
 * đóng kênh ngay sau khi mở (đúng thời điểm phòng bắt đầu). Store này giữ kết nối media suốt
 * phiên phòng, đúng như coordinator bên JavaFX.
 *
 * Trách nhiệm:
 * - Nhận `PROCTOR_MEDIA_SESSION` → mở publisher (player) hoặc subscriber (host).
 * - Báo `PROCTOR_STATUS_REPORT` mỗi khi trạng thái camera **đổi**.
 * - Báo `PROCTOR_EVENT_REPORT` cho các sự kiện thật sự phát hiện được (xem
 *   `DETECTABLE_EVENT_TYPES`) và **không gửi** khi phòng đã kết thúc/huỷ.
 * - Giữ tile/feed cho host dashboard; frame đi qua `frame-hub` để không re-render cả màn hình.
 *
 * KHÔNG có logic điểm/phòng: mọi thứ vẫn do Java server quyết định.
 * KHÔNG lưu ticket vào state công khai: ticket nằm ở biến module và không bao giờ vào DOM/log.
 */
import { create } from 'zustand'
import type {
  CameraStatus,
  CalibrationStatus,
  ProctorEventData,
  ProctorEventType,
  ProctorMediaSession,
  ProctorSeverity,
  ProctorStatusUpdate,
  ServerMessage
} from '@shared/protocol'
import {
  MEDIA_ERROR,
  type MediaCommandResult,
  type MediaPublishFrameRequest,
  type MediaSessionTarget,
  type MediaStatusSnapshot,
  type NqMediaApi
} from '@shared/media-ipc'
import { subscribeServerMessages, useConnectionStore } from '../../lib/connection-store'
import { getMediaApi } from './media-client'
import { clearHubFrames, publishHubFrame } from './frame-hub'
import { createFocusWatcher, type FocusAwayKind, type FocusDecision } from './focus-events'
import {
  CAMERA_DETAIL,
  buildEventReport,
  buildStatusReport,
  canEmitEvent,
  canReportStatus,
  createEventId,
  type DetectableEventType,
  type ProctorPhase,
  type ProctorRoomContext
} from './proctor-protocol'

/** Trần feed sự kiện của host (yêu cầu: 100 gần nhất). */
export const PROCTOR_FEED_LIMIT = 100

/** Cooldown theo từng loại sự kiện — mirror `ProctoringCoordinator.lastEvents` (10 s). */
export const EVENT_COOLDOWN_MS = 10_000

/** Nhịp kiểm tra "đang vắng bao lâu" (JavaFX dùng 250 ms; 1 s là đủ để phát hiện ngưỡng 5 s). */
const FOCUS_TICK_MS = 1_000

export type ProctorConsent = 'pending' | 'granted' | 'declined'

/** Trạng thái một kênh media theo góc nhìn UI. */
export type ProctorLinkState = 'idle' | 'connecting' | 'live' | 'error'

export interface ProctorLink {
  state: ProctorLinkState
  /** Câu tiếng Việt cho banner; `null` khi bình thường. */
  message: string | null
}

/** Một ô trong dashboard host. */
export interface ProctorTile {
  userId: number
  username: string
  cameraStatus: CameraStatus
  calibrationStatus: CalibrationStatus
  connected: boolean
  warnings: number
  lastEvent: { type: ProctorEventType; severity: ProctorSeverity; at: number } | null
}

/** Một dòng trong feed cảnh báo của host. */
export interface ProctorFeedEntry {
  eventId: string
  userId: number
  username: string
  type: ProctorEventType
  severity: ProctorSeverity
  /** Epoch ms server ghi nhận. */
  at: number
  durationMs: number
  frameSequence: number
}

/** Thành viên lấy từ `QuizLobbyData` để seed tile trước khi có `PROCTOR_STATUS_UPDATE`. */
export interface ProctorMemberSnapshot {
  userId: number
  username: string
  cameraStatus: CameraStatus
  calibrationStatus: CalibrationStatus
  connected: boolean
  warningCount: number
}

export interface ProctorState {
  context: ProctorRoomContext | null
  consent: ProctorConsent
  cameraStatus: CameraStatus
  cameraDetail: string | null
  publisher: ProctorLink
  subscriber: ProctorLink
  tiles: ProctorTile[]
  feed: ProctorFeedEntry[]

  /** Vào/ở lại một phòng; gọi từ `ProctorSessionHost` mỗi khi bối cảnh đổi. */
  enterRoom: (context: ProctorRoomContext) => void
  /** Rời phòng hoàn toàn (unmount, đăng xuất, không còn phòng). */
  leaveRoom: () => void
  /** Seed tile từ lobby (host cần thấy cả người chưa từng báo status). */
  syncMembers: (members: ProctorMemberSnapshot[]) => void
  /** Người chơi chọn bật hoặc từ chối camera. */
  decideConsent: (consent: 'granted' | 'declined') => void
  /** Báo trạng thái camera; trả `true` nếu thực sự gửi (mỗi thay đổi đúng một lần). */
  reportCamera: (status: CameraStatus, detail?: string | null) => boolean
  /** Track camera bị mute/ended giữa phiên → `CAMERA_BLOCKED`. */
  noteTrackIssue: (kind: 'mute' | 'ended') => void
  /** Đẩy một frame JPEG đã encode lên main. */
  publishFrame: (frame: MediaPublishFrameRequest) => Promise<MediaCommandResult>
  /** Phát một sự kiện (đã qua cổng + cooldown); trả `true` nếu gửi. */
  emitEvent: (
    type: DetectableEventType,
    severity: ProctorSeverity,
    durationMs?: number,
    now?: number
  ) => boolean
  /** Mất focus (window blur) / bị ẩn (visibilitychange). */
  noteFocusLost: (kind: FocusAwayKind, now?: number) => void
  /** Quay lại cửa sổ; trả `true` nếu có sự kiện được gửi. */
  noteFocusReturn: (now?: number) => boolean
  /** Nhịp định kỳ trong lúc vắng: phát EVIDENCE ngay khi chạm ngưỡng. */
  tickFocus: (now?: number) => boolean
  retryPublisher: () => void
  retrySubscriber: () => void
  applyServerMessage: (message: ServerMessage, now?: number) => boolean
}

/** Trạng thái ban đầu, cũng là trạng thái sau `leaveRoom`. */
export const initialProctorState = {
  context: null,
  consent: 'pending',
  cameraStatus: 'STOPPED',
  cameraDetail: null,
  publisher: { state: 'idle', message: null },
  subscriber: { state: 'idle', message: null },
  tiles: [],
  feed: []
} as const satisfies Pick<
  ProctorState,
  'context' | 'consent' | 'cameraStatus' | 'cameraDetail' | 'publisher' | 'subscriber' | 'tiles' | 'feed'
>

// ---------------------------------------------------------------------------------------------
// Biến module: ticket và tài nguyên không được vào state công khai
// ---------------------------------------------------------------------------------------------

/** Ticket publisher (single-use). Không log, không vào DOM, không vào store state. */
let publisherSession: MediaSessionTarget | null = null
/** Ticket subscriber (host). */
let subscriberSession: MediaSessionTarget | null = null

let publisherGeneration = 0
let subscriberGeneration = 0

let unsubscribeFrames: (() => void) | null = null
let unsubscribeStatus: (() => void) | null = null

let detachFocusDom: (() => void) | null = null
let focusTimer: ReturnType<typeof setInterval> | null = null

let channelReady = false

/** Sequence của frame gần nhất — gắn vào `frameSequence` của event report. */
let lastFrameSequence = 0

/** Lần phát gần nhất theo từng loại sự kiện (cooldown 10 s). */
const lastEventAt = new Map<ProctorEventType, number>()

const focusWatcher = createFocusWatcher()

/** Mô tả lỗi media bằng tiếng Việt; không bao giờ chứa ticket. */
export function describeMediaError(code: string | undefined, ack?: number | null): string {
  if (code === MEDIA_ERROR.unavailable) {
    return 'Kênh media chưa khả dụng trong bản này — bạn vẫn có thể thi bình thường.'
  }
  if (code === MEDIA_ERROR.ackRejected) {
    if (ack === 4) {
      return 'Phiên media đã hết hạn. Thử lại; nếu vẫn lỗi, cần vào lại phòng để nhận phiên mới.'
    }
    if (ack === 5) return 'Phòng đã đóng nên kênh media bị từ chối.'
    if (ack === 3) return 'Phiên media không hợp lệ. Thử lại; nếu vẫn lỗi, cần vào lại phòng.'
    return 'Máy chủ từ chối phiên media.'
  }
  if (code === MEDIA_ERROR.connectTimeout) return 'Kết nối kênh media quá 10 giây.'
  if (code === MEDIA_ERROR.connectFailed) return 'Không kết nối được tới cổng media của máy chủ.'
  if (code === MEDIA_ERROR.socketClosed) return 'Kênh media vừa bị đóng.'
  if (code === MEDIA_ERROR.invalidTicket) return 'Phiên media không hợp lệ.'
  if (code === MEDIA_ERROR.invalidPort) return 'Cổng media không hợp lệ.'
  if (code === MEDIA_ERROR.invalidHost) return 'Địa chỉ máy chủ media không hợp lệ.'
  if (code === MEDIA_ERROR.invalidFrame) return 'Frame camera không hợp lệ và đã bị bỏ.'
  if (code === MEDIA_ERROR.sendFailed) return 'Không gửi được frame camera.'
  return 'Kênh camera gặp sự cố — bạn vẫn có thể thi bình thường.'
}

/** Host của control channel = host của media channel (cùng máy chủ Java). */
function serverHost(): string | null {
  return useConnectionStore.getState().status.host
}

/** Tile theo thứ tự hiển thị: nhiều cảnh báo trước, rồi tên A→Z (ổn định giữa các lần cập nhật). */
export function sortProctorTiles(tiles: ProctorTile[]): ProctorTile[] {
  return [...tiles].sort((left, right) => {
    if (right.warnings !== left.warnings) return right.warnings - left.warnings
    return left.username.localeCompare(right.username, 'vi')
  })
}

/** Tổng cảnh báo của phòng (host header). */
export function totalWarnings(tiles: ProctorTile[]): number {
  return tiles.reduce((sum, tile) => sum + tile.warnings, 0)
}

/** Số camera đang thực sự có hình. */
export function onlineCameraCount(tiles: ProctorTile[]): number {
  return tiles.filter(
    (tile) => tile.cameraStatus === 'READY' || tile.cameraStatus === 'BLOCKED'
  ).length
}

function upsertTile(tiles: ProctorTile[], patch: Partial<ProctorTile> & { userId: number }): ProctorTile[] {
  const index = tiles.findIndex((tile) => tile.userId === patch.userId)
  if (index < 0) {
    const base: ProctorTile = {
      userId: patch.userId,
      username: patch.username ?? `#${patch.userId}`,
      cameraStatus: patch.cameraStatus ?? 'NOT_APPLICABLE',
      calibrationStatus: patch.calibrationStatus ?? 'NOT_REQUIRED',
      connected: patch.connected ?? true,
      warnings: patch.warnings ?? 0,
      lastEvent: patch.lastEvent ?? null
    }
    return [...tiles, base]
  }
  const next = [...tiles]
  next[index] = { ...next[index], ...patch }
  return next
}

export const useProctorStore = create<ProctorState>()((set, get) => {
  // -------------------------------------------------------------------------------------------
  // Media sessions
  // -------------------------------------------------------------------------------------------

  const startPublisher = async (): Promise<void> => {
    const session = publisherSession
    if (session === null) return
    const host = serverHost()
    if (host === null) {
      set({ publisher: { state: 'error', message: 'Chưa kết nối tới máy chủ.' } })
      return
    }
    const generation = ++publisherGeneration
    set({ publisher: { state: 'connecting', message: null } })
    const result = await getMediaApi().startPublish({
      host,
      mediaPort: session.mediaPort,
      ticket: session.ticket
    })
    if (generation !== publisherGeneration) return
    set(
      result.ok
        ? { publisher: { state: 'live', message: null } }
        : { publisher: { state: 'error', message: describeMediaError(result.error, result.ack) } }
    )
  }

  const startSubscriber = async (): Promise<void> => {
    const session = subscriberSession
    if (session === null) return
    const host = serverHost()
    if (host === null) {
      set({ subscriber: { state: 'error', message: 'Chưa kết nối tới máy chủ.' } })
      return
    }
    const generation = ++subscriberGeneration
    set({ subscriber: { state: 'connecting', message: null } })
    const result = await getMediaApi().startSubscribe({
      host,
      mediaPort: session.mediaPort,
      ticket: session.ticket
    })
    if (generation !== subscriberGeneration) return
    set(
      result.ok
        ? { subscriber: { state: 'live', message: null } }
        : { subscriber: { state: 'error', message: describeMediaError(result.error, result.ack) } }
    )
  }

  const handleSession = (session: ProctorMediaSession, now: number): boolean => {
    const state = get()
    const context = state.context
    if (context === null || context.pin !== session.pin) return false
    // Ticket hết hạn thì server sẽ cấp phiên mới; thử ngay chỉ tạo lỗi ACK 4.
    if (session.expiresAtEpochMillis <= now) return false

    if (session.role === 'PUBLISHER') {
      // Host không bao giờ publish (protocol: proctoringEnabled ⇒ hostPlays = false).
      if (context.host || !context.proctoringEnabled) return true
      publisherSession = {
        host: serverHost() ?? '',
        mediaPort: session.mediaPort,
        ticket: session.ticket
      }
      if (state.consent === 'granted' && canReportStatus(context)) {
        void startPublisher()
      } else {
        set({ publisher: { state: 'idle', message: 'Chờ bật camera để gửi hình.' } })
      }
      return true
    }

    // HOST_SUBSCRIBER: chỉ host mới mở kênh xem.
    if (!context.host) return true
    subscriberSession = {
      host: serverHost() ?? '',
      mediaPort: session.mediaPort,
      ticket: session.ticket
    }
    void startSubscriber()
    return true
  }

  const stopMedia = (): void => {
    publisherGeneration += 1
    subscriberGeneration += 1
    if (publisherSession !== null) {
      publisherSession = null
      void getMediaApi().stopPublish()
    }
    if (subscriberSession !== null) {
      subscriberSession = null
      void getMediaApi().stopSubscribe()
    }
    set({
      publisher: { state: 'idle', message: null },
      subscriber: { state: 'idle', message: null }
    })
  }

  // -------------------------------------------------------------------------------------------
  // Focus listeners (chỉ gắn khi người chơi thật sự phải báo cáo)
  // -------------------------------------------------------------------------------------------

  const detachFocus = (): void => {
    if (focusTimer !== null) {
      clearInterval(focusTimer)
      focusTimer = null
    }
    if (detachFocusDom !== null) {
      detachFocusDom()
      detachFocusDom = null
    }
    focusWatcher.reset()
  }

  const attachFocus = (): void => {
    if (detachFocusDom !== null) return
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    const onBlur = (): void => {
      get().noteFocusLost('APP_FOCUS_LOST')
    }
    const onFocus = (): void => {
      get().noteFocusReturn()
    }
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') get().noteFocusLost('APP_MINIMIZED')
      else get().noteFocusReturn()
    }

    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    detachFocusDom = () => {
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }

    // Nhịp 1 s: phát EVIDENCE ngay khi chạm ngưỡng, không phải chờ người dùng quay lại.
    focusTimer = setInterval(() => {
      get().tickFocus()
    }, FOCUS_TICK_MS)
    if (typeof (focusTimer as { unref?: () => void }).unref === 'function') {
      ;(focusTimer as unknown as { unref: () => void }).unref()
    }
  }

  // -------------------------------------------------------------------------------------------
  // Message routing
  // -------------------------------------------------------------------------------------------

  const applyStatusUpdate = (update: ProctorStatusUpdate): boolean => {
    const context = get().context
    if (context === null || context.pin !== update.pin) return false
    set((state) => ({
      tiles: upsertTile(state.tiles, {
        userId: update.userId,
        username: update.username,
        cameraStatus: update.cameraStatus,
        calibrationStatus: update.calibrationStatus,
        connected: update.connected,
        warnings: update.warningCount
      })
    }))
    return true
  }

  const applyEvent = (event: ProctorEventData): boolean => {
    const context = get().context
    if (context === null || context.pin !== event.pin) return false
    const entry: ProctorFeedEntry = {
      eventId: event.eventId,
      userId: event.userId,
      username: event.username,
      type: event.type,
      severity: event.severity,
      at: event.serverReceivedAtEpochMillis,
      durationMs: event.durationMillis,
      frameSequence: event.frameSequence
    }
    set((state) => ({
      tiles: upsertTile(state.tiles, {
        userId: event.userId,
        username: event.username,
        warnings: event.warningCount,
        lastEvent: { type: event.type, severity: event.severity, at: entry.at }
      }),
      // Bounded: giữ đúng 100 dòng mới nhất, không phình theo thời gian phòng.
      feed: [entry, ...state.feed].slice(0, PROCTOR_FEED_LIMIT)
    }))
    return true
  }

  const endRoom = (): void => {
    const context = get().context
    if (context === null) return
    set({ context: { ...context, phase: 'ended' }, publisher: { state: 'idle', message: null } })
    detachFocus()
    stopMedia()
    clearHubFrames()
    lastFrameSequence = 0
  }

  return {
    ...initialProctorState,

    enterRoom: (context) => {
      // Bridge có thể đã đổi (preload chậm, test thay fake) → nối lại listener frame/status.
      syncMediaBridge()
      const current = get().context
      if (current !== null && current.pin === context.pin) {
        // Phòng đã kết thúc thì **không** được bật lại thành "running" (một render cũ có thể
        // tới muộn sau `QUIZ_ROOM_FINISHED`); về `lobby` thì vô hại vì event vẫn bị cổng chặn.
        const phase: ProctorPhase =
          current.phase === 'ended' && context.phase === 'running' ? 'ended' : context.phase
        const gateChanged =
          current.host !== context.host ||
          current.playing !== context.playing ||
          current.proctoringEnabled !== context.proctoringEnabled ||
          current.phase !== phase
        if (gateChanged) set({ context: { ...context, phase } })
        if (phase === 'ended') {
          detachFocus()
        } else if (canReportStatus({ ...context, phase })) {
          attachFocus()
        }
        return
      }

      // Phòng khác: dọn sạch rồi bắt đầu lại từ đầu (kể cả ticket đang giữ).
      detachFocus()
      stopMedia()
      clearHubFrames()
      lastEventAt.clear()
      lastFrameSequence = 0
      focusWatcher.reset()
      set({
        ...initialProctorState,
        context: { ...context },
        publisher: { state: 'idle', message: null },
        subscriber: { state: 'idle', message: null }
      })
      if (canReportStatus(context)) attachFocus()
    },

    leaveRoom: () => {
      detachFocus()
      stopMedia()
      clearHubFrames()
      lastEventAt.clear()
      lastFrameSequence = 0
      focusWatcher.reset()
      set({ ...initialProctorState, publisher: { state: 'idle', message: null }, subscriber: { state: 'idle', message: null } })
    },

    syncMembers: (members) => {
      if (members.length === 0) return
      set((state) => {
        let tiles = state.tiles
        for (const member of members) {
          const existing = tiles.find((tile) => tile.userId === member.userId)
          tiles = upsertTile(tiles, {
            userId: member.userId,
            username: member.username,
            cameraStatus: member.cameraStatus,
            calibrationStatus: member.calibrationStatus,
            connected: member.connected,
            // Message sự kiện có thể mang số cảnh báo mới hơn lobby: không hạ xuống.
            warnings: Math.max(existing?.warnings ?? 0, member.warningCount),
            lastEvent: existing?.lastEvent ?? null
          })
        }
        return { tiles }
      })
    },

    decideConsent: (consent) => {
      if (get().consent === consent) return
      set({ consent })
      const context = get().context
      if (consent === 'declined') {
        // Chỉ là cảnh báo: người chơi vẫn vào phòng và vẫn thi bình thường (D-002/D-005).
        get().reportCamera('DENIED', 'Người chơi chọn tiếp tục không camera')
        return
      }
      if (publisherSession !== null && canReportStatus(context)) void startPublisher()
    },

    reportCamera: (status, detail) => {
      const nextDetail = detail ?? CAMERA_DETAIL[status]
      const previous = get().cameraStatus
      if (previous === status) {
        if (get().cameraDetail !== nextDetail) set({ cameraDetail: nextDetail })
        return false
      }
      set({ cameraStatus: status, cameraDetail: nextDetail })
      const context = get().context
      if (!canReportStatus(context)) return false
      const report = buildStatusReport({
        pin: context.pin,
        status,
        detail: nextDetail,
        observedAtEpochMillis: Date.now()
      })
      // `buildStatusReport` trả null cho NOT_REQUIRED/NOT_APPLICABLE — server từ chối chúng.
      if (report === null) return false
      void useConnectionStore.getState().send({ type: 'PROCTOR_STATUS_REPORT', payload: report })
      return true
    },

    noteTrackIssue: (kind) => {
      if (kind === 'mute') {
        get().reportCamera('BLOCKED', 'Track camera bị tắt tiếng/hình (mute)')
      } else {
        get().reportCamera('LOST', 'Track camera đã kết thúc')
      }
      get().emitEvent('CAMERA_BLOCKED', 'EVIDENCE', 0)
    },

    publishFrame: (frame) => {
      if (get().publisher.state !== 'live') {
        return Promise.resolve({ ok: false, error: MEDIA_ERROR.notStarted })
      }
      lastFrameSequence = frame.meta.sequence
      return getMediaApi().publishFrame(frame)
    },

    emitEvent: (type, severity, durationMs = 0, now = Date.now()) => {
      const context = get().context
      if (!canEmitEvent(context)) return false
      const previous = lastEventAt.get(type)
      if (previous !== undefined && now - previous < EVENT_COOLDOWN_MS) return false
      lastEventAt.set(type, now)
      const report = buildEventReport({
        pin: context.pin,
        eventId: createEventId(),
        type,
        severity,
        frameSequence: lastFrameSequence,
        occurredAtEpochMillis: now,
        durationMillis: durationMs,
        // Không có model thị giác: confidence 0 nghĩa là "chưa đo", không phải "chắc chắn 0%".
        confidence: 0
      })
      void useConnectionStore.getState().send({ type: 'PROCTOR_EVENT_REPORT', payload: report })
      return true
    },

    noteFocusLost: (kind, now = Date.now()) => {
      focusWatcher.leave(kind, now)
    },

    noteFocusReturn: (now = Date.now()) => {
      const decision: FocusDecision | null = focusWatcher.ret(now)
      if (decision === null) return false
      return get().emitEvent(decision.type, decision.severity, decision.durationMs, now)
    },

    tickFocus: (now = Date.now()) => {
      const decision: FocusDecision | null = focusWatcher.tick(now)
      if (decision === null) return false
      return get().emitEvent(decision.type, decision.severity, decision.durationMs, now)
    },

    retryPublisher: () => {
      if (publisherSession === null) {
        set({ publisher: { state: 'idle', message: 'Đang chờ máy chủ cấp phiên media mới.' } })
        return
      }
      void startPublisher()
    },

    retrySubscriber: () => {
      if (subscriberSession === null) {
        set({ subscriber: { state: 'idle', message: 'Đang chờ máy chủ cấp phiên media mới.' } })
        return
      }
      void startSubscriber()
    },

    applyServerMessage: (message, now = Date.now()) => {
      switch (message.type) {
        case 'PROCTOR_MEDIA_SESSION':
          return handleSession(message.payload, now)

        case 'PROCTOR_STATUS_UPDATE':
          return applyStatusUpdate(message.payload)

        case 'PROCTOR_EVENT':
          return applyEvent(message.payload)

        case 'QUIZ_ROOM_FINISHED': {
          const context = get().context
          if (context === null || context.pin !== message.payload.pin) return false
          endRoom()
          return true
        }

        case 'QUIZ_ROOM_CANCEL': {
          if (get().context === null) return false
          endRoom()
          return true
        }

        default:
          return false
      }
    }
  }
})

/** API media đang gắn listener frame/status (đổi khi preload hoặc test thay bridge). */
let boundApi: NqMediaApi | null = null

/** Nối frame + status của main process. Gọi lại an toàn khi bridge đổi danh tính. */
function syncMediaBridge(): void {
  const media = getMediaApi()
  if (boundApi === media) return
  unsubscribeFrames?.()
  unsubscribeStatus?.()
  boundApi = media
  unsubscribeFrames = media.onFrame((frame) => {
    // Frame đi thẳng vào hub: chỉ tile tương ứng re-render.
    publishHubFrame(frame)
  })
  unsubscribeStatus = media.onStatus((snapshot) => applySocketStatus(snapshot))
}

/**
 * Cập nhật trạng thái kênh từ main. Chỉ map `connected`/`error`: `idle` là do chính store chủ
 * động (teardown), không phải lỗi cần báo.
 */
function applySocketStatus(snapshot: MediaStatusSnapshot): void {
  const state = useProctorStore.getState()
  if (state.context === null) return
  const patch: Partial<ProctorState> = {}

  if (publisherSession !== null) {
    if (snapshot.publisher.state === 'connected' && state.publisher.state !== 'live') {
      patch.publisher = { state: 'live', message: null }
    } else if (snapshot.publisher.state === 'error' && state.publisher.state !== 'idle') {
      patch.publisher = {
        state: 'error',
        message: snapshot.publisher.lastError ?? 'Kênh gửi camera vừa đóng.'
      }
    }
  }

  if (subscriberSession !== null) {
    if (snapshot.subscriber.state === 'connected' && state.subscriber.state !== 'live') {
      patch.subscriber = { state: 'live', message: null }
    } else if (snapshot.subscriber.state === 'error' && state.subscriber.state !== 'idle') {
      patch.subscriber = {
        state: 'error',
        message: snapshot.subscriber.lastError ?? 'Kênh xem camera vừa đóng.'
      }
    }
  }

  if (Object.keys(patch).length > 0) useProctorStore.setState(patch)
}

/** Đăng ký nhận message server + bridge media đúng một lần cho cả app. */
export function ensureProctorChannel(): void {
  syncMediaBridge()
  if (channelReady) return
  channelReady = true
  subscribeServerMessages((message) => {
    useProctorStore.getState().applyServerMessage(message, Date.now())
  })
}

/** Reset cho test và cho luồng đăng xuất. */
export function resetProctorStore(): void {
  useProctorStore.getState().leaveRoom()
  useProctorStore.setState({ ...initialProctorState })
  lastEventAt.clear()
}

ensureProctorChannel()
