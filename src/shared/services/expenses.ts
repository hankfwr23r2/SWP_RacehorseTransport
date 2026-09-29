// Chi phí tài xế khai dọc đường (kèm ảnh biên lai). Manager duyệt ở đợt sau.
// Sau này: GET/POST /api/expenses
import type { Currency } from '../config/driver'
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
}

const store = createStore<Expense>('expenses', () => [])

export const expensesApi = {
  list: async (): Promise<Expense[]> => structuredClone(store.all()),
  create: async (data: Omit<Expense, 'id' | 'status'>): Promise<Expense> => {
    const next = Math.max(0, ...store.all().map(e => Number(e.id.slice(4)))) + 1
    return structuredClone(store.add({ ...data, id: `EXP-${String(next).padStart(3, '0')}`, status: 'pending' }))
  },
}
