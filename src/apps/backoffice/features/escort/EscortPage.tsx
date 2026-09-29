// Nhật ký sức khỏe ngựa (hộ tống). Chuyển từ Escort/escort_page.html + escort.js.
// Báo cáo ghi vào nhật ký sức khỏe của đơn: khách thấy ở trang Theo dõi, thân nhiệt / nhịp tim lúc nhận / lúc giao dùng cho biên bản nghiệm thu.
// Tình trạng nặng (Thương tích / Nguy kịch) → hỏi xác nhận, rồi hệ thống tự tạo sự cố "Y tế ngựa" cho Điều phối (OPS-04).
// Tài xế check-in tới mốc (điểm đón, trạm dừng, cửa khẩu) → nhắc hộ tống ghi báo cáo cho ngựa chưa ghi ở mốc đó.
// Sửa / xóa từng báo cáo của mình trong HEALTH_EDIT_MINUTES sau khi gửi; quá hạn thì khóa vì khách đã xem.
// Báo cáo theo thời gian thực: giờ kiểm tra ghi tự động lúc gửi, hộ tống không tự chọn.
// Bố cục: dải trên cùng là ngữ cảnh chuyến (thứ hộ tống cần ngay), form chia 4 nhóm theo trình tự công việc, nút gửi dính đáy màn hình.
// 1 đơn = 1 xe = 1 hộ tống: tab Chuyến để nhận chuyến được giao; tab Báo cáo luôn ghi cho chuyến đang chạy, không chọn chuyến.
import { useState, type ReactNode } from 'react'
import { useAuth } from '@shared/auth/AuthContext'
import { NORMAL_RANGE } from '@shared/config/documents'
import { HEALTH_EDIT_MINUTES, HEALTH_OTHER, HEALTH_STATUS, healthTone, isSevere } from '@shared/config/health'
import { formatClock, formatDate, formatDateTime } from '@shared/lib/format'
import { canEditHealthLog, tripsApi, type TripView } from '@shared/services/trips'
import type { HealthLog } from '@shared/types/order'
import { Modal } from '@shared/ui/Modal'
import { useToast } from '@shared/ui/toast'
import { cx } from '../../shared/parts'
import { useOps } from '../../shared/useOps'
import s from './Escort.module.css'

const BADGE = { ok: 'badge-success', watch: 'badge-warning', severe: 'badge-danger' }
const badgeOf = (status?: string) => status ? BADGE[healthTone(status)] : 'badge-info'
const toneClass = (status?: string) => s[`tone_${status ? healthTone(status) : 'watch'}`]
const EMPTY = { horse: '', temp: '', heart: '', status: '', other: '', notes: '', photo: '' }
const NO_NOTE = 'Không có ghi chú.'
// Ô thiếu → nhóm cần cuộn tới + câu báo lỗi
const ERRORS: Record<string, [section: string, message: string]> = {
  horse: ['sec-horse', 'Chọn ngựa cần ghi.'],
  temp: ['sec-vitals', 'Nhập thân nhiệt.'],
  heart: ['sec-vitals', 'Nhập nhịp tim.'],
  status: ['sec-status', 'Chọn tình trạng sức khỏe.'],
  other: ['sec-status', 'Mô tả tình trạng khi chọn "Khác".'],
}

type Entry = HealthLog & { orderId: string; tripId: string }

// Mốc gần nhất tài xế đã check-in và các ngựa chưa có báo cáo từ lúc đó
function reminderOf(t: TripView) {
  const cps = t.order.trip?.checkpoints ?? []
  const last = [...cps].reverse().find(c => c.state === 'done')
  if (!last) return null
  const logged = new Set((t.order.trip?.health ?? []).filter(h => h.horse && h.time >= last.time).map(h => h.horse))
  const horses = t.order.horses.map(h => h.name).filter(n => !logged.has(n))
  return horses.length ? { checkpoint: last, horses } : null
}

function Section({ id, num, title, error, children }: { id: string; num: number; title: string; error?: string; children: ReactNode }) {
  return (
    <section id={id} className={s.section}>
      <h2 className={s.sectionTitle}><span>{num}</span>{title}</h2>
      {error && <p className={s.error} role="alert"><i className="fa-solid fa-circle-exclamation" /> {error}</p>}
      {children}
    </section>
  )
}

export default function EscortPage() {
  const { session } = useAuth()
  const toast = useToast()
  const { ready, trips, crew, vehicle, name, reload } = useOps()
  const [tab, setTab] = useState<'trip' | 'report' | 'history' | null>(null) // null: tự chọn theo có chuyến đang chạy hay không
  const [detail, setDetail] = useState<Entry | null>(null)
  const [f, setF] = useState(EMPTY)
  const [editing, setEditing] = useState<Entry | null>(null)
  const [invalid, setInvalid] = useState('')
  const [confirmSevere, setConfirmSevere] = useState(false)
  const [deleting, setDeleting] = useState<Entry | null>(null)
  const me = crew.find(c => c.role === 'escort' && c.name === session!.name)
  const mine = trips.filter(t => t.legs.some(l => l.escortId === me?.id))
  const trip = mine.find(t => t.status === 'in_transit') // chuyến đang chạy (mỗi lúc 1 chuyến)
  const assigned = mine.filter(t => t.status === 'assigned').sort((a, b) => a.order.departAt - b.order.departAt)
  const toAccept = [...(trip && !trip.escortAcceptedAt ? [trip] : []), ...assigned.filter(t => !t.escortAcceptedAt)].length
  const reminder = trip?.escortAcceptedAt ? reminderOf(trip) : null
  const pending = reminder?.horses ?? []
  const view = tab ?? (trip ? 'report' : 'trip')
  const history: Entry[] = trips
    .flatMap(t => (t.order.trip?.health ?? []).filter(h => h.by === session!.name && h.temp !== '—').map(h => ({ ...h, orderId: t.orderId, tripId: t.id })))
    .sort((a, b) => b.time - a.time)
  const editableEntry = (h: Entry) => canEditHealthLog(h, session!.name) && trip?.id === h.tripId
  const set = (key: keyof typeof f) => (v: string) => { setInvalid(''); setF({ ...f, [key]: v }) }
  const errorFor = (section: string) => (invalid && ERRORS[invalid][0] === section ? ERRORS[invalid][1] : undefined)

  const pickPhoto = (file?: File) => {
    if (!file) return set('photo')('')
    const reader = new FileReader()
    reader.onload = () => set('photo')(String(reader.result))
    reader.readAsDataURL(file)
  }
  const startFor = (horse: string) => { setEditing(null); setDetail(null); setTab('report'); setInvalid(''); setF({ ...EMPTY, horse }) }
  const startEdit = (h: Entry) => {
    setDetail(null); setTab('report'); setInvalid(''); setEditing(h)
    setF({ horse: h.horse ?? '', temp: String(parseFloat(h.temp)), heart: String(parseFloat(h.heart) || ''), status: h.status ?? '', other: h.other ?? '', notes: h.note === NO_NOTE ? '' : h.note, photo: h.photo ?? '' })
    window.scrollTo({ top: 0 })
  }
  const reset = () => { setEditing(null); setF(EMPTY) }

  // Thiếu ô nào thì báo lỗi ở nhóm đó và cuộn tới (nút gửi dính đáy nên ô thiếu có thể đang khuất phía trên)
  const fail = (key: string) => {
    setInvalid(key)
    document.getElementById(ERRORS[key][0])?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  const submit = () => {
    if (!f.horse) return fail('horse')
    if (!f.temp) return fail('temp')
    if (!f.heart) return fail('heart')
    if (!f.status) return fail('status')
    if (f.status === HEALTH_OTHER && !f.other.trim()) return fail('other')
    // Tình trạng nặng tạo sự cố khẩn cấp: hỏi lại một bước để tránh báo động giả
    if (isSevere(f.status) && (!editing || editing.status !== f.status)) return setConfirmSevere(true)
    send()
  }
  const send = async () => {
    setConfirmSevere(false)
    const log: HealthLog = {
      time: editing ? editing.time : Date.now(), temp: `${f.temp}°C`, heart: `${f.heart} bpm`, note: f.notes.trim() || NO_NOTE,
      horse: f.horse, status: f.status, by: session!.name,
      ...(f.status === HEALTH_OTHER && { other: f.other.trim() }), ...(f.photo && { photo: f.photo }),
    }
    const severe = isSevere(f.status)
    try {
      if (editing) await tripsApi.updateHealthLog(trip!.orderId, editing.sentAt!, session!.name, log, severe)
      else await tripsApi.addHealthLog(trip!.orderId, log, severe)
    } catch (e) {
      toast((e as Error).message, 'error')
      reset(); reload()
      return
    }
    toast(severe ? 'Đã gửi báo cáo. Hệ thống đã tạo sự cố khẩn cấp gửi Điều phối' : editing ? 'Đã sửa báo cáo sức khỏe' : 'Đã ghi nhận báo cáo sức khỏe', severe ? 'error' : 'success')
    reset()
    reload()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const accept = (t: TripView) => {
    tripsApi.acceptAsEscort(t.id)
    toast(`Đã nhận chuyến ${t.id}.`)
    reload()
  }

  const remove = async () => {
    try { await tripsApi.deleteHealthLog(deleting!.orderId, deleting!.sentAt!, session!.name); toast('Đã xóa báo cáo', 'info') } catch (e) { toast((e as Error).message, 'error') }
    setDeleting(null)
    setDetail(null)
    reload()
  }

  if (!ready) return <p className="text-muted">Đang tải…</p>

  const minutesLeft = (h: Entry) => Math.max(1, Math.ceil((h.sentAt! + HEALTH_EDIT_MINUTES * 60000 - Date.now()) / 60000))
  const actions = (h: Entry) => editableEntry(h) && (
    <div className={s.actions}>
      <span className="text-muted small">Còn {minutesLeft(h)} phút để sửa</span>
      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(h)}><i className="fa-solid fa-pen" /> Sửa</button>
      <button className="btn btn-ghost btn-sm text-red" onClick={() => setDeleting(h)}><i className="fa-solid fa-trash" /> Xóa</button>
    </div>
  )
  const statusLabel = (status?: string) => <span className={`badge ${badgeOf(status)}`}>{isSevere(status) && <i className="fa-solid fa-triangle-exclamation" />}{status}</span>
  const current = trip?.order.trip?.checkpoints.find(c => c.state === 'current')
  const crewOf = (t: TripView) => {
    const leg = t.legs[0]
    const driver = crew.find(c => c.id === leg?.driverId)
    return { plate: vehicle(leg?.vehicleId ?? '')?.plate ?? 'Chưa xếp xe', driver: driver ? `${driver.name} · ${driver.phone}` : name(leg?.driverId ?? '') }
  }
  const tripCard = (t: TripView, active: boolean) => (
    <div key={t.id} className={cx('card', s.tripCard, active && s.tripActive)}>
      <div className={s.tripHead}><b>{t.id} · {t.order.routeShort}</b><span className={`badge ${active ? 'badge-orange' : 'badge-info'}`}>{active ? 'Đang chạy' : `Khởi hành ${formatDate(t.order.departAt)}`}</span></div>
      <dl className={s.tripFacts}>
        <div><dt>Điểm đón</dt><dd>{t.order.from}</dd></div>
        <div><dt>Điểm giao</dt><dd>{t.order.to}</dd></div>
        <div><dt>Ngựa ({t.order.horses.length})</dt><dd>{t.order.horses.map(h => h.name).join(', ')}</dd></div>
        <div><dt>Xe · Tài xế</dt><dd>{crewOf(t).plate} · {crewOf(t).driver}</dd></div>
      </dl>
      {t.order.customerNote && <p className={s.tripNote}><i className="fa-solid fa-circle-info" /> {t.order.customerNote}</p>}
      {t.escortAcceptedAt
        ? <div className={s.accepted}><i className="fa-solid fa-circle-check" /> Đã nhận chuyến lúc {formatDateTime(t.escortAcceptedAt)}{!active && ' · chờ khởi hành'}</div>
        : <button className={cx('btn btn-primary btn-lg', s.acceptBtn)} onClick={() => accept(t)}><i className="fa-solid fa-hand" /> Nhận chuyến</button>}
      {active && t.escortAcceptedAt && <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={() => setTab('report')}><i className="fa-solid fa-file-medical" /> Ghi báo cáo sức khỏe</button>}
    </div>
  )

  return (
    <div className={s.page}>
      <div className={s.segmented}>
        <button className={cx(view === 'trip' && !detail && s.active)} onClick={() => { setDetail(null); setTab('trip') }}><i className="fa-solid fa-truck" /> Chuyến{toAccept > 0 && <span className={s.dot}>{toAccept}</span>}</button>
        <button className={cx(view === 'report' && !detail && s.active)} onClick={() => { setDetail(null); setTab('report') }}><i className="fa-solid fa-file-medical" /> Báo cáo{pending.length > 0 && <span className={s.dot}>{pending.length}</span>}</button>
        <button className={cx(view === 'history' && !detail && s.active)} onClick={() => { setDetail(null); setTab('history') }}><i className="fa-solid fa-clock-rotate-left" /> Lịch sử</button>
      </div>

      {detail ? (
        <div className={cx('card', s.detailCard, toneClass(detail.status))}>
          <button className="btn btn-ghost btn-sm" onClick={() => setDetail(null)}><i className="fa-solid fa-arrow-left" /> Về lịch sử</button>
          <div className={s.horseLine} style={{ marginTop: 12 }}><h3>{detail.horse ?? 'Cả chuyến'}</h3>{statusLabel(detail.status)}</div>
          <div className={s.muted}>{detail.tripId} · {detail.orderId}</div>
          <div className={s.infoGrid}>
            <div><span>Giờ kiểm tra</span>{formatDateTime(detail.time)}</div>
            <div><span>Thân nhiệt · Nhịp tim</span>{detail.temp} · {detail.heart}</div>
          </div>
          {detail.other && <><h4>Tình trạng khác</h4><p>{detail.other}</p></>}
          {detail.note !== NO_NOTE && <><h4>Ghi chú</h4><p>{detail.note}</p></>}
          {detail.photo && <img className={s.detailImg} src={detail.photo} alt="Tình trạng ngựa" />}
          {actions(detail)}
        </div>
      ) : view === 'trip' ? (
        <>
          <div className={s.header}><h1>Chuyến của tôi</h1><p>Mỗi chuyến một hộ tống. Bấm "Nhận chuyến" để xác nhận chuyến Điều phối giao cho bạn.</p></div>
          {trip && <><h2 className={s.groupTitle}>Đang chạy</h2>{tripCard(trip, true)}</>}
          <h2 className={s.groupTitle}>Được giao{assigned.length > 0 && ` (${assigned.length})`}</h2>
          {assigned.length ? assigned.map(t => tripCard(t, false)) : <div className={s.empty}><i className="fa-solid fa-calendar-check" /><p>Chưa có chuyến mới được giao.</p></div>}
        </>
      ) : view === 'history' ? (
        <>
          <div className={s.header}><h1>Lịch sử báo cáo</h1><p>Khách xem được ở trang Theo dõi của đơn. Sửa / xóa được trong {HEALTH_EDIT_MINUTES} phút sau khi gửi.</p></div>
          <div className={s.history}>
            {history.length ? history.map(h => (
              <div key={h.orderId + h.time + h.horse} className={cx(s.historyCard, toneClass(h.status))}>
                <button className={s.historyMain} onClick={() => setDetail(h)}>
                  <div className={s.horseLine}><h3>{h.horse ?? 'Cả chuyến'}</h3>{statusLabel(h.status)}</div>
                  <div className={s.historyInfo}><span>{formatDateTime(h.time)}</span><span>{h.temp}</span><span>{h.heart}</span></div>
                  {h.note !== NO_NOTE && <p className="small text-muted">{h.note}</p>}
                  <div className={s.muted}>{h.tripId} · {h.orderId}</div>
                </button>
                {actions(h)}
              </div>
            )) : <div className={s.empty}><i className="fa-solid fa-file-medical" /><p>Chưa có báo cáo sức khỏe nào.</p></div>}
          </div>
        </>
      ) : !trip ? (
        <div className={s.empty}><i className="fa-solid fa-truck" /><p>Chưa có chuyến đang chạy. Báo cáo mở khi xe của chuyến bạn đã nhận bắt đầu chạy.</p><button className="btn btn-ghost" onClick={() => setTab('trip')}>Xem chuyến được giao</button></div>
      ) : !trip.escortAcceptedAt ? (
        <>{tripCard(trip, true)}<p className="text-muted small">Nhận chuyến trước khi ghi báo cáo sức khỏe.</p></>
      ) : (
        <>
          {/* Dải đầu trang: ngữ cảnh chuyến và việc cần làm, đọc đầu tiên */}
          {editing ? (
            <div className={s.context}>
              <div className={s.contextMain}><b>Sửa báo cáo · {editing.horse}</b><span>Gửi lúc {formatClock(editing.sentAt!)} · còn {minutesLeft(editing)} phút để sửa</span></div>
              <button className="btn btn-ghost btn-sm" onClick={reset}>Hủy sửa</button>
            </div>
          ) : (
            <div className={s.context}>
              <i className="fa-solid fa-truck-moving" />
              <div className={s.contextMain}><b>{trip.id} · {trip.order.routeShort}</b>{current && <span>Đang tới: {current.label} · {current.place}</span>}</div>
            </div>
          )}

          {!editing && reminder && (
            <button type="button" className={s.reminder} onClick={() => startFor(reminder.horses[0])}>
              <i className="fa-solid fa-bell" />
              <span className={s.reminderText}><b>{reminder.horses.length} ngựa cần ghi</b><span>{reminder.checkpoint.label} · {reminder.checkpoint.place} · {formatDateTime(reminder.checkpoint.time)}</span></span>
              <span className={s.reminderGo}>Ghi <i className="fa-solid fa-arrow-right" /></span>
            </button>
          )}

          <div className={cx('card', s.form)}>
            <Section id="sec-horse" num={1} title="Ngựa" error={errorFor('sec-horse')}>
              <div className={cx(s.choices, invalid === 'horse' && s.invalid)} role="radiogroup" aria-label="Ngựa">
                {trip.order.horses.map(h => (
                  <button key={h.name} type="button" role="radio" aria-checked={f.horse === h.name} disabled={!!editing && f.horse !== h.name} className={cx(s.choice, f.horse === h.name && s.choiceOn)} onClick={() => set('horse')(h.name)}>
                    <b>{h.name}</b><span>{h.chip}</span>{pending.includes(h.name) && <span className={s.need}>Cần ghi</span>}
                  </button>
                ))}
              </div>
            </Section>

            <Section id="sec-vitals" num={2} title="Chỉ số" error={errorFor('sec-vitals')}>
              <div className={s.vitals}>
                {([['temp', 'Thân nhiệt', '°C', 'decimal', NORMAL_RANGE.temp], ['heart', 'Nhịp tim', 'lần/phút', 'numeric', NORMAL_RANGE.heart]] as const).map(([key, label, unit, mode, [lo, hi]]) => {
                  const v = parseFloat(f[key])
                  const out = !Number.isNaN(v) && (v < lo || v > hi)
                  return (
                    <div key={key} className={cx(s.vital, invalid === key && s.invalid, out && s.vitalOut)}>
                      <label htmlFor={key}>{label}</label>
                      <div className={s.vitalInput}><input id={key} type="number" step={key === 'temp' ? '0.1' : '1'} inputMode={mode} placeholder="—" value={f[key]} onChange={e => set(key)(e.target.value)} /><span>{unit}</span></div>
                      <small>{out ? 'Ngoài ngưỡng bình thường' : `Bình thường ${lo}–${hi}`}</small>
                    </div>
                  )
                })}
              </div>
            </Section>

            <Section id="sec-status" num={3} title="Tình trạng" error={errorFor('sec-status')}>
              <div className={cx(s.statusGrid, invalid === 'status' && s.invalid)}>
                {HEALTH_STATUS.map(x => (
                  <label key={x.label} className={cx(s.statusOption, f.status === x.label && s.selected, x.tone === 'severe' && s.severe)}>
                    <input type="radio" name="health" checked={f.status === x.label} onChange={() => set('status')(x.label)} />
                    {x.label}{x.tone === 'severe' && <i className="fa-solid fa-triangle-exclamation" aria-label="tình trạng nặng" />}
                  </label>
                ))}
              </div>
              {f.status === HEALTH_OTHER && <><textarea maxLength={500} rows={2} className={cx('form-control', invalid === 'other' && 'invalid')} style={{ marginTop: 8 }} placeholder="Mô tả tình trạng sức khỏe..." value={f.other} onChange={e => set('other')(e.target.value)} /><div className={s.counter}>{f.other.length}/500</div></>}
              {isSevere(f.status) && <p className={s.severeNote}><i className="fa-solid fa-triangle-exclamation" /> Gửi báo cáo này sẽ tạo sự cố khẩn cấp cho Điều phối.</p>}
            </Section>

            <Section id="sec-more" num={4} title="Ảnh & ghi chú">
              {f.photo
                ? <div className={s.photo}><img src={f.photo} alt="Xem trước" /><button type="button" aria-label="Bỏ ảnh" onClick={() => set('photo')('')}><i className="fa-solid fa-xmark" /></button></div>
                : <label className={s.camera}><input type="file" accept="image/*" capture="environment" onChange={e => pickPhoto(e.target.files?.[0])} /><i className="fa-solid fa-camera" /> Chụp ảnh tình trạng ngựa</label>}
              <textarea maxLength={500} rows={3} className="form-control" style={{ marginTop: 10 }} placeholder="Ghi chú (nếu có)..." aria-label="Ghi chú" value={f.notes} onChange={e => set('notes')(e.target.value)} />
              <div className={s.counter}>{f.notes.length}/500</div>
            </Section>

            <div className={s.submitBar}>
              <span className={s.timeNote}><i className="fa-regular fa-clock" /> {editing ? `Giữ giờ kiểm tra ${formatClock(editing.time)}` : 'Giờ kiểm tra ghi lúc gửi'}</span>
              <button className="btn btn-primary btn-lg" onClick={submit}><i className={`fa-solid ${editing ? 'fa-floppy-disk' : 'fa-paper-plane'}`} /> {editing ? 'Lưu sửa đổi' : f.horse ? `Gửi báo cáo ${f.horse}` : 'Gửi báo cáo'}</button>
            </div>
          </div>
        </>
      )}

      {confirmSevere && (
        <Modal title={<span className="text-red"><i className="fa-solid fa-triangle-exclamation" /> Báo tình trạng {f.status}?</span>} onClose={() => setConfirmSevere(false)}
          footer={<><button className="btn btn-ghost" onClick={() => setConfirmSevere(false)}>Quay lại</button><button className="btn btn-danger" onClick={send}><i className="fa-solid fa-paper-plane" /> Gửi & báo Điều phối</button></>}>
          <p><b>{f.horse}</b> · thân nhiệt {f.temp}°C · nhịp tim {f.heart} lần/phút.</p>
          <p>Hệ thống sẽ tạo <b>sự cố khẩn cấp "Y tế ngựa"</b> gửi Điều phối viên ngay khi gửi.</p>
        </Modal>
      )}
      {deleting && (
        <Modal title="Xóa báo cáo này?" onClose={() => setDeleting(null)} footer={<><button className="btn btn-ghost" onClick={() => setDeleting(null)}>Hủy</button><button className="btn btn-danger" onClick={remove}><i className="fa-solid fa-trash" /> Xóa</button></>}>
          <p>Báo cáo {deleting.horse} lúc {formatDateTime(deleting.time)} sẽ bị xóa khỏi nhật ký sức khỏe của đơn {deleting.orderId}. Khách sẽ không còn thấy báo cáo này.</p>
        </Modal>
      )}
    </div>
  )
}
