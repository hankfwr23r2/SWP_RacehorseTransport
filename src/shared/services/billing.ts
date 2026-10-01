// Hóa đơn của khách: 100% đã trả trước chuyến + hóa đơn quyết toán phụ phí phát sinh.
// Sau này: GET /api/billing · POST /api/billing/{orderId}/settlement/pay
import { settlementOf, type Settlement } from '../lib/settlement'
import type { Order } from '../types/order'
import { expensesApi } from './expenses'
import { ordersApi } from './orders'

export interface Bill { order: Order; settlement: Settlement }

const BILLED: Order['status'][] = ['paid', 'in_transit', 'delivered', 'disputed', 'completed']

export const billingApi = {
  // Hóa đơn các đơn của khách đã thanh toán
  list: async (customer: string): Promise<Bill[]> => {
    const [orders, expenses] = await Promise.all([ordersApi.list(), expensesApi.list()])
    return orders.filter(o => o.customer === customer && BILLED.includes(o.status)).map(order => ({ order, settlement: settlementOf(order, expenses) }))
  },
  // Còn phải trả bao nhiêu trước khi bàn giao (tài xế bị khóa bàn giao khi > 0)
  due: async (orderId: string): Promise<number> => {
    const [o, expenses] = await Promise.all([ordersApi.get(orderId), expensesApi.list()])
    return o ? settlementOf(o, expenses).due : 0
  },
  paySettlement: async (customer: string, orderId: string) => {
    const [o, expenses] = await Promise.all([ordersApi.get(orderId), expensesApi.list()])
    if (!o || o.customer !== customer) throw new Error('Không có quyền với đơn này')
    const { total } = settlementOf(o, expenses)
    return ordersApi.update(orderId, { settlementPaid: { amount: total, at: Date.now() } })
  },
}
