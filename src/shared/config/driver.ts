// Checklist, sự cố SOS, chi phí của Tài xế. Theo tài liệu nhóm (thẻ Màn hình, Ngoại lệ, ngoại lệ lộ trình, trách nhiệm khai/duyệt phí).

// Giấy bản gốc tài xế thu và chụp tại điểm đón (thiếu thì không nhận ngựa)
export const pickupDocs = (border: boolean): [key: string, label: string][] => [
  ['passport', 'Bản gốc hộ chiếu ngựa'],
  ['health_cert', border ? 'Bản gốc Giấy chứng nhận kiểm dịch xuất/nhập khẩu' : 'Bản gốc Giấy chứng nhận kiểm dịch vận chuyển'],
  ...(border ? [['customs', 'Tờ khai hải quan'] as [string, string]] : []),
  ['authorization', 'Giấy ủy quyền áp tải có chữ ký của khách'],
]

// Giấy bản gốc trả lại người nhận tại điểm giao
export const returnDocs = (border: boolean) => ['Bản gốc hộ chiếu ngựa', border ? 'Giấy chứng nhận kiểm dịch nhập khẩu' : 'Giấy chứng nhận kiểm dịch vận chuyển']

// Loại sự cố SOS. emergency: nguy hiểm ngựa / xe (được bỏ cửa khẩu) · medium: chỉ làm chậm (vẫn phải tới cửa khẩu cũ)
export const SOS_TYPES: { type: string; severity: 'emergency' | 'medium'; icon: string }[] = [
  { type: 'Ngựa cấp cứu', severity: 'emergency', icon: 'fa-truck-medical' },
  { type: 'Ngựa không đủ sức khỏe lúc đón', severity: 'emergency', icon: 'fa-horse-head' },
  { type: 'Tai nạn giao thông', severity: 'emergency', icon: 'fa-car-burst' },
  { type: 'Hỏng xe', severity: 'emergency', icon: 'fa-screwdriver-wrench' },
  { type: 'Hải quan giữ xe', severity: 'medium', icon: 'fa-building-columns' },
  { type: 'Tắc đường / sạt lở', severity: 'medium', icon: 'fa-road-barrier' },
]

// Loại chi phí tài xế khai. billable: phụ phí tính cho khách (loại B), còn lại là phí vận hành công ty chịu (loại A)
export const EXPENSE_TYPES: { type: string; billable: boolean }[] = [
  { type: 'Xăng dầu', billable: false },
  { type: 'Cầu đường', billable: false },
  { type: 'Phí cửa khẩu', billable: false },
  { type: 'Phí lưu bãi', billable: true },
  { type: 'Phí thú y', billable: true },
  { type: 'Khác', billable: false },
]

// Tỷ giá tham khảo quy về VND (chi ở Lào / Campuchia). Cập nhật theo tỷ giá ngân hàng.
export const CURRENCIES = {
  VND: { label: 'VND', rate: 1 },
  LAK: { label: 'Kíp Lào (LAK)', rate: 1.2 },
  KHR: { label: 'Riel Campuchia (KHR)', rate: 6.3 },
} as const
export type Currency = keyof typeof CURRENCIES

// Định mức mỗi khoản chi (VND): khai vượt thì Manager thấy chữ đỏ khi duyệt (chống khai khống). Số tham khảo, chỉnh theo thực tế.
export const EXPENSE_QUOTA: Record<string, number> = {
  'Xăng dầu': 2_000_000,
  'Cầu đường': 500_000,
  'Phí cửa khẩu': 1_000_000,
  'Phí lưu bãi': 3_000_000,
  'Phí thú y': 2_000_000,
  'Khác': 500_000,
}
