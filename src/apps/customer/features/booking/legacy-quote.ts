// Dự toán ở bước 4 đặt chuyến. Giữ công thức của recalculateStep4Quotation (create_request.js), bỏ dòng bảo hiểm (công ty không bán bảo hiểm).
// Công thức này KHÁC bảng giá trang chủ (shared/lib/pricing.ts): giữ nguyên, chờ chốt ở docs/PRD.md mục 11–12.
import type { BookingDraft } from './draft'

export interface QuoteRow { title: string; detail: string; unit: string; qty: string; amount: number | null; includedLabel?: string }

export function legacyQuote(d: BookingDraft) {
  const isDomestic = d.type !== 'international'
  const quantity = Math.max(1, d.horseIds.length)

  const baseFreight = (isDomestic ? 25_000_000 : 120_000_000) * quantity
  const quarantineFee = (isDomestic ? 3_000_000 : 15_000_000) * quantity
  const feedFee = 500_000 * 3 * quantity // 500.000/ngày × 3 ngày × số ngựa
  const stallFee = d.stallType === 'vip' ? 12_000_000 * quantity : 0
  const escortFee = 8_500_000

  const vnd = (n: number) => n.toLocaleString('vi-VN') + ' ₫'
  const rows: QuoteRow[] = [
    { title: isDomestic ? 'Cước vận chuyển đường bộ trong nước' : 'Cước vận chuyển đường bộ quốc tế', detail: `${d.originLocationName} → ${d.destLocationName}${d.gate ? ` · qua ${d.gate}` : ''}`, unit: vnd(baseFreight / quantity), qty: `${quantity} ngựa`, amount: baseFreight },
    { title: isDomestic ? 'Phí kiểm dịch & thủ tục trong nước' : 'Phí kiểm dịch & thủ tục cửa khẩu', detail: 'Đối chiếu giấy tờ, kiểm tra an toàn sinh học', unit: vnd(quarantineFee / quantity), qty: `${quantity} ngựa`, amount: quarantineFee },
    { title: `Khẩu phần dinh dưỡng (${d.foodTypeName || 'Cỏ khô Timothy Hay'})`, detail: 'Dự phòng 3 ngày hành trình', unit: '500,000 ₫/ngày', qty: `${3 * quantity} khẩu phần`, amount: feedFee },
    { title: `Khoang vận chuyển: ${d.stallTypeName || 'Khoang Tiêu chuẩn'}`, detail: 'Sàn đệm cao su giảm chấn, thông khí đa chiều', unit: stallFee > 0 ? vnd(stallFee / quantity) : '—', qty: `${quantity} khoang`, amount: stallFee > 0 ? stallFee : null, includedLabel: 'Đã bao gồm' },
    { title: 'Nhân viên hộ tống chăm sóc ngựa', detail: 'Theo dõi sức khỏe ngựa suốt hành trình', unit: vnd(escortFee), qty: '1 người', amount: escortFee },
  ]
  const totalCost = baseFreight + quarantineFee + feedFee + stallFee + escortFee
  return { isDomestic, rows, totalCost }
}
