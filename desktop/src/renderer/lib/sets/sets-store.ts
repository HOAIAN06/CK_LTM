/**
 * Phiên làm việc với bộ đề: danh sách (OWN/PUBLISHED), chi tiết, lưu, xuất bản, xoá.
 *
 * Hợp đồng (docs/protocol.md §6):
 *   QUIZ_SET_LIST {scope} → QUIZ_SET_LIST_RESULT | QUIZ_SET_ERROR
 *   QUIZ_SET_GET {quizSetId} → QUIZ_SET_DETAIL | QUIZ_SET_ERROR
 *   QUIZ_SET_SAVE (QuizSetEdit) → QUIZ_SET_SAVED {quizSetId}
 *   QUIZ_SET_PUBLISH {quizSetId,published} → QUIZ_SET_PUBLISHED
 *   QUIZ_SET_DELETE {quizSetId} → QUIZ_SET_DELETED
 *
 * Mọi lệnh có watchdog 10 giây để không bao giờ có spinner vô hạn. Store chỉ giữ dữ liệu
 * server gửi; reducer/logic thuần nằm ở `lib/sets/validation.ts`.
 */
import { create } from 'zustand'
import type { NqResult } from '@shared/ipc'
import type { OutboundMessage, QuizSetSummary, ServerMessage } from '@shared/protocol'
import { useConnectionStore, subscribeServerMessages } from '../connection-store'
import { UI_ERROR } from '../error-codes'
import { noticeFromErrorCode, successNotice, type UiNotice } from '../notices'
import { RESPONSE_TIMEOUT_MS, createWatchdog } from '../watchdog'
import {
  draftFromPayload,
  draftToPayload,
  type DraftSet
} from './validation'

export type QuizSetScope = 'OWN' | 'PUBLISHED'

export const QUIZ_SET_SCOPES: ReadonlyArray<QuizSetScope> = ['OWN', 'PUBLISHED']

export interface SetsState {
  scope: QuizSetScope
  items: Record<QuizSetScope, QuizSetSummary[] | null>
  listLoading: boolean
  listError: string | null

  detail: DraftSet | null
  detailLoading: boolean
  detailError: string | null

  saving: boolean
  publishPending: boolean
  deletePending: number | null
  /** `QUIZ_SET_SAVED` gần nhất — editor dùng để điều hướng về danh sách. */
  savedId: number | null
  notice: UiNotice | null

  setScope: (scope: QuizSetScope) => void
  requestList: (scope?: QuizSetScope) => Promise<NqResult>
  requestDetail: (quizSetId: number) => Promise<NqResult>
  save: (draft: DraftSet, publishAfterSave: boolean) => Promise<NqResult>
  setPublished: (quizSetId: number, published: boolean) => Promise<NqResult>
  remove: (quizSetId: number) => Promise<NqResult>
  clearDetail: () => void
  clearNotice: () => void
  consumeSaved: () => void
  applyServerMessage: (message: ServerMessage) => void
}

const listWatchdog = createWatchdog()
const detailWatchdog = createWatchdog()
const saveWatchdog = createWatchdog()
const publishWatchdog = createWatchdog()
const deleteWatchdog = createWatchdog()

/**
 * Yêu cầu `QUIZ_SET_LIST` đang chờ. Payload trả về **không** chứa scope, nên phải nhớ
 * scope của lần gửi gần nhất — và chỉ nhận kết quả khi thật sự có yêu cầu đang chờ.
 * Nếu không, `QUIZ_SET_LIST_RESULT` do màn hình khác (ví dụ picker bộ đề ở `/quiz`) gây ra
 * sẽ bị đổ nhầm vào bucket `OWN`.
 */
let pendingList: { scope: QuizSetScope; requestId: number } | null = null
let listRequestSeq = 0
/** Lưu xong thì xuất bản luôn (payload `QUIZ_SET_SAVED` mới có id). */
let publishAfterSave = false
let channelReady = false

function clearAllWatchdogs(): void {
  listWatchdog.clear()
  detailWatchdog.clear()
  saveWatchdog.clear()
  publishWatchdog.clear()
  deleteWatchdog.clear()
}

function ensureChannel(): void {
  if (channelReady) return
  channelReady = true
  subscribeServerMessages((message) => {
    useQuizStoreSets.getState().applyServerMessage(message)
  })
}

// Tên riêng để tránh nhầm với `useQuizStore` của phòng Quiz.
const useQuizStoreSets = create<SetsState>()((set, get) => ({
  scope: 'OWN',
  items: { OWN: null, PUBLISHED: null },
  listLoading: false,
  listError: null,
  detail: null,
  detailLoading: false,
  detailError: null,
  saving: false,
  publishPending: false,
  deletePending: null,
  savedId: null,
  notice: null,

  setScope: (scope) => {
    set({ scope })
    void get().requestList(scope)
  },

  requestList: async (scope) => {
    const target = scope ?? get().scope
    const requestId = listRequestSeq + 1
    listRequestSeq = requestId
    pendingList = { scope: target, requestId }
    listWatchdog.clear()
    set({ scope: target, listLoading: true, listError: null })

    const result = await useConnectionStore
      .getState()
      .send({ type: 'QUIZ_SET_LIST', payload: { scope: target } })

    if (!result.ok) {
      if (pendingList?.requestId === requestId) pendingList = null
      set({ listLoading: false, listError: result.error ?? 'SEND_FAILED' })
      return result
    }
    listWatchdog.arm(RESPONSE_TIMEOUT_MS, () => {
      if (pendingList?.requestId !== requestId) return
      pendingList = null
      set({ listLoading: false, listError: UI_ERROR.requestTimeout })
    })
    return result
  },

  requestDetail: async (quizSetId) => {
    detailWatchdog.clear()
    set({ detailLoading: true, detailError: null, savedId: null })

    const result = await useConnectionStore
      .getState()
      .send({ type: 'QUIZ_SET_GET', payload: { quizSetId } })

    if (!result.ok) {
      set({ detailLoading: false, detailError: result.error ?? 'SEND_FAILED' })
      return result
    }
    detailWatchdog.arm(RESPONSE_TIMEOUT_MS, () => {
      set({ detailLoading: false, detailError: UI_ERROR.requestTimeout })
    })
    return result
  },

  save: async (draft, afterSavePublish) => {
    if (get().saving) return { ok: false, error: 'SEND_FAILED' }
    publishAfterSave = afterSavePublish
    saveWatchdog.clear()
    set({ saving: true, notice: null })

    const frame: OutboundMessage = { type: 'QUIZ_SET_SAVE', payload: draftToPayload(draft) }
    const result = await useConnectionStore.getState().send(frame)

    if (!result.ok) {
      publishAfterSave = false
      set({ saving: false, notice: noticeFromErrorCode(result.error) })
      return result
    }
    if (get().saving) {
      saveWatchdog.arm(RESPONSE_TIMEOUT_MS, () => {
        publishAfterSave = false
        set({ saving: false, notice: noticeFromErrorCode(UI_ERROR.requestTimeout) })
      })
    }
    return result
  },

  setPublished: async (quizSetId, published) => {
    if (get().publishPending) return { ok: false, error: 'SEND_FAILED' }
    publishWatchdog.clear()
    set({ publishPending: true, notice: null })

    const result = await useConnectionStore
      .getState()
      .send({ type: 'QUIZ_SET_PUBLISH', payload: { quizSetId, published } })

    if (!result.ok) {
      set({ publishPending: false, notice: noticeFromErrorCode(result.error) })
      return result
    }
    if (get().publishPending) {
      publishWatchdog.arm(RESPONSE_TIMEOUT_MS, () => {
        set({ publishPending: false, notice: noticeFromErrorCode(UI_ERROR.requestTimeout) })
      })
    }
    return result
  },

  remove: async (quizSetId) => {
    if (get().deletePending !== null) return { ok: false, error: 'SEND_FAILED' }
    deleteWatchdog.clear()
    set({ deletePending: quizSetId, notice: null })

    const result = await useConnectionStore
      .getState()
      .send({ type: 'QUIZ_SET_DELETE', payload: { quizSetId } })

    if (!result.ok) {
      set({ deletePending: null, notice: noticeFromErrorCode(result.error) })
      return result
    }
    if (get().deletePending !== null) {
      deleteWatchdog.arm(RESPONSE_TIMEOUT_MS, () => {
        set({ deletePending: null, notice: noticeFromErrorCode(UI_ERROR.requestTimeout) })
      })
    }
    return result
  },

  clearDetail: () => set({ detail: null, detailLoading: false, detailError: null, savedId: null }),

  clearNotice: () => set({ notice: null }),

  consumeSaved: () => set({ savedId: null }),

  applyServerMessage: (message) => {
    switch (message.type) {
      case 'QUIZ_SET_LIST_RESULT': {
        const pending = pendingList
        pendingList = null
        // Không có yêu cầu nào đang chờ → kết quả này thuộc màn hình khác (picker ở
        // `/quiz`): bỏ qua thay vì ghi đè bucket của store.
        if (!pending) return

        listWatchdog.clear()
        set((state) => ({
          items: { ...state.items, [pending.scope]: message.payload.items },
          listLoading: false,
          listError: null
        }))
        break
      }

      case 'QUIZ_SET_DETAIL': {
        detailWatchdog.clear()
        set({ detail: draftFromPayload(message.payload), detailLoading: false, detailError: null })
        break
      }

      case 'QUIZ_SET_SAVED': {
        saveWatchdog.clear()
        const quizSetId = message.payload.quizSetId
        set((state) => ({
          saving: false,
          savedId: quizSetId,
          detail: state.detail ? { ...state.detail, id: quizSetId } : state.detail
        }))

        if (publishAfterSave) {
          publishAfterSave = false
          void get().setPublished(quizSetId, true)
          break
        }
        set({ notice: successNotice('Đã lưu bộ đề', 'Bộ đề được lưu dưới dạng bản nháp.') })
        void get().requestList(get().scope)
        break
      }

      case 'QUIZ_SET_PUBLISHED': {
        publishWatchdog.clear()
        const { quizSetId, published } = message.payload
        set((state) => ({
          publishPending: false,
          items: {
            OWN: patchPublished(state.items.OWN, quizSetId, published),
            PUBLISHED: patchPublished(state.items.PUBLISHED, quizSetId, published)
          },
          notice: published
            ? successNotice('Đã xuất bản bộ đề', 'Học viên có thể dùng bộ đề này để tạo phòng Quiz.')
            : successNotice('Đã thu hồi bộ đề', 'Bộ đề không còn hiển thị cho người khác.')
        }))
        void get().requestList(get().scope)
        break
      }

      case 'QUIZ_SET_DELETED': {
        deleteWatchdog.clear()
        const quizSetId = message.payload.quizSetId
        set((state) => ({
          deletePending: null,
          items: {
            OWN: removeFromList(state.items.OWN, quizSetId),
            PUBLISHED: removeFromList(state.items.PUBLISHED, quizSetId)
          },
          detail: state.detail?.id === quizSetId ? null : state.detail,
          notice: successNotice('Đã xoá bộ đề')
        }))
        void get().requestList(get().scope)
        break
      }

      case 'QUIZ_SET_ERROR': {
        clearAllWatchdogs()
        pendingList = null
        publishAfterSave = false
        set({
          listLoading: false,
          detailLoading: false,
          saving: false,
          publishPending: false,
          deletePending: null,
          listError: get().listLoading ? message.payload : get().listError,
          notice: noticeFromErrorCode(message.payload)
        })
        break
      }

      default:
        break
    }
  }
}))

function patchPublished(
  list: QuizSetSummary[] | null,
  quizSetId: number,
  published: boolean
): QuizSetSummary[] | null {
  if (!list) return list
  return list.map((item) => (item.id === quizSetId ? { ...item, published } : item))
}

function removeFromList(list: QuizSetSummary[] | null, quizSetId: number): QuizSetSummary[] | null {
  if (!list) return list
  return list.filter((item) => item.id !== quizSetId)
}

/** Store danh sách/chi tiết bộ đề (tên khác `useQuizStore` của phòng Quiz). */
export const useSetsStore = useQuizStoreSets

ensureChannel()

/** Chỉ dùng cho test. */
export function resetSetsStore(): void {
  clearAllWatchdogs()
  publishAfterSave = false
  pendingList = null
  useQuizStoreSets.setState({
    scope: 'OWN',
    items: { OWN: null, PUBLISHED: null },
    listLoading: false,
    listError: null,
    detail: null,
    detailLoading: false,
    detailError: null,
    saving: false,
    publishPending: false,
    deletePending: null,
    savedId: null,
    notice: null
  })
}
