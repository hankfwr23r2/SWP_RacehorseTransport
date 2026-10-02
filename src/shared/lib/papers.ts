// Quy tắc trang Giấy tờ chuyến đi (đơn ĐÃ THANH TOÁN), theo tài liệu nhóm:
// - Khách tự xin Giấy kiểm dịch (+ Tờ khai hải quan nếu quốc tế) và tải bản scan trước giờ đi 24 giờ.
// - Kiểm dịch viên chỉ ĐỐI CHIẾU: trùng microchip, trùng cửa khẩu, còn hạn. Sai thì từ chối giấy, khách xin lại; không sửa lộ trình theo giấy sai.
// - Bản gốc do tài xế thu tại điểm đón (checklist nhận ngựa), không qua Kiểm dịch.
// - Kiểm dịch viên KHÔNG từ chối đơn: vướng thì báo Manager.
// Giấy nhập từ trước (không có uploadedAt) coi như đã đạt.
import { PROCEDURES, proceduresFor, type ProcedureKey } from '../config/documents'
import { expiresEarly } from './trip'
import type { Order } from '../types/order'

export type PapersState = 'preparing' | 'ready' | 'reported'
export type ProcedureState = 'missing' | 'pending' | 'passed' | 'rejected' | 'expired'

export const procedureExpiresEarly = (o: Order, key: ProcedureKey) => {
  const p = o.papers?.procedures[key]
  return !!(p && PROCEDURES[key].hasValidity && p.validUntil && expiresEarly(p.validUntil, o.departAt, o.duration))
}

export function procedureState(o: Order, key: ProcedureKey): ProcedureState {
  const p = o.papers?.procedures[key]
  if (!p) return 'missing'
  if (p.check?.result === 'rejected') return 'rejected'
  if (p.uploadedAt && !p.check) return 'pending'
  return procedureExpiresEarly(o, key) ? 'expired' : 'passed'
}

// Mọi giấy của một đơn
export const itemsOf = (o: Order) => proceduresFor(!!o.border).map(key => ({ key, label: PROCEDURES[key].label, done: procedureState(o, key) === 'passed' }))

export function progressOf(o: Order) {
  const items = itemsOf(o)
  const done = items.filter(i => i.done).length
  return { total: items.length, done, ready: done === items.length }
}

// Tình trạng giấy tờ của đơn với kiểm dịch viên `me` (null = không thuộc danh sách)
export function papersState(o: Order, me: string): PapersState | null {
  if (o.inspector !== me || !o.papers) return null
  if (o.papers.handedAt) return 'ready'
  if (o.papersReport) return 'reported'
  if (o.status !== 'paid') return null
  return progressOf(o).ready ? 'ready' : 'preparing'
}
