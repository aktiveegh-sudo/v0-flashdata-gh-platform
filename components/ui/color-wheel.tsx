'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface ColorWheelProps {
  color: string
  onChange: (hex: string) => void
  size?: number
}

// Convert hex → hsv
function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min

  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max

  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }

  return { h: h * 360, s, v }
}

// Convert hsv → hex
function hsvToHex(h: number, s: number, v: number): string {
  const i = Math.floor(h / 60) % 6
  const f = h / 60 - Math.floor(h / 60)
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)

  let r = 0; let g = 0; let b = 0
  if (i === 0) { r = v; g = t; b = p }
  else if (i === 1) { r = q; g = v; b = p }
  else if (i === 2) { r = p; g = v; b = t }
  else if (i === 3) { r = p; g = q; b = v }
  else if (i === 4) { r = t; g = p; b = v }
  else { r = v; g = p; b = q }

  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function hsvToRgb(h: number, s: number, v: number) {
  const i = Math.floor(h / 60) % 6
  const f = h / 60 - Math.floor(h / 60)
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  if (i === 0) return [v, t, p]
  if (i === 1) return [q, v, p]
  if (i === 2) return [p, v, t]
  if (i === 3) return [p, q, v]
  if (i === 4) return [t, p, v]
  return [v, p, q]
}

export function ColorWheel({ color, onChange, size = 220 }: ColorWheelProps) {
  const wheelRef = useRef<HTMLCanvasElement>(null)
  const stripRef = useRef<HTMLCanvasElement>(null)
  const isDraggingWheel = useRef(false)
  const isDraggingStrip = useRef(false)

  const safeHex = /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#0ea5e9'
  const [hsv, setHsv] = useState(() => hexToHsv(safeHex))

  // Sync external color changes
  useEffect(() => {
    if (/^#[0-9a-fA-F]{6}$/.test(color)) {
      setHsv(hexToHsv(color))
    }
  }, [color])

  const radius = size / 2
  const innerRadius = radius - 28 // thickness of ring

  // Draw the colour wheel
  useEffect(() => {
    const canvas = wheelRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, size, size)

    for (let angle = 0; angle < 360; angle++) {
      const startAngle = ((angle - 1) * Math.PI) / 180
      const endAngle = ((angle + 1) * Math.PI) / 180

      const gradient = ctx.createRadialGradient(radius, radius, innerRadius, radius, radius, radius)
      const [r, g, b] = hsvToRgb(angle, 1, 1)
      gradient.addColorStop(0, `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},1)`)
      gradient.addColorStop(1, `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},0)`)

      ctx.beginPath()
      ctx.moveTo(radius, radius)
      ctx.arc(radius, radius, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = gradient
      ctx.fill()
    }

    // White overlay for saturation
    const whiteGrad = ctx.createRadialGradient(radius, radius, innerRadius, radius, radius, radius)
    whiteGrad.addColorStop(0, 'rgba(255,255,255,1)')
    whiteGrad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.beginPath()
    ctx.arc(radius, radius, radius, 0, 2 * Math.PI)
    ctx.fillStyle = whiteGrad
    ctx.fill()

    // Clear centre hole
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(radius, radius, innerRadius, 0, 2 * Math.PI)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'

    // Draw thumb
    const thumbAngle = (hsv.h * Math.PI) / 180
    const thumbRadius = innerRadius + (radius - innerRadius) * hsv.s
    const tx = radius + Math.cos(thumbAngle) * thumbRadius
    const ty = radius + Math.sin(thumbAngle) * thumbRadius

    ctx.beginPath()
    ctx.arc(tx, ty, 9, 0, 2 * Math.PI)
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(tx, ty, 7, 0, 2 * Math.PI)
    ctx.fillStyle = hsvToHex(hsv.h, hsv.s, hsv.v)
    ctx.fill()
  }, [hsv, size, radius, innerRadius])

  // Draw brightness strip
  useEffect(() => {
    const canvas = stripRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    const gradient = ctx.createLinearGradient(0, 0, 0, h)
    gradient.addColorStop(0, hsvToHex(hsv.h, hsv.s, 1))
    gradient.addColorStop(1, '#000000')
    ctx.fillStyle = gradient
    ctx.roundRect(0, 0, w, h, 6)
    ctx.fill()

    // Thumb
    const ty = (1 - hsv.v) * h
    ctx.beginPath()
    ctx.arc(w / 2, ty, 8, 0, 2 * Math.PI)
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2.5
    ctx.stroke()
  }, [hsv])

  const getWheelHsv = useCallback((cx: number, cy: number) => {
    const canvas = wheelRef.current!
    const rect = canvas.getBoundingClientRect()
    const x = cx - rect.left - radius
    const y = cy - rect.top - radius
    const dist = Math.sqrt(x * x + y * y)
    if (dist > radius) return null

    let angle = (Math.atan2(y, x) * 180) / Math.PI
    if (angle < 0) angle += 360
    const s = Math.min(dist / radius, 1)
    return { h: angle, s }
  }, [radius])

  const getStripV = useCallback((cy: number) => {
    const canvas = stripRef.current!
    const rect = canvas.getBoundingClientRect()
    const y = cy - rect.top
    return 1 - Math.max(0, Math.min(1, y / rect.height))
  }, [])

  const handleWheelPointer = useCallback((cx: number, cy: number) => {
    const result = getWheelHsv(cx, cy)
    if (!result) return
    const newHsv = { ...hsv, h: result.h, s: result.s }
    setHsv(newHsv)
    onChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v))
  }, [hsv, getWheelHsv, onChange])

  const handleStripPointer = useCallback((cy: number) => {
    const v = getStripV(cy)
    const newHsv = { ...hsv, v }
    setHsv(newHsv)
    onChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v))
  }, [hsv, getStripV, onChange])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (isDraggingWheel.current) handleWheelPointer(e.clientX, e.clientY)
      if (isDraggingStrip.current) handleStripPointer(e.clientY)
    }
    const onUp = () => { isDraggingWheel.current = false; isDraggingStrip.current = false }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) }
  }, [handleWheelPointer, handleStripPointer])

  return (
    <div className="flex items-center gap-3">
      <canvas
        ref={wheelRef}
        width={size}
        height={size}
        className="cursor-crosshair touch-none"
        onPointerDown={(e) => { isDraggingWheel.current = true; handleWheelPointer(e.clientX, e.clientY) }}
      />
      <canvas
        ref={stripRef}
        width={24}
        height={size}
        className="cursor-ns-resize touch-none rounded-md"
        onPointerDown={(e) => { isDraggingStrip.current = true; handleStripPointer(e.clientY) }}
      />
    </div>
  )
}
