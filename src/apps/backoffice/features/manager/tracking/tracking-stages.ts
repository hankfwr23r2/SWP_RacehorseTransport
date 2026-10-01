// Trạng thái hiển thị ở trang Theo dõi đơn vận chuyển (suy từ đơn, không lưu riêng) và nhật ký của đơn.
// 8 bước xếp theo bản thiết kế của nhóm; ngoại lệ gộp còn 2 loại.
import { OPTIONS, PROCEDURES, proceduresFor, type OptionKey } from '@shared/config/documents'
import { isSevere } from '@shared/config/health'
import { formatVND } from '@shared/lib/format'
import { orderTotal, type Order } from '@shared/types/order'
import { progressOf } from '@shared/lib/papers'

export type StageKey =
  | 'pending_approval' | 'pending_payment' | 'awaiting_documents' | 'under_verification'
  | 'ready_for_dispatch' | 'in_transit' | 'delivered' | 'completed'
  | 'on_hold' | 'cancelled'

export interface StageDef { key: StageKey; label: string; badge: string; icon: string }

export const STEPS: StageDef[] = [
  { key: 'pending_approval', label: 'Chờ phê duyệt', badge: 'badge-warning', icon: 'fa-file-signature' },
  { key: 'pending_payment', label: 'Chờ thanh toán', badge: 'badge-warning', icon: 'fa-credit-card' },
  { key: 'awaiting_documents', label: 'Chờ giấy tờ', badge: 'badge-info', icon: 'fa-folder-open' },
  { key: 'under_verification', label: 'Đang thẩm định', badge: 'badge-info', icon: 'fa-magnifying-glass' },
  { key: 'ready_for_dispatch', label: 'Sẵn sàng xuất bến', badge: 'badge-info', icon: 'fa-truck-ramp-box' },
  { key: 'in_transit', label: 'Đang vận chuyển', badge: 'badge-orange', icon: 'fa-truck-moving' },
  { key: 'delivered', label: 'Đã giao · chờ quyết toán', badge: 'badge-warning', icon: 'fa-clipboard-check' },
  { key: 'completed', label: 'Hoàn thành', badge: 'badge-success', icon: 'fa-circle-check' },
]
export const EXCEPTIONS: StageDef[] = [
  { key: 'on_hold', label: 'Tạm dừng', badge: 'badge-danger', icon: 'fa-circle-pause' },
  { key: 'cancelled', label: 'Đã hủy / từ chối', badge: 'badge-muted', icon: 'fa-ban' },
]
export const STAGE = Object.fromEntries([...STEPS, ...EXCEPTIONS].map(d => [d.key, d])) as Record<StageKey, StageDef>

const papersMissing = (o: Order) => !!o.papers && !progressOf(o).ready && !o.papers.handedAt

export function stageOf(o: Order): StageKey {
  if (o.status === 'rejected' || o.status === 'cancelled') return 'cancelled'
  if (o.status === 'choose_option' || o.pending) return 'on_hold'
  if (o.status === 'completed') return 'completed'
  if (o.status === 'delivered' || o.status === 'disputed') return 'delivered'
  if (o.status === 'in_transit') return 'in_transit'
  if (o.status === 'paid') return papersMissing(o) ? 'awaiting_documents' : 'ready_for_dispatch'
  if (o.status === 'awaiting_payment') return 'pending_payment'
  return o.stage === 'approval' ? 'pending_approval' : 'under_verification'
}

// Bước (1–8) trên thanh tiến trình. Đơn ngoại lệ: bước bị chặn.
export function stepOf(o: Order): { step: number; blocked: boolean } {
  const key = stageOf(o)
  if (key === 'on_hold') return { step: 4, blocked: true }
  if (key === 'cancelled') {
    if (o.status === 'rejected') return { step: o.rejectedStep === 2 ? 1 : 4, blocked: true }
    return { step: o.paidAt ? 3 : o.approvedAt ? 2 : 1, blocked: true }
  }
  return { step: STEPS.findIndex(d => d.key === key) + 1, blocked: false }
}

// Từ lúc xe khởi hành, nhật ký chuyển sang nhật ký giao hàng
export const isDelivery = (o: Order) => ['in_transit', 'delivered', 'disputed', 'completed'].includes(o.status)

export type Tone = 'done' | 'current' | 'next' | 'alert'
export interface LogEvent { time: number; title: string; desc?: string; meta?: string; tone: Tone; icon: string }

const optionLabel = (key: string) => OPTIONS[key as OptionKey]?.label ?? key
const PENDING_LABEL = { issue: 'Kiểm dịch báo vấn đề, chờ Manager gửi phương án', recheck: 'Khách chọn kiểm tra lại, chờ Manager giao người', expired: 'Khách quá hạn chọn phương án, chờ Manager quyết định' }

// Nhật ký đơn: chỉ những việc đã xảy ra, theo thứ tự thời gian
export function orderLog(o: Order): LogEvent[] {
  const e: LogEvent[] = []
  const add = (time: number | undefined, ev: Omit<LogEvent, 'time'>) => { if (time) e.push({ time, ...ev }) }
  add(o.submittedAt, { title: 'Khách gửi đơn', desc: `${o.horses.length} ngựa: ${o.horses.map(h => h.name).join(', ')}`, meta: `${o.distance} · ${o.border ?? 'Nội địa'}`, tone: 'done', icon: 'fa-paper-plane' })
  if (o.inspector) add(o.intakeAt, { title: 'Hệ thống phân công', desc: `Kiểm dịch viên ${o.inspector} · Điều phối viên ${o.coordinator}`, tone: 'done', icon: 'fa-user-check' })
  add(o.verification?.requestedAt, { title: 'Yêu cầu khách bổ sung giấy tờ', desc: o.verification?.customerMessage, tone: 'done', icon: 'fa-file-circle-exclamation' })
  add(o.offer?.sentAt, { title: 'Gửi phương án cho khách', desc: o.offer?.issue, tone: 'done', icon: 'fa-list-check' })
  add(o.choice?.at, { title: 'Khách chọn phương án', desc: o.choice && optionLabel(o.choice.key), tone: 'done', icon: 'fa-hand-pointer' })
  add(o.recheckAt, { title: 'Bắt đầu kiểm tra lại', tone: 'done', icon: 'fa-rotate' })
  if (o.verification?.result === 'passed') add(o.verification.closedAt, { title: 'Kiểm dịch xác nhận hồ sơ hợp lệ', tone: 'done', icon: 'fa-circle-check' })
  add(o.infeasible?.at, { title: 'Điều phối đánh giá tuyến không khả thi', desc: o.infeasible?.note, tone: 'alert', icon: 'fa-route' })
  add(o.approvedAt, { title: 'Manager phê duyệt', desc: `Gửi yêu cầu thanh toán ${formatVND(orderTotal(o))}`, tone: 'done', icon: 'fa-stamp' })
  add(o.paidAt, { title: 'Khách thanh toán 100%', tone: 'done', icon: 'fa-credit-card' })
  add(o.papersReport?.at, { title: 'Kiểm dịch báo cáo giấy tờ chuyến đi', desc: o.papersReport && `${o.papersReport.type}: ${o.papersReport.note}`, tone: 'alert', icon: 'fa-flag' })
  proceduresFor(!!o.border).forEach(k => {
    const p = o.papers?.procedures[k]
    add(p?.uploadedAt, { title: `Khách tải ${PROCEDURES[k].label}`, tone: 'done', icon: 'fa-cloud-arrow-up' })
    add(p?.check?.at, { title: `Kiểm dịch ${p?.check?.result === 'passed' ? 'duyệt' : 'từ chối'} ${PROCEDURES[k].label}`, desc: p?.check?.reason, tone: p?.check?.result === 'passed' ? 'done' : 'alert', icon: p?.check?.result === 'passed' ? 'fa-circle-check' : 'fa-circle-xmark' })
  })
  add(o.papers?.handedAt, { title: 'Bàn giao giấy tờ cho Điều phối', tone: 'done', icon: 'fa-handshake' })
  add(o.pending?.at, { title: 'Chuyển lên Manager', desc: o.pending && PENDING_LABEL[o.pending.kind], tone: 'alert', icon: 'fa-user-tie' })
  add(o.rejectedAt, { title: 'Đơn bị từ chối', desc: `${o.rejectType ?? ''}${o.reason ? `: ${o.reason}` : ''}`, tone: 'alert', icon: 'fa-circle-xmark' })
  add(o.cancelledAt, { title: 'Đơn bị hủy', desc: o.reason, tone: 'alert', icon: 'fa-ban' })
  e.sort((a, b) => a.time - b.time)
  // Việc mới nhất của đơn đang chạy là việc hiện tại
  const last = e[e.length - 1]
  if (last && last.tone === 'done' && stageOf(o) !== 'cancelled') last.tone = 'current'
  return e
}

// Nhật ký giao hàng: mốc tài xế xác nhận + báo cáo sức khỏe của hộ tống; đơn đã giao không còn dữ liệu chuyến thì lấy biên bản bàn giao
export function deliveryLog(o: Order): LogEvent[] {
  const e: LogEvent[] = []
  if (o.trip) {
    o.trip.checkpoints.forEach(c => e.push({ time: c.time, title: c.label, desc: c.place, tone: c.state, icon: c.state === 'next' ? 'fa-location-dot' : 'fa-truck' }))
    o.trip.health.forEach(h => e.push({
      time: h.time, title: h.horse ? `Sức khỏe · ${h.horse}: ${h.status ?? 'đã đo'}` : 'Ghi chú hộ tống',
      desc: [h.note, h.other].filter(Boolean).join(' · '), meta: `Thân nhiệt ${h.temp} · Nhịp tim ${h.heart}${h.by ? ` · ${h.by}` : ''}`,
      tone: isSevere(h.status) ? 'alert' : 'done', icon: 'fa-heart-pulse',
    }))
  } else if (o.handover) {
    const { pickup, delivery } = o.handover
    e.push({ time: pickup.time, title: 'Nhận ngựa lên xe', desc: `${o.handover.vehicle} · Tài xế ${o.handover.driver} · Hộ tống ${o.handover.groom}`, meta: `Thân nhiệt ${pickup.temp}°C · Nhịp tim ${pickup.heart} bpm · ${pickup.body}`, tone: 'done', icon: 'fa-truck' })
    e.push({ time: delivery.time, title: 'Giao ngựa', desc: o.to, meta: `Thân nhiệt ${delivery.temp}°C · Nhịp tim ${delivery.heart} bpm · ${delivery.body}`, tone: 'done', icon: 'fa-flag-checkered' })
  }
  if (o.issue) e.push({ time: o.issue.time, title: 'Khách báo vấn đề khi nghiệm thu', desc: `${o.issue.type}: ${o.issue.note}`, tone: 'alert', icon: 'fa-flag' })
  if (o.acceptedAt) e.push({ time: o.acceptedAt, title: o.acceptedBy === 'auto' ? 'Tự động nghiệm thu' : 'Khách xác nhận nghiệm thu', tone: 'done', icon: 'fa-circle-check' })
  return e.sort((a, b) => (a.tone === 'next' ? 1 : 0) - (b.tone === 'next' ? 1 : 0) || a.time - b.time)
}
