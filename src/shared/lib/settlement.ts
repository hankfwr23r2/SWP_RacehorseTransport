// Hóa đơn quyết toán: phụ phí phát sinh trong chuyến, cộng thêm ngoài 100% đã trả trước chuyến (docs/PRD.md mục 7).
// Gồm phụ phí tài xế khai (phí lưu bãi, phí thú y) đã được Manager duyệt, và phí chờ khi khách thiếu bản gốc tại điểm đón.
import { PICKUP_MAX_WAIT_HOURS, PICKUP_WAIT_FEE_PER_HOUR } from '../config/business-rules'
import type { Expense } from '../services/expenses'
import type { Order } from '../types/order'

// Tính theo block giờ, tối đa PICKUP_MAX_WAIT_HOURS
export const pickupWaitFee = (minutes?: number) => (minutes ? Math.min(Math.ceil(minutes / 60), PICKUP_MAX_WAIT_HOURS) * PICKUP_WAIT_FEE_PER_HOUR : 0)

export interface Settlement {
  lines: [label: string, detail: string, amount: number][]
  total: number
  paid: number
  due: number
  pending: number // số khoản phụ phí tài xế đã khai nhưng Manager chưa duyệt (chưa tính vào hóa đơn)
}

export function settlementOf(o: Pick<Order, 'id' | 'trip' | 'settlementPaid'>, expenses: Expense[]): Settlement {
  const mine = expenses.filter(e => e.orderId === o.id && e.billable)
  const lines: Settlement['lines'] = mine.filter(e => e.status === 'approved').map(e => [e.type, e.note || e.receipt, e.amountVnd])
  const wait = pickupWaitFee(o.trip?.pickup?.waitMinutes)
  if (wait) lines.push(['Phí chờ tại điểm đón', `Khách thiếu bản gốc, chờ ${o.trip!.pickup!.waitMinutes} phút (tính block giờ)`, wait])
  const total = lines.reduce((sum, l) => sum + l[2], 0)
  const paid = o.settlementPaid?.amount ?? 0
  return { lines, total, paid, due: Math.max(0, total - paid), pending: mine.filter(e => e.status === 'pending').length }
}
