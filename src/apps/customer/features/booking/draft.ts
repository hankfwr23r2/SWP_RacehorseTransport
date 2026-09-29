// Bản nháp đơn đặt chuyến qua 4 bước, lưu sessionStorage (giữ đúng key của create_request.js cũ).
import { useState } from 'react'
import type { CountryCode } from '@shared/config/network'

export type TransportType = 'domestic' | 'international'
export type InsuranceMode = 'own' | 'waiver'

export interface BookingDraft {
  type: TransportType | ''
  // Trong nước: đi và đến cùng một nước. Quốc tế: một đầu là VN, qua cửa khẩu.
  originCountry: CountryCode | ''
  originLocation: string
  originLocationName: string
  destCountry: CountryCode | ''
  destLocation: string
  destLocationName: string
  gate: string // cửa khẩu khách chọn (chỉ quốc tế), khóa theo đơn
  departureDate: string
  horseIds: string[] // microchip của ngựa chọn từ Hồ sơ ngựa
  feeding: string
  foodType: string
  foodTypeName: string
  stallType: string
  stallTypeName: string
  waterSupplement: string
  waterSupplementName: string
  specialCare: string
  insuranceMode: InsuranceMode | '' // own: khách tự mua, nhập mã hợp đồng · waiver: không mua, ký miễn trừ
  insurancePolicy: string
  waiverSigned: boolean
}

// Điều khoản khách ký khi không mua bảo hiểm (tài liệu nhóm, thẻ "mô tả pháp lí")
export const WAIVER_TEXT = 'Tôi không mua bảo hiểm cho ngựa và đồng ý miễn trừ 100% trách nhiệm dân sự và tài chính cho Nhà vận chuyển trong trường hợp ngựa ốm đau hoặc tử vong do nguyên nhân bệnh lý tự nhiên (đau bụng colic, đột quỵ...).'

export const STORAGE_KEY = 'SWP_RACEHORSE_TRANSPORT_REQUEST'

export const emptyDraft = (): BookingDraft => ({
  type: '',
  originCountry: '', originLocation: '', originLocationName: '',
  destCountry: '', destLocation: '', destLocationName: '',
  gate: '', departureDate: '', horseIds: [],
  feeding: '', foodType: '', foodTypeName: '', stallType: '', stallTypeName: '',
  waterSupplement: '', waterSupplementName: '', specialCare: '',
  insuranceMode: '', insurancePolicy: '', waiverSigned: false,
})

function read(): BookingDraft {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? { ...emptyDraft(), ...JSON.parse(raw) } : emptyDraft()
  } catch {
    return emptyDraft()
  }
}

export function useBookingDraft() {
  const [draft, setDraft] = useState<BookingDraft>(read)
  const save = (patch: Partial<BookingDraft>) => {
    const next = { ...read(), ...patch }
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* bỏ qua */ }
    setDraft(next)
    return next
  }
  return { draft, save }
}
