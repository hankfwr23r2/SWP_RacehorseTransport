// Hồ sơ ngựa: khách khai ngựa một lần (microchip, giới tính, hộ chiếu, sổ tiêm); khi đặt đơn chỉ cần tick chọn ngựa.
import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@shared/auth/AuthContext'
import { hasDocs, horsesApi, type HorseProfile } from '@shared/services/horses'
import { customerOrdersApi } from '@shared/services/orders'
import { useLoad } from '@shared/services/useLoad'
import { Modal } from '@shared/ui/Modal'
import { useToast } from '@shared/ui/toast'
import { HorseForm } from './HorseForm'
import s from './Horses.module.css'

function DocLine({ label, file, onView }: { label: string; file: string; onView: () => void }) {
  return file
    ? <li className={s.docOk}><i className="fa-solid fa-circle-check" /> {label} <button type="button" className={s.docView} onClick={onView}>Xem</button></li>
    : <li className={s.docMissing}><i className="fa-solid fa-circle-exclamation" /> Thiếu {label.toLowerCase()}</li>
}

export default function HorsesPage() {
  const toast = useToast()
  const { session } = useAuth()
  const { data: horses, reload } = useLoad(() => horsesApi.list(session!.name), [session?.name])
  const { data: orders = [] } = useLoad(() => customerOrdersApi.list(session!.name), [session?.name])
  const [editing, setEditing] = useState<HorseProfile | 'new' | null>(null)
  const [doc, setDoc] = useState<{ title: string; file: string } | null>(null)
  if (!horses) return null

  const trips = (chip: string) => orders.filter(o => o.horses.some(h => h.chip === chip)).length
  const missing = horses.filter(h => !hasDocs(h)).length

  return (
    <div className="page">
      <div className="wrap">
        <div className="breadcrumb"><Link to="/portal">Cổng Khách hàng</Link> / <span className="text-orange font-semibold">Hồ sơ ngựa</span></div>
        <div className={s.head}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <h1>Hồ sơ ngựa</h1>
            <p>Khai ngựa một lần. Khi đặt đơn, bạn chỉ cần chọn ngựa, hộ chiếu và sổ tiêm tự gắn vào đơn.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setEditing('new')}><i className="fa-solid fa-plus" /> Thêm ngựa</button>
        </div>

        {missing > 0 && <div className="alert alert-warning" style={{ marginBottom: 16 }}><i className="fa-solid fa-triangle-exclamation" /><div>{missing} ngựa còn thiếu giấy tờ, chưa chọn được khi đặt đơn. Bấm "Sửa" để tải bổ sung.</div></div>}

        {horses.length ? (
          <div className={s.grid}>
            {horses.map(h => (
              <article key={h.id} className={s.card}>
                <div className={s.cardTop}>
                  <span className={s.avatar} aria-hidden="true"><i className="fa-solid fa-horse-head" /></span>
                  <div className={s.cardTitle}>
                    <h3>{h.name}</h3>
                    <div className={s.subRow}>
                      <span className={s.chip}>{h.chip}</span>
                      {hasDocs(h) ? <span className="badge badge-success">Sẵn sàng đặt</span> : <span className="badge badge-warning">Thiếu giấy</span>}
                    </div>
                  </div>
                </div>
                <dl className={s.facts}>
                  <div><dt>Giống</dt><dd>{h.breed}</dd></div>
                  <div><dt>Giới tính</dt><dd>{h.sex}</dd></div>
                  <div><dt>Năm sinh</dt><dd>{h.birthYear}</dd></div>
                  <div><dt>Màu lông</dt><dd>{h.color}</dd></div>
                </dl>
                {h.marks && <p className={s.marks}>{h.marks}</p>}
                <ul className={s.docs}>
                  <DocLine label="Hộ chiếu ngựa" file={h.passportFile} onView={() => setDoc({ title: `Hộ chiếu ngựa · ${h.name}`, file: h.passportFile })} />
                  <DocLine label="Sổ tiêm phòng" file={h.vaccineFile} onView={() => setDoc({ title: `Sổ tiêm phòng · ${h.name}`, file: h.vaccineFile })} />
                </ul>
                <div className={s.cardFoot}>
                  <span className="text-muted small">{trips(h.chip!) ? `Đã có ${trips(h.chip!)} đơn` : 'Chưa có đơn nào'}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(h)}><i className="fa-solid fa-pen" /> Sửa</button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={`card ${s.empty}`}>
            <i className="fa-solid fa-horse" />
            <p>Bạn chưa khai ngựa nào.</p>
            <button className="btn btn-primary" onClick={() => setEditing('new')}><i className="fa-solid fa-plus" /> Thêm ngựa đầu tiên</button>
          </div>
        )}
      </div>
      {doc && (
        <Modal title={doc.title} onClose={() => setDoc(null)} footer={<button className="btn btn-ghost" onClick={() => setDoc(null)}>Đóng</button>}>
          <div className={s.docPreview}><i className="fa-regular fa-file-pdf" /><div>{doc.file}</div><div className="sub-text">Bản xem trước tài liệu</div></div>
        </Modal>
      )}
      {editing && (
        <HorseForm horse={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)}
          onSaved={h => { setEditing(null); reload(); toast(editing === 'new' ? `Đã thêm ${h.name} vào hồ sơ` : `Đã cập nhật hồ sơ ${h.name}`) }} />
      )}
    </div>
  )
}
