// Bước 2: Chọn ngựa từ Hồ sơ ngựa. Hộ chiếu và sổ tiêm của ngựa tự gắn vào đơn, không tải giấy ở bước này.
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { MAX_HORSES } from '@shared/config/business-rules'
import { hasDocs, horsesApi } from '@shared/services/horses'
import { useLoad } from '@shared/services/useLoad'
import { HorseForm } from '../horses/HorseForm'
import { BookingShell } from './BookingShell'
import { useBookingDraft } from './draft'
import s from './Booking.module.css'

export default function Step2HorsesPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { draft, save } = useBookingDraft()
  const { data: horses, reload } = useLoad(() => horsesApi.list(session!.name), [session?.name])
  const [picked, setPicked] = useState<string[]>(draft.horseIds)
  const [adding, setAdding] = useState(false)
  const [warning, setWarning] = useState('')
  if (!draft.type) return <Navigate to="/booking/route" replace />
  if (!horses) return null

  const toggle = (id: string) => {
    setWarning('')
    if (picked.includes(id)) return setPicked(picked.filter(x => x !== id))
    if (picked.length >= MAX_HORSES) return setWarning(`Mỗi đơn tối đa ${MAX_HORSES} ngựa (1 xe). Nhiều hơn, vui lòng tách đơn.`)
    setPicked([...picked, id])
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!picked.length) return setWarning('Chọn ít nhất 1 ngựa.')
    save({ horseIds: picked })
    navigate('/booking/services')
  }

  return (
    <BookingShell step={2} crumb="Bước 2: Chọn ngựa" title="Chọn ngựa vận chuyển" subtitle="Tick các ngựa đi chuyến này. Hộ chiếu và sổ tiêm lấy từ Hồ sơ ngựa và tự gắn vào đơn.">
      <form onSubmit={submit}>
        <div className="card">
          <div className="card-header">
            <h2><i className="fa-solid fa-horse-head" /> Ngựa của bạn</h2>
            <span className="badge badge-info">Đã chọn {picked.length}</span>
          </div>
          {warning && <div className="alert alert-danger" style={{ marginBottom: 12 }}><i className="fa-solid fa-circle-exclamation" /><div>{warning}</div></div>}
          <ul className={s.pickList}>
            {horses.map(h => {
              const ready = hasDocs(h)
              const on = picked.includes(h.id)
              return (
                <li key={h.id}>
                  <label className={`${s.pick} ${on ? s.pickOn : ''} ${ready ? '' : s.pickOff}`}>
                    <input type="checkbox" checked={on} disabled={!ready} onChange={() => toggle(h.id)} />
                    <span className={s.pickBody}>
                      <span className={s.pickName}>{h.name} <span className={s.pickChip}>{h.chip}</span></span>
                      <span className={s.pickMeta}>{h.breed} · {h.sex} · sinh {h.birthYear}</span>
                    </span>
                    {ready
                      ? <span className={s.pickDocs}><i className="fa-solid fa-paperclip" /> Hộ chiếu, sổ tiêm</span>
                      : <span className={s.pickMissing}><i className="fa-solid fa-circle-exclamation" /> Thiếu {h.passportFile ? 'sổ tiêm' : h.vaccineFile ? 'hộ chiếu' : 'hộ chiếu, sổ tiêm'} · <Link to="/horses">Bổ sung</Link></span>}
                  </label>
                </li>
              )
            })}
          </ul>
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => setAdding(true)}><i className="fa-solid fa-plus" /> Thêm ngựa mới</button>
        </div>

        <div className={s.actions}>
          <Link to="/booking/route" className="btn btn-ghost"><i className="fa-solid fa-arrow-left" /> Bước 1</Link>
          <button type="submit" className="btn btn-primary">Tiếp tục: Dịch vụ & bảo hiểm <i className="fa-solid fa-arrow-right" /></button>
        </div>
      </form>
      {adding && <HorseForm onClose={() => setAdding(false)} onSaved={h => { setAdding(false); reload(); if (hasDocs(h) && picked.length < MAX_HORSES) setPicked([...picked, h.id]) }} />}
    </BookingShell>
  )
}
