'use client'

import { useEffect, useRef, useState } from 'react'
import type { Surface } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Props = {
  imageUrl: string
  surfaces: Surface[]
  onChange: (surfaces: Surface[]) => void
}

export default function FloorPlanAnnotator({ imageUrl, surfaces, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [imgSize, setImgSize] = useState({ w: 600, h: 400 })
  const [newLabel, setNewLabel] = useState('')
  const [newType, setNewType] = useState<Surface['type']>('wall')
  const surfacesRef = useRef(surfaces)
  useEffect(() => { surfacesRef.current = surfaces }, [surfaces])

  function onImgLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget
    const scale = 600 / img.naturalWidth
    setImgSize({ w: 600, h: Math.round(img.naturalHeight * scale) })
  }

  function addSurface() {
    if (!newLabel.trim()) return
    const id = crypto.randomUUID()
    onChange([...surfacesRef.current, { id, label: newLabel.trim(), type: newType, x: 80, y: 80 }])
    setNewLabel('')
  }

  function removeSurface(id: string) {
    onChange(surfacesRef.current.filter((s) => s.id !== id))
  }

  function startDrag(e: React.PointerEvent, id: string) {
    e.preventDefault()
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)

    const container = containerRef.current!.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const surface = surfacesRef.current.find((s) => s.id === id)!
    const origX = surface.x ?? 80
    const origY = surface.y ?? 80

    function onMove(ev: PointerEvent) {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      const newX = Math.max(0, Math.min(imgSize.w - 14, origX + dx))
      const newY = Math.max(0, Math.min(imgSize.h - 14, origY + dy))
      onChange(surfacesRef.current.map((s) => s.id === id ? { ...s, x: newX, y: newY } : s))
    }

    function onUp() {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
  }

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="relative border rounded overflow-hidden" style={{ width: 600, height: imgSize.h }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="floor plan" width={600} onLoad={onImgLoad} className="absolute inset-0" />
        {surfaces.map((s) => (
          <div
            key={s.id}
            onPointerDown={(e) => startDrag(e, s.id)}
            className="absolute flex items-center gap-1 cursor-grab active:cursor-grabbing select-none"
            style={{ left: s.x ?? 80, top: s.y ?? 80, touchAction: 'none' }}
          >
            <div className="w-5 h-5 rounded-full bg-blue-500 shrink-0" />
            <span className="text-xs font-medium text-blue-900 bg-white/80 px-1 rounded">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 items-center">
        <Input
          placeholder="Label (e.g. Wall 1)"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addSurface()}
          className="w-40"
        />
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value as Surface['type'])}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="wall">Wall</option>
          <option value="floor">Floor</option>
          <option value="ceiling">Ceiling</option>
          <option value="bath">Bath</option>
          <option value="shower">Shower</option>
          <option value="sink">Sink</option>
          <option value="toilet">Toilet</option>
        </select>
        <Button onClick={addSurface} size="sm">Add Surface</Button>
      </div>

      <ul className="text-sm space-y-1">
        {surfaces.map((s) => (
          <li key={s.id} className="flex items-center gap-2">
            <span className="text-muted-foreground">● {s.label} ({s.type})</span>
            <button onClick={() => removeSurface(s.id)} className="text-destructive text-xs underline">remove</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
