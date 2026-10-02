// Đồng hồ cho các bộ đếm thời gian chờ của tài xế (tự cập nhật mỗi 30 giây)
import { useEffect, useState } from 'react'
import { HOUR } from '@shared/config/business-rules'

export function useNow() {
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id) }, [])
  return now
}

export const elapsedText = (ms: number) => { const m = Math.max(0, Math.floor(ms / 60000)); return `${Math.floor(m / 60)} giờ ${m % 60} phút` }
export const startedHours = (ms: number) => Math.max(1, Math.ceil(ms / HOUR)) // tính phí theo block giờ, bắt đầu là 1 giờ
