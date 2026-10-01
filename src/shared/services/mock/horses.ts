// Hồ sơ ngựa mẫu của khách (trang Hồ sơ ngựa). Khớp ngựa trong bộ đơn mẫu (orders.ts → HORSES).
import type { HorseProfile } from '../horses'
import { CUSTOMER, HORSES } from './orders'

const { stormRunner, bachPhong, kimLan, hacPhong } = HORSES
const owner = CUSTOMER.name

export const seedHorses = (): HorseProfile[] => [
  { ...stormRunner, id: stormRunner.chip!, owner, color: 'Nâu đỏ', birthYear: 2021, marks: 'Sao trắng trán, tất trắng chân sau', passportFile: 'Ho_chieu_Storm_Runner.pdf', vaccineFile: 'So_tiem_Storm_Runner.pdf' },
  { ...bachPhong, id: bachPhong.chip!, owner, color: 'Trắng', birthYear: 2019, marks: 'Đốm trắng nhỏ trên mũi', passportFile: 'Ho_chieu_Bach_Phong.pdf', vaccineFile: 'So_tiem_Bach_Phong.pdf' },
  { ...kimLan, id: kimLan.chip!, owner, color: 'Hạt dẻ', birthYear: 2020, marks: 'Vệt trắng dài giữa trán', passportFile: 'Ho_chieu_Kim_Lan.pdf', vaccineFile: 'So_tiem_Kim_Lan.pdf' },
  // Thiếu sổ tiêm: chưa chọn được khi đặt đơn
  { ...hacPhong, id: hacPhong.chip!, owner, color: 'Đen', birthYear: 2022, marks: '', passportFile: 'Ho_chieu_Hac_Phong.pdf', vaccineFile: '' },
]
