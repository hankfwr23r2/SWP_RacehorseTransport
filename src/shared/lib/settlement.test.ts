import { describe, expect, it } from 'vitest'
import type { Expense } from '../services/expenses'
import { pickupWaitFee, settlementOf } from './settlement'

const exp = (p: Partial<Expense>): Expense => ({ id: 'EXP-1', orderId: 'EQ-1', tripId: 'TR-1', driverId: 'TX-1', time: 0, type: 'Phí lưu bãi', billable: true, amount: 2_000_000, currency: 'VND', amountVnd: 2_000_000, receipt: 'a.jpg', note: '', status: 'approved', ...p })

describe('phí chờ tại điểm đón', () => {
  it('block giờ, tối đa 4 giờ', () => {
    expect(pickupWaitFee(undefined)).toBe(0)
    expect(pickupWaitFee(1)).toBe(500_000)
    expect(pickupWaitFee(61)).toBe(1_000_000)
    expect(pickupWaitFee(600)).toBe(2_000_000)
  })
})

describe('hóa đơn quyết toán', () => {
  const order = { id: 'EQ-1', trip: undefined, settlementPaid: undefined }
  it('chỉ tính phụ phí (loại B) đã duyệt của đúng đơn', () => {
    const s = settlementOf(order, [exp({}), exp({ id: 'EXP-2', status: 'pending' }), exp({ id: 'EXP-3', billable: false }), exp({ id: 'EXP-4', orderId: 'EQ-2' }), exp({ id: 'EXP-5', status: 'rejected' })])
    expect(s.total).toBe(2_000_000)
    expect(s.due).toBe(2_000_000)
    expect(s.pending).toBe(1)
  })
  it('trừ phần đã thanh toán', () => {
    const s = settlementOf({ ...order, settlementPaid: { amount: 2_000_000, at: 1 } }, [exp({}), exp({ id: 'EXP-2', amountVnd: 600_000 })])
    expect(s).toMatchObject({ total: 2_600_000, paid: 2_000_000, due: 600_000 })
  })
})
