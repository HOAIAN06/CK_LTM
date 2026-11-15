import { describe, expect, it } from 'vitest'
import type { QuizSetEdit } from '@shared/protocol'
import {
  CHOICES_PER_QUESTION,
  addQuestion,
  draftFromPayload,
  draftToPayload,
  emptyDraftQuestion,
  emptyDraftSet,
  isDraftDirty,
  publishChecklist,
  questionIssues,
  removeQuestion,
  setCorrectChoice,
  validateDraft,
  validateSetMeta,
  type DraftQuestion
} from './validation'

function question(overrides: Partial<DraftQuestion> = {}): DraftQuestion {
  const base = emptyDraftQuestion()
  return {
    ...base,
    content: '「食べる」の意味は？',
    choices: base.choices.map((choice, index) => ({
      ...choice,
      content: ['ăn', 'uống', 'ngủ', 'đi'][index] ?? ''
    })),
    ...overrides
  }
}

function draftWith(count: number, questionOverrides: Partial<DraftQuestion> = {}) {
  const draft = emptyDraftSet()
  draft.title = 'Luyện N5'
  draft.description = 'Bộ cơ bản'
  draft.level = 'N5'
  for (let index = 0; index < count; index += 1) {
    draft.questions.push(question(questionOverrides))
  }
  return draft
}

const PAYLOAD: QuizSetEdit = {
  id: 4,
  title: '  Luyện N5  ',
  description: '  mô tả  ',
  level: 'n5',
  questions: [
    {
      id: 9,
      content: '  Câu 1  ',
      explanation: ' giải thích ',
      choices: [
        { id: 31, content: '  B  ', position: 2, correct: false },
        { id: 30, content: '  A  ', position: 1, correct: true }
      ]
    }
  ]
}

describe('draft normalization', () => {
  it('pads a payload to exactly four choices, sorted by position', () => {
    const draft = draftFromPayload(PAYLOAD)
    const normalized = draft.questions[0]!

    expect(draft.id).toBe(4)
    expect(draft.level).toBe('N5')
    expect(normalized.choices).toHaveLength(CHOICES_PER_QUESTION)
    expect(normalized.choices.map((choice) => choice.position)).toEqual([1, 2, 3, 4])
    expect(normalized.choices[0]).toMatchObject({ id: 30, content: '  A  ', correct: true })
    expect(normalized.choices[1]).toMatchObject({ id: 31, content: '  B  ', correct: false })
    // Hai ô thiếu được thêm mới, không giữ `correct` từ payload.
    expect(normalized.choices[2]?.id).toBeNull()
    expect(normalized.choices[2]?.correct).toBe(false)
  })

  it('falls back to N5 for an unknown level instead of crashing', () => {
    const draft = draftFromPayload({ ...PAYLOAD, level: 'X9' })
    expect(draft.level).toBe('N5')
  })

  it('trims every string on the way back to the server payload', () => {
    const payload = draftToPayload(draftFromPayload(PAYLOAD))
    expect(payload.title).toBe('Luyện N5')
    expect(payload.description).toBe('mô tả')
    expect(payload.questions[0]?.content).toBe('Câu 1')
    expect(payload.questions[0]?.explanation).toBe('giải thích')
    expect(payload.questions[0]?.choices[0]?.content).toBe('A')
    expect(payload.questions[0]?.choices.map((choice) => choice.position)).toEqual([1, 2, 3, 4])
  })

  it('starts with one correct choice so a new question is never ambiguous', () => {
    const fresh = emptyDraftQuestion()
    expect(fresh.choices.filter((choice) => choice.correct)).toHaveLength(1)
    expect(fresh.choices[0]?.correct).toBe(true)
  })
})

describe('validateSetMeta', () => {
  it('requires a 1–100 character title and a known level', () => {
    const empty = emptyDraftSet()
    expect(validateSetMeta(empty).title).toContain('Nhập tiêu đề')

    const tooLong = { ...empty, title: 'a'.repeat(101) }
    expect(validateSetMeta(tooLong).title).toContain('100')

    expect(validateSetMeta({ ...empty, title: 'a'.repeat(100) }).title).toBeUndefined()

    const badLevel = { ...empty, title: 'ok', level: 'Z9' as never }
    expect(validateSetMeta(badLevel).level).toBeTruthy()
    expect(validateSetMeta({ ...empty, title: '  ' }).title).toBeTruthy()
  })
})

describe('questionIssues', () => {
  it('accepts a well-formed question', () => {
    expect(questionIssues(question())).toEqual([])
  })

  it('rejects a wrong number of choices', () => {
    const broken = question()
    const issues = questionIssues({ ...broken, choices: broken.choices.slice(0, 3) })
    expect(issues.join(' ')).toContain('4 lựa chọn')
  })

  it('rejects empty content in the question or in a choice', () => {
    expect(questionIssues(question({ content: '   ' })).join(' ')).toContain('nội dung')

    const broken = question()
    const withEmpty = {
      ...broken,
      choices: broken.choices.map((choice, index) =>
        index === 2 ? { ...choice, content: '  ' } : choice
      )
    }
    expect(questionIssues(withEmpty).join(' ')).toContain('chưa có nội dung')
  })

  it('requires exactly one correct choice (radio, not checkbox)', () => {
    const base = question()
    const none = { ...base, choices: base.choices.map((choice) => ({ ...choice, correct: false })) }
    expect(questionIssues(none).join(' ')).toContain('Chưa chọn đáp án đúng')

    const two = { ...base, choices: base.choices.map((choice) => ({ ...choice, correct: true })) }
    expect(questionIssues(two).join(' ')).toContain('Chỉ được chọn một đáp án đúng')
  })

  it('detects duplicated positions', () => {
    const base = question()
    const duplicated = {
      ...base,
      choices: base.choices.map((choice, index) =>
        index === 3 ? { ...choice, position: 3 } : choice
      )
    }
    expect(questionIssues(duplicated).join(' ')).toContain('trùng')
  })
})

describe('validateDraft', () => {
  it('accepts a draft with zero questions (draft rule)', () => {
    const draft = emptyDraftSet()
    draft.title = 'Bản nháp'
    expect(validateDraft(draft).ok).toBe(true)
  })

  it('reports validity per question', () => {
    const draft = draftWith(2)
    draft.questions[1] = question({ content: '' })
    const validation = validateDraft(draft)
    expect(validation.ok).toBe(false)
    expect(validation.questions[0]).toEqual([])
    expect(validation.questions[1]?.length).toBeGreaterThan(0)
  })
})

describe('publishChecklist', () => {
  it('is not ready below three valid questions', () => {
    const two = publishChecklist(draftWith(2))
    expect(two.ready).toBe(false)
    expect(two.validQuestions).toBe(2)
    expect(two.items.some((item) => !item.ok)).toBe(true)
  })

  it('is ready with three valid questions and a valid title', () => {
    const three = publishChecklist(draftWith(3))
    expect(three.ready).toBe(true)
    expect(three.items.every((item) => item.ok)).toBe(true)
  })

  it('stays unready when one question is invalid or the title is missing', () => {
    const draft = draftWith(3)
    draft.questions[2] = question({ content: '' })
    expect(publishChecklist(draft).ready).toBe(false)
    expect(publishChecklist(draft).validQuestions).toBe(2)

    const noTitle = draftWith(3)
    noTitle.title = ''
    expect(publishChecklist(noTitle).ready).toBe(false)
  })
})

describe('isDraftDirty', () => {
  it('ignores whitespace-only differences but catches real edits', () => {
    const baseline = draftFromPayload(PAYLOAD)
    const same = draftFromPayload(PAYLOAD)
    same.title = '  Luyện N5  '
    expect(isDraftDirty(baseline, same)).toBe(false)

    const edited = draftFromPayload(PAYLOAD)
    edited.title = 'Luyện N4'
    expect(isDraftDirty(baseline, edited)).toBe(true)

    const choiceEdited = draftFromPayload(PAYLOAD)
    choiceEdited.questions[0]!.choices[3]!.content = 'mới'
    expect(isDraftDirty(baseline, choiceEdited)).toBe(true)
  })
})

describe('draft mutations', () => {
  it('keeps exactly one correct choice', () => {
    const updated = setCorrectChoice(question(), 3)
    expect(updated.choices.filter((choice) => choice.correct)).toHaveLength(1)
    expect(updated.choices.find((choice) => choice.correct)?.position).toBe(3)
  })

  it('adds and removes questions without touching the others', () => {
    const one = addQuestion(emptyDraftSet())
    expect(one.questions).toHaveLength(1)

    const two = addQuestion(one)
    expect(two.questions).toHaveLength(2)

    const removed = removeQuestion(two, 0)
    expect(removed.questions).toHaveLength(1)
  })
})
