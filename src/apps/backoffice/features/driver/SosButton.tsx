// Nút SOS luôn nổi khi đang chạy chuyến: chọn loại sự cố, mô tả, ảnh → tạo sự cố cho Điều phối xử lý.
import { useState } from 'react'
import { SOS_TYPES } from '@shared/config/driver'
import { tripsApi } from '@shared/services/trips'
import type { Order } from '@shared/types/order'
import { Modal } from '@shared/ui/Modal'
import { cx } from '../../shared/parts'
import { PhotoInput } from './inputs'
import s from './Driver.module.css'

export function SosButton({ order: o, onSent }: { order: Order; onSent: (msg: string) => void }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('')
  const [desc, setDesc] = useState('')
  const [photo, setPhoto] = useState('')
  const [touched, setTouched] = useState(false)
  const picked = SOS_TYPES.find(x => x.type === type)

  const close = () => { setOpen(false); setType(''); setDesc(''); setPhoto(''); setTouched(false) }
  const send = async () => {
    setTouched(true)
    if (!picked || !desc.trim()) return
    const inc = await tripsApi.sos(o.id, picked.type, picked.severity, desc.trim(), photo ? [photo] : [])
    close()
    onSent(`Đã gửi SOS ${inc.id}. Điều phối đang xử lý, giữ máy để nhận chỉ đạo.`)
  }

  return <>
    <div className={s.sosSpace} aria-hidden="true" />
    <button type="button" className={s.sos} onClick={() => setOpen(true)} aria-label="Báo sự cố khẩn cấp (SOS)"><i className="fa-solid fa-triangle-exclamation" /> SOS</button>
    {open && (
      <Modal title={<span className="text-red"><i className="fa-solid fa-triangle-exclamation" /> Báo sự cố khẩn cấp</span>} subtitle={`${o.id} · ${o.routeShort}`} onClose={close}
        footer={<div className={s.sheetFoot}><button className="btn btn-ghost" onClick={close}>Hủy</button><button className="btn btn-danger" onClick={send}><i className="fa-solid fa-paper-plane" /> Gửi SOS</button></div>}>
        <div className={s.sheetSection}>
          <h4 className={cx(touched && !picked && 'text-red')}>Loại sự cố</h4>
          <div className={s.sosGrid} role="radiogroup" aria-label="Loại sự cố">
            {SOS_TYPES.map(x => (
              <button key={x.type} type="button" role="radio" aria-checked={type === x.type} className={cx(s.sosType, type === x.type && s.sosOn)} onClick={() => setType(x.type)}>
                <i className={`fa-solid ${x.icon}`} /><span>{x.type}</span>
              </button>
            ))}
          </div>
          {picked && <p className="form-hint">{picked.severity === 'emergency' ? 'Khẩn cấp: Điều phối có thể đổi lộ trình tới trạm thú y / nơi an toàn gần nhất.' : 'Chỉ làm chậm chuyến: Điều phối có thể cho đi đường vòng, vẫn tới đúng cửa khẩu cũ.'}</p>}
        </div>
        <div className={s.sheetSection}>
          <div className="form-group"><label className="required">Mô tả nhanh</label>
            <textarea className={cx('form-control', touched && !desc.trim() && 'invalid')} rows={3} value={desc} onChange={e => setDesc(e.target.value)} placeholder="VD: Quốc lộ 22 ngập nặng, xe đứng yên từ 14:00" /></div>
          <PhotoInput label="Ảnh hiện trường (nếu có)" value={photo} onChange={setPhoto} />
        </div>
      </Modal>
    )}
  </>
}
