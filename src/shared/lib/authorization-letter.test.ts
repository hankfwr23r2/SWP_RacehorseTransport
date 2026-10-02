import { expect, it } from 'vitest'
import { authorizationLetterHtml } from './authorization-letter'

const order = { id: 'EQ-2026-1', customer: 'A & B', from: 'Kho Đồng Nai', to: 'Kho Phnom Penh', border: 'Mộc Bài – Bavet', departAt: new Date('2026-10-15T08:00').getTime(), horses: [{ name: 'Bạch Phong', breed: 'Thoroughbred', sex: 'Đực', chip: '900123' }] }

it('điền sẵn biển số, cửa khẩu, microchip và escape tên khách', () => {
  const html = authorizationLetterHtml(order, '51C-123.45')
  expect(html).toContain('51C-123.45')
  expect(html).toContain('Mộc Bài – Bavet')
  expect(html).toContain('900123')
  expect(html).toContain('A &amp; B')
})
it('nội địa không nhắc cửa khẩu', () => {
  expect(authorizationLetterHtml({ ...order, border: null }, '51C-123.45')).not.toContain('cửa khẩu')
})
