'use client'

import { useEffect, useRef, useState } from 'react'
import { Canvas, FabricImage, FabricText, Circle } from 'fabric'
import type { Surface } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Props = {
  imageUrl: string
  surfaces: Surface[]
  onChange: (surfaces: Surface[]) => void
}

export default function FloorPlanAnnotator({ imageUrl, surfaces, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  // map surfaceId → [dot, label] fabric objects
  const objectMapRef = useRef<Map<string, [Circle, FabricText]>>(new Map())
  const [newLabel, setNewLabel] = useState('')
  const [newType, setNewType] = useState<Surface['type']>('wall')

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = new Canvas(canvasRef.current, { width: 600, height: 400 })
    fabricRef.current = canvas

    FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((img) => {
      const scale = 600 / img.width!
      const scaledHeight = img.height! * scale
      img.set({ left: 0, top: 0, originX: 'left', originY: 'top' })
      img.scale(scale)
      try { canvas.setDimensions({ width: 600, height: scaledHeight }) } catch { /* fabric init race */ }
      canvas.backgroundImage = img
      canvas.renderAll()
    }).catch((err) => console.error('[FloorPlan] image load failed:', err))

    return () => {
      canvas.dispose()
      objectMapRef.current.clear()
    }
  }, [imageUrl])

  function addSurface() {
    if (!newLabel.trim() || !fabricRef.current) return
    const id = crypto.randomUUID()
    const canvas = fabricRef.current

    const dot = new Circle({ radius: 10, fill: '#3b82f6', left: 100, top: 100, selectable: true, hasControls: false, hasBorders: false })
    const label = new FabricText(newLabel.trim(), { left: 115, top: 93, fontSize: 14, fill: '#1e3a5f', selectable: false })

    objectMapRef.current.set(id, [dot, label])
    canvas.add(dot, label)
    canvas.renderAll()

    onChange([...surfaces, { id, label: newLabel.trim(), type: newType }])
    setNewLabel('')
  }

  function removeSurface(id: string) {
    const canvas = fabricRef.current
    if (!canvas) return
    const pair = objectMapRef.current.get(id)
    if (pair) {
      canvas.remove(pair[0], pair[1])
      objectMapRef.current.delete(id)
      canvas.renderAll()
    }
    onChange(surfaces.filter((s) => s.id !== id))
  }

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="border rounded" />
      <div className="flex gap-2 items-center">
        <Input
          placeholder="Label (e.g. Wall 1)"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
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
      <ul className="text-sm text-muted-foreground space-y-1">
        {surfaces.map((s) => (
          <li key={s.id} className="flex items-center gap-2">
            <span>{s.label} ({s.type})</span>
            <button onClick={() => removeSurface(s.id)} className="text-destructive text-xs underline">remove</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
