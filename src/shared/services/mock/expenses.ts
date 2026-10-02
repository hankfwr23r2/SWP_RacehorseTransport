// Chi phí tài xế khai mẫu cho chuyến TR-9028 (đơn EQ-2026-1028), để Manager có việc duyệt.
import { HOUR } from '../../config/business-rules'
import type { Expense } from '../expenses'

export function seedExpenses(): Expense[] {
  const now = Date.now()
  const base = { orderId: 'EQ-2026-1028', tripId: 'TR-9028', driverId: 'TX-07', currency: 'VND' as const, status: 'pending' as const }
  return [
    { ...base, id: 'EXP-001', time: now - 5 * HOUR, type: 'Xăng dầu', billable: false, amount: 2_600_000, amountVnd: 2_600_000, receipt: 'bien_lai_xang_trang_bang.jpg', note: 'Đổ dầu tại trạm Trảng Bàng' },
    { ...base, id: 'EXP-002', time: now - 4 * HOUR, type: 'Cầu đường', billable: false, amount: 85_000, amountVnd: 85_000, receipt: 've_cau_duong.jpg', note: '' },
    { ...base, id: 'EXP-003', time: now - 2 * HOUR, type: 'Phí lưu bãi', billable: true, amount: 2_000_000, amountVnd: 2_000_000, receipt: 'bien_lai_luu_bai_moc_bai.jpg', note: 'Hải quan giữ xe qua đêm' },
    { ...base, id: 'EXP-004', time: now - 3 * HOUR, type: 'Phí thú y', billable: true, amount: 600_000, amountVnd: 600_000, receipt: 'hoa_don_thu_y.jpg', note: 'Bác sĩ thú y khám tại cửa khẩu', status: 'approved' as const, decidedBy: 'Quản lý', decidedAt: now - HOUR },
  ]
}
