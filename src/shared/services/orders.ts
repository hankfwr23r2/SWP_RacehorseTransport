// Service đơn hàng. Tên hàm theo REST để sau này thay bằng API Spring Boot:
//   list() → GET /api/orders · get(id) → GET /api/orders/{id} · update(id, patch) → PATCH /api/orders/{id}
import { acceptanceDeadline, papersScanDue, paymentDeadline } from '../lib/deadlines'
import { formatDateTime } from '../lib/format'
import { itemsOf, procedureState } from '../lib/papers'
import type { Order } from '../types/order'
import { seedOrders } from './mock/orders'
import { seedOtherOrders } from './mock/orders-others'
import { staffApi, suggestStaff } from './staff'
import { createStore } from './store'

// Bộ đơn chung: khách mẫu Trang trại Long Thành + các khách khác
const store = createStore<Order>('orders', () => [...seedOrders(), ...seedOtherOrders()])

// Quy tắc hệ thống chạy mỗi lần đọc đơn (docs/PRD.md mục 3):
// - quá hạn thanh toán → đơn tự hủy, nhả chỗ xe giữ tạm
// - giao xong quá 24 giờ chưa phản hồi → tự động nghiệm thu
// - quá hạn tải giấy kiểm dịch / tờ khai (24 giờ trước giờ đi) mà chưa có giấy hợp lệ → đơn Tạm giữ, nhả chỗ xe (trừ đơn Kiểm dịch đã báo Manager)
// - đơn mới → giao kiểm dịch viên & điều phối viên đang ít việc nhất; không còn ai đang làm việc thì đơn chờ (Manager thấy ở trang Phê duyệt)
// Khi có backend, việc này do job phía server làm.
async function applySystemRules() {
  const now = Date.now()
  const fresh = store.all().filter(o => o.status === 'processing' && o.stage === 'intake')
  if (fresh.length) {
    const staff = await staffApi.list()
    fresh.forEach(o => {
      if (store.get(o.id)?.stage !== 'intake') return // lượt đọc song song đã giao rồi
      const [ins] = suggestStaff(staff, 'inspector', store.all())
      const [coo] = suggestStaff(staff, 'coordinator', store.all())
      if (!ins || !coo) return
      store.update(o.id, {
        stage: 'inspecting', inspector: ins.name, coordinator: coo.name, intakeAt: o.submittedAt,
        task: { step: 'inspector', assigneeId: ins.id, assignedAt: o.submittedAt, pausedWorkingDays: 0, history: [] },
      })
    })
  }
  store.all().forEach(o => {
    if (o.status === 'awaiting_payment' && o.approvedAt && now > paymentDeadline(o.approvedAt, o.departAt)) {
      store.update(o.id, { status: 'cancelled', reason: `Quá hạn thanh toán (hạn ${formatDateTime(paymentDeadline(o.approvedAt, o.departAt))}).` })
    }
    if (o.status === 'paid' && !o.papersReport && now > papersScanDue(o.departAt) && now < o.departAt && itemsOf(o).some(i => ['missing', 'rejected'].includes(procedureState(o, i.key)))) {
      store.update(o.id, {
        status: 'cancelled', cancelledAt: now, heldAt: now,
        reason: `Quá hạn ${formatDateTime(papersScanDue(o.departAt))} mà chưa có đủ giấy kiểm dịch / tờ khai hải quan hợp lệ. Chỗ xe đã được nhả. Theo bảng hoàn tiền, hủy dưới 3 ngày trước ngày đi không được hoàn. Muốn đi, bạn cần đặt đơn mới.`,
      })
    }
    if (o.status === 'delivered' && o.deliveredAt && now > acceptanceDeadline(o.deliveredAt)) {
      store.update(o.id, { status: 'completed', acceptedAt: acceptanceDeadline(o.deliveredAt), acceptedBy: 'auto' })
    }
  })
}

// Bỏ trường nội bộ trước khi đưa sang app khách (khi có backend, API phía khách tự làm việc này)
const INTERNAL_KEYS = ['stage', 'inspector', 'coordinator', 'intakeAt', 'hold', 'warning', 'waitingCustomer', 'pending', 'rejectType', 'report', 'rechecked', 'review', 'task', 'papersReport', 'verification', 'recheckRequest', 'infeasible'] as const
export type CustomerOrderView = Omit<Order, (typeof INTERNAL_KEYS)[number]> & { plates?: string }
// Biển số xe đã gán (khách cần để khai tờ khai hải quan), lấy từ thông tin Manager duyệt, chỉ có sau khi điều phối chốt lộ trình
const platesOf = (o: Order) => o.review?.vehicle.split(', ').map(v => v.replace(/\s*\(.*\)$/, '')).filter(Boolean).join(', ')
const toCustomerView = (o: Order): CustomerOrderView => {
  const view = structuredClone(o) as Partial<Order> & { plates?: string }
  view.plates = platesOf(o)
  INTERNAL_KEYS.forEach(k => delete view[k])
  return view as CustomerOrderView
}

// Dành cho app khách: chỉ đơn của khách đang đăng nhập, không kèm trường nội bộ
export const customerOrdersApi = {
  list: async (customer: string): Promise<CustomerOrderView[]> => { await applySystemRules(); return store.all().filter(o => o.customer === customer).map(toCustomerView) },
  get: async (customer: string, id: string): Promise<CustomerOrderView | undefined> => {
    await applySystemRules()
    const o = store.get(id)
    return o && o.customer === customer ? toCustomerView(o) : undefined
  },
  update: async (customer: string, id: string, patch: Partial<CustomerOrderView>): Promise<CustomerOrderView> => {
    if (store.get(id)?.customer !== customer) throw new Error('Không có quyền với đơn này')
    return toCustomerView(store.update(id, patch))
  },
}

// Dành cho app nội bộ
export const ordersApi = {
  list: async (): Promise<Order[]> => { await applySystemRules(); return structuredClone(store.all()) },
  get: async (id: string): Promise<Order | undefined> => { await applySystemRules(); return structuredClone(store.get(id)) },
  update: async (id: string, patch: Partial<Order>): Promise<Order> => structuredClone(store.update(id, patch)),
}
