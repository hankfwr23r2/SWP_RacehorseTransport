// Thanh toán & Hóa đơn: 100% đã trả trước chuyến, cộng hóa đơn quyết toán cho phụ phí phát sinh (lưu bãi, thú y, phí chờ).
// Chưa trả hết hóa đơn quyết toán thì tài xế không bàn giao được ngựa (tài liệu nhóm, thẻ Màn hình, bổ sung cho khách hàng).
import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { BANK } from '@shared/config/business-rules'
import { formatDate, formatDateTime, formatVND } from '@shared/lib/format'
import { billingApi, type Bill } from '@shared/services/billing'
import { useLoad } from '@shared/services/useLoad'
import { orderTotal } from '@shared/types/order'
import { Modal } from '@shared/ui/Modal'
import { useToast } from '@shared/ui/toast'

export default function BillingPage() {
  const { session } = useAuth()
  const toast = useToast()
  const { data: bills = [], reload } = useLoad(() => billingApi.list(session!.name), [session?.name])
  const [paying, setPaying] = useState<Bill | null>(null)
  const list = [...bills].sort((a, b) => b.order.departAt - a.order.departAt)

  const pay = async () => {
    await billingApi.paySettlement(session!.name, paying!.order.id)
    toast(`Đã ghi nhận thanh toán hóa đơn quyết toán đơn ${paying!.order.id}`)
    setPaying(null)
    reload()
  }

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb"><Link to="/portal">Cổng Khách hàng</Link> / <span className="text-orange font-semibold">Thanh toán &amp; Hóa đơn</span></div>
        <div className="page-header">
          <h1>Thanh toán &amp; Hóa đơn</h1>
          <p>Bạn đã thanh toán 100% giá trên đơn trước chuyến. Phụ phí phát sinh trong chuyến (phí lưu bãi, phí thú y, phí chờ tại điểm đón) được Quản lý duyệt rồi cộng vào hóa đơn quyết toán riêng. Cần thanh toán hóa đơn này trước khi tài xế bàn giao ngựa.</p>
        </div>
        {list.length ? list.map(({ order: o, settlement: st }) => (
          <div key={o.id} className="card">
            <div className="card-header"><h3><Link to={`/orders/${o.id}`} className="text-orange">{o.id}</Link> · {o.routeShort}</h3><span className="sub-text">Khởi hành {formatDate(o.departAt)}</span></div>
            <div className="info-row"><span className="label">Hóa đơn thanh toán trước chuyến</span><span className="value">{formatVND(orderTotal(o))} <span className="badge badge-success">Đã thanh toán {o.paidAt ? formatDateTime(o.paidAt) : ''}</span></span></div>
            <div className="info-row"><span className="label">Hóa đơn quyết toán (phụ phí)</span><span className="value">
              {st.lines.length
                ? <>{formatVND(st.total)} {st.due > 0 ? <span className="badge badge-danger">Còn nợ {formatVND(st.due)}</span> : <span className="badge badge-success">Đã thanh toán</span>}</>
                : <span className="text-muted">Chưa phát sinh phụ phí</span>}
            </span></div>
            {st.lines.length > 0 && (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Khoản phụ phí</th><th>Chi tiết</th><th className="text-right">Số tiền</th></tr></thead>
                  <tbody>{st.lines.map(l => <tr key={l[0] + l[1]}><td className="font-semibold">{l[0]}</td><td className="text-muted">{l[1]}</td><td className="text-right nowrap">{formatVND(l[2])}</td></tr>)}</tbody>
                  <tfoot><tr><td colSpan={2}>Còn phải thanh toán</td><td className="text-right nowrap">{formatVND(st.due)}</td></tr></tfoot>
                </table>
              </div>
            )}
            {st.pending > 0 && <p className="sub-text" style={{ margin: '8px 0 0' }}><i className="fa-regular fa-clock" /> {st.pending} khoản phụ phí tài xế đã khai đang chờ Quản lý duyệt, chưa tính vào hóa đơn.</p>}
            {st.due > 0 && <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setPaying({ order: o, settlement: st })}><i className="fa-solid fa-credit-card" /> Thanh toán hóa đơn quyết toán</button>}
          </div>
        )) : <div className="card"><p className="text-muted">Chưa có đơn nào đã thanh toán.</p></div>}
      </div>

      {paying && (
        <Modal title={<>Thanh toán quyết toán đơn <span className="text-orange">{paying.order.id}</span></>} onClose={() => setPaying(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setPaying(null)}>Để sau</button><button className="btn btn-primary" onClick={pay}>Tôi đã thanh toán</button></>}>
          <div className="info-row"><span className="label">Ngân hàng</span><span className="value">{BANK.name}</span></div>
          <div className="info-row"><span className="label">Số tài khoản</span><span className="value">{BANK.account}</span></div>
          <div className="info-row"><span className="label">Chủ tài khoản</span><span className="value">{BANK.owner}</span></div>
          <div className="info-row"><span className="label">Số tiền</span><span className="value">{formatVND(paying.settlement.due)}</span></div>
          <div className="info-row"><span className="label">Nội dung chuyển khoản</span><span className="value text-orange">{paying.order.id}-QT</span></div>
        </Modal>
      )}
    </div>
  )
}
