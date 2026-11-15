/**
 * Badge "Chế độ xem thử" — bắt buộc phải nhìn thấy khi fixture demo đang bật.
 *
 * Component này chỉ đọc một cờ boolean; nó không import fixture, nên bản production
 * không kéo dữ liệu giả vào bundle.
 */
import type { ReactNode } from 'react'
import { Badge } from '../components/ui'
import { isDemoMode } from '../lib/demo/flag'

export function DemoBadge(): ReactNode {
  if (!isDemoMode()) return null
  return (
    <Badge tone="warning" appearance="solid" dot title="Dữ liệu minh hoạ, không phải dữ liệu máy chủ">
      Chế độ xem thử
    </Badge>
  )
}
