/**
 * `/sets/editor` — tạo mới (`?id=` trống) hoặc sửa bộ đề (`?id=<quizSetId>`).
 *
 * Luồng: `QUIZ_SET_GET` → `QUIZ_SET_DETAIL` → sửa → `QUIZ_SET_SAVE` → `QUIZ_SET_SAVED`
 * (kèm `QUIZ_SET_PUBLISH` nếu người dùng chọn "Lưu & xuất bản").
 *
 * Kiểm tra tại client mirror `QuizSetService.validate` (xem `lib/sets/validation.ts`):
 * tiêu đề 1–100, level N5–N1, mỗi câu đúng 4 lựa chọn + 1 đáp án đúng, xuất bản cần ≥ 3 câu.
 * Server vẫn là bên phán quyết (`INVALID_QUIZ`, `NOT_OWNER`, …).
 *
 * Rời màn hình khi còn thay đổi chưa lưu phải qua xác nhận: nút "Hủy" của trang hỏi trực
 * tiếp, sidebar hỏi qua `lib/navigation-guard.ts`.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/shell'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Dialog,
  ErrorBanner,
  Input,
  Select,
  Skeleton,
  Textarea
} from '../components/ui'
import { Check, Plus, ShieldCheck, X } from '../components/ui/icons'
import { useSetsStore } from '../lib/sets/sets-store'
import {
  QUIZ_LEVELS,
  QUIZ_TITLE_MAX,
  addQuestion,
  emptyDraftSet,
  isDraftDirty,
  publishChecklist,
  removeQuestion,
  setCorrectChoice,
  updateQuestion,
  validateDraft,
  type DraftSet,
  type DraftValidation
} from '../lib/sets/validation'
import { useNavigationGuard } from '../lib/navigation-guard'
import { describeErrorCode } from '../lib/error-codes'

export function SetEditorRoute(): ReactNode {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const rawId = params.get('id')
  const quizSetId = rawId !== null && /^\d+$/.test(rawId) ? Number(rawId) : null

  const detail = useSetsStore((state) => state.detail)
  const detailLoading = useSetsStore((state) => state.detailLoading)
  const detailError = useSetsStore((state) => state.detailError)
  const savedId = useSetsStore((state) => state.savedId)
  const saving = useSetsStore((state) => state.saving)
  const notice = useSetsStore((state) => state.notice)
  const ownItems = useSetsStore((state) => state.items.OWN)
  const publishedItems = useSetsStore((state) => state.items.PUBLISHED)
  const requestDetail = useSetsStore((state) => state.requestDetail)
  const requestList = useSetsStore((state) => state.requestList)
  const save = useSetsStore((state) => state.save)
  const clearDetail = useSetsStore((state) => state.clearDetail)
  const consumeSaved = useSetsStore((state) => state.consumeSaved)
  const clearNotice = useSetsStore((state) => state.clearNotice)

  const setDirty = useNavigationGuard((state) => state.setDirty)

  const [draft, setDraft] = useState<DraftSet>(emptyDraftSet)
  const [errors, setErrors] = useState<DraftValidation | null>(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const baselineRef = useRef<DraftSet>(emptyDraftSet())
  const loadedRef = useRef<number | null>(null)

  /* Nạp dữ liệu theo id trên URL. */
  useEffect(() => {
    clearDetail()
    consumeSaved()
    setErrors(null)
    loadedRef.current = null

    if (quizSetId === null) {
      const empty = emptyDraftSet()
      setDraft(empty)
      baselineRef.current = empty
      return
    }

    void requestList('OWN')
    void requestDetail(quizSetId)
  }, [quizSetId, clearDetail, consumeSaved, requestDetail, requestList])

  /* Chỉ nhận chi tiết của đúng bộ đề đang mở. */
  useEffect(() => {
    if (!detail || quizSetId === null) return
    if (detail.id !== quizSetId || loadedRef.current === quizSetId) return
    loadedRef.current = quizSetId
    setDraft(detail)
    baselineRef.current = detail
  }, [detail, quizSetId])

  const dirty = isDraftDirty(baselineRef.current, draft)

  useEffect(() => {
    setDirty(dirty, draft.title.trim() || 'Bộ đề chưa đặt tên')
  }, [dirty, draft.title, setDirty])

  /* Rời trang thì luôn nhả cờ, nếu không sidebar sẽ hỏi mãi. */
  useEffect(() => () => setDirty(false), [setDirty])

  /* Lưu xong → về danh sách. */
  useEffect(() => {
    if (savedId === null) return
    consumeSaved()
    baselineRef.current = draft
    setDirty(false)
    navigate('/sets', { replace: true })
  }, [savedId, consumeSaved, draft, navigate, setDirty])

  const summary = quizSetId === null
    ? null
    : (ownItems?.find((item) => item.id === quizSetId) ??
      publishedItems?.find((item) => item.id === quizSetId) ??
      null)
  const editable = quizSetId === null ? true : summary?.ownedByMe === true

  const checklist = publishChecklist(draft)
  const detailCopy = detailError ? describeErrorCode(detailError) : null

  const patch = (update: (current: DraftSet) => DraftSet): void => {
    setDraft((current) => update(current))
  }

  const handleSave = async (publishAfter: boolean): Promise<void> => {
    const validation = validateDraft(draft)
    setErrors(validation)
    if (!validation.ok) return
    if (publishAfter && !publishChecklist(draft).ready) return
    await save(draft, publishAfter)
  }

  const requestLeave = (): void => {
    if (!dirty) {
      setDirty(false)
      navigate('/sets')
      return
    }
    setConfirmLeave(true)
  }

  const confirmLeaveNow = (): void => {
    setConfirmLeave(false)
    setDirty(false)
    navigate('/sets')
  }

  return (
    <>
      <PageHeader
        eyebrow="Bộ đề"
        title={quizSetId === null ? 'Tạo bộ đề' : editable ? 'Sửa bộ đề' : 'Xem bộ đề'}
        subtitle={
          quizSetId === null
            ? 'Thêm thông tin và ít nhất 3 câu hỏi hợp lệ để có thể xuất bản.'
            : editable
              ? 'Thay đổi được lưu dưới dạng bản nháp cho tới khi bạn xuất bản.'
              : 'Bộ đề đã xuất bản của người khác — chỉ đọc.'
        }
        meta={
          <>
            <Badge tone={dirty ? 'warning' : 'neutral'} appearance="soft" dot>
              {dirty ? 'Có thay đổi chưa lưu' : 'Không có thay đổi'}
            </Badge>
            <Badge tone="neutral" appearance="outline">
              {draft.questions.length} câu
            </Badge>
            {summary?.published ? (
              <Badge tone="success" appearance="soft">
                Đã xuất bản
              </Badge>
            ) : null}
          </>
        }
        actions={
          <>
            <Button variant="ghost" onClick={requestLeave}>
              Hủy
            </Button>
            {editable ? (
              <>
                <Button
                  variant="secondary"
                  loading={saving}
                  onClick={() => void handleSave(false)}
                  disabled={saving}
                >
                  Lưu nháp
                </Button>
                <Button
                  leftIcon={<Check size={16} />}
                  onClick={() => void handleSave(true)}
                  loading={saving}
                  disabled={saving || !checklist.ready}
                >
                  Lưu &amp; xuất bản
                </Button>
              </>
            ) : null}
          </>
        }
      />

      {!editable && quizSetId !== null ? (
        <ErrorBanner
          className="mb-4"
          tone="info"
          title="Chế độ chỉ đọc"
          description="Bộ đề này thuộc tài khoản khác và đã được xuất bản, nên bạn chỉ xem được nội dung. Chỉ chủ sở hữu mới sửa hoặc thu hồi được."
        />
      ) : null}

      {notice ? (
        <ErrorBanner
          className="mb-4"
          tone={notice.tone}
          title={notice.title}
          description={notice.description}
          onDismiss={clearNotice}
        />
      ) : null}

      {detailCopy ? (
        <ErrorBanner
          className="mb-4"
          tone="danger"
          title={detailCopy.title}
          description={detailCopy.description}
          onRetry={() => {
            if (quizSetId !== null) void requestDetail(quizSetId)
          }}
          retryLabel="Thử lại"
        />
      ) : null}

      {quizSetId !== null && detailLoading && detail === null ? (
        <Card padding="md">
          <Skeleton lines={4} height="1.6rem" rounded="sm" />
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-4">
            <Card padding="lg">
              <CardHeader
                title="Thông tin bộ đề"
                description="Tiêu đề 1–100 ký tự; trình độ dùng để lọc khi tạo phòng Quiz."
              />
              <div className="mt-4 flex flex-col gap-3">
                <Input
                  id="set-title"
                  label="Tiêu đề"
                  value={draft.title}
                  maxLength={QUIZ_TITLE_MAX}
                  error={errors?.meta.title}
                  hint={`${draft.title.trim().length}/${QUIZ_TITLE_MAX} ký tự`}
                  onChange={(event) => patch((current) => ({ ...current, title: event.target.value }))}
                  disabled={!editable}
                />
                <Textarea
                  id="set-description"
                  label="Mô tả"
                  minRows={2}
                  value={draft.description}
                  onChange={(event) =>
                    patch((current) => ({ ...current, description: event.target.value }))
                  }
                  disabled={!editable}
                  hint="Không bắt buộc"
                />
                <Select
                  id="set-level"
                  label="Trình độ"
                  value={draft.level}
                  error={errors?.meta.level}
                  onChange={(event) =>
                    patch((current) => ({
                      ...current,
                      level: event.target.value as DraftSet['level']
                    }))
                  }
                  disabled={!editable}
                  options={QUIZ_LEVELS.map((level) => ({ value: level, label: level }))}
                />
              </div>
            </Card>

            {draft.questions.map((question, index) => (
              <Card key={`${question.id ?? 'new'}-${index}`} padding="lg">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <CardHeader
                    eyebrow={`Câu ${index + 1}`}
                    title={question.content.trim() || 'Câu hỏi chưa có nội dung'}
                    description="Bốn lựa chọn, đúng một đáp án. Vị trí 1–4 do server giữ nguyên."
                  />
                  {editable ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<X size={14} />}
                      onClick={() => patch((current) => removeQuestion(current, index))}
                    >
                      Xoá câu
                    </Button>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-col gap-3">
                  <Textarea
                    label="Nội dung câu hỏi"
                    minRows={2}
                    value={question.content}
                    onChange={(event) =>
                      patch((current) =>
                        updateQuestion(current, index, (item) => ({
                          ...item,
                          content: event.target.value
                        }))
                      )
                    }
                    disabled={!editable}
                  />

                  <fieldset className="flex flex-col gap-2">
                    <legend className="nq-caps mb-1">Lựa chọn (chọn một đáp án đúng)</legend>
                    {question.choices.map((choice) => (
                      <div key={choice.position} className="flex items-start gap-2.5">
                        <label className="flex shrink-0 items-center gap-1.5 pt-2 text-nq-xs text-nq-text-secondary">
                          <input
                            type="radio"
                            name={`q-${index}-correct`}
                            checked={choice.correct}
                            disabled={!editable}
                            onChange={() =>
                              patch((current) =>
                                updateQuestion(current, index, (item) =>
                                  setCorrectChoice(item, choice.position)
                                )
                              )
                            }
                            className="size-4 accent-[var(--nq-primary)]"
                          />
                          <span className="nq-tabular">{choice.position}</span>
                        </label>
                        <Input
                          aria-label={`Nội dung lựa chọn ${choice.position}`}
                          inputSize="sm"
                          value={choice.content}
                          onChange={(event) =>
                            patch((current) =>
                              updateQuestion(current, index, (item) => ({
                                ...item,
                                choices: item.choices.map((candidate) =>
                                  candidate.position === choice.position
                                    ? { ...candidate, content: event.target.value }
                                    : candidate
                                )
                              }))
                            )
                          }
                          disabled={!editable}
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </fieldset>

                  <Textarea
                    label="Giải thích (tuỳ chọn)"
                    minRows={2}
                    value={question.explanation}
                    onChange={(event) =>
                      patch((current) =>
                        updateQuestion(current, index, (item) => ({
                          ...item,
                          explanation: event.target.value
                        }))
                      )
                    }
                    disabled={!editable}
                  />

                  {errors?.questions[index]?.length ? (
                    <ul className="flex flex-col gap-0.5">
                      {errors.questions[index]!.map((issue) => (
                        <li key={issue} className="text-nq-xs leading-snug text-nq-danger">
                          {issue}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </Card>
            ))}

            {editable ? (
              <div>
                <Button
                  variant="secondary"
                  leftIcon={<Plus size={16} />}
                  onClick={() => patch((current) => addQuestion(current))}
                >
                  Thêm câu hỏi
                </Button>
              </div>
            ) : null}

            {draft.questions.length === 0 ? (
              <p className="text-nq-xs text-nq-text-tertiary">
                Bản nháp có thể chưa có câu nào, nhưng cần ít nhất 3 câu hợp lệ để xuất bản.
              </p>
            ) : null}
          </div>

          <Card tone="sunken" padding="md" className="h-fit">
            <CardHeader
              icon={<ShieldCheck size={18} aria-hidden="true" />}
              title="Điều kiện xuất bản"
              description="Máy chủ kiểm tra lại toàn bộ trước khi lưu hoặc xuất bản."
            />
            <ul className="mt-4 flex flex-col gap-2">
              {checklist.items.map((item) => (
                <li key={item.label} className="flex items-start gap-2 text-nq-sm leading-normal">
                  <span
                    aria-hidden="true"
                    className={
                      item.ok
                        ? 'mt-0.5 grid size-4 shrink-0 place-items-center rounded-nq-full bg-nq-success-soft text-nq-success'
                        : 'mt-0.5 grid size-4 shrink-0 place-items-center rounded-nq-full border border-nq-border-strong text-nq-text-tertiary'
                    }
                  >
                    {item.ok ? <Check size={11} /> : null}
                  </span>
                  <span className={item.ok ? 'text-nq-text-secondary' : 'text-nq-text'}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
            <p className="nq-tabular mt-3 text-nq-xs text-nq-text-tertiary">
              {checklist.validQuestions}/{draft.questions.length} câu đang hợp lệ
            </p>
            {!editable ? (
              <p className="mt-3 text-nq-xs text-nq-text-tertiary">
                Bạn không phải chủ sở hữu nên không lưu hay xuất bản được bộ đề này.
              </p>
            ) : null}
          </Card>
        </div>
      )}

      <Dialog
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        closeOnScrimClick={false}
        title="Rời màn hình soạn bộ đề?"
        description="Bộ đề có thay đổi chưa được lưu. Nếu rời đi, các thay đổi hiện tại sẽ mất."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmLeave(false)}>
              <X aria-hidden="true" size={15} />
              Ở lại
            </Button>
            <Button variant="danger" onClick={confirmLeaveNow}>
              Rời và bỏ thay đổi
            </Button>
          </>
        }
      />
    </>
  )
}
