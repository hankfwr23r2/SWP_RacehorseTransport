// Chuông thông báo của khách: một chỗ duy nhất xem việc cần làm (chọn phương án, thanh toán, nghiệm thu), bấm là tới đơn.
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { formatDateTime, timeLeftText } from '@shared/lib/format'
import { customerOrdersApi } from '@shared/services/orders'
import { useLoad } from '@shared/services/useLoad'
import { attentionOf, byPriority } from '../features/orders/attention'
import s from './NotificationBell.module.css'

export function NotificationBell() {
  const { session } = useAuth()
  const { pathname } = useLocation()
  // Tải lại mỗi lần chuyển trang để số việc luôn mới (vừa thanh toán, vừa nghiệm thu…)
  const { data: orders = [] } = useLoad(() => customerOrdersApi.list(session!.name), [session?.name, pathname])
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const items = byPriority(orders).flatMap(o => { const a = attentionOf(o); return a ? [{ o, a }] : [] })

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
        aria-label={items.length ? `Thông báo: ${items.length} việc cần bạn xử lý` : 'Thông báo'}>
        <i className="fa-regular fa-bell" />
        {items.length > 0 && <span className={s.count} aria-hidden="true">{items.length}</span>}
      </button>
      {open && (
        <div className={s.panel} role="region" aria-label="Thông báo">
          <div className={s.head}>Cần bạn xử lý{items.length > 0 && <span className={s.headCount}>{items.length}</span>}</div>
          {items.length ? (
            <ul className={s.list}>
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
