// Checklist nhận ngựa tại điểm đón: tick + chụp bản gốc từng giấy, chụp hiện trạng từng ngựa, khách ký bàn giao.
// Lưu xong mới hiện nút "Bắt đầu chuyến" ở trang Tiến độ.
// Khách thiếu bản gốc: tài xế báo thiếu → tính phí chờ theo giờ, tối đa PICKUP_MAX_WAIT_HOURS rồi Điều phối / Manager hủy lệnh.
// Khách mang giấy tới: tài xế bấm "Khách đã bổ sung bản gốc" để dừng đồng hồ, rồi làm checklist.
import { useState } from 'react'
import { PICKUP_MAX_WAIT_HOURS, PICKUP_WAIT_FEE_PER_HOUR, HOUR } from '@shared/config/business-rules'
import { pickupDocs } from '@shared/config/driver'
import { formatClock, formatVND } from '@shared/lib/format'
import { tripsApi } from '@shared/services/trips'
import type { Order } from '@shared/types/order'
import { Modal } from '@shared/ui/Modal'
import { useToast } from '@shared/ui/toast'
import { PhotoInput, SignaturePad } from './inputs'
import { elapsedText, startedHours, useNow } from './useNow'
import s from './Driver.module.css'

export function PickupSheet({ order: o, onClose, onDone, onChange }: { order: Order; onClose: () => void; onDone: (msg: string) => void; onChange: () => void }) {
  const toast = useToast()
  const docs = pickupDocs(!!o.border)
  const now = useNow()
  const [received, setReceived] = useState<string[]>([])
  const [photos, setPhotos] = useState<Record<string, string>>({})
  const [horsePhotos, setHorsePhotos] = useState<Record<string, string>>({})
  const [horseNote, setHorseNote] = useState('')
  const [signedBy, setSignedBy] = useState('')
  const [signature, setSignature] = useState('')
  const [reporting, setReporting] = useState(false)
  const [missing, setMissing] = useState<string[]>([])
  const [note, setNote] = useState('')
  const waitingSince = o.trip!.missingDocsAt
  const arrivedAt = o.trip!.docsArrivedAt // đã dừng đồng hồ
  const waited = waitingSince ? (arrivedAt ?? now) - waitingSince : 0
  const overdue = waited > PICKUP_MAX_WAIT_HOURS * HOUR
  const docsOk = docs.every(([k]) => received.includes(k) && photos[k])
  const horsesOk = o.horses.every(h => horsePhotos[h.name])
  const ready = docsOk && horsesOk && !!signedBy.trim() && !!signature

  const done = async () => {
    await tripsApi.savePickup(o.id, { received, photos, horsePhotos, horseNote: horseNote.trim(), signedBy: signedBy.trim(), signature })
    onDone('Đã lưu checklist nhận ngựa. Cho ngựa lên xe rồi bấm "Bắt đầu chuyến".')
  }
  const stopWaiting = async () => {
    await tripsApi.stopWaiting(o.id)
    toast('Đã dừng đồng hồ phí chờ. Tiếp tục làm checklist nhận ngựa.')
    onChange()
  }
  const report = async () => {
    await tripsApi.reportMissingDocs(o.id, missing, note.trim())
    onDone('Đã báo thiếu bản gốc. Điều phối đã nhận sự cố, bắt đầu tính phí chờ.')
  }

  const footer = reporting
    ? <div className={s.sheetFoot}><button className="btn btn-ghost" onClick={() => setReporting(false)}>Quay lại</button><button className="btn btn-danger" disabled={!missing.length} onClick={report}><i className="fa-solid fa-flag" /> Gửi báo thiếu</button></div>
    : <div className={s.sheetFoot}>{!waitingSince && <button className="btn btn-ghost" onClick={() => setReporting(true)}><i className="fa-solid fa-file-circle-xmark" /> Khách thiếu bản gốc</button>}
      <button className="btn btn-primary" disabled={!ready} onClick={done}><i className="fa-solid fa-clipboard-check" /> Lưu checklist</button></div>

  return (
    <Modal wide title="Checklist nhận ngựa" subtitle={`${o.id} · ${o.from}`} onClose={onClose} footer={footer}>
      {waitingSince && (arrivedAt ? (
        <div className={`alert alert-success ${s.sheetAlert}`}>
          <i className="fa-solid fa-circle-check" />
          <div><b>Đã dừng đồng hồ</b>: khách bổ sung bản gốc lúc {formatClock(arrivedAt)} · thời gian chờ <b>{elapsedText(waited)}</b> · phí chờ tạm tính <b>{formatVND(startedHours(waited) * PICKUP_WAIT_FEE_PER_HOUR)}</b>.</div>
        </div>
      ) : (
        <div className={`alert ${overdue ? 'alert-danger' : 'alert-warning'} ${s.sheetAlert}`}>
          <i className="fa-solid fa-stopwatch" />
          <div>
            <b>Đang chờ khách bổ sung bản gốc</b> từ {formatClock(waitingSince)} · đã chờ <b>{elapsedText(waited)}</b> · phí chờ tạm tính <b>{formatVND(startedHours(waited) * PICKUP_WAIT_FEE_PER_HOUR)}</b> ({formatVND(PICKUP_WAIT_FEE_PER_HOUR)}/giờ).
            <br />{overdue ? `Đã quá ${PICKUP_MAX_WAIT_HOURS} giờ chờ. Liên hệ Điều phối để hủy lệnh, khách chịu cước chuyến.` : `Chờ tối đa ${PICKUP_MAX_WAIT_HOURS} giờ.`}
            <button type="button" className={`btn btn-success ${s.stopWait}`} onClick={stopWaiting}><i className="fa-solid fa-stop" /> Khách đã bổ sung bản gốc</button>
          </div>
        </div>
      ))}

      {reporting ? (
        <div className={s.sheetSection}>
          <h4>Khách thiếu giấy nào?</h4>
          <div className={s.checkList}>
            {docs.map(([k, label]) => (
              <label key={k} className={s.checkRow}>
                <input type="checkbox" checked={missing.includes(label)} onChange={e => setMissing(e.target.checked ? [...missing, label] : missing.filter(x => x !== label))} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <div className="form-group" style={{ marginTop: 12 }}><label>Ghi chú</label><textarea className="form-control" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="VD: khách chỉ có ảnh chụp, hẹn mang bản gốc tới trong 2 giờ" /></div>
          <p className="form-hint"><i className="fa-solid fa-circle-info" /> Không có bản gốc thì không được nhận ngựa lên xe. Phí chờ {formatVND(PICKUP_WAIT_FEE_PER_HOUR)}/giờ, tối đa {PICKUP_MAX_WAIT_HOURS} giờ.</p>
        </div>
      ) : <>
        <div className={s.sheetSection}>
          <h4>1. Giấy tờ bản gốc <span className={s.stepCount}>{docs.filter(([k]) => received.includes(k) && photos[k]).length}/{docs.length}</span></h4>
          <div className={s.docChecks}>
            {docs.map(([k, label]) => (
              <div key={k} className={s.docCheck}>
                <label className={s.checkRow}>
                  <input type="checkbox" checked={received.includes(k)} onChange={e => setReceived(e.target.checked ? [...received, k] : received.filter(x => x !== k))} />
                  <span>Đã nhận {label.charAt(0).toLowerCase() + label.slice(1)}</span>
                </label>
                <PhotoInput label="Ảnh giấy" value={photos[k] ?? ''} onChange={f => setPhotos({ ...photos, [k]: f })} />
              </div>
            ))}
          </div>
        </div>
        <div className={s.sheetSection}>
          <h4>2. Hiện trạng ngựa <span className={s.stepCount}>{o.horses.filter(h => horsePhotos[h.name]).length}/{o.horses.length}</span></h4>
          <div className={s.photoGrid}>
            {o.horses.map(h => <PhotoInput key={h.name} label={`Ảnh ${h.name}${h.chip ? ` · ${h.chip}` : ''}`} value={horsePhotos[h.name] ?? ''} onChange={f => setHorsePhotos({ ...horsePhotos, [h.name]: f })} />)}
          </div>
          <div className="form-group" style={{ marginTop: 10 }}><label>Ghi chú hiện trạng</label><textarea className="form-control" rows={2} value={horseNote} onChange={e => setHorseNote(e.target.value)} placeholder="VD: vết trầy nhỏ chân trước trái có từ trước, ngựa ăn uống bình thường" /></div>
        </div>
        <div className={s.sheetSection}>
          <h4>3. Khách ký xác nhận bàn giao</h4>
          <div className="form-group"><label className="required">Người bàn giao</label><input className="form-control" value={signedBy} onChange={e => setSignedBy(e.target.value)} placeholder={`Đại diện ${o.customer}`} /></div>
          <SignaturePad onChange={setSignature} />
        </div>
        {!ready && <p className="form-hint"><i className="fa-solid fa-lock" /> Cần tick và chụp đủ {docs.length} giấy, chụp hiện trạng {o.horses.length} ngựa và có chữ ký của khách mới lưu được.</p>}
      </>}
    </Modal>
  )
}
