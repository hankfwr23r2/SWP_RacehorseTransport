// Bước 1: Loại chuyến & tuyến đường. Khách chọn Trong nước / Quốc tế trước để chỉ hỏi thông tin cần cho loại chuyến đó.
// Quốc tế: một đầu là Việt Nam, khách bắt buộc chọn cửa khẩu; cửa khẩu khóa theo đơn và phải ghi đúng trên giấy tờ.
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { MIN_LEAD_DAYS } from '@shared/config/business-rules'
import { COUNTRIES, COUNTRY_LOCATIONS, GATES, type CountryCode } from '@shared/config/network'
import { Flag } from '@shared/ui/Flag'
import { BookingShell } from './BookingShell'
import { useBookingDraft, type TransportType } from './draft'
import s from './Booking.module.css'

type Partner = Exclude<CountryCode, 'VN'>
const PARTNERS: Partner[] = ['KH', 'LA']

const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const earliest = () => { const d = new Date(); d.setDate(d.getDate() + MIN_LEAD_DAYS); return isoDate(d) }

function LocationSelect({ id, country, value, onChange, exclude }: { id: string; country: CountryCode; value: string; onChange: (v: string) => void; exclude?: string }) {
  return (
    <select id={id} className="form-control" required value={value} onChange={e => onChange(e.target.value)}>
      <option value="">— Chọn địa điểm —</option>
      {COUNTRY_LOCATIONS[country].filter(l => l.id !== exclude).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
    </select>
  )
}

function Segment<T extends string>({ value, options, onChange, label }: { value: T | ''; options: [T, React.ReactNode][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className={s.segment} role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => <button key={v} type="button" role="radio" aria-checked={value === v} className={value === v ? s.segOn : ''} onClick={() => onChange(v)}>{text}</button>)}
    </div>
  )
}

const TYPES: [TransportType, string, string, string][] = [
  ['domestic', 'fa-truck', 'Trong nước', 'Đi và đến đều trong Việt Nam. Không qua cửa khẩu.'],
  ['international', 'fa-earth-asia', 'Quốc tế', 'Từ Việt Nam sang Campuchia hoặc Lào, hoặc từ Campuchia hoặc Lào về Việt Nam, qua một cửa khẩu bạn chọn.'],
]

export default function Step1RoutePage() {
  const navigate = useNavigate()
  const { draft, save } = useBookingDraft()
  const [type, setType] = useState<TransportType | ''>(draft.type)
  // Quốc tế: nước bạn + chiều đi. Trong nước: chỉ trong Việt Nam.
  const initPartner = draft.type === 'international' ? (draft.originCountry === 'VN' ? draft.destCountry : draft.originCountry) : ''
  const [partner, setPartner] = useState<Partner | ''>(initPartner as Partner | '')
  const [outbound, setOutbound] = useState<'out' | 'in'>(draft.type === 'international' && draft.originCountry !== 'VN' ? 'in' : 'out')
  const [origin, setOrigin] = useState(draft.originLocation)
  const [dest, setDest] = useState(draft.destLocation)
  const [gate, setGate] = useState(draft.gate)
  const [date, setDate] = useState(draft.departureDate)

  const originCountry: CountryCode | '' = type === 'domestic' ? 'VN' : partner ? (outbound === 'out' ? 'VN' : partner) : ''
  const destCountry: CountryCode | '' = type === 'domestic' ? 'VN' : partner ? (outbound === 'out' ? partner : 'VN') : ''
  const gates = partner ? GATES.filter(g => g.country === partner) : []
  const nameOf = (c: CountryCode | '', id: string) => (c ? COUNTRY_LOCATIONS[c].find(l => l.id === id)?.name ?? '' : '')
  const resetRoute = () => { setOrigin(''); setDest(''); setGate('') }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!type || !originCountry || !destCountry) return
    save({
      type, originCountry, originLocation: origin, originLocationName: nameOf(originCountry, origin),
      destCountry, destLocation: dest, destLocationName: nameOf(destCountry, dest),
      gate: type === 'international' ? gate : '', departureDate: date,
    })
    navigate('/booking/horses')
  }

  return (
    <BookingShell step={1} crumb="Bước 1: Loại chuyến & tuyến đường" title="Tạo yêu cầu vận chuyển" subtitle="Chọn loại chuyến trước, hệ thống chỉ hỏi những thông tin cần cho loại chuyến đó.">
      <form onSubmit={submit}>
        <div className="card">
          <div className="card-header"><h2><i className="fa-solid fa-signs-post" /> Loại chuyến</h2><span className="badge badge-orange">Bước 1/4</span></div>
          <div className={s.typeGrid} role="radiogroup" aria-label="Loại chuyến">
            {TYPES.map(([v, icon, title, desc]) => (
              <button key={v} type="button" role="radio" aria-checked={type === v} className={`${s.typeCard} ${type === v ? s.typeOn : ''}`} onClick={() => { setType(v); resetRoute() }}>
                <i className={`fa-solid ${icon}`} />
                <span className={s.typeTitle}>{title}</span>
                <span className={s.typeDesc}>{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {type && (
          <div className="card">
            <div className="card-header"><h2><i className="fa-solid fa-route" /> Tuyến đường & ngày đi</h2></div>

            {type === 'international' && (
              <div className={s.grid2}>
                <div className="form-group">
                  <label className="required">Nước bạn</label>
                  <Segment label="Nước bạn" value={partner} onChange={p => { setPartner(p); resetRoute() }}
                    options={PARTNERS.map(c => [c, <span key={c} className={s.inlineFlag}><Flag code={c} size={16} /> {COUNTRIES[c].name}</span>])} />
                </div>
                <div className="form-group">
                  <label className="required">Chiều đi</label>
                  <Segment label="Chiều đi" value={outbound} onChange={o => { setOutbound(o); setOrigin(''); setDest('') }}
                    options={[['out', `Việt Nam → ${partner ? COUNTRIES[partner].name : 'nước bạn'}`], ['in', `${partner ? COUNTRIES[partner].name : 'Nước bạn'} → Việt Nam`]]} />
                </div>
              </div>
            )}

            {originCountry && destCountry && (
              <div className={s.grid2}>
                <div className="form-group">
                  <label htmlFor="origin" className="required">Điểm đón ({COUNTRIES[originCountry].name})</label>
                  <LocationSelect id="origin" country={originCountry} value={origin} onChange={setOrigin} exclude={type === 'domestic' ? dest : undefined} />
                </div>
                <div className="form-group">
                  <label htmlFor="dest" className="required">Điểm giao ({COUNTRIES[destCountry].name})</label>
                  <LocationSelect id="dest" country={destCountry} value={dest} onChange={setDest} exclude={type === 'domestic' ? origin : undefined} />
                </div>
              </div>
            )}

            {type === 'international' && partner && (
              <div className="form-group">
                <label htmlFor="gate" className="required">Cửa khẩu</label>
                <select id="gate" className="form-control" required value={gate} onChange={e => setGate(e.target.value)}>
                  <option value="">— Chọn cửa khẩu Việt Nam – {COUNTRIES[partner].name} —</option>
                  {gates.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
                </select>
                {gate && (
                  <div className={`alert alert-danger ${s.gateWarn}`}>
                    <i className="fa-solid fa-triangle-exclamation" />
                    <div>Cửa khẩu đã chọn: <b>{gate}</b>. Bạn <b>bắt buộc</b> dùng đúng tên cửa khẩu này khi khai Tờ khai hải quan và Giấy chứng nhận kiểm dịch. Sau khi đặt, cửa khẩu không đổi được; giấy ghi cửa khẩu khác sẽ bị trả về để xin lại.</div>
                  </div>
                )}
              </div>
            )}

            <div className={s.grid2}>
              <div className="form-group">
                <label htmlFor="date" className="required">Ngày khởi hành</label>
                <input id="date" type="date" className="form-control" required min={earliest()} value={date} onChange={e => setDate(e.target.value)} />
                <div className="form-hint">Sớm nhất sau {MIN_LEAD_DAYS} ngày kể từ hôm nay.</div>
              </div>
            </div>

            <div className={`alert alert-info ${s.docsNote}`}>
              <i className="fa-solid fa-file-shield" />
              <div>
                <b>Giấy tờ cho chuyến {type === 'domestic' ? 'trong nước' : 'quốc tế'}</b>
                <ul>
                  <li>Khi đặt: hộ chiếu ngựa và sổ tiêm lấy từ <Link to="/horses">Hồ sơ ngựa</Link>, không cần tải lại.</li>
                  {type === 'domestic'
                    ? <li>Trước giờ đi 24 giờ: bạn tự xin và tải lên bản scan Giấy chứng nhận kiểm dịch vận chuyển.</li>
                    : <>
                      <li>Sau khi đơn được duyệt: bạn nhận biển số xe để khai Tờ khai hải quan.</li>
                      <li>Trước giờ đi 24 giờ: bạn tự xin và tải lên bản scan Giấy chứng nhận kiểm dịch xuất/nhập khẩu và Tờ khai hải quan, ghi đúng cửa khẩu đã chọn.</li>
                    </>}
                  <li>Ngày đi: giao bản gốc cho tài xế tại điểm đón.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className={s.actions}>
          <Link to="/portal" className="btn btn-ghost">Hủy</Link>
          <button type="submit" className="btn btn-primary" disabled={!originCountry}>Tiếp tục: Chọn ngựa <i className="fa-solid fa-arrow-right" /></button>
        </div>
      </form>
    </BookingShell>
  )
}
