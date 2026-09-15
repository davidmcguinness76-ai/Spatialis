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
  const [newLabel, setNewLabel] = useState('')
  const [newType, setNewType] = useState<Surface['type']>('wall')

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = new Canvas(canvasRef.current, { width: 600, height: 400 })
    fabricRef.current = canvas

    FabricImage.fromURL(imageUrl).then((img) => {
      const scale = 600 / img.width!
      img.scale(scale)
      canvas.height = img.height! * scale
      canvas.backgroundImage = img
      canvas.renderAll()
    })

    return () => {
      canvas.dispose()
    }
  }, [imageUrl])

  function addSurface() {
    if (!newLabel.trim() || !fabricRef.current) return
    const id = crypto.randomUUID()
    const canvas = fabricRef.current

    const dot = new Circle({ radius: 10, fill: '#3b82f6', left: 100, top: 100, selectable: true })
    const text = new FabricText(newLabel, { left: 115, top: 93, fontSize: 14, fill: '#1e3a5f', selectable: false })

    canvas.add(dot, text)
    canvas.renderAll()

    const updated = [...surfaces, { id, label: newLabel.trim(), type: newType }]
    onChange(updated)
    setNewLabel('')
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
          <li key={s.id}>{s.label} ({s.type})</li>
        ))}
      </ul>
    </div>
  )
}
