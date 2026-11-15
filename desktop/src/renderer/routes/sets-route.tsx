/**
 * `/sets` — danh sách bộ đề của tôi và bộ đề đã xuất bản.
 *
 * Hợp đồng (docs/protocol.md §6): `QUIZ_SET_LIST {scope}` → `QUIZ_SET_LIST_RESULT`;
 * `QUIZ_SET_PUBLISH` / `QUIZ_SET_DELETE` → `QUIZ_SET_PUBLISHED` / `QUIZ_SET_DELETED`.
 *
 * Thao tác nguy hiểm (xoá) đi qua dialog; thao tác chỉ chủ sở hữu làm được (sửa, xuất bản,
 * xoá) chỉ hiện trên bộ đề `ownedByMe`, còn server vẫn là bên từ chối cuối cùng.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/shell'
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorBanner,
  SegmentedControl,
  Skeleton
} from '../components/ui'
import { ChevronRight, Library, Plus, RefreshCw, X } from '../components/ui/icons'
import { useSetsStore, type QuizSetScope } from '../lib/sets/sets-store'
import { describeErrorCode } from '../lib/error-codes'

const SCOPE_OPTIONS = [
  { value: 'OWN' as const, label: 'Của tôi' },
  { value: 'PUBLISHED' as const, label: 'Đã xuất bản' }
]

export function SetsRoute(): ReactNode {
  const navigate = useNavigate()

  const scope = useSetsStore((state) => state.scope)
  const items = useSetsStore((state) => state.items[state.scope])
  const listLoading = useSetsStore((state) => state.listLoading)
  const listError = useSetsStore((state) => state.listError)
  const notice = useSetsStore((state) => state.notice)
  const publishPending = useSetsStore((state) => state.publishPending)
  const deletePending = useSetsStore((state) => state.deletePending)
  const setScope = useSetsStore((state) => state.setScope)
  const requestList = useSetsStore((state) => state.requestList)
  const setPublished = useSetsStore((state) => state.setPublished)
  const remove = useSetsStore((state) => state.remove)
  const clearNotice = useSetsStore((state) => state.clearNotice)

  const [pendingDelete, setPendingDelete] = useState<{ id: number; title: string } | null>(null)

  /* Chỉ tải một lần khi mở màn hình; đổi scope thì `setScope` tự tải. */
  useEffect(() => {
    void requestList(useSetsStore.getState().scope)
  }, [requestList])

  const errorCopy = listError ? describeErrorCode(listError) : null
  const showSkeleton = listLoading && items === null

  const openSet = (id: number): void => {
    navigate(`/sets/editor?id=${id}`)
  }

  const confirmDelete = async (): Promise<void> => {
    if (!pendingDelete) return
    const target = pendingDelete
    setPendingDelete(null)
    await remove(target.id)
  }

  return (
    <>
      <PageHeader
        eyebrow="Chơi"
        title="Bộ đề"
        subtitle="Tạo, chỉnh sửa và xuất bản bộ câu hỏi. Chỉ bộ đề đã xuất bản mới dùng được để mở phòng Quiz."
        meta={
          <Badge tone="neutral" appearance="outline">
            {items ? `${items.length} bộ đề` : 'Đang tải…'}
          </Badge>
        }
        actions={
          <Button leftIcon={<Plus size={16} />} onClick={() => navigate('/sets/editor')}>
            Tạo bộ đề
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl<QuizSetScope>
          label="Phạm vi bộ đề"
          value={scope}
          onChange={setScope}
          options={SCOPE_OPTIONS}
        />
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<RefreshCw size={14} />}
          onClick={() => void requestList(scope)}
          loading={listLoading}
        >
          Làm mới
        </Button>
      </div>

      {notice ? (
        <ErrorBanner
          className="mb-4"
          tone={notice.tone}
          title={notice.title}
          description={notice.description}
          onDismiss={clearNotice}
        />
      ) : null}

      {errorCopy ? (
        <ErrorBanner
          className="mb-4"
          tone="danger"
          title={errorCopy.title}
          description={errorCopy.description}
          onRetry={() => void requestList(scope)}
          retryLabel="Tải lại danh sách"
        />
      ) : null}

      {showSkeleton ? (
        <Card padding="md">
          <div className="flex flex-col gap-3">
            <Skeleton height="1.4rem" width="40%" />
            <Skeleton lines={3} height="1.6rem" rounded="sm" />
          </div>
        </Card>
      ) : items !== null && items.length === 0 ? (
        <EmptyState
          icon={<Library size={22} aria-hidden="true" />}
          title={scope === 'OWN' ? 'Bạn chưa có bộ đề nào' : 'Chưa có bộ đề nào được xuất bản'}
          description={
            scope === 'OWN'
              ? 'Tạo bộ đề đầu tiên, thêm ít nhất 3 câu rồi xuất bản để mở phòng Quiz.'
              : 'Khi ai đó xuất bản bộ đề, nó sẽ xuất hiện ở đây để bạn dùng cho phòng Quiz.'
          }
          action={
            scope === 'OWN' ? (
              <Button leftIcon={<Plus size={16} />} onClick={() => navigate('/sets/editor')}>
                Tạo bộ đề
              </Button>
            ) : null
          }
        />
      ) : items ? (
        <Card padding="none">
          <ul className="flex flex-col">
            {items.map((item) => {
              const owned = item.ownedByMe
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 border-b border-nq-border-subtle px-5 py-3.5 last:border-b-0"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openSet(item.id)}
                        className="nq-focusable truncate rounded-nq-sm text-left text-nq-sm font-semibold text-nq-text hover:underline"
                      >
                        {item.title}
                      </button>
                      <Badge tone="neutral" appearance="outline">
                        {item.level}
                      </Badge>
                      <Badge tone={item.published ? 'success' : 'neutral'} appearance="soft" dot>
                        {item.published ? 'Đã xuất bản' : 'Bản nháp'}
                      </Badge>
                      {item.questionCount < 3 ? (
                        <Badge tone="warning" appearance="soft">
                          {item.questionCount} câu — chưa đủ để xuất bản
                        </Badge>
                      ) : (
                        <Badge tone="neutral" appearance="outline">
                          {item.questionCount} câu
                        </Badge>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-nq-xs text-nq-text-tertiary">
                      {owned ? 'Bộ đề của bạn' : `Tác giả: ${item.ownerUsername}`}
                      {item.description ? ` · ${item.description}` : ''}
                    </span>
                  </span>

                  <span className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => openSet(item.id)} rightIcon={<ChevronRight size={14} />}>
                      {owned ? 'Sửa' : 'Xem'}
                    </Button>
                    {owned ? (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={publishPending}
                          onClick={() => void setPublished(item.id, !item.published)}
                        >
                          {item.published ? 'Thu hồi' : 'Xuất bản'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<X size={14} />}
                          onClick={() => setPendingDelete({ id: item.id, title: item.title })}
                          disabled={deletePending !== null}
                        >
                          Xoá
                        </Button>
                      </>
                    ) : null}
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>
      ) : null}

      <p className="mt-3 text-nq-xs text-nq-text-tertiary">
        Xuất bản cần ít nhất 3 câu hợp lệ; mỗi câu phải có 4 lựa chọn và đúng một đáp án. Máy chủ
        kiểm tra lại lần cuối trước khi lưu hoặc xuất bản.
      </p>

      <Dialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        closeOnScrimClick={false}
        title="Xoá bộ đề?"
        description={
          pendingDelete
            ? `"${pendingDelete.title}" sẽ bị xoá khỏi danh sách của bạn. Phòng Quiz đang dùng bộ đề này không bị ảnh hưởng.`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              <X aria-hidden="true" size={15} />
              Giữ lại
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} loading={deletePending !== null}>
              Xoá bộ đề
            </Button>
          </>
        }
      />
    </>
  )
}
