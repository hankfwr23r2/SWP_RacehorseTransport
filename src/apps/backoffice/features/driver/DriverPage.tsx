// Chuyến của tôi (tài xế). Chuyển từ Driver/index.html + script.js.
// Tài xế check-in lần lượt từng mốc; khách thấy ngay ở trang Theo dõi. Mốc cuối (giao ngựa) → đơn Đã giao, khách có 24 giờ nghiệm thu.
// Mốc nhận ngựa cần checklist nhận ngựa, mốc giao ngựa cần checklist bàn giao. Có nút SOS và tab khai chi phí.
import { useState } from 'react'
import { useAuth } from '@shared/auth/AuthContext'
import { formatClock, formatDate, formatDateTime } from '@shared/lib/format'
import { splitStop } from '@shared/lib/trip'
import { TRIP_STATUS_LABEL, tripsApi, type TripView } from '@shared/services/trips'
import { useToast } from '@shared/ui/toast'
import { cx } from '../../shared/parts'
import { useOps } from '../../shared/useOps'
import { DeliverySheet } from './DeliverySheet'
import { ExpensesTab } from './ExpensesTab'
import { PickupSheet } from './PickupSheet'
import { SosButton } from './SosButton'
import s from './Driver.module.css'

// Chuyến đang chờ tài xế nhận ngựa lên đầu, rồi chuyến đang chạy, cuối cùng chuyến chờ khởi hành
const rank = (t: TripView) => t.status !== 'in_transit' ? 2 : t.order.trip?.checkpoints[0]?.state === 'current' ? 0 : 1

export default function DriverPage() {
  const { session } = useAuth()
  const toast = useToast()
  const { ready, trips, crew, vehicle, name, reload } = useOps()
  const [tab, setTab] = useState<'progress' | 'trip' | 'expenses'>('progress')
  const [sheet, setSheet] = useState<'pickup' | 'delivery' | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const me = crew.find(c => c.role === 'driver' && c.name === session!.name)
  const mine = trips
    .filter(t => (t.status === 'in_transit' || t.status === 'assigned') && t.legs.some(l => l.driverId === me?.id))
    .sort((a, b) => rank(a) - rank(b) || a.order.departAt - b.order.departAt)
  const t = mine.find(x => x.id === selected) ?? mine[0]

  if (!ready) return <p className="text-muted">Đang tải…</p>
  if (!t) return <div className={s.empty}><i className="fa-solid fa-truck" /><p>Bạn chưa được phân công chuyến nào.</p></div>

  const o = t.order
  const running = t.status === 'in_transit'
  // Chưa khởi hành: xem trước các mốc theo điểm dừng
  const checkpoints = o.trip?.checkpoints ?? (o.stops ?? []).map(x => { const p = splitStop(x); return { label: p.act, place: p.place, time: o.departAt, state: 'next' as const } })
  const escort = t.legs[0]?.escortId

  const checkIn = async () => {
    await tripsApi.checkIn(o.id)
    toast('Đã check-in mốc, khách thấy cập nhật ngay')
    reload()
  }
  const sheetDone = (msg: string) => { setSheet(null); toast(msg); reload() }
  const startTrip = async () => {
    await tripsApi.startTrip(o.id)
    toast(`Đã bắt đầu chuyến ${t.id}. Khách, Manager và Điều phối thấy lộ trình cập nhật ngay.`)
    reload()
  }

  return (
    <>
      <div className={s.segmented}>
        <button className={cx(tab === 'progress' && s.active)} onClick={() => setTab('progress')}><i className="fa-solid fa-route" /> Tiến độ</button>
        <button className={cx(tab === 'trip' && s.active)} onClick={() => setTab('trip')}><i className="fa-solid fa-clipboard-list" /> Xem chuyến</button>
        <button className={cx(tab === 'expenses' && s.active)} onClick={() => setTab('expenses')}><i className="fa-solid fa-receipt" /> Chi phí</button>
      </div>
      {mine.length > 1 && (
        <select className="form-control" style={{ marginBottom: 14 }} value={t.id} onChange={e => setSelected(e.target.value)}>
          {mine.map(x => <option key={x.id} value={x.id}>{x.id} · {x.order.routeShort} ({TRIP_STATUS_LABEL[x.status]})</option>)}
        </select>
      )}

      {tab === 'expenses' ? <ExpensesTab trip={t} driverId={me!.id} onSaved={msg => toast(msg)} /> : tab === 'progress' ? <>
        <div className={s.header}><h1>Tiến độ vận chuyển</h1><p>{running ? 'Check-in tại mỗi mốc để cập nhật hệ thống.' : `Chuyến chưa khởi hành (dự kiến ${formatDate(o.departAt)}). Điều phối xác nhận khởi hành thì mở check-in.`} Lộ trình do Điều phối viên {o.coordinator ?? ''} lập; khách, Manager và Điều phối cùng theo dõi.</p></div>
        <div className={s.milestones}>
          {checkpoints.map((c, i) => {
            const last = i === checkpoints.length - 1
            const state = running ? c.state : 'next'
            return (
              <div key={i} className={cx(s.milestone, state === 'done' && s.done, state === 'current' && s.current, state === 'next' && s.next)}>
                <div className={s.icon}>{state === 'done' ? <i className="fa-solid fa-check" /> : i + 1}</div>
                <div className={s.body}>
                  <div className={s.bodyHead}><span>{c.label.charAt(0).toUpperCase() + c.label.slice(1)}</span>
                    {state === 'done' ? <span className="badge badge-success">Đã hoàn thành</span> : state === 'current' ? <span className="badge badge-warning">Chờ xử lý</span> : <span className="badge badge-muted">Đã khóa</span>}</div>
                  <div className={s.meta}><i className="fa-solid fa-location-dot" /> {c.place}{running && ` · ${state === 'done' ? `Đã check-in lúc ${formatClock(c.time)}` : `Dự kiến ${formatDateTime(c.time)}`}`}</div>
                  {state === 'current' && i === 0 && o.trip?.missingDocsAt && <div className={s.waitNote}><i className="fa-solid fa-stopwatch" /> {o.trip.docsArrivedAt ? 'Khách đã bổ sung bản gốc, làm tiếp checklist' : 'Đang chờ khách bổ sung bản gốc giấy tờ'}</div>}
                  {state === 'current' && last && o.trip?.handoverFailedAt && <div className={s.waitNote}><i className="fa-solid fa-stopwatch" /> Đã báo giao thất bại, đang chờ người nhận</div>}
                  {state === 'current' && i === 0 && o.trip?.pickup && (
                    <div className={s.pickupDone}>
                      <div><i className="fa-solid fa-circle-check" /> Checklist xong lúc {formatClock(o.trip.pickup.at)}: {o.trip.pickup.received.length} giấy bản gốc, ảnh hiện trạng {Object.keys(o.trip.pickup.horsePhotos).length} ngựa, khách ký ({o.trip.pickup.signedBy}).</div>
                      <button type="button" className={s.redo} onClick={() => setSheet('pickup')}>Làm lại checklist</button>
                    </div>
                  )}
                  {state === 'current' && (i === 0
                    ? o.trip?.pickup
                      ? <button className={cx('btn btn-primary', s.checkIn, s.start)} onClick={startTrip}><i className="fa-solid fa-truck-moving" /> Bắt đầu chuyến</button>
                      : <button className={cx('btn btn-primary', s.checkIn)} onClick={() => setSheet('pickup')}><i className="fa-solid fa-clipboard-check" /> Checklist nhận ngựa</button>
                    : last
                      ? <button className={cx('btn btn-primary', s.checkIn)} onClick={() => setSheet('delivery')}><i className="fa-solid fa-flag-checkered" /> Bàn giao ngựa</button>
                      : <button className={cx('btn btn-primary', s.checkIn)} onClick={checkIn}><i className="fa-solid fa-location-dot" /> Check In</button>)}
                </div>
              </div>
            )
          })}
        </div>
      </> : (
        <div className="card">
          <div className="card-header"><h3>Mã đơn: {o.id}</h3><span className={`badge ${running ? 'badge-warning' : 'badge-info'}`}>{TRIP_STATUS_LABEL[t.status]}</span></div>
          <p><i className="fa-solid fa-truck text-orange" /> {o.from} → <i className="fa-solid fa-flag-checkered text-orange" /> {o.to}</p>
          <div className={s.infoGrid}>
            <div><span>Khách hàng</span>{o.customer}</div>
            <div><span>Ngựa</span>{o.horses.map(h => h.name).join(', ')}</div>
            <div><span>Khởi hành</span>{formatDate(o.departAt)}</div>
            <div><span>NV chăm sóc đi kèm</span>{escort ? `${name(escort)} · ${crew.find(c => c.id === escort)?.phone}` : '—'}</div>
          </div>
          <div className={s.instructions}><b><i className="fa-solid fa-triangle-exclamation" /> Yêu cầu đặc biệt</b><p>{o.customerNote || 'Không có yêu cầu đặc biệt từ khách.'}</p></div>
          <h4 style={{ margin: '16px 0 6px' }}>Lộ trình chi tiết (Bộ phận Điều phối)</h4>
          {t.legs.map(l => (
            <div key={l.no} className={s.leg}>
              <i className="fa-solid fa-truck" />
              <div><b>Chặng {l.no}</b><div>Từ: {l.from}</div><div>Đến: {l.to}</div><div className="text-muted">Xe: {vehicle(l.vehicleId)?.name} (Biển số: {vehicle(l.vehicleId)?.plate}){l.driverId !== me?.id && ` · Tài xế ${name(l.driverId)}`}</div></div>
            </div>
          ))}
          {o.papers?.handedAt && <p className="small text-muted" style={{ marginTop: 8 }}><i className="fa-solid fa-folder-open" /> Nhận giấy tờ của ngựa trên xe từ Điều phối viên {o.coordinator} trước khi khởi hành.</p>}
        </div>
      )}
      {running && <SosButton order={o} onSent={msg => toast(msg, 'error')} />}
      {sheet === 'pickup' && <PickupSheet order={o} onClose={() => setSheet(null)} onDone={sheetDone} onChange={reload} />}
      {sheet === 'delivery' && <DeliverySheet order={o} onClose={() => setSheet(null)} onDone={sheetDone} />}
    </>
  )
}
