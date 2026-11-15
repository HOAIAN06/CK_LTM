/**
 * Soạn và kiểm tra bộ đề phía client — bản mirror của `QuizSetService.validate`.
 *
 * Quy tắc server (nguồn sự thật, `src/main/java/.../server/quiz/QuizSetService.java`):
 * - `title` 1–100 ký tự sau trim; `level` ∈ N5..N1 (server tự upper-case).
 * - Draft được phép 0 câu; **câu đã thêm** phải có nội dung, đúng 4 lựa chọn, `position` 1–4
 *   duy nhất, mỗi lựa chọn có nội dung, và **đúng một** `correct=true`.
 * - Xuất bản cần ≥ 3 câu hợp lệ.
 *
 * Client kiểm tra trước để người dùng thấy lỗi tại chỗ; server vẫn là bên phán quyết cuối
 * (`INVALID_QUIZ`, `NOT_OWNER`, …). Không có kiểm tra nào ở đây "sửa" dữ liệu của server.
 */
import type { QuizSetEdit, QuizQuestionEdit } from '@shared/protocol'

export const QUIZ_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const
export type QuizLevel = (typeof QUIZ_LEVELS)[number]

export const QUIZ_TITLE_MAX = 100
export const MIN_PUBLISH_QUESTIONS = 3
export const CHOICES_PER_QUESTION = 4
export const CHOICE_POSITIONS = [1, 2, 3, 4] as const

export interface DraftChoice {
  /** `null` khi là lựa chọn mới (server cấp id). */
  id: number | null
  content: string
  position: number
  correct: boolean
}

export interface DraftQuestion {
  id: number | null
  content: string
  explanation: string
  choices: DraftChoice[]
}

export interface DraftSet {
  id: number | null
  title: string
  description: string
  level: QuizLevel
  questions: DraftQuestion[]
}

export function isQuizLevel(value: unknown): value is QuizLevel {
  return typeof value === 'string' && (QUIZ_LEVELS as ReadonlyArray<string>).includes(value)
}

export function emptyDraftSet(): DraftSet {
  return { id: null, title: '', description: '', level: 'N5', questions: [] }
}

export function emptyDraftQuestion(): DraftQuestion {
  return {
    id: null,
    content: '',
    explanation: '',
    choices: CHOICE_POSITIONS.map((position) => ({
      id: null,
      content: '',
      position,
      correct: position === 1
    }))
  }
}

function normalizeChoices(choices: QuizQuestionEdit['choices'] | null | undefined): DraftChoice[] {
  const source = Array.isArray(choices) ? choices : []
  const byPosition = new Map<number, DraftChoice>()
  for (const choice of source) {
    if (!choice) continue
    const position =
      choice.position >= 1 && choice.position <= CHOICES_PER_QUESTION
        ? choice.position
        : byPosition.size + 1
    if (byPosition.has(position)) continue
    byPosition.set(position, {
      id: typeof choice.id === 'number' ? choice.id : null,
      content: choice.content ?? '',
      position,
      correct: choice.correct === true
    })
  }
  // Luôn có đúng 4 ô, giữ nguyên thứ tự vị trí 1–4.
  return CHOICE_POSITIONS.map((position) => {
    const existing = byPosition.get(position)
    return (
      existing ?? {
        id: null,
        content: '',
        position,
        correct: byPosition.size === 0 && position === 1
      }
    )
  })
}

/** Payload server → draft chỉnh sửa được (chuẩn hoá 4 lựa chọn, sort theo position). */
export function draftFromPayload(edit: QuizSetEdit): DraftSet {
  const level = isQuizLevel((edit.level ?? '').toUpperCase())
    ? ((edit.level ?? '').toUpperCase() as QuizLevel)
    : 'N5'
  const questions = (edit.questions ?? []).map<DraftQuestion>((question) => ({
    id: typeof question.id === 'number' ? question.id : null,
    content: question.content ?? '',
    explanation: question.explanation ?? '',
    choices: normalizeChoices(question.choices)
  }))
  return {
    id: typeof edit.id === 'number' ? edit.id : null,
    title: edit.title ?? '',
    description: edit.description ?? '',
    level,
    questions
  }
}

/** Draft → payload gửi server: trim mọi chuỗi, sort lựa chọn theo position. */
export function draftToPayload(draft: DraftSet): QuizSetEdit {
  return {
    id: draft.id,
    title: draft.title.trim(),
    description: draft.description.trim(),
    level: draft.level,
    questions: draft.questions.map((question) => ({
      id: question.id,
      content: question.content.trim(),
      explanation: question.explanation.trim(),
      choices: [...question.choices]
        .sort((left, right) => left.position - right.position)
        .map((choice) => ({
          id: choice.id,
          content: choice.content.trim(),
          position: choice.position,
          correct: choice.correct
        }))
    }))
  }
}

export interface SetMetaErrors {
  title?: string
  level?: string
}

export function validateSetMeta(draft: DraftSet): SetMetaErrors {
  const errors: SetMetaErrors = {}
  const title = draft.title.trim()
  if (title.length === 0) errors.title = 'Nhập tiêu đề bộ đề'
  else if (title.length > QUIZ_TITLE_MAX) {
    errors.title = `Tiêu đề tối đa ${QUIZ_TITLE_MAX} ký tự`
  }
  if (!isQuizLevel(draft.level)) errors.level = 'Chọn trình độ N5–N1'
  return errors
}

/** Các lỗi của một câu hỏi; mảng rỗng nghĩa là hợp lệ. */
export function questionIssues(question: DraftQuestion): string[] {
  const issues: string[] = []
  if (question.content.trim().length === 0) issues.push('Thiếu nội dung câu hỏi')

  const choices = question.choices
  if (choices.length !== CHOICES_PER_QUESTION) {
    issues.push(`Cần đúng ${CHOICES_PER_QUESTION} lựa chọn`)
  }
  const positions = new Set(choices.map((choice) => choice.position))
  if (positions.size !== choices.length) issues.push('Vị trí lựa chọn bị trùng')

  if (choices.some((choice) => choice.content.trim().length === 0)) {
    issues.push('Có lựa chọn chưa có nội dung')
  }

  const correctCount = choices.filter((choice) => choice.correct).length
  if (correctCount === 0) issues.push('Chưa chọn đáp án đúng')
  else if (correctCount > 1) issues.push('Chỉ được chọn một đáp án đúng')

  return issues
}

export interface DraftValidation {
  meta: SetMetaErrors
  /** Lỗi theo từng câu, cùng thứ tự với `draft.questions`. */
  questions: string[][]
  ok: boolean
}

export function validateDraft(draft: DraftSet): DraftValidation {
  const meta = validateSetMeta(draft)
  const questions = draft.questions.map(questionIssues)
  const ok = Object.keys(meta).length === 0 && questions.every((issues) => issues.length === 0)
  return { meta, questions, ok }
}

export interface PublishChecklistItem {
  label: string
  ok: boolean
}

export interface PublishChecklist {
  ready: boolean
  items: PublishChecklistItem[]
  /** Câu hợp lệ / tổng; dùng cho câu giải thích. */
  validQuestions: number
}

/** Danh sách điều kiện xuất bản — hiển thị ngay trong editor để người dùng biết thiếu gì. */
export function publishChecklist(draft: DraftSet): PublishChecklist {
  const meta = validateSetMeta(draft)
  const issuesPerQuestion = draft.questions.map(questionIssues)
  const validQuestions = issuesPerQuestion.filter((issues) => issues.length === 0).length
  const items: PublishChecklistItem[] = [
    { label: `Tiêu đề 1–${QUIZ_TITLE_MAX} ký tự và có trình độ`, ok: Object.keys(meta).length === 0 },
    { label: 'Mọi câu đã thêm đều hợp lệ (4 lựa chọn, 1 đáp án đúng)', ok: issuesPerQuestion.every((issues) => issues.length === 0) },
    {
      label: `Có ít nhất ${MIN_PUBLISH_QUESTIONS} câu hỏi hợp lệ`,
      ok: validQuestions >= MIN_PUBLISH_QUESTIONS
    }
  ]
  return {
    ready: issuesPerQuestion.every((issues) => issues.length === 0) && validQuestions >= MIN_PUBLISH_QUESTIONS && Object.keys(meta).length === 0,
    items,
    validQuestions
  }
}

/** So sánh draft với bản đã tải để biết có thay đổi chưa lưu hay không. */
export function isDraftDirty(baseline: DraftSet, draft: DraftSet): boolean {
  return JSON.stringify(draftToPayload(baseline)) !== JSON.stringify(draftToPayload(draft))
}

/** Đặt `correct` cho đúng một lựa chọn (radio, không phải checkbox). */
export function setCorrectChoice(question: DraftQuestion, position: number): DraftQuestion {
  return {
    ...question,
    choices: question.choices.map((choice) => ({
      ...choice,
      correct: choice.position === position
    }))
  }
}

export function addQuestion(draft: DraftSet): DraftSet {
  return { ...draft, questions: [...draft.questions, emptyDraftQuestion()] }
}

export function removeQuestion(draft: DraftSet, index: number): DraftSet {
  return { ...draft, questions: draft.questions.filter((_, current) => current !== index) }
}

export function updateQuestion(
  draft: DraftSet,
  index: number,
  update: (question: DraftQuestion) => DraftQuestion
): DraftSet {
  return {
    ...draft,
    questions: draft.questions.map((question, current) =>
      current === index ? update(question) : question
    )
  }
}
