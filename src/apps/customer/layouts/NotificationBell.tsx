// Chuông thông báo của khách: một chỗ duy nhất xem việc cần làm (chọn phương án, thanh toán, nghiệm thu), bấm là tới đơn.
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { formatDateTime, formatVND, timeLeftText } from '@shared/lib/format'
import { billingApi } from '@shared/services/billing'
import { customerOrdersApi } from '@shared/services/orders'
import { useLoad } from '@shared/services/useLoad'
import { attentionOf, byPriority } from '../features/orders/attention'
import s from './NotificationBell.module.css'

export function NotificationBell() {
  const { session } = useAuth()
  const { pathname } = useLocation()
  // Tải lại mỗi lần chuyển trang để số việc luôn mới (vừa thanh toán, vừa nghiệm thu…)
  const { data: orders = [] } = useLoad(() => customerOrdersApi.list(session!.name), [session?.name, pathname])
  const { data: bills = [] } = useLoad(() => billingApi.list(session!.name), [session?.name, pathname])
  const owed = bills.filter(b => b.settlement.due > 0) // phụ phí đã duyệt, chưa thanh toán quyết toán
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const items = byPriority(orders).flatMap(o => { const a = attentionOf(o); return a ? [{ o, a }] : [] })
  const total = items.length + owed.length

  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div ref={box} className={s.wrap}>
      <button type="button" className={s.bell} aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(!open)}
        aria-label={total ? `Thông báo: ${total} việc cần bạn xử lý` : 'Thông báo'}>
        <i className="fa-regular fa-bell" />
        {total > 0 && <span className={s.count} aria-hidden="true">{total}</span>}
      </button>
      {open && (
        <div className={s.panel} role="region" aria-label="Thông báo">
          <div className={s.head}>Cần bạn xử lý{total > 0 && <span className={s.headCount}>{total}</span>}</div>
          {total ? (
            <ul className={s.list}>
              {owed.map(({ order: o, settlement: st }) => (
                <li key={`qt-${o.id}`}>
                  <Link to="/billing" className={s.item}>
                    <span className={`${s.icon} ${s.urgent}`}><i className="fa-solid fa-receipt" /></span>
                    <span className={s.body}>
                      <span className={s.title}>Thanh toán hóa đơn quyết toán {formatVND(st.due)}</span>
                      <span className={s.meta}>{o.id} · {o.routeShort}</span>
                      <span className={`${s.due} ${s.dueUrgent}`}>Cần thanh toán trước khi tài xế bàn giao ngựa</span>
                    </span>
                  </Link>
                </li>
              ))}
              {items.map(({ o, a }) => (
                <li key={o.id}>
                  <Link to={a.href} className={s.item}>
                    <span className={`${s.icon} ${a.urgent ? s.urgent : ''}`}><i className={`fa-solid ${a.icon}`} /></span>
                    <span className={s.body}>
                      <span className={s.title}>{a.title}</span>
                      <span className={s.meta}>{o.id} · {o.routeShort}</span>
                      <span className={`${s.due} ${a.urgent ? s.dueUrgent : ''}`}>Hạn {formatDateTime(a.deadline)} · còn {timeLeftText(a.deadline)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className={s.empty}><i className="fa-regular fa-circle-check" /> Không có việc nào cần bạn xử lý.</p>}
          <Link to="/orders" className={s.all}>Xem tất cả đơn <i className="fa-solid fa-arrow-right" /></Link>
        </div>
      )}
    </div>
  )
}
