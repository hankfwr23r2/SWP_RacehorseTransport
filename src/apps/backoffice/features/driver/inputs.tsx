// Ô chụp ảnh (mở camera sau trên điện thoại) và khung ký tên điện tử của tài xế / khách / người nhận.
import { useEffect, useRef, useState } from 'react'
import { cx } from '../../shared/parts'
import s from './Driver.module.css'

export function PhotoInput({ label, value, onChange }: { label: string; value: string; onChange: (file: string) => void }) {
  return (
    <label className={cx(s.photo, value && s.photoOk)}>
      <input type="file" accept="image/*" capture="environment" onChange={e => e.target.files?.[0] && onChange(e.target.files[0].name)} />
      <i className={`fa-solid ${value ? 'fa-circle-check' : 'fa-camera'}`} />
      <span className={s.photoText}>
        <span className={s.photoLabel}>{label}</span>
        <span className={s.photoSub}>{value || 'Chạm để chụp ảnh'}</span>
      </span>
    </label>
  )
}

export function SignaturePad({ onChange }: { onChange: (dataUrl: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [empty, setEmpty] = useState(true)

  useEffect(() => {
    const c = canvas.current!
    const ratio = window.devicePixelRatio || 1
    c.width = c.offsetWidth * ratio
    c.height = c.offsetHeight * ratio
    const ctx = c.getContext('2d')!
    ctx.scale(ratio, ratio)
    Object.assign(ctx, { lineWidth: 2.4, lineCap: 'round', lineJoin: 'round', strokeStyle: '#0f172a' })
  }, [])

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as const }
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    const ctx = e.currentTarget.getContext('2d')!
    ctx.beginPath()
    ctx.moveTo(...point(e))
  }
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const ctx = e.currentTarget.getContext('2d')!
    ctx.lineTo(...point(e))
    ctx.stroke()
  }
  const up = () => {
    if (!drawing.current) return
    drawing.current = false
    setEmpty(false)
    onChange(canvas.current!.toDataURL())
  }
  const clear = () => {
    const c = canvas.current!
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    setEmpty(true)
    onChange('')
  }

  return (
    <div className={s.sign}>
      <canvas ref={canvas} aria-label="Khung ký tên" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
      {empty && <span className={s.signHint}>Ký tên vào đây</span>}
      {!empty && <button type="button" className={s.signClear} onClick={clear}><i className="fa-solid fa-rotate-left" /> Ký lại</button>}
    </div>
  )
}
