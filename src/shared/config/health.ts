// Tình trạng sức khỏe hộ tống ghi (tài liệu nhóm, thẻ Màn hình: Khỏe / Mệt mỏi / Căng thẳng / Bỏ ăn / Thương tích; thêm Nguy kịch, Khác).
// Khác: hộ tống bắt buộc mô tả tình trạng.
// severe → hệ thống tự tạo sự cố khẩn cấp "Y tế ngựa" cho Điều phối.
export const HEALTH_STATUS: { label: string; tone: 'ok' | 'watch' | 'severe' }[] = [
  { label: 'Khỏe', tone: 'ok' },
  { label: 'Mệt mỏi', tone: 'watch' },
  { label: 'Căng thẳng', tone: 'watch' },
  { label: 'Bỏ ăn', tone: 'watch' },
  { label: 'Thương tích', tone: 'severe' },
  { label: 'Nguy kịch', tone: 'severe' },
  { label: 'Khác', tone: 'watch' },
]
export const HEALTH_OTHER = 'Khác'
export const HEALTH_OK = 'Khỏe'
export const healthTone = (status?: string) => HEALTH_STATUS.find(x => x.label === status)?.tone ?? 'watch'
export const isSevere = (status?: string) => healthTone(status) === 'severe'

// Hộ tống sửa / xóa báo cáo của mình trong khoảng này sau khi gửi (để sửa nhầm); quá hạn thì khóa vì khách đã xem
export const HEALTH_EDIT_MINUTES = 15
