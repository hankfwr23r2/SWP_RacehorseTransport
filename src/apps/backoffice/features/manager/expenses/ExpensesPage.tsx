// Duyệt chi phí tài xế khai (tài liệu nhóm, thẻ "trách nhiệm khai/duyệt phí"): 2 tab.
// Phí vận hành (xăng dầu, cầu đường, cửa khẩu, khác): công ty chịu, khai vượt định mức thì báo đỏ.
// Phụ phí khách hàng (lưu bãi, thú y): duyệt xong tự cộng vào hóa đơn quyết toán của khách.
import { useState } from 'react'
import { useAuth } from '@shared/auth/AuthContext'
import { EXPENSE_QUOTA } from '@shared/config/driver'
import { formatDateTime, formatVND } from '@shared/lib/format'
import { crewApi } from '@shared/services/fleet'
import { expensesApi, type Expense } from '@shared/services/expenses'
import { useLoad } from '@shared/services/useLoad'
import { Modal } from '@shared/ui/Modal'
import { useToast } from '@shared/ui/toast'

type Tab = 'operating' | 'surcharge'
const TABS: [Tab, string][] = [['operating', 'Phí vận hành'], ['surcharge', 'Phụ phí khách hàng']]
const STATUS: Record<Expense['status'], [string, string]> = { pending: ['badge-warning', 'Chờ duyệt'], approved: ['badge-success', 'Đã duyệt'], rejected: ['badge-danger', 'Đã từ chối'] }

export default function ExpensesPage() {
  const { session } = useAuth()
  const toast = useToast()
  const { data: all = [], reload } = useLoad(expensesApi.list)
  const { data: crew = [] } = useLoad(crewApi.list)
  const [tab, setTab] = useState<Tab>('operating')
  const [rejecting, setRejecting] = useState<Expense | null>(null)
  const [reason, setReason] = useState('')
  const [invalid, setInvalid] = useState(false)
  const list = all.filter(e => e.billable === (tab === 'surcharge')).sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending') || b.time - a.time)
  const pendingOf = (t: Tab) => all.filter(e => e.billable === (t === 'surcharge') && e.status === 'pending').length
  const driver = (id: string) => crew.find(c => c.id === id)?.name ?? id

  const decide = async (e: Expense, patch: Partial<Expense>, msg: string) => {
    await expensesApi.update(e.id, { ...patch, decidedBy: session!.name, decidedAt: Date.now() })
    setRejecting(null)
    setReason('')
    toast(msg)
    reload()
  }
  const approve = (e: Expense) => decide(e, { status: 'approved' }, e.billable ? `Đã duyệt ${e.type} ${formatVND(e.amountVnd)}, cộng vào hóa đơn quyết toán của khách đơn ${e.orderId}` : `Đã duyệt ${e.type} ${formatVND(e.amountVnd)}`)
  const reject = () => reason.trim() ? decide(rejecting!, { status: 'rejected', rejectReason: reason.trim() }, 'Đã từ chối, yêu cầu tài xế giải trình') : setInvalid(true)

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb">Manager / <span className="text-orange font-semibold">Chi phí tài xế</span></div>
        <div className="page-header">
          <h1>Chi phí tài xế</h1>
          <p>Duyệt các khoản tài xế khai dọc đường, đối chiếu với biên lai và định mức. Điều phối không có quyền duyệt tiền.</p>
        </div>
        <div className="card">
          <div className="tabs">
            {TABS.map(([key, label]) => <button key={key} className={`tab ${key === tab ? 'active' : ''}`} onClick={() => setTab(key)}>{label}<span className="count">{pendingOf(key)}</span></button>)}
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Mã</th><th>Chuyến · Đơn</th><th>Tài xế</th><th>Loại phí</th><th className="text-right">Số tiền</th><th>Biên lai</th><th>Trạng thái</th><th /></tr></thead>
              <tbody>
                {list.length ? list.map(e => {
                  const quota = EXPENSE_QUOTA[e.type]
                  const over = !e.billable && quota !== undefined && e.amountVnd > quota
                  return (
                    <tr key={e.id}>
                      <td className="nowrap">{e.id}<div className="sub-text">{formatDateTime(e.time)}</div></td>
                      <td>{e.tripId}<div className="sub-text">{e.orderId}</div></td>
                      <td>{driver(e.driverId)}</td>
                      <td className="font-semibold">{e.type}{e.note && <div className="sub-text">{e.note}</div>}</td>
                      <td className="text-right nowrap">
                        <span className={over ? 'text-red font-semibold' : ''}>{formatVND(e.amountVnd)}</span>
                        {e.currency !== 'VND' && <div className="sub-text">{e.amount.toLocaleString('vi-VN')} {e.currency}</div>}
                        {over && <div className="small text-red"><i className="fa-solid fa-triangle-exclamation" /> Vượt định mức {formatVND(quota)}</div>}
                      </td>
                      <td><span className="small"><i className="fa-regular fa-image" /> {e.receipt}</span></td>
                      <td><span className={`badge ${STATUS[e.status][0]}`}>{STATUS[e.status][1]}</span>{e.rejectReason && <div className="sub-text">{e.rejectReason}</div>}{e.decidedBy && <div className="sub-text">{e.decidedBy} · {formatDateTime(e.decidedAt!)}</div>}</td>
                      <td className="text-right nowrap">{e.status === 'pending' && <>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setInvalid(false); setReason(''); setRejecting(e) }}>Từ chối</button>{' '}
                        <button className="btn btn-primary btn-sm" onClick={() => approve(e)}>Duyệt</button>
                      </>}</td>
                    </tr>
                  )
                }) : <tr><td colSpan={8} className="text-center text-muted" style={{ padding: 24 }}>Chưa có khoản nào</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {rejecting && (
        <Modal title={`Từ chối ${rejecting.type} ${formatVND(rejecting.amountVnd)}`} onClose={() => setRejecting(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setRejecting(null)}>Hủy</button><button className="btn btn-danger" onClick={reject}>Xác nhận từ chối</button></>}>
          <div className="form-group"><label className="required">Yêu cầu tài xế giải trình</label><textarea rows={3} className={`form-control ${invalid ? 'invalid' : ''}`} value={reason} onChange={e => { setInvalid(false); setReason(e.target.value) }} placeholder="Ví dụ: Số tiền vượt định mức, biên lai không rõ. Vui lòng chụp lại." /></div>
        </Modal>
      )}
    </div>
  )
}
