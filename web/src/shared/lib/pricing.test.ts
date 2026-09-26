// Đáp án lấy bằng cách chạy hàm tra cước của home.js cũ với cùng đầu vào.
import { describe, expect, it } from 'vitest'
import { PLACES } from '../config/network'
import { estimateFee, routeOf, truckCost, trucksFor } from './pricing'

const place = (id: string) => PLACES.find(p => p.id === id)!

describe('tra cước (home.js)', () => {
  const cases: [string, string, number, number, string | null, number][] = [
    // [đi, đến, số ngựa, km, cửa khẩu, cước xe]
    ['dni', 'pnh', 2, 320, 'Mộc Bài – Bavet', 11_200_000],
    ['hn', 'vte', 5, 780, 'Cầu Treo – Nam Phao', 46_800_000],
    ['hcm', 'dn', 3, 820, null, 28_140_000],
    ['ct', 'rep', 8, 590, 'Tịnh Biên – Phnom Den', 46_480_000],
    ['dni', 'bd', 1, 60, null, 4_560_000],
  ]
  it.each(cases)('%s → %s, %i ngựa', (from, to, horses, km, gate, truck) => {
    const route = routeOf(place(from), place(to))
    expect(route).toEqual({ km, gate })
    expect(trucksFor(horses).reduce((t, big) => t + truckCost(km, big), 0)).toBeCloseTo(truck, 0)
  })

  it('tổng = cộng các dòng, có bảo hiểm khi khai giá trị', () => {
    const r = estimateFee(place('hn'), place('vte'), 5, 2_000_000_000)
    expect(r.rows).toHaveLength(4)
    expect(r.total).toBe(r.rows.reduce((t, row) => t + row[2], 0))
  })
})
