// Hồ sơ ngựa của khách: khai một lần (microchip, hộ chiếu, sổ tiêm), khi đặt đơn chỉ cần chọn ngựa.
// Sau này: GET/POST/PATCH /api/customers/me/horses
import type { Horse } from '../types/order'
import { seedHorses } from './mock/horses'
import { createStore } from './store'

export const HORSE_SEXES = ['Đực', 'Cái', 'Thiến'] as const

export interface HorseProfile extends Horse {
  id: string // = microchip
  owner: string // tên khách
  color: string
  birthYear: number
  marks: string
  passportFile: string // bản scan hộ chiếu ngựa ('' = chưa tải)
  vaccineFile: string // bản scan sổ tiêm phòng ('' = chưa tải)
}

// Đủ giấy để chọn khi đặt đơn
export const hasDocs = (h: HorseProfile) => !!(h.passportFile && h.vaccineFile)

const store = createStore<HorseProfile>('horses', seedHorses)

export const horsesApi = {
  list: async (owner: string): Promise<HorseProfile[]> => structuredClone(store.all().filter(h => h.owner === owner)),
  create: async (owner: string, h: Omit<HorseProfile, 'id' | 'owner'>): Promise<HorseProfile> => {
    const chip = h.chip!.trim()
    if (store.get(chip)) throw new Error(`Microchip ${chip} đã có trong hệ thống`)
    return structuredClone(store.add({ ...h, chip, id: chip, owner }))
  },
  update: async (owner: string, id: string, patch: Partial<Omit<HorseProfile, 'id' | 'owner' | 'chip'>>): Promise<HorseProfile> => {
    if (store.get(id)?.owner !== owner) throw new Error('Không có quyền với ngựa này')
    return structuredClone(store.update(id, patch))
  },
}
