// Việc khách cần làm trên đơn (chuông thông báo) và thứ tự ưu tiên của danh sách Đơn của tôi.
import { HOUR, URGENT_HOURS } from '@shared/config/business-rules'
import { acceptanceDeadline, choiceDeadline, paymentDeadline } from '@shared/lib/deadlines'
import { choiceExpired } from '@shared/lib/order-status'
import type { CustomerOrderView } from '@shared/services/orders'

export interface Attention { title: string; deadline: number; href: string; icon: string; urgent: boolean }

export function attentionOf(o: CustomerOrderView, now = Date.now()): Attention | null {
  const item = (title: string, deadline: number, href: string, icon: string) => ({ title, deadline, href, icon, urgent: deadline - now < URGENT_HOURS * HOUR })
  if (o.status === 'choose_option' && o.offer && !choiceExpired(o, now)) return item('Chọn phương án xử lý hồ sơ', choiceDeadline(o.offer.sentAt), `/orders/${o.id}`, 'fa-list-check')
  if (o.status === 'awaiting_payment' && o.approvedAt) return item('Thanh toán đơn đã được duyệt', paymentDeadline(o.approvedAt, o.departAt), `/orders/${o.id}`, 'fa-credit-card')
  if (o.status === 'delivered' && o.deliveredAt) return item('Nghiệm thu ngựa đã giao', acceptanceDeadline(o.deliveredAt), `/acceptance?id=${o.id}`, 'fa-clipboard-check')
  return null
}

const CLOSED = ['completed', 'rejected', 'cancelled']

// 0: cần bạn xử lý (hạn gần trước) · 1: đang chạy (ngày đi gần trước) · 2: đã đóng (mới nhất trước)
export function byPriority<T extends CustomerOrderView>(orders: T[], now = Date.now()): T[] {
  const rank = (o: T) => {
    const a = attentionOf(o, now)
    if (a) return [0, a.deadline]
    if (CLOSED.includes(o.status)) return [2, -o.departAt]
    return [1, o.departAt]
  }
  return [...orders].sort((x, y) => { const [gx, kx] = rank(x), [gy, ky] = rank(y); return gx - gy || kx - ky })
}
