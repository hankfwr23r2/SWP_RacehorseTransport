// Giấy ủy quyền áp tải: hệ thống tự điền biển số xe, khách in ra và ký sống, ngày đi giao cho tài xế (tài liệu nhóm, thẻ Màn hình).
import { formatDate } from './format'
import type { Order } from '../types/order'

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export function authorizationLetterHtml(o: Pick<Order, 'id' | 'customer' | 'from' | 'to' | 'border' | 'horses' | 'departAt'>, plates: string) {
  const horses = o.horses.map(h => `<li>${esc(h.name)} (${esc(h.breed)}, ${esc(h.sex)})${h.chip ? ` — microchip ${esc(h.chip)}` : ''}</li>`).join('')
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Giấy ủy quyền áp tải ${esc(o.id)}</title>
<style>body{font-family:'Times New Roman',serif;max-width:720px;margin:32px auto;line-height:1.6}h1{text-align:center;font-size:20px}.sign{display:flex;justify-content:space-between;margin-top:48px}</style></head><body>
<h1>GIẤY ỦY QUYỀN ÁP TẢI NGỰA</h1>
<p>Đơn vận chuyển: <b>${esc(o.id)}</b> · Ngày khởi hành: <b>${formatDate(o.departAt)}</b></p>
<p>Bên ủy quyền (chủ ngựa): <b>${esc(o.customer)}</b></p>
<p>Ủy quyền cho tài xế của công ty vận chuyển điều khiển xe biển số <b>${esc(plates)}</b> áp tải các ngựa sau từ <b>${esc(o.from)}</b> đến <b>${esc(o.to)}</b>${o.border ? `, qua cửa khẩu <b>${esc(o.border)}</b>` : ''}:</p>
<ul>${horses}</ul>
<p>Tài xế được trình bản gốc hộ chiếu ngựa, giấy chứng nhận kiểm dịch${o.border ? ' và tờ khai hải quan' : ''} cho cơ quan chức năng trong suốt hành trình.</p>
<div class="sign"><div>Chủ ngựa<br>(ký, ghi rõ họ tên)</div><div>Tài xế nhận<br>(ký, ghi rõ họ tên)</div></div>
</body></html>`
}
