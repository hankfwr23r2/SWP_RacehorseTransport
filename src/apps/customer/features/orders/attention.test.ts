// Thứ tự ưu tiên ở Đơn của tôi và việc cần làm trong chuông thông báo, trên bộ đơn mẫu của khách
import { describe, expect, it } from 'vitest'
import { seedOrders } from '@shared/services/mock/orders'
import { attentionOf, byPriority } from './attention'

const orders = seedOrders()

describe('việc cần khách xử lý', () => {
  it('chỉ đơn chờ chọn phương án, chờ thanh toán, chờ nghiệm thu', () => {
    const kinds = new Set(orders.filter(o => attentionOf(o)).map(o => o.status))
    expect([...kinds].every(s => ['choose_option', 'awaiting_payment', 'delivered'].includes(s))).toBe(true)
    expect(attentionOf(orders.find(o => o.status === 'delivered')!)?.href).toMatch(/^\/acceptance\?id=/)
  })
})

describe('xếp theo mức độ', () => {
  it('việc cần xử lý lên đầu theo hạn, đơn đã đóng xuống cuối', () => {
    const sorted = byPriority(orders)
    const group = (o: (typeof orders)[number]) => attentionOf(o) ? 0 : ['completed', 'rejected', 'cancelled'].includes(o.status) ? 2 : 1
    const groups = sorted.map(group)
    expect(groups).toEqual([...groups].sort((a, b) => a - b))
    const due = sorted.filter(o => attentionOf(o)).map(o => attentionOf(o)!.deadline)
    expect(due).toEqual([...due].sort((a, b) => a - b))
  })
})
