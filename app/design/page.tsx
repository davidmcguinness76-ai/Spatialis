'use client'

import { useEffect, useState } from 'react'
import { getProject, getDesign, saveDesign } from '@/lib/storage'
import type { Design, SurfaceLayer, Surface } from '@/lib/types'
import SurfaceCard from '@/components/SurfaceCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

function defaultLayer(surfaceId: string): SurfaceLayer {
  return {
    surfaceId,
    materials: [{
      material: { type: 'tile', photoUrl: '', dimensions: { w: 0, h: 0 }, label: '' },
    }],
  }
}

export default function DesignPage() {
  const [design, setDesign] = useState<Design | null>(null)
  const [surfaces, setSurfaces] = useState<Surface[]>([])
  const [roomDimensions, setRoomDimensions] = useState({ length: 0, width: 0, height: 0 })

  useEffect(() => {
    const project = getProject()
    if (project) {
      const room = project.rooms[0]
      setSurfaces(room.floorPlan.surfaces)
      setRoomDimensions(room.dimensions)
    }
    const saved = getDesign()
    setDesign(saved ?? {
      id: crypto.randomUUID(),
      name: 'Design 1',
      layers: [],
      fixtureNotes: '',
    })
  }, [])

  if (!design) return null

  function updateLayer(layer: SurfaceLayer) {
    const layers = design!.layers.filter((l) => l.surfaceId !== layer.surfaceId).concat(layer)
    const updated = { ...design!, layers }
    setDesign(updated)
    saveDesign(updated)
  }

  function updateNotes(fixtureNotes: string) {
    const updated = { ...design!, fixtureNotes }
    setDesign(updated)
    saveDesign(updated)
  }

  if (surfaces.length === 0) {
    return <p className="text-muted-foreground">No surfaces defined yet. Add them on the Room page first.</p>
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Design Palette</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {surfaces.map((surface) => {
          const layer = design.layers.find((l) => l.surfaceId === surface.id) ?? defaultLayer(surface.id)
          return (
            <SurfaceCard
              key={surface.id}
              surface={surface}
              layer={layer}
              roomDimensions={roomDimensions}
              onChange={updateLayer}
            />
          )
        })}
      </div>
      <Separator />
      <div className="space-y-2">
        <Label>Fixture notes</Label>
        <Input
          placeholder="e.g. replace bath with walk-in shower, new basin TBC"
          value={design.fixtureNotes}
          onChange={(e) => updateNotes(e.target.value)}
        />
      </div>
    </div>
  )
}
