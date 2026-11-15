import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NqBridge } from '@shared/ipc'
import { createIdleConnectionStatus } from '@shared/ipc'
import type { QuizSetEdit, QuizSetSummary } from '@shared/protocol'
import { setBridgeOverride } from '../bridge'
import { resetConnectionStore } from '../connection-store'
import { resetSetsStore, useSetsStore } from './sets-store'
import { draftFromPayload, emptyDraftSet } from './validation'

const SUMMARY: QuizSetSummary = {
  id: 4,
  ownerId: 7,
  ownerUsername: 'minh_anh',
  title: 'Luyện N5',
  description: '',
  level: 'N5',
  published: false,
  questionCount: 3,
  ownedByMe: true
}

const DETAIL: QuizSetEdit = {
  id: 4,
  title: 'Luyện N5',
  description: 'mô tả',
  level: 'N5',
  questions: []
}

function createFakeBridge(): NqBridge {
  return {
    connect: vi.fn(() => Promise.resolve({ ok: true })),
    disconnect: vi.fn(() => Promise.resolve()),
    send: vi.fn(() => Promise.resolve({ ok: true })),
    getStatus: vi.fn(() => Promise.resolve(createIdleConnectionStatus())),
    onEvent: vi.fn(() => () => undefined),
    app: { version: 'test', platform: 'linux', packaged: false }
  }
}

let bridge: NqBridge

beforeEach(() => {
  resetConnectionStore()
  resetSetsStore()
  bridge = createFakeBridge()
  setBridgeOverride(bridge)
})

afterEach(() => {
  resetSetsStore()
  setBridgeOverride(null)
  vi.useRealTimers()
})

describe('sets store — list', () => {
  it('requests the active scope and stores the result', async () => {
    await useSetsStore.getState().requestList('OWN')
    expect(bridge.send).toHaveBeenCalledWith({
      type: 'QUIZ_SET_LIST',
      payload: { scope: 'OWN' }
    })
    expect(useSetsStore.getState().listLoading).toBe(true)

    useSetsStore
      .getState()
      .applyServerMessage({ type: 'QUIZ_SET_LIST_RESULT', payload: { items: [SUMMARY] } })

    const state = useSetsStore.getState()
    expect(state.items.OWN).toEqual([SUMMARY])
    expect(state.listLoading).toBe(false)
  })

  it('keeps each scope in its own bucket', async () => {
    await useSetsStore.getState().requestList('PUBLISHED')
    useSetsStore.getState().applyServerMessage({
      type: 'QUIZ_SET_LIST_RESULT',
      payload: { items: [{ ...SUMMARY, id: 9, published: true, ownedByMe: false }] }
    })

    await useSetsStore.getState().requestList('OWN')
    useSetsStore.getState().applyServerMessage({
      type: 'QUIZ_SET_LIST_RESULT',
      payload: { items: [SUMMARY] }
    })

    const state = useSetsStore.getState()
    expect(state.items.PUBLISHED?.[0]?.id).toBe(9)
    expect(state.items.OWN?.[0]?.id).toBe(4)
  })

  it('ignores a list result that has no pending request (F-08)', () => {
    useSetsStore.setState({
      items: { OWN: [SUMMARY], PUBLISHED: [{ ...SUMMARY, id: 9, published: true }] },
      listLoading: false
    })

    // Kết quả này do picker bộ đề ở `/quiz` gây ra, không phải yêu cầu của store này.
    useSetsStore.getState().applyServerMessage({
      type: 'QUIZ_SET_LIST_RESULT',
      payload: { items: [{ ...SUMMARY, id: 99, title: 'Từ picker' }] }
    })

    const state = useSetsStore.getState()
    expect(state.items.OWN?.[0]?.id).toBe(4)
    expect(state.items.PUBLISHED?.[0]?.id).toBe(9)
    expect(state.listLoading).toBe(false)
  })

  it('maps QUIZ_SET_ERROR to a Vietnamese notice', async () => {
    await useSetsStore.getState().requestList('OWN')
    useSetsStore.getState().applyServerMessage({ type: 'QUIZ_SET_ERROR', payload: 'NOT_OWNER' })

    const state = useSetsStore.getState()
    expect(state.listLoading).toBe(false)
    expect(state.notice?.tone).toBe('danger')
    expect(state.notice?.title).toBeTruthy()
  })
})

describe('sets store — detail', () => {
  it('loads a set into an editable draft', async () => {
    await useSetsStore.getState().requestDetail(4)
    expect(bridge.send).toHaveBeenCalledWith({ type: 'QUIZ_SET_GET', payload: { quizSetId: 4 } })

    useSetsStore.getState().applyServerMessage({ type: 'QUIZ_SET_DETAIL', payload: DETAIL })

    const state = useSetsStore.getState()
    expect(state.detail?.id).toBe(4)
    expect(state.detail?.title).toBe('Luyện N5')
    expect(state.detailLoading).toBe(false)
  })
})

describe('sets store — save and publish', () => {
  it('sends a trimmed payload and reports success', async () => {
    await useSetsStore.getState().requestDetail(4)
    useSetsStore.getState().applyServerMessage({ type: 'QUIZ_SET_DETAIL', payload: DETAIL })

    const draft = draftFromPayload({ ...DETAIL, title: '  Bộ mới  ' })
    await useSetsStore.getState().save(draft, false)

    const sent = (bridge.send as ReturnType<typeof vi.fn>).mock.calls
      .map((call) => call[0] as { type: string; payload: QuizSetEdit })
      .find((frame) => frame.type === 'QUIZ_SET_SAVE')
    expect(sent?.payload.title).toBe('Bộ mới')

    useSetsStore.getState().applyServerMessage({ type: 'QUIZ_SET_SAVED', payload: { quizSetId: 12 } })

    const state = useSetsStore.getState()
    expect(state.savedId).toBe(12)
    expect(state.saving).toBe(false)
    expect(state.detail?.id).toBe(12)
    expect(state.notice?.tone).toBe('success')
  })

  it('chains QUIZ_SET_PUBLISH after a save when requested', async () => {
    await useSetsStore.getState().save(draftFromPayload(DETAIL), true)
    useSetsStore.getState().applyServerMessage({ type: 'QUIZ_SET_SAVED', payload: { quizSetId: 12 } })

    const types = (bridge.send as ReturnType<typeof vi.fn>).mock.calls.map(
      (call) => (call[0] as { type: string }).type
    )
    expect(types).toContain('QUIZ_SET_PUBLISH')
    expect(useSetsStore.getState().publishPending).toBe(true)
  })

  it('updates both cached lists on QUIZ_SET_PUBLISHED', () => {
    useSetsStore.setState({
      items: { OWN: [SUMMARY], PUBLISHED: [{ ...SUMMARY, id: 8 }] }
    })

    useSetsStore.getState().applyServerMessage({
      type: 'QUIZ_SET_PUBLISHED',
      payload: { quizSetId: 8, published: true }
    })

    expect(useSetsStore.getState().items.PUBLISHED?.[0]?.published).toBe(true)
    expect(useSetsStore.getState().notice?.title).toContain('xuất bản')
  })

  it('keeps the draft when the server rejects the save', async () => {
    const failing: NqBridge = {
      ...createFakeBridge(),
      send: vi.fn(() =>
        Promise.resolve({ ok: true })
      )
    }
    setBridgeOverride(failing)

    await useSetsStore.getState().save(emptyDraftSet(), false)
    useSetsStore.getState().applyServerMessage({ type: 'QUIZ_SET_ERROR', payload: 'INVALID_QUIZ' })

    const state = useSetsStore.getState()
    expect(state.saving).toBe(false)
    expect(state.notice?.tone).toBe('danger')
    expect(state.savedId).toBeNull()
  })

  it('removes a deleted set from both lists', async () => {
    useSetsStore.setState({ items: { OWN: [SUMMARY], PUBLISHED: [SUMMARY] } })
    await useSetsStore.getState().remove(4)
    expect(bridge.send).toHaveBeenCalledWith({ type: 'QUIZ_SET_DELETE', payload: { quizSetId: 4 } })

    useSetsStore.getState().applyServerMessage({ type: 'QUIZ_SET_DELETED', payload: { quizSetId: 4 } })

    const state = useSetsStore.getState()
    expect(state.items.OWN).toEqual([])
    expect(state.items.PUBLISHED).toEqual([])
    expect(state.deletePending).toBeNull()
  })
})
