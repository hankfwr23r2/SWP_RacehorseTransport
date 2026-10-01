// Đối chiếu giấy tờ chuyến đi của một đơn. Khách tự xin giấy và tải bản scan; kiểm dịch viên chỉ đối chiếu với đơn
// (trùng microchip, trùng cửa khẩu, còn hạn) rồi Duyệt hoặc Từ chối giấy (tài liệu nhóm, thẻ Màn hình / Cửa khẩu / Ngoại lệ 1.2).
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { HOUR } from '@shared/config/business-rules'
import { PAPERS_REPORT_TYPES, PROCEDURES, proceduresFor, type ProcedureKey } from '@shared/config/documents'
import { papersScanDue } from '@shared/lib/deadlines'
import { formatDate, formatDateTime, formatDeadline } from '@shared/lib/format'
import { deliveryDate } from '@shared/lib/trip'
import { ordersApi } from '@shared/services/orders'
import { useLoad } from '@shared/services/useLoad'
import type { Order, Papers } from '@shared/types/order'
import { Modal } from '@shared/ui/Modal'
import { useToast } from '@shared/ui/toast'
import { cx } from '../../../shared/parts'
import s from '../Specialist.module.css'
import { FilePreview, InfoRow } from '../parts'
import { DueBadge, PapersBadge } from './TripPapersListPage'
import { itemsOf, papersState, procedureExpiresEarly, procedureState, progressOf, type PapersState, type ProcedureState } from '@shared/lib/papers'

type ModalKind = { review: ProcedureKey } | { file: string } | 'report' | null

const STATE_BADGE: Record<ProcedureState, [string, string]> = {
  missing: ['badge-muted', 'Khách chưa tải'],
  pending: ['badge-warning', 'Chờ đối chiếu'],
  passed: ['badge-success', 'Đã duyệt'],
  rejected: ['badge-danger', 'Đã từ chối, chờ khách xin lại'],
  expired: ['badge-danger', 'Hết hiệu lực trước ngày giao'],
}

function Banner({ o, st }: { o: Order; st: PapersState }) {
  const due = papersScanDue(o.departAt)
  const missing = itemsOf(o).filter(i => procedureState(o, i.key) === 'missing').length
  let box: [string, string, ReactNode]
  if (st === 'ready') box = ['alert-success', 'fa-circle-check', <>Mọi giấy của khách đã được đối chiếu và duyệt. Bản gốc do tài xế thu tại điểm đón ngày đi.</>]
  else if (st === 'reported') {
    const r = o.papersReport!
    box = ['alert-warning', 'fa-user-tie', <>Đã báo cáo Manager lúc <b>{formatDateTime(r.at)}</b> — {r.type}.<br />Giấy liên quan: {r.items.join('; ')}.<br />Ghi chú: {r.note}<br />Manager sẽ quyết định cách xử lý. Bạn tiếp tục khi Manager giao lại.</>]
  } else if (Date.now() > due && missing) box = ['alert-danger', 'fa-triangle-exclamation', <>Khách đã quá hạn tải giấy (<b>{formatDeadline(due)}</b>), còn thiếu {missing} giấy. Liên hệ khách; nếu không kịp, hãy <b>Báo cáo Manager</b>.</>]
  else box = ['alert-info', 'fa-circle-info', <>Khách tự xin giấy và tải bản scan trước <b>{formatDeadline(due)}</b> (24 giờ trước giờ khởi hành). Bạn chỉ đối chiếu, không xin giấy hộ và không sửa lộ trình theo giấy sai.</>]
  return <div className={s.banners}><div className={`alert ${box[0]}`}><i className={`fa-solid ${box[1]}`} /><div>{box[2]}</div></div></div>
}

// Màn hình đối chiếu: bên trái bản scan khách tải, bên phải dữ liệu đơn gốc, tick từng mục rồi Duyệt / Từ chối
function ReviewModal({ o, k, onClose, onDone }: { o: Order; k: ProcedureKey; onClose: () => void; onDone: (check: NonNullable<Papers['procedures'][ProcedureKey]>['check']) => void }) {
  const def = PROCEDURES[k]
  const p = o.papers!.procedures[k]!
  const { session } = useAuth()
  const [ticks, setTicks] = useState({ chip: false, gate: !o.border, valid: !def.hasValidity })
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [invalid, setInvalid] = useState('')
  const early = procedureExpiresEarly(o, k)
  const tick = (key: keyof typeof ticks) => (
    <input type="checkbox" checked={ticks[key]} onChange={e => { setInvalid(''); setTicks({ ...ticks, [key]: e.target.checked }) }} />
  )
  const pass = () => ticks.chip && ticks.gate && ticks.valid ? onDone({ result: 'passed', by: session!.name, at: Date.now() }) : setInvalid('ticks')
  const reject = () => reason.trim() ? onDone({ result: 'rejected', by: session!.name, at: Date.now(), reason: reason.trim() }) : setInvalid('reason')
  return (
    <Modal wide title={`Đối chiếu · ${def.label}`} onClose={onClose}
      footer={rejecting
        ? <><button className="btn btn-ghost" onClick={() => setRejecting(false)}>Quay lại</button><button className="btn btn-danger" onClick={reject}><i className="fa-solid fa-xmark" /> Xác nhận từ chối giấy</button></>
        : <><button className="btn btn-ghost" onClick={onClose}>Đóng</button><button className="btn btn-danger" onClick={() => setRejecting(true)}><i className="fa-solid fa-xmark" /> Từ chối giấy</button><button className="btn btn-primary" onClick={pass}><i className="fa-solid fa-check" /> Duyệt</button></>}>
      <div className={s.formRow}>
        <div>
          <p className={s.hint} style={{ marginBottom: 6 }}>Bản scan khách tải lên</p>
          <div className={s.doc}><i className="fa-solid fa-file-pdf" /> <b>{p.file}</b></div>
          <InfoRow label={def.numberLabel}>{p.number}</InfoRow>
          {p.validUntil && <InfoRow label="Hiệu lực đến"><span className={early ? 'text-red' : ''}>{formatDate(p.validUntil)}</span></InfoRow>}
        </div>
        <div>
          <p className={s.hint} style={{ marginBottom: 6 }}>Dữ liệu đơn {o.id}</p>
          {o.border && <div className="alert alert-danger" style={{ marginBottom: 8 }}><i className="fa-solid fa-flag" /><div>CỬA KHẨU YÊU CẦU: <b>{o.border}</b></div></div>}
          {o.horses.map(h => <InfoRow key={h.name} label={h.name}>Microchip <b>{h.chip}</b></InfoRow>)}
          <InfoRow label="Giao dự kiến">{formatDate(deliveryDate(o.departAt, o.duration))}</InfoRow>
        </div>
      </div>
      {rejecting
        ? <div className="form-group" style={{ marginTop: 12 }}><label className="required">Lý do từ chối (khách sẽ thấy)</label><textarea rows={3} className={cx('form-control', invalid === 'reason' && 'invalid')} value={reason} onChange={e => { setInvalid(''); setReason(e.target.value) }} placeholder="Ví dụ: Giấy ghi cửa khẩu Xa Mát, đơn đi Mộc Bài. Vui lòng xin lại giấy ghi đúng cửa khẩu." /></div>
        : <div className={cx(s.checkBox, invalid === 'ticks' && s.invalid)} style={{ marginTop: 12 }}>
          <label className={s.checkLine}>{tick('chip')} Trùng mã microchip với ngựa trong đơn</label>
          {o.border && <label className={s.checkLine}>{tick('gate')} Trùng cửa khẩu <b>{o.border}</b></label>}
          {def.hasValidity && <label className={s.checkLine}>{tick('valid')} Còn hạn đến hết ngày giao dự kiến</label>}
        </div>}
      {early && !rejecting && <p className={cx(s.hint, 'text-red')} style={{ marginTop: 8 }}><i className="fa-solid fa-triangle-exclamation" /> Giấy hết hiệu lực trước ngày giao dự kiến.</p>}
    </Modal>
  )
}

export default function TripPapersPage() {
  const { id } = useParams()
  const { session } = useAuth()
  const toast = useToast()
  const { data: order, reload } = useLoad(() => ordersApi.get(id!), [id])
  const [modal, setModal] = useState<ModalKind>(null)
  const [invalid, setInvalid] = useState('')
  const [rep, setRep] = useState({ type: PAPERS_REPORT_TYPES[0], items: [] as string[], note: '' })

  if (!order) return <div className="page"><div className="wrap"><p className="text-muted">Đang tải…</p></div></div>
  const o = order
  const st = papersState(o, session!.name)
  if (!st) return <div className="page"><div className="wrap"><div className="alert alert-warning"><i className="fa-solid fa-lock" /><div>Đơn {o.id} không thuộc danh sách giấy tờ bạn phụ trách. <Link to="/specialist/trip-papers" className="text-orange">Về danh sách</Link></div></div></div></div>
  const papers = o.papers!
  const editable = st === 'preparing'
  const pr = progressOf(o)
  const pending = itemsOf(o).filter(i => !i.done)
  const due = papersScanDue(o.departAt)

  const save = async (patch: Partial<Papers>, msg: string, extra: Partial<Order> = {}) => {
    await ordersApi.update(o.id, { papers: { ...papers, ...patch }, ...extra })
    setModal(null)
    toast(msg)
    reload()
  }
  const confirmReport = () => {
    if (!rep.items.length) return setInvalid('items')
    if (!rep.note.trim()) return setInvalid('note')
    save({}, `Đã gửi báo cáo ${o.id} cho Manager`, { papersReport: { at: Date.now(), type: rep.type, items: rep.items, note: rep.note.trim() } })
  }

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb">Kiểm dịch / <Link to="/specialist/trip-papers">Giấy tờ chuyến đi</Link> / <span className="text-orange font-semibold">{o.id}</span></div>
        <div className={`page-header ${s.titleRow}`}><h1>Giấy tờ chuyến đi {o.id}</h1><PapersBadge o={o} st={st} /></div>
        <Banner o={o} st={st} />

        <div className={s.layout}>
          <div>
            <div className="card">
              <div className="card-header"><h3><i className="fa-solid fa-landmark" /> Giấy khách tự xin từ cơ quan chức năng</h3></div>
              {proceduresFor(!!o.border).map(k => {
                const def = PROCEDURES[k]
                const p = papers.procedures[k]
                const state = procedureState(o, k)
                const [cls, label] = STATE_BADGE[state]
                return (
                  <div key={k} className={cx(s.doc, state === 'passed' && s.docValid, (state === 'rejected' || state === 'expired') && s.docInvalid)}>
                    <div className={s.docHead}>
                      <div className={s.docName}>{def.label}</div>
                      <div className={s.docActions}>
                        <span className={`badge ${cls}`}>{label}</span>
                        {p && <button className="btn btn-ghost btn-sm" onClick={() => setModal({ file: p.file })}><i className="fa-solid fa-file-pdf" /> Bản scan</button>}
                        {editable && state === 'pending' && <button className="btn btn-primary btn-sm" onClick={() => { setInvalid(''); setModal({ review: k }) }}>Đối chiếu</button>}
                      </div>
                    </div>
                    {p && <div className={s.fields}>
                      <div><span>{def.numberLabel}</span><b>{p.number}</b></div>
                      {def.hasValidity && p.validUntil && <div><span>Hiệu lực đến</span><span className={state === 'expired' ? 'text-red' : ''}>{formatDate(p.validUntil)}</span></div>}
                      {p.check && <div><span>{p.check.result === 'passed' ? 'Duyệt bởi' : 'Từ chối bởi'}</span>{p.check.by} · {formatDateTime(p.check.at)}</div>}
                    </div>}
                    {p?.check?.reason && <p className={s.hint} style={{ marginTop: 8, marginBottom: 0 }}>Lý do từ chối: {p.check.reason}</p>}
                    {state === 'expired' && <p className={cx(s.hint, 'text-red')} style={{ marginTop: 8, marginBottom: 0 }}><i className="fa-solid fa-triangle-exclamation" /> Ngày giao dự kiến là {formatDate(deliveryDate(o.departAt, o.duration))}. Khách cần xin giấy còn hiệu lực đến hết ngày này, hoặc báo cáo Manager.</p>}
                  </div>
                )
              })}
            </div>
          </div>

          <aside className={s.side}>
            {editable && (
              <div className="card">
                <div className="card-header"><h3><i className="fa-solid fa-list-check" /> Tiến độ đối chiếu</h3></div>
                <div className={cx(s.deadline, (Date.now() > due || due - Date.now() <= 24 * HOUR) && s.urgent)}><i className="fa-regular fa-clock" /> Hạn khách tải giấy: <b>{formatDeadline(due)}</b></div>
                <div className={s.progress}><div style={{ width: `${Math.round(pr.done / pr.total * 100)}%` }} /></div>
                <p className={s.hint}>Đã duyệt {pr.done}/{pr.total} giấy</p>
                <div className={s.actions}>
                  <button className="btn btn-danger" disabled={pr.ready} onClick={() => { setRep({ type: PAPERS_REPORT_TYPES[0], items: pending.map(i => i.label), note: '' }); setInvalid(''); setModal('report') }}><i className="fa-solid fa-flag" /> Báo cáo Manager</button>
                  <p className={s.hint}>Khi khách không tải giấy đúng hạn, hoặc giấy vẫn sai sau khi xin lại. Bạn không từ chối đơn.</p>
                </div>
              </div>
            )}
            <div className="card">
              <div className="card-header"><h3><i className="fa-solid fa-file-lines" /> Thông tin đơn</h3></div>
              <InfoRow label="Khách hàng">{o.customer}</InfoRow>
              <InfoRow label="Điểm đi">{o.from}</InfoRow>
              <InfoRow label="Điểm đến">{o.to}</InfoRow>
              <InfoRow label="Loại tuyến">{o.border ? `Xuyên quốc gia · ${o.border}` : 'Nội địa'}</InfoRow>
              <InfoRow label="Khởi hành">{formatDate(o.departAt)}</InfoRow>
              <InfoRow label="Giao dự kiến">{formatDate(deliveryDate(o.departAt, o.duration))}</InfoRow>
              {o.paidAt && <InfoRow label="Thanh toán lúc">{formatDateTime(o.paidAt)}</InfoRow>}
              <InfoRow label="Hạn khách tải giấy"><DueBadge o={o} st={st} /></InfoRow>
            </div>
          </aside>
        </div>
      </div>

      {modal && typeof modal === 'object' && 'file' in modal && <FilePreview file={modal.file} note="Bản xem trước tài liệu" onClose={() => setModal(null)} />}

      {modal && typeof modal === 'object' && 'review' in modal && (
        <ReviewModal o={o} k={modal.review} onClose={() => setModal(null)} onDone={check => save(
          { procedures: { ...papers.procedures, [modal.review]: { ...papers.procedures[modal.review]!, check } } },
          check!.result === 'passed' ? `Đã duyệt ${PROCEDURES[modal.review].label}` : 'Đã từ chối giấy, khách sẽ được yêu cầu xin lại',
        )} />
      )}

      {modal === 'report' && (
        <Modal wide title={`Báo cáo Manager · ${o.id}`} onClose={() => setModal(null)} footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Hủy</button><button className="btn btn-danger" onClick={confirmReport}><i className="fa-solid fa-flag" /> Gửi báo cáo</button></>}>
          <div className="form-group"><label className="required">Vấn đề</label><select className="form-control" value={rep.type} onChange={e => setRep({ ...rep, type: e.target.value })}>{PAPERS_REPORT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
          <div className="form-group">
            <label className="required">Giấy liên quan</label>
            <div className={cx(s.checkBox, invalid === 'items' && s.invalid)}>
              {pending.map(i => <label key={i.label} className={s.checkLine}><input type="checkbox" checked={rep.items.includes(i.label)} onChange={e => { setInvalid(''); setRep({ ...rep, items: e.target.checked ? [...rep.items, i.label] : rep.items.filter(x => x !== i.label) }) }} /> {i.label}</label>)}
            </div>
          </div>
          <div className="form-group"><label className="required">Ghi chú cho Manager</label><textarea rows={3} className={cx('form-control', invalid === 'note' && 'invalid')} value={rep.note} onChange={e => { setInvalid(''); setRep({ ...rep, note: e.target.value }) }} placeholder="Đã làm gì, còn vướng gì, dự kiến khi nào xong..." /></div>
        </Modal>
      )}
    </div>
  )
}
