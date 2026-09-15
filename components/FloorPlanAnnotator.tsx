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
  const objectMapRef = useRef<Map<string, [Circle, FabricText]>>(new Map())
  const surfacesRef = useRef(surfaces)
  const [newLabel, setNewLabel] = useState('')
  const [newType, setNewType] = useState<Surface['type']>('wall')

  // keep surfacesRef in sync so the move handler closure sees latest
  useEffect(() => { surfacesRef.current = surfaces }, [surfaces])

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = new Canvas(canvasRef.current, { width: 600, height: 400, selection: false, perPixelTargetFind: false })
    fabricRef.current = canvas

    FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((img) => {
      const scale = 600 / img.width!
      const scaledHeight = img.height! * scale
      img.set({ left: 0, top: 0, originX: 'left', originY: 'top' })
      img.scale(scale)
      try { canvas.setDimensions({ width: 600, height: scaledHeight }) } catch { /* fabric init race */ }
      canvas.backgroundImage = img

      // Restore existing surface dots
      surfacesRef.current.forEach((s) => {
        const x = s.x ?? 100
        const y = s.y ?? 100
        placeDot(canvas, s.id, s.label, x, y)
      })

      canvas.renderAll()
    }).catch((err) => console.error('[FloorPlan] image load failed:', err))

    return () => {
      canvas.dispose()
      objectMapRef.current.clear()
    }
  }, [imageUrl])

  function placeDot(canvas: Canvas, id: string, label: string, x: number, y: number) {
    const dot = new Circle({
      radius: 14, fill: '#3b82f6', left: x, top: y,
      selectable: true, hasControls: false, hasBorders: false,
      lockScalingX: true, lockScalingY: true, lockRotation: true,
    })
    const txt = new FabricText(label, {
      left: x + 14, top: y - 6, fontSize: 13, fill: '#1e3a5f', selectable: false,
    })
    objectMapRef.current.set(id, [dot, txt])
    canvas.add(dot, txt)

    dot.on('moving', () => {
      txt.set({ left: dot.left! + 14, top: dot.top! - 6 })
      canvas.renderAll()
      // Save position back
      const updated = surfacesRef.current.map((s) =>
        s.id === id ? { ...s, x: dot.left!, y: dot.top! } : s
      )
      onChange(updated)
    })
  }

  function addSurface() {
    if (!newLabel.trim() || !fabricRef.current) return
    const id = crypto.randomUUID()
    const canvas = fabricRef.current
    placeDot(canvas, id, newLabel.trim(), 100, 100)
    canvas.renderAll()
    onChange([...surfacesRef.current, { id, label: newLabel.trim(), type: newType, x: 100, y: 100 }])
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
    onChange(surfacesRef.current.filter((s) => s.id !== id))
  }

  function selectDot(id: string) {
    const canvas = fabricRef.current
    if (!canvas) return
    const pair = objectMapRef.current.get(id)
    if (pair) {
      canvas.setActiveObject(pair[0])
      canvas.renderAll()
    }
  }

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="border rounded" />
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
            <button onClick={() => selectDot(s.id)} className="text-muted-foreground hover:text-foreground">
              ● {s.label} ({s.type})
            </button>
            <button onClick={() => removeSurface(s.id)} className="text-destructive text-xs underline">remove</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
