// Trạng thái đơn đang thẩm định ở trang Phê duyệt (tab "Cần xử lý", "Đang thẩm định", "Từ chối").
import { CHOICE_HOURS, HOUR } from '@shared/config/business-rules'
import type { Order } from '@shared/types/order'

// unassigned: đơn mới chưa tự phân công được (không còn kiểm dịch viên / điều phối viên đang làm việc)
export type ReviewStatus = 'unassigned' | 'needs_manager' | 'inspecting' | 'routing' | 'rejected'

export function reviewStatus(o: Order): ReviewStatus | null {
  if (o.status === 'rejected') return o.rejectedStep === 2 ? null : 'rejected' // từ chối ở bước Phê duyệt xem bằng khung Phê duyệt
  if (o.pending) return 'needs_manager'
  if (!['processing', 'choose_option', 'rechecking'].includes(o.status)) return null
  if (o.stage === 'intake') return 'unassigned'
  if (o.stage === 'inspecting') return 'inspecting'
  if (o.stage === 'routing') return 'routing'
  return null // đang chờ Phê duyệt
}

// Đơn đã gửi phương án, đang chờ khách chọn (còn hạn)
export const waitingChoice = (o: Order) => o.status === 'choose_option' && !!o.offer && !o.pending
export const choiceHoursLeft = (o: Order) => Math.max(0, Math.ceil((o.offer!.sentAt + CHOICE_HOURS * HOUR - Date.now()) / HOUR))
