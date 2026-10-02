// Đối chiếu danh sách "Chuẩn bị giấy tờ chuyến đi" với dữ liệu gốc của thu_tuc.js
import { describe, expect, it } from 'vitest'
import { seedOrders } from '@shared/services/mock/orders'
import { seedOtherOrders } from '@shared/services/mock/orders-others'
import { papersState, procedureExpiresEarly, procedureState, progressOf } from './papers'

const orders = [...seedOrders(), ...seedOtherOrders()]
const get = (id: string) => orders.find(o => o.id === id)!
const idsIn = (state: string) => orders.filter(o => papersState(o, 'Phạm Văn Hưng') === state).map(o => o.id).sort()

describe('giấy tờ chuyến đi của Phạm Văn Hưng', () => {
  it('chia đúng tab', () => {
    expect(idsIn('preparing')).toEqual(['EQ-2026-1054', 'EQ-2026-1058', 'EQ-2026-1081', 'EQ-2026-1082'])
    expect(idsIn('ready')).toEqual(['EQ-2026-1028', 'EQ-2026-1050', 'EQ-2026-1083']) // 1028, 1050 đã bàn giao theo luồng cũ
    expect(idsIn('reported')).toEqual(['EQ-2026-1052'])
  })
  it('giấy kiểm dịch hết hiệu lực trước ngày giao (EQ-2026-1082 đi 2 ngày) không tính là đủ', () => {
    expect(procedureExpiresEarly(get('EQ-2026-1082'), 'quarantine_border')).toBe(true)
    expect(progressOf(get('EQ-2026-1082'))).toEqual({ total: 2, done: 1, ready: false })
  })
})

describe('đối chiếu giấy khách tự tải lên', () => {
  const withProcedure = (p?: object) => {
    const o = structuredClone(get('EQ-2026-1081'))
    o.papers = { originals: {}, procedures: p ? { quarantine_domestic: { number: 'KD-1', agency: 'Khách tự xin', issuedAt: 0, validUntil: o.departAt + 30 * 86_400_000, file: 'a.pdf', ...p } } : {} }
    o.border = null
    return o
  }
  const by = { by: 'Phạm Văn Hưng', at: 1 }
  it('chưa tải → missing; tải rồi chưa ai xem → pending', () => {
    expect(procedureState(withProcedure(), 'quarantine_domestic')).toBe('missing')
    expect(procedureState(withProcedure({ uploadedAt: 1 }), 'quarantine_domestic')).toBe('pending')
  })
  it('duyệt → passed (đủ giấy); từ chối → rejected (khách phải xin lại, chưa đủ giấy)', () => {
    const passed = withProcedure({ uploadedAt: 1, check: { result: 'passed', ...by } })
    expect(procedureState(passed, 'quarantine_domestic')).toBe('passed')
    expect(progressOf(passed).ready).toBe(true)
    const rejected = withProcedure({ uploadedAt: 1, check: { result: 'rejected', reason: 'Sai cửa khẩu', ...by } })
    expect(procedureState(rejected, 'quarantine_domestic')).toBe('rejected')
    expect(progressOf(rejected).ready).toBe(false)
  })
})
