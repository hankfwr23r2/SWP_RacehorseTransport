// Bước 3: Dịch vụ & bảo hiểm. Chuyển từ CUS/create_request_step3.html + initStep3().
// Bảo hiểm: công ty không bán; khách khai mã hợp đồng tự mua, hoặc ký miễn trừ trách nhiệm (không chọn thì không đặt được).
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { BookingShell } from './BookingShell'
import { WAIVER_TEXT, useBookingDraft, type InsuranceMode } from './draft'
import s from './Booking.module.css'

type Opts = [string, string][]
const FEEDING: Opts = [['yes', 'Đội ngũ hậu cần chuẩn bị (Đã bao gồm trong giá)'], ['custom', 'Thực đơn đặc biệt theo yêu cầu (Phụ phí thức ăn)'], ['self', 'Chủ trang trại tự chuẩn bị khẩu phần đóng gói']]
const FOOD: Opts = [['hay', 'Cỏ khô Timothy Hay nhập khẩu — Tiêu chuẩn thi đấu'], ['alfalfa', 'Cỏ Alfalfa — Giàu đạm & khoáng chất'], ['mixed', 'Thức ăn hỗn hợp cao cấp (Pellets + Timothy)'], ['fresh', 'Cỏ tươi tự nhiên + Táo/Cà rốt bổ sung']]
const STALL: Opts = [['standard', 'Khoang Tiêu chuẩn (1.2m × 2.4m) — Khuyên dùng'], ['vip', 'Khoang VIP Royal (1.5m × 3.0m) — Rộng hơn 25%, sàn đệm cao su'], ['isolation', 'Khoang Cách ly Độc lập — Có vách ngăn kín và lọc khí HEPA']]
const WATER: Opts = [['normal', 'Nước khoáng tinh khiết tiêu chuẩn — Uống tự do'], ['electrolyte', 'Bổ sung dung dịch điện giải chống mất nước & giảm stress']]

const label = (opts: Opts, v: string) => opts.find(o => o[0] === v)?.[1] ?? ''

function Select({ id, title, opts, value, onChange }: { id: string; title: string; opts: Opts; value: string; onChange: (v: string) => void }) {
  return (
    <div className="form-group">
      <label htmlFor={id} className="required">{title}</label>
      <select id={id} className="form-control" value={value} onChange={e => onChange(e.target.value)}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    </div>
  )
}

export default function Step3ServicesPage() {
  const navigate = useNavigate()
  const { draft, save } = useBookingDraft()
  const [f, setF] = useState({
    feeding: draft.feeding || 'yes', foodType: draft.foodType || 'hay', stallType: draft.stallType || 'standard',
    waterSupplement: draft.waterSupplement || 'normal', specialCare: draft.specialCare,
  })
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v })
  const [mode, setMode] = useState<InsuranceMode | ''>(draft.insuranceMode)
  const [policy, setPolicy] = useState(draft.insurancePolicy)
  const [waiver, setWaiver] = useState(draft.waiverSigned)
  const [touched, setTouched] = useState(false)
  if (!draft.horseIds.length) return <Navigate to="/booking/horses" replace />
  const insuranceOk = mode === 'own' ? !!policy.trim() : mode === 'waiver' && waiver

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!insuranceOk) return document.getElementById('insurance')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    save({
      feeding: f.feeding,
      foodType: f.foodType, foodTypeName: label(FOOD, f.foodType),
      stallType: f.stallType, stallTypeName: label(STALL, f.stallType),
      waterSupplement: f.waterSupplement, waterSupplementName: label(WATER, f.waterSupplement),
      specialCare: f.specialCare,
      insuranceMode: mode, insurancePolicy: mode === 'own' ? policy.trim() : '', waiverSigned: mode === 'waiver' && waiver,
    })
    navigate('/booking/review')
  }

  return (
    <BookingShell step={3} crumb="Bước 3: Dịch vụ & bảo hiểm" title="Dịch vụ chăm sóc & bảo hiểm" subtitle="Chọn tiêu chuẩn chăm sóc ngựa trên đường và khai thông tin bảo hiểm.">
      <form onSubmit={submit}>
        <div className="card">
          <div className="card-header"><h2><i className="fa-solid fa-wheat-awn" /> 1. Chăm sóc Dinh dưỡng & Khoang Vận chuyển (Stalls)</h2></div>
          <div className={s.grid2}>
            <Select id="feeding" title="Chế độ dinh dưỡng trên đường" opts={FEEDING} value={f.feeding} onChange={set('feeding')} />
            <Select id="food_type" title="Loại thức ăn chính" opts={FOOD} value={f.foodType} onChange={set('foodType')} />
            <Select id="stall_type" title="Quy cách khoang vận chuyển (Stalls)" opts={STALL} value={f.stallType} onChange={set('stallType')} />
            <Select id="water_supplement" title="Chế độ nước uống & Điện giải" opts={WATER} value={f.waterSupplement} onChange={set('waterSupplement')} />
          </div>
        </div>

        <div className="card" id="insurance">
          <div className="card-header"><h2><i className="fa-solid fa-shield-halved" /> 2. Bảo hiểm ngựa</h2><span className="badge badge-warning">Bắt buộc chọn</span></div>
          <p className={s.lead}>Công ty chỉ vận chuyển, không bán bảo hiểm. Vui lòng chọn một trong hai:</p>
          <div className={`${s.choiceList} ${touched && !mode ? s.choiceBad : ''}`} role="radiogroup" aria-label="Bảo hiểm">
            <label className={`${s.choice} ${mode === 'own' ? s.choiceOn : ''}`}>
              <input type="radio" name="insurance" checked={mode === 'own'} onChange={() => setMode('own')} />
              <span><b>Tôi đã tự mua bảo hiểm cho ngựa</b><span className={s.choiceSub}>Nhập mã hợp đồng để đối chiếu khi có sự cố.</span></span>
            </label>
            {mode === 'own' && (
              <div className={`form-group ${s.choiceDetail}`}>
                <label htmlFor="policy" className="required">Mã hợp đồng bảo hiểm</label>
                <input id="policy" className={`form-control ${touched && !policy.trim() ? 'invalid' : ''}`} value={policy} onChange={e => setPolicy(e.target.value)} placeholder="VD: PVI-EQ-2026-00123" />
              </div>
            )}
            <label className={`${s.choice} ${mode === 'waiver' ? s.choiceOn : ''}`}>
              <input type="radio" name="insurance" checked={mode === 'waiver'} onChange={() => setMode('waiver')} />
              <span><b>Tôi không mua bảo hiểm</b><span className={s.choiceSub}>Phải đồng ý điều khoản miễn trừ bên dưới mới đặt được.</span></span>
            </label>
            {mode === 'waiver' && (
              <label className={`${s.commit} ${s.choiceDetail} ${touched && !waiver ? s.commitBad : ''}`}>
                <input type="checkbox" checked={waiver} onChange={e => setWaiver(e.target.checked)} />
                <span>{WAIVER_TEXT}</span>
              </label>
            )}
          </div>
          {touched && !insuranceOk && <p className={s.fieldError}><i className="fa-solid fa-circle-exclamation" /> {mode === 'own' ? 'Nhập mã hợp đồng bảo hiểm.' : mode === 'waiver' ? 'Tick đồng ý điều khoản miễn trừ để tiếp tục.' : 'Chọn một trong hai lựa chọn bảo hiểm.'}</p>}
        </div>

        <div className="card">
          <div className="card-header"><h2><i className="fa-solid fa-user-nurse" /> 3. Ghi chú Hướng dẫn cho Đội ngũ Hộ tống (Escort / Groom)</h2></div>
          <div className="form-group">
            <label htmlFor="special_care">Yêu cầu tâm lý, thói quen sinh hoạt hoặc dặn dò đặc biệt</label>
            <textarea id="special_care" className="form-control" rows={4} placeholder="VD: Ngựa nhạy cảm với tiếng còi xe lớn, thích được chải lông trước khi ngủ, cho uống nước ấm khi trời lạnh..." value={f.specialCare} onChange={e => set('specialCare')(e.target.value)} />
          </div>
        </div>

        <div className={s.actions}>
          <Link to="/booking/horses" className="btn btn-ghost"><i className="fa-solid fa-arrow-left" /> Bước 2</Link>
          <button type="submit" className="btn btn-primary">Tiếp tục: Xác nhận <i className="fa-solid fa-arrow-right" /></button>
        </div>
      </form>
    </BookingShell>
  )
}
