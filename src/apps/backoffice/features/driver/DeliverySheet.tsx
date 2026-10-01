// Bàn giao tại điểm giao: trả bản gốc giấy tờ, chụp ảnh ngựa đã xuống xe, người nhận ký → hoàn thành chuyến.
// Người nhận vắng / từ chối: tài xế báo giao thất bại (lưu thời điểm làm bằng chứng), chờ tối đa RECEIVER_MAX_WAIT_HOURS.
import { useState } from 'react'
import { ACCEPTANCE_HOURS, HOUR, RECEIVER_MAX_WAIT_HOURS } from '@shared/config/business-rules'
import { returnDocs } from '@shared/config/driver'
import { formatClock } from '@shared/lib/format'
import { tripsApi } from '@shared/services/trips'
import type { Order } from '@shared/types/order'
import { Modal } from '@shared/ui/Modal'
import { PhotoInput, SignaturePad } from './inputs'
import { elapsedText, useNow } from './useNow'
import s from './Driver.module.css'

const FAIL_REASONS = ['Người nhận vắng mặt, không liên lạc được', 'Người nhận từ chối nhận ngựa']

export function DeliverySheet({ order: o, onClose, onDone }: { order: Order; onClose: () => void; onDone: (msg: string) => void }) {
  const docs = returnDocs(!!o.border)
  const now = useNow()
  const [returned, setReturned] = useState<string[]>([])
  const [photo, setPhoto] = useState('')
  const [receiver, setReceiver] = useState('')
  const [signature, setSignature] = useState('')
  const [failing, setFailing] = useState(false)
  const [reason, setReason] = useState(FAIL_REASONS[0])
  const [note, setNote] = useState('')
  const failedAt = o.trip!.handoverFailedAt
  const waited = failedAt ? now - failedAt : 0
  const overdue = waited > RECEIVER_MAX_WAIT_HOURS * HOUR
  const ready = returned.length === docs.length && !!photo && !!receiver.trim() && !!signature

  const done = async () => {
    await tripsApi.completeDelivery(o.id, { docsReturned: returned, photo, receiver: receiver.trim(), signature })
    onDone(`Đã giao ngựa đơn ${o.id}. Khách có ${ACCEPTANCE_HOURS} giờ để nghiệm thu.`)
  }
  const fail = async () => {
    await tripsApi.reportHandoverFailed(o.id, `${reason}${note.trim() ? `. ${note.trim()}` : ''}`)
    onDone('Đã báo giao thất bại. Điều phối đã nhận sự cố và sẽ liên hệ người gửi.')
  }

  const footer = failing
    ? <div className={s.sheetFoot}><button className="btn btn-ghost" onClick={() => setFailing(false)}>Quay lại</button><button className="btn btn-danger" onClick={fail}><i className="fa-solid fa-flag" /> Gửi báo giao thất bại</button></div>
    : <div className={s.sheetFoot}>{!failedAt && <button className="btn btn-ghost" onClick={() => setFailing(true)}><i className="fa-solid fa-user-xmark" /> Không giao được</button>}
      <button className="btn btn-primary" disabled={!ready} onClick={done}><i className="fa-solid fa-flag-checkered" /> Hoàn thành bàn giao</button></div>

  return (
    <Modal wide title="Bàn giao ngựa" subtitle={`${o.id} · ${o.to}`} onClose={onClose} footer={footer}>
      {failedAt && (
        <div className={`alert ${overdue ? 'alert-danger' : 'alert-warning'} ${s.sheetAlert}`}>
          <i className="fa-solid fa-stopwatch" />
          <div>
            <b>Đang chờ người nhận</b> từ {formatClock(failedAt)} · đã chờ <b>{elapsedText(waited)}</b>.
            <br />{overdue ? `Đã quá ${RECEIVER_MAX_WAIT_HOURS} giờ. Chờ Điều phối lệnh đưa ngựa về trại ký gửi.` : `Chờ tối đa ${RECEIVER_MAX_WAIT_HOURS} giờ. Người nhận tới thì làm bàn giao như bình thường.`}
          </div>
        </div>
      )}

      {failing ? (
        <div className={s.sheetSection}>
          <h4>Vì sao không giao được?</h4>
          <div className={s.checkList}>
            {FAIL_REASONS.map(r => <label key={r} className={s.checkRow}><input type="radio" name="fail" checked={reason === r} onChange={() => setReason(r)} /><span>{r}</span></label>)}
          </div>
          <div className="form-group" style={{ marginTop: 12 }}><label>Ghi chú</label><textarea className="form-control" rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="VD: đã gọi 3 lần không nghe máy" /></div>
          <p className="form-hint"><i className="fa-solid fa-location-dot" /> Hệ thống lưu thời điểm báo làm bằng chứng.</p>
        </div>
      ) : <>
        <div className={s.sheetSection}>
          <h4>1. Trả bản gốc giấy tờ cho người nhận</h4>
          <div className={s.checkList}>
            {docs.map(d => (
              <label key={d} className={s.checkRow}>
                <input type="checkbox" checked={returned.includes(d)} onChange={e => setReturned(e.target.checked ? [...returned, d] : returned.filter(x => x !== d))} />
                <span>Đã trả {d.charAt(0).toLowerCase() + d.slice(1)}</span>
              </label>
            ))}
          </div>
        </div>
        <div className={s.sheetSection}>
          <h4>2. Chụp ảnh ngựa đã xuống xe</h4>
          <PhotoInput label={`Ảnh ${o.horses.map(h => h.name).join(', ')}`} value={photo} onChange={setPhoto} />
        </div>
        <div className={s.sheetSection}>
          <h4>3. Người nhận ký xác nhận</h4>
          <div className="form-group"><label className="required">Người nhận</label><input className="form-control" value={receiver} onChange={e => setReceiver(e.target.value)} placeholder="Họ tên người nhận ngựa" /></div>
          <SignaturePad onChange={setSignature} />
        </div>
        {!ready && <p className="form-hint"><i className="fa-solid fa-lock" /> Tick trả đủ giấy, có ảnh ngựa và chữ ký người nhận mới hoàn thành được.</p>}
      </>}
    </Modal>
  )
}
