// Chi phí tài xế khai dọc đường (kèm ảnh biên lai). Manager duyệt ở trang Chi phí tài xế.
// Sau này: GET/POST /api/expenses · PATCH /api/expenses/{id}
import type { Currency } from '../config/driver'
import { seedExpenses } from './mock/expenses'
import { createStore } from './store'

export interface Expense {
  id: string // EXP-xxx
  orderId: string
  tripId: string
  driverId: string
  time: number
  type: string
  billable: boolean // phụ phí tính cho khách (loại B)
  amount: number
  currency: Currency
  amountVnd: number
  receipt: string // ảnh biên lai / hóa đơn
  note: string
  status: 'pending' | 'approved' | 'rejected'
  decidedBy?: string
  decidedAt?: number
  rejectReason?: string // lý do từ chối (yêu cầu tài xế giải trình)
}

const store = createStore<Expense>('expenses', seedExpenses)

export const expensesApi = {
  list: async (): Promise<Expense[]> => structuredClone(store.all()),
  create: async (data: Omit<Expense, 'id' | 'status'>): Promise<Expense> => {
    const next = Math.max(0, ...store.all().map(e => Number(e.id.slice(4)))) + 1
    return structuredClone(store.add({ ...data, id: `EXP-${String(next).padStart(3, '0')}`, status: 'pending' }))
  },
  update: async (id: string, patch: Partial<Expense>): Promise<Expense> => structuredClone(store.update(id, patch)),
}
