// Theo dõi đơn vận chuyển (thay trang Báo cáo chuyến đi). Danh sách đơn bên trái, chi tiết bên phải:
// tiến trình 8 bước, nhật ký đơn; từ lúc xe khởi hành, nhật ký chuyển sang nhật ký giao hàng.
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { formatDate, formatDateTime, formatVND } from '@shared/lib/format'
import { ordersApi } from '@shared/services/orders'
import { useLoad } from '@shared/services/useLoad'
import { orderTotal, type Order } from '@shared/types/order'
import { EXCEPTIONS, STAGE, STEPS, deliveryLog, isDelivery, orderLog, stageOf, stepOf, type LogEvent, type StageKey } from './tracking-stages'
import s from './Tracking.module.css'

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')

function StageBadge({ k }: { k: StageKey }) {
  const d = STAGE[k]
  return <span className={`badge ${d.badge}`}><i className={`fa-solid ${d.icon}`} /> {d.label}</span>
}

function Progress({ o }: { o: Order }) {
  const { step, blocked } = stepOf(o)
  return (
    <ol className={s.steps} aria-label="Tiến trình đơn">
      {STEPS.map((d, i) => {
        const n = i + 1
        const state = n < step ? s.done : n === step ? (blocked ? s.blocked : s.current) : ''
        return (
          <li key={d.key} className={cx(s.step, state)} aria-current={n === step ? 'step' : undefined}>
            <span className={s.dot}>{n < step ? <i className="fa-solid fa-check" /> : n === step && blocked ? <i className="fa-solid fa-exclamation" /> : n}</span>
            <span className={s.stepLabel}>{d.label}</span>
          </li>
        )
      })}
    </ol>
  )
}

function Log({ events }: { events: LogEvent[] }) {
  if (!events.length) return <p className="text-muted small">Chưa có dữ liệu.</p>
  return (
    <ul className={s.log}>
      {events.map((e, i) => (
        <li key={i} className={cx(s.event, s[e.tone])}>
          <span className={s.eventIcon}><i className={`fa-solid ${e.icon}`} /></span>
          <div className={s.eventBody}>
            <div className={s.eventHead}><span className={s.eventTitle}>{e.title}</span><time className={s.eventTime}>{e.tone === 'next' ? `Dự kiến ${formatDateTime(e.time)}` : formatDateTime(e.time)}</time></div>
            {e.desc && <div className={s.eventDesc}>{e.desc}</div>}
            {e.meta && <div className={s.eventMeta}>{e.meta}</div>}
          </div>
        </li>
      ))}
    </ul>
  )
}

const vehicleOf = (o: Order) => o.trip?.plate ?? o.handover?.vehicle ?? o.review?.vehicle ?? o.vehicle
const driverOf = (o: Order) => o.trip?.contacts.find(c => c[0] === 'Tài xế')?.[1] ?? o.handover?.driver ?? o.review?.driver

function Detail({ o }: { o: Order }) {
  const key = stageOf(o)
  const delivery = isDelivery(o)
  const facts: [string, string][] = [
    ['Khởi hành', formatDate(o.departAt)],
    ['Ngựa', `${o.horses.length} · ${o.horses.map(h => h.name).join(', ')}`],
    ['Xe · Tài xế', [vehicleOf(o), driverOf(o)].filter(Boolean).join(' · ') || 'Chưa xếp xe'],
    ['Phụ trách', o.inspector ? `KDV ${o.inspector} · ĐPV ${o.coordinator}` : 'Chưa phân công'],
    ['Giá trị đơn', formatVND(orderTotal(o))],
  ]
  const print = () => { const prev = document.title; document.title = `Theo-doi-${o.id}`; setTimeout(() => { window.print(); document.title = prev }, 50) }

  return (
    <article className={`card ${s.detail}`}>
      <header className={s.detailHead}>
        <div>
          <div className={s.detailId}>{o.id} <StageBadge k={key} /></div>
          <div className={s.detailSub}>{o.customer} · {o.routeShort}{o.border ? ` · Cửa khẩu ${o.border}` : ''}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={print}><i className="fa-solid fa-print" /> In</button>
      </header>

      <dl className={s.facts}>{facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>

      <Progress o={o} />

      {(key === 'on_hold' || key === 'cancelled') && (
        <div className={`alert ${key === 'on_hold' ? 'alert-warning' : 'alert-danger'}`}>
          <i className={`fa-solid ${STAGE[key].icon}`} />
          <div><b>{STAGE[key].label}.</b> {key === 'on_hold'
            ? (o.pending ? 'Đang chờ Manager xử lý ở trang Phê duyệt.' : 'Đang chờ khách chọn phương án xử lý hồ sơ.')
            : (o.reason ?? 'Đơn đã kết thúc sớm.')}</div>
        </div>
      )}

      <section>
        <h3 className={s.h3}>{delivery ? 'Nhật ký giao hàng' : 'Nhật ký đơn hàng'}</h3>
        <Log events={delivery ? deliveryLog(o) : orderLog(o)} />
      </section>
      {delivery && (
        <details className={s.more}>
          <summary>Nhật ký đơn hàng trước khi khởi hành</summary>
          <Log events={orderLog(o)} />
        </details>
      )}
    </article>
  )
}

export default function TrackingPage() {
  const { data: orders = [] } = useLoad(ordersApi.list)
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState<StageKey | 'all'>('all')
  const [query, setQuery] = useState('')

  const rows = orders.map(o => ({ o, key: stageOf(o) })).sort((a, b) => b.o.submittedAt - a.o.submittedAt)
  const count = (k: StageKey) => rows.filter(r => r.key === k).length
  const q = query.trim().toLowerCase()
  const list = rows.filter(r => (filter === 'all' || r.key === filter)
    && (!q || [r.o.id, r.o.customer, r.o.routeShort, ...r.o.horses.map(h => h.name)].join(' ').toLowerCase().includes(q)))
  const selected = orders.find(o => o.id === params.get('id')) ?? list[0]?.o

  return (
    <div className="page">
      <div className={`wrap ${s.wrap}`}>
        <div className="page-header">
          <h1>Theo dõi đơn vận chuyển</h1>
          <p>Mỗi đơn đang ở bước nào, ai phụ trách và đã có những việc gì, từ lúc khách gửi đơn tới khi giao ngựa.</p>
        </div>
        <div className={s.layout}>
          <aside className={`card ${s.side}`}>
            <div className={s.filters}>
              <label className={s.field}>
                <span>Trạng thái</span>
                <select className="form-control" value={filter} onChange={e => setFilter(e.target.value as StageKey | 'all')}>
                  <option value="all">Tất cả ({rows.length})</option>
                  <optgroup label="Quy trình">{STEPS.map((d, i) => <option key={d.key} value={d.key}>{i + 1}. {d.label} ({count(d.key)})</option>)}</optgroup>
                  <optgroup label="Ngoại lệ">{EXCEPTIONS.map(d => <option key={d.key} value={d.key}>{d.label} ({count(d.key)})</option>)}</optgroup>
                </select>
              </label>
              <label className={s.field}>
                <span>Tìm kiếm</span>
                <input className="form-control" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Mã đơn, khách, tuyến, tên ngựa" />
              </label>
            </div>
            <div className={s.resultCount}>{list.length} đơn</div>
            <ul className={s.list}>
              {list.length ? list.map(({ o, key }) => (
                <li key={o.id}>
                  <button type="button" className={cx(s.item, o.id === selected?.id && s.active)} aria-pressed={o.id === selected?.id} onClick={() => setParams({ id: o.id }, { replace: true })}>
                    <span className={s.itemTop}><span className={s.itemId}>{o.id}</span><StageBadge k={key} /></span>
                    <span className={s.itemRoute}>{o.routeShort}</span>
                    <span className={s.itemMeta}>{o.customer} · Khởi hành {formatDate(o.departAt)}</span>
                  </button>
                </li>
              )) : <li className={s.empty}>Không có đơn phù hợp.</li>}
            </ul>
          </aside>
          {selected ? <Detail o={selected} /> : <div className={`card ${s.empty}`}>Chọn một đơn để xem chi tiết.</div>}
        </div>
      </div>
    </div>
  )
}
