// Khung thêm / sửa hồ sơ ngựa. Dùng ở trang Hồ sơ ngựa và bước chọn ngựa khi đặt đơn.
import { useState } from 'react'
import { useAuth } from '@shared/auth/AuthContext'
import { HORSE_SEXES, horsesApi, type HorseProfile } from '@shared/services/horses'
import { Modal } from '@shared/ui/Modal'
import s from './Horses.module.css'

const BREEDS = ['Thoroughbred', 'Arabian', 'Quarter Horse', 'Warmblood', 'Appaloosa', 'Khác']
const THIS_YEAR = new Date().getFullYear()

type Form = { name: string; chip: string; breed: string; sex: string; color: string; birthYear: string; marks: string; passportFile: string; vaccineFile: string }

function FileField({ label, hint, value, onChange, onView }: { label: string; hint: string; value: string; onChange: (name: string) => void; onView: () => void }) {
  return (
    <div className="form-group">
      <div className={s.fileHead}>
        <label>{label}</label>
        {value && <button type="button" className={s.docView} onClick={onView}><i className="fa-regular fa-eye" /> Xem</button>}
      </div>
      <label className={s.file}>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => e.target.files?.[0] && onChange(e.target.files[0].name)} />
        {value
          ? <span className={s.fileOk}><i className="fa-solid fa-file-circle-check" /> {value} <span className={s.fileChange}>Đổi tệp</span></span>
          : <span><i className="fa-solid fa-cloud-arrow-up" /> Chọn tệp PDF / JPG / PNG</span>}
      </label>
      <div className="form-hint">{hint}</div>
    </div>
  )
}

export function HorseForm({ horse, onClose, onSaved }: { horse?: HorseProfile; onClose: () => void; onSaved: (h: HorseProfile) => void }) {
  const { session } = useAuth()
  const [f, setF] = useState<Form>({
    name: horse?.name ?? '', chip: horse?.chip ?? '', breed: horse?.breed ?? '', sex: horse?.sex ?? '', color: horse?.color ?? '',
    birthYear: horse ? String(horse.birthYear) : '', marks: horse?.marks ?? '', passportFile: horse?.passportFile ?? '', vaccineFile: horse?.vaccineFile ?? '',
  })
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState('')
  const [doc, setDoc] = useState<{ title: string; file: string } | null>(null)
  const set = (k: keyof Form) => (v: string) => { setError(''); setF({ ...f, [k]: v }) }
  const year = Number(f.birthYear)
  const missing = (k: keyof Form) => touched && !f[k].trim()
  const yearBad = touched && (!Number.isInteger(year) || year < THIS_YEAR - 30 || year > THIS_YEAR)

  const save = async () => {
    setTouched(true)
    if (['name', 'chip', 'breed', 'sex', 'color'].some(k => !f[k as keyof Form].trim()) || !Number.isInteger(year) || year < THIS_YEAR - 30 || year > THIS_YEAR) return
    const data = { name: f.name.trim(), breed: f.breed, sex: f.sex, color: f.color.trim(), birthYear: year, marks: f.marks.trim(), passportFile: f.passportFile, vaccineFile: f.vaccineFile }
    try {
      onSaved(horse ? await horsesApi.update(session!.name, horse.id, data) : await horsesApi.create(session!.name, { ...data, chip: f.chip.trim() }))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <>
      <Modal wide title={horse ? `Sửa hồ sơ ${horse.name}` : 'Thêm ngựa mới'} subtitle="Khai một lần, lần sau đặt đơn chỉ cần chọn ngựa" onClose={onClose}
        footer={<><button className="btn btn-ghost" onClick={onClose}>Hủy</button><button className="btn btn-primary" onClick={save}><i className="fa-solid fa-check" /> Lưu hồ sơ</button></>}>
        {error && <div className="alert alert-danger" style={{ marginBottom: 12 }}><i className="fa-solid fa-circle-exclamation" /><div>{error}</div></div>}
        <div className={s.formGrid}>
          <div className="form-group"><label className="required">Tên ngựa</label><input className={`form-control ${missing('name') ? 'invalid' : ''}`} value={f.name} onChange={e => set('name')(e.target.value)} placeholder="Tên đăng ký thi đấu" /></div>
          <div className="form-group">
            <label className="required">Mã microchip</label>
            <input className={`form-control ${missing('chip') ? 'invalid' : ''}`} value={f.chip} disabled={!!horse} onChange={e => set('chip')(e.target.value)} placeholder="VD: VN-985215" />
            <div className="form-hint">Mã định danh của ngựa, dùng để đối chiếu giấy tờ. Không sửa được sau khi lưu.</div>
          </div>
          <div className="form-group"><label className="required">Giống</label>
            <select className={`form-control ${missing('breed') ? 'invalid' : ''}`} value={f.breed} onChange={e => set('breed')(e.target.value)}><option value="">— Chọn giống —</option>{BREEDS.map(b => <option key={b}>{b}</option>)}</select></div>
          <div className="form-group">
            <label className="required">Giới tính</label>
            <div className={`${s.segment} ${missing('sex') ? s.segmentBad : ''}`} role="radiogroup">
              {HORSE_SEXES.map(x => <button key={x} type="button" role="radio" aria-checked={f.sex === x} className={f.sex === x ? s.on : ''} onClick={() => set('sex')(x)}>{x}</button>)}
            </div>
            <div className="form-hint">Dùng để xếp khoang: ngựa đực cần khoang riêng.</div>
          </div>
          <div className="form-group"><label className="required">Màu lông</label><input className={`form-control ${missing('color') ? 'invalid' : ''}`} value={f.color} onChange={e => set('color')(e.target.value)} placeholder="VD: Nâu đỏ" /></div>
          <div className="form-group"><label className="required">Năm sinh</label><input className={`form-control ${yearBad ? 'invalid' : ''}`} type="number" min={THIS_YEAR - 30} max={THIS_YEAR} value={f.birthYear} onChange={e => set('birthYear')(e.target.value)} placeholder={String(THIS_YEAR - 5)} /></div>
        </div>
        <div className="form-group"><label>Đặc điểm nhận dạng</label><input className="form-control" value={f.marks} onChange={e => set('marks')(e.target.value)} placeholder="VD: Sao trắng trán, tất trắng chân sau" /></div>
        <div className={s.formGrid}>
          <FileField label="Hộ chiếu ngựa (bản scan)" hint="Trang có mã microchip và ảnh nhận dạng." value={f.passportFile} onChange={set('passportFile')}
            onView={() => setDoc({ title: `Hộ chiếu ngựa${f.name ? ` · ${f.name}` : ''}`, file: f.passportFile })} />
          <FileField label="Sổ tiêm phòng (bản scan)" hint="Có mũi cúm ngựa trong 6 tháng gần nhất." value={f.vaccineFile} onChange={set('vaccineFile')}
            onView={() => setDoc({ title: `Sổ tiêm phòng${f.name ? ` · ${f.name}` : ''}`, file: f.vaccineFile })} />
        </div>
        {(!f.passportFile || !f.vaccineFile) && <p className="form-hint"><i className="fa-solid fa-circle-info" /> Vẫn lưu được khi thiếu giấy, nhưng ngựa chỉ chọn được khi đặt đơn sau khi có đủ hộ chiếu và sổ tiêm.</p>}
      </Modal>
      {doc && (
        <Modal title={doc.title} onClose={() => setDoc(null)} footer={<button className="btn btn-ghost" onClick={() => setDoc(null)}>Đóng</button>}>
          <div className={s.docPreview}><i className="fa-regular fa-file-pdf" /><div>{doc.file}</div><div className="sub-text">Bản xem trước tài liệu</div></div>
        </Modal>
      )}
    </>
  )
}
