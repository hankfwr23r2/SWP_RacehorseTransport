// Bước 4: Rà soát & gửi. Chuyển từ CUS/create_request_step4.html + initStep4().
// Nhắc khách: công ty chỉ vận chuyển, khách tự xin giấy kiểm dịch & hải quan; quốc tế thì cửa khẩu khóa theo đơn.
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { COUNTRIES, type CountryCode } from '@shared/config/network'
import { horsesApi } from '@shared/services/horses'
import { useLoad } from '@shared/services/useLoad'
import { Flag } from '@shared/ui/Flag'
import { useToast } from '@shared/ui/toast'
import { BookingShell } from './BookingShell'
import { useBookingDraft } from './draft'
import { legacyQuote } from './legacy-quote'
import s from './Booking.module.css'

const formatDateVN = (d: string) => { const p = d.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d }

function Item({ label, children, strong }: { label: string; children: ReactNode; strong?: boolean }) {
  return <div><div className={s.reviewLabel}>{label}</div><div className={`${s.reviewValue} ${strong ? 'font-semibold' : ''}`}>{children}</div></div>
}

export default function Step4ReviewPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { session } = useAuth()
  const { draft: d } = useBookingDraft()
  const { data: horses } = useLoad(() => horsesApi.list(session!.name), [session?.name])
  const [agreed, setAgreed] = useState(false)
  if (!d.insuranceMode) return <Navigate to="/booking/services" replace />
  if (!horses) return null

  const { isDomestic, rows, totalCost } = legacyQuote(d)
  const picked = horses.filter(h => d.horseIds.includes(h.id))
  const place = (c: CountryCode | '', name: string) => c && <span className={s.inlineFlag}><Flag code={c} /> {name}</span>

  const submit = (e: FormEvent) => {
    e.preventDefault()
    toast('Đã gửi yêu cầu vận chuyển. Đơn đang chờ thẩm định.')
    navigate('/orders')
  }

  return (
    <BookingShell step={4} crumb="Bước 4: Xác nhận" title="Kiểm tra lại và gửi yêu cầu" subtitle="Xem lại tuyến, ngựa, dịch vụ và bảo hiểm trước khi gửi.">
      <div className="alert alert-warning" style={{ marginBottom: 16 }}>
        <i className="fa-solid fa-scale-balanced" />
        <div><b>Công ty chỉ nhận vận chuyển.</b> Bạn tự chịu trách nhiệm xin Giấy chứng nhận kiểm dịch{isDomestic ? '' : ' và Tờ khai hải quan'}, tải bản scan lên trước giờ đi 24 giờ và giao bản gốc cho tài xế ngày đi.</div>
      </div>

      <div className="card">
        <div className="card-header"><h2><i className="fa-solid fa-route" /> 1. Chuyến đi</h2><Link to="/booking/route" className="text-orange small">Sửa</Link></div>
        <div className={s.reviewGrid}>
          <Item label="Loại chuyến" strong>{isDomestic ? `Trong nước (${COUNTRIES[d.originCountry as CountryCode].name})` : 'Quốc tế'}</Item>
          <Item label="Ngày khởi hành" strong>{formatDateVN(d.departureDate)}</Item>
          <Item label="Điểm đón">{place(d.originCountry, d.originLocationName)}</Item>
          <Item label="Điểm giao">{place(d.destCountry, d.destLocationName)}</Item>
        </div>
        {!isDomestic && (
          <div className={`alert alert-danger ${s.gateWarn}`}>
            <i className="fa-solid fa-lock" />
            <div>Cửa khẩu: <b>{d.gate}</b>. Khóa theo đơn, không đổi được. Tờ khai hải quan và Giấy chứng nhận kiểm dịch phải ghi đúng cửa khẩu này. Sau khi đơn được duyệt, bạn nhận biển số xe để khai hải quan.</div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header"><h2><i className="fa-solid fa-horse-head" /> 2. Ngựa ({picked.length})</h2><Link to="/booking/horses" className="text-orange small">Sửa</Link></div>
        <ul className={s.reviewHorses}>
          {picked.map(h => (
            <li key={h.id}>
              <span><b>{h.name}</b> <span className={s.pickChip}>{h.chip}</span><span className={s.pickMeta}>{h.breed} · {h.sex} · sinh {h.birthYear}</span></span>
              <span className={s.pickDocs}><i className="fa-solid fa-paperclip" /> {h.passportFile}, {h.vaccineFile}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <div className="card-header"><h2><i className="fa-solid fa-shield-halved" /> 3. Dịch vụ & bảo hiểm</h2><Link to="/booking/services" className="text-orange small">Sửa</Link></div>
        <div className={s.reviewGrid}>
          <Item label="Thức ăn">{d.foodTypeName}</Item>
          <Item label="Khoang vận chuyển">{d.stallTypeName}</Item>
          <Item label="Nước uống">{d.waterSupplementName}</Item>
          <Item label="Bảo hiểm" strong>{d.insuranceMode === 'own' ? <>Tự mua · mã hợp đồng <b>{d.insurancePolicy}</b></> : 'Không mua · đã ký miễn trừ trách nhiệm'}</Item>
        </div>
        {d.specialCare && <p className={s.note}><i className="fa-solid fa-comment-dots" /> {d.specialCare}</p>}
      </div>

      <div className="card">
        <div className="card-header"><h2><i className="fa-solid fa-calculator" /> 4. Dự toán chi phí</h2><span className="badge badge-warning">Tham khảo</span></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Hạng mục</th><th className="text-right">Đơn giá</th><th className="text-center">Số lượng</th><th className="text-right">Thành tiền</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.title}>
                  <td><div className="font-semibold">{r.title}</div><div className="sub-text">{r.detail}</div></td>
                  <td className="text-right font-semibold nowrap">{r.unit}</td>
                  <td className="text-center nowrap">{r.qty}</td>
                  <td className="text-right font-bold nowrap" style={r.amount === null ? { color: 'var(--green)' } : undefined}>{r.amount === null ? r.includedLabel : `${r.amount.toLocaleString('vi-VN')} ₫`}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={3}>Tổng dự toán</td><td className="text-right nowrap">{totalCost.toLocaleString('vi-VN')} ₫</td></tr></tfoot>
          </table>
        </div>
        <p className="form-hint">Giá chính thức gửi kèm khi đơn được duyệt.</p>
      </div>

      <form onSubmit={submit}>
        <label className={s.commit}>
          <input type="checkbox" required checked={agreed} onChange={e => setAgreed(e.target.checked)} />
          <span>Tôi cam kết thông tin ngựa và giấy tờ đã khai là trung thực, và tự xin đủ giấy tờ nhà nước {isDomestic ? '' : `ghi đúng cửa khẩu ${d.gate} `}trước hạn.</span>
        </label>
        <div className={s.actions}>
          <Link to="/booking/services" className="btn btn-ghost"><i className="fa-solid fa-arrow-left" /> Bước 3</Link>
          <button type="submit" className="btn btn-primary"><i className="fa-solid fa-paper-plane" /> Gửi yêu cầu vận chuyển</button>
        </div>
      </form>
    </BookingShell>
  )
}
