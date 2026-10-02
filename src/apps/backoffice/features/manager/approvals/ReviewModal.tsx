// Khung xem đơn đang thẩm định ở trang Phê duyệt (trước là trang Tiếp nhận, gốc Manager/manager_tiep_nhan.html).
// Đơn mới được hệ thống tự giao kiểm dịch viên & điều phối viên (services/orders.ts). Ở đây Manager từ chối sớm đơn không hợp lệ
// và xử lý việc kiểm dịch chuyển lên (báo vấn đề, khách chọn kiểm tra lại, khách quá hạn chọn phương án).
import { useState } from 'react'
import { Link } from 'react-router'
import { DAY, MIN_LEAD_DAYS } from '@shared/config/business-rules'
import { startOfDay } from '@shared/lib/dates'
import { formatDateTime } from '@shared/lib/format'
import { staffApi } from '@shared/services/staff'
import { useLoad } from '@shared/services/useLoad'
import type { Order } from '@shared/types/order'
import { Modal } from '@shared/ui/Modal'
import { HorsesDocs, QuoteList, Section, Stepper, TripInfo, cx, partStyles as s } from '../../../shared/parts'
import { ManagerAction, optionText } from './ManagerAction'
import { choiceHoursLeft, reviewStatus, waitingChoice, type ReviewStatus } from './review-status'

const REJECT_TYPES = ['Đơn trùng lặp', 'Thông tin khai báo không khớp hồ sơ', 'Ngựa không thuộc diện vận chuyển (không phải ngựa đua)', 'Khác']
const STEP_OF: Record<ReviewStatus, number> = { unassigned: 0, needs_manager: 1, inspecting: 1, routing: 2, rejected: 0 }

export function Assignee({ o }: { o: Order }) {
  const st = reviewStatus(o)
  if (st === 'unassigned') return <span className="badge badge-danger">Chưa có người nhận</span>
  if (st === 'needs_manager') return {
    issue: <span className="badge badge-warning">Chọn phương án gửi khách</span>,
    recheck: <span className="badge badge-warning">Giao kiểm tra lại</span>,
    expired: <span className="badge badge-danger">Khách quá hạn chọn</span>,
  }[o.pending!.kind]
  if (st === 'inspecting') {
    const sub = waitingChoice(o) ? `Chờ khách chọn phương án · còn ${choiceHoursLeft(o)} giờ` : o.status === 'rechecking' ? 'Kiểm tra lại' : o.waitingCustomer ? 'Chờ khách bổ sung' : ''
    return <><i className="fa-solid fa-user-doctor text-muted" /> {o.inspector}{sub && <div className="sub-text">{sub}</div>}</>
  }
  if (st === 'routing') return <><i className="fa-solid fa-route text-muted" /> {o.coordinator}</>
  return <span className="text-muted">Manager · bước {o.rejectedStep === 0 ? 'Gửi đơn' : 'Kiểm dịch'}</span>
}

function StatusBanner({ o, st }: { o: Order; st: ReviewStatus }) {
  if (st === 'unassigned') return (
    <div className={`alert alert-danger ${s.banner}`}><i className="fa-solid fa-user-slash" /><div>
      Hệ thống chưa tự phân công được: không còn kiểm dịch viên hoặc điều phối viên nào đang làm việc. Đơn sẽ tự giao khi có người đi làm lại (xem trang <Link to="/manager/staff">Nhân sự</Link>).
    </div></div>
  )
  if (st === 'inspecting') {
    const text = waitingChoice(o)
      ? <>Đã gửi phương án cho khách lúc {formatDateTime(o.offer!.sentAt)}: {optionText(o.offer!.options, o.offer!.custom)}. Hạn khách chọn: <b>{formatDateTime(o.offer!.sentAt + 48 * 3600_000)}</b>.</>
      : o.status === 'rechecking'
        ? <>Đang kiểm tra lại theo yêu cầu của khách. Kiểm dịch viên <b>{o.inspector}</b> xác minh lại từ đầu.</>
        : o.waitingCustomer
          ? <>Kiểm dịch viên <b>{o.inspector}</b> đã yêu cầu khách bổ sung giấy tờ. Đơn đang chờ phía khách, đồng hồ xử lý của kiểm dịch tạm dừng.</>
          : <>Hệ thống đã phân công lúc {o.intakeAt ? formatDateTime(o.intakeAt) : '—'}. Đang chờ Kiểm dịch viên <b>{o.inspector}</b> xác minh hồ sơ.</>
    return <div className={`alert alert-info ${s.banner}`}><i className="fa-solid fa-hourglass-half" /><div>{text}</div></div>
  }
  if (st === 'routing') return <div className={`alert alert-info ${s.banner}`}><i className="fa-solid fa-hourglass-half" /><div>Hồ sơ đã được kiểm dịch xác nhận hợp lệ. Đang chờ Điều phối viên <b>{o.coordinator}</b> lập lộ trình.</div></div>
  if (st === 'rejected') return (
    <div className={`alert alert-danger ${s.banner}`}><i className="fa-solid fa-circle-xmark" /><div>
      <b>Manager từ chối</b> {o.rejectedStep === 0 ? 'sớm' : 'ở bước Kiểm dịch'} lúc {formatDateTime(o.rejectedAt!)} — <b>{o.rejectType}</b>: {o.reason}
      {o.report && <><br />Báo cáo kiểm dịch ({o.report.inspector}): {o.report.type} — {o.report.note}</>}
    </div></div>
  )
  return null
}

export function ReviewModal({ order: o, orders, onClose, onSave }: { order: Order; orders: Order[]; onClose: () => void; onSave: (patch: Partial<Order>, message: string, type?: 'success' | 'error') => void }) {
  const st = reviewStatus(o)!
  const { data: staff = [] } = useLoad(staffApi.list)
  const [rejecting, setRejecting] = useState(false)
  const [rejectType, setRejectType] = useState(REJECT_TYPES[0])
  const [rejectNote, setRejectNote] = useState('')
  const [shake, setShake] = useState(0)
  const canReject = st === 'unassigned' || st === 'inspecting' || st === 'routing'

  const leadDays = Math.round((startOfDay(o.departAt).getTime() - startOfDay(o.submittedAt).getTime()) / DAY)
  const checks: [boolean, string][] = [
    [leadDays >= MIN_LEAD_DAYS, `Khởi hành sau ${leadDays} ngày kể từ ngày đặt (tối thiểu ${MIN_LEAD_DAYS} ngày)`],
    [true, 'Tuyến nằm trong vùng phục vụ (Việt Nam – Lào – Campuchia)'],
    [true, `Còn năng lực vận chuyển — đã giữ chỗ tạm ${o.hold ?? ''}`],
    [true, `Khách đã nộp đủ hồ sơ cho ${o.horses.length} ngựa`],
  ]

  const reject = () => {
    if (!rejectNote.trim()) return setShake(shake + 1)
    onSave({ status: 'rejected', rejectedStep: 0, rejectedAt: Date.now(), rejectType, reason: rejectNote.trim(), stage: undefined, task: undefined }, `Đã từ chối sớm đơn ${o.id} và thông báo cho khách hàng`, 'error')
  }

  const footer = canReject && !rejecting ? <button className="btn btn-ghost" onClick={() => setRejecting(true)}><i className="fa-solid fa-ban" /> Từ chối sớm</button> : undefined

  return (
    <Modal wide title={o.id} subtitle={`${o.customer} · Gửi lúc ${formatDateTime(o.submittedAt)}`} onClose={onClose} footer={footer}>
      <Stepper current={STEP_OF[st]} rejectedAt={st === 'rejected' ? (o.rejectedStep ?? 0) : undefined} />
      <StatusBanner o={o} st={st} />
      <Section num={1} title="Thông tin chuyến"><TripInfo order={o} /></Section>
      <Section num={2} title="Ngựa & hồ sơ khách đã nộp"><HorsesDocs order={o} /></Section>
      <Section num={3} title="Báo giá đã gửi khách"><QuoteList order={o} /></Section>
      <Section num={4} title="Hệ thống kiểm tra tự động">
        <ul className={s.checks}>
          {checks.map(([ok, text]) => <li key={text} className={ok ? s.checkOk : s.checkWarn}><i className={`fa-solid ${ok ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} /> {text}</li>)}
          {o.warning && <li className={s.checkWarn}><i className="fa-solid fa-triangle-exclamation" /> {o.warning}</li>}
        </ul>
      </Section>
      <Section num={5} title="Phân công xử lý">
        {st === 'unassigned' || (st === 'rejected' && !o.inspector)
          ? <p className="text-muted small">Chưa phân công.</p>
          : <div className={s.infoGrid}><div><span className="text-muted small">Kiểm dịch viên</span><div className="font-semibold">{o.inspector}</div></div><div><span className="text-muted small">Điều phối viên</span><div className="font-semibold">{o.coordinator}</div></div></div>}
        {canReject && <p className={s.hint}><i className="fa-solid fa-circle-info" /> Hệ thống tự giao người đang ít việc nhất khi khách gửi đơn; người phụ trách trễ hạn hoặc nghỉ thì tự chuyển (trang <Link to="/manager/staff">Nhân sự</Link>).</p>}
      </Section>

      {st === 'needs_manager' && <Section num={6} title="Manager xử lý"><ManagerAction order={o} staff={staff} orders={orders} onSave={onSave} /></Section>}

      {rejecting && (
        <div key={shake} className={cx(s.rejectBox, shake > 0 && s.shake)}>
          <div className="form-group"><label className="required">Lý do từ chối</label><select className="form-control" value={rejectType} onChange={e => setRejectType(e.target.value)}>{REJECT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
          <div className="form-group"><label className="required">Ghi chú gửi khách</label><textarea rows={3} className={cx('form-control', shake > 0 && !rejectNote.trim() && 'invalid')} autoFocus value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Giải thích cho khách vì sao đơn bị từ chối..." /></div>
          <div className="text-right" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => { setRejecting(false); setRejectNote(''); setShake(0) }}>Hủy</button>
            <button className="btn btn-danger" onClick={reject}><i className="fa-solid fa-ban" /> Xác nhận từ chối</button>
          </div>
        </div>
      )}
    </Modal>
  )
}
