// Trạng thái và nhật ký ở trang Theo dõi đơn vận chuyển, dựa trên bộ đơn mẫu
import { describe, expect, it } from 'vitest'
import { seedOrders } from '@shared/services/mock/orders'
import { seedOtherOrders } from '@shared/services/mock/orders-others'
import { deliveryLog, isDelivery, orderLog, stageOf, stepOf } from './tracking-stages'

const orders = [...seedOrders(), ...seedOtherOrders()]
const find = (pred: (o: (typeof orders)[number]) => boolean) => orders.find(pred)!

describe('trạng thái theo dõi', () => {
  it('suy đúng bước từ trạng thái đơn', () => {
    expect(stageOf(find(o => o.status === 'awaiting_payment'))).toBe('pending_payment')
    expect(stageOf(find(o => o.status === 'in_transit'))).toBe('in_transit')
    expect(stageOf(find(o => o.status === 'delivered'))).toBe('delivered')
    expect(stageOf(find(o => o.status === 'processing' && o.stage === 'approval'))).toBe('pending_approval')
    expect(stageOf(find(o => o.status === 'processing' && o.stage === 'routing'))).toBe('under_verification')
  })
  it('ngoại lệ chỉ có Tạm dừng và Đã hủy / từ chối, bước bị chặn', () => {
    const hold = find(o => o.status === 'choose_option')
    expect(stageOf(hold)).toBe('on_hold')
    expect(stepOf(hold)).toEqual({ step: 4, blocked: true })
    const rejected = find(o => o.status === 'rejected' && o.rejectedStep === 2)
    expect(stageOf(rejected)).toBe('cancelled')
    expect(stepOf(rejected)).toEqual({ step: 1, blocked: true })
  })
})

describe('nhật ký', () => {
  it('nhật ký đơn theo thứ tự thời gian, bắt đầu từ lúc gửi đơn', () => {
    const o = find(o => o.status === 'paid' && !!o.paidAt)
    const log = orderLog(o)
    expect(log[0].title).toBe('Khách gửi đơn')
    expect(log.map(e => e.time)).toEqual([...log.map(e => e.time)].sort((a, b) => a - b))
  })
  it('từ lúc khởi hành chuyển sang nhật ký giao hàng', () => {
    const moving = find(o => o.status === 'in_transit' && !!o.trip)
    expect(isDelivery(moving)).toBe(true)
    const log = deliveryLog(moving)
    expect(log.length).toBe(moving.trip!.checkpoints.length + moving.trip!.health.length)
    expect(log[log.length - 1].tone).toBe('next') // mốc chưa tới nằm cuối
    const delivered = find(o => o.status === 'delivered' && !!o.handover && !o.trip)
    expect(deliveryLog(delivered).map(e => e.title)).toEqual(['Nhận ngựa lên xe', 'Giao ngựa'])
  })
})
