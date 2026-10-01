// Khai chi phí dọc đường: loại phí, số tiền (quy đổi Kíp / Riel về VND), ảnh biên lai bắt buộc. Manager duyệt sau.
import { useState } from 'react'
import { CURRENCIES, EXPENSE_TYPES, type Currency } from '@shared/config/driver'
import { formatDateTime, formatVND } from '@shared/lib/format'
import { expensesApi } from '@shared/services/expenses'
import type { TripView } from '@shared/services/trips'
import { useLoad } from '@shared/services/useLoad'
import { cx } from '../../shared/parts'
import { PhotoInput } from './inputs'
import s from './Driver.module.css'

const STATUS: Record<string, [string, string]> = { pending: ['badge-warning', 'Chờ duyệt'], approved: ['badge-success', 'Đã duyệt'], rejected: ['badge-danger', 'Bị từ chối'] }

export function ExpensesTab({ trip: t, driverId, onSaved }: { trip: TripView; driverId: string; onSaved: (msg: string) => void }) {
  const { data: all = [], reload } = useLoad(expensesApi.list)
  const [type, setType] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('VND')
  const [receipt, setReceipt] = useState('')
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)
  const mine = all.filter(e => e.tripId === t.id && e.driverId === driverId).sort((a, b) => b.time - a.time)
  const value = Number(amount.replace(/\D/g, ''))
  const vnd = Math.round(value * CURRENCIES[currency].rate)
  const kind = EXPENSE_TYPES.find(x => x.type === type)

  const submit = async () => {
    setTouched(true)
    if (!kind || !value || !receipt) return
    await expensesApi.create({ orderId: t.order.id, tripId: t.id, driverId, time: Date.now(), type: kind.type, billable: kind.billable, amount: value, currency, amountVnd: vnd, receipt, note: note.trim() })
    setType(''); setAmount(''); setCurrency('VND'); setReceipt(''); setNote(''); setTouched(false)
    reload()
    onSaved(`Đã gửi khoản ${kind.type} ${formatVND(vnd)} cho Manager duyệt`)
  }

  return <>
    <div className={s.header}><h1>Khai chi phí</h1><p>Chuyến {t.id} · {t.order.routeShort}. Khai ngay khi chi hoặc gom lại khai lúc giao ngựa xong.</p></div>
    <div className="card">
      <div className="form-group">
        <label className={cx('required', touched && !kind && 'text-red')}>Loại phí</label>
        <div className={s.chips} role="radiogroup" aria-label="Loại phí">
          {EXPENSE_TYPES.map(x => <button key={x.type} type="button" role="radio" aria-checked={type === x.type} className={cx(s.chip, type === x.type && s.chipOn)} onClick={() => setType(x.type)}>{x.type}</button>)}
        </div>
        {kind && <div className="form-hint">{kind.billable ? 'Phụ phí tính cho khách: duyệt xong cộng vào hóa đơn của khách.' : 'Phí vận hành: công ty chịu, trừ vào hiệu quả chuyến.'}</div>}
      </div>
      <div className={s.amountRow}>
        <div className="form-group"><label className="required">Số tiền</label><input className={cx('form-control', touched && !value && 'invalid')} inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="VD: 850000" /></div>
        <div className="form-group"><label>Loại tiền</label><select className="form-control" value={currency} onChange={e => setCurrency(e.target.value as Currency)}>{(Object.keys(CURRENCIES) as Currency[]).map(c => <option key={c} value={c}>{CURRENCIES[c].label}</option>)}</select></div>
      </div>
      {currency !== 'VND' && value > 0 && <p className="form-hint" style={{ marginTop: -8 }}>Quy đổi: <b>{formatVND(vnd)}</b> (tỷ giá tham khảo 1 {currency} = {CURRENCIES[currency].rate} VND)</p>}
      <div className="form-group">
        <label className={cx('required', touched && !receipt && 'text-red')}>Ảnh biên lai / hóa đơn</label>
        <PhotoInput label="Biên lai, vé cầu đường, hóa đơn VAT" value={receipt} onChange={setReceipt} />
      </div>
      <div className="form-group"><label>Ghi chú</label><input className="form-control" value={note} onChange={e => setNote(e.target.value)} placeholder="VD: đổ dầu tại trạm Trảng Bàng" /></div>
      <button className="btn btn-primary btn-full" onClick={submit}><i className="fa-solid fa-paper-plane" /> Gửi khoản chi</button>
    </div>

    <h3 className={s.listTitle}>Đã khai cho chuyến này{mine.length > 0 && ` · ${formatVND(mine.reduce((sum, e) => sum + e.amountVnd, 0))}`}</h3>
    {mine.length ? (
      <ul className={s.expenseList}>
        {mine.map(e => (
          <li key={e.id}>
            <div><b>{e.type}</b> <span className={`badge ${STATUS[e.status][0]}`}>{STATUS[e.status][1]}</span><div className={s.meta}>{formatDateTime(e.time)} · {e.receipt}{e.note && ` · ${e.note}`}</div></div>
            <div className={s.expenseAmount}>{formatVND(e.amountVnd)}{e.currency !== 'VND' && <div className={s.meta}>{e.amount.toLocaleString('vi-VN')} {e.currency}</div>}</div>
          </li>
        ))}
      </ul>
    ) : <p className="text-muted small">Chưa có khoản chi nào.</p>}
  </>
}
