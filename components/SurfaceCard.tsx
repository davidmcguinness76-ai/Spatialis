'use client'

import { useState } from 'react'
import type { Surface, SurfaceLayer, Material } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import TileCalculator from './TileCalculator'

type TileMaterial = Extract<Material, { type: 'tile' }>
type PaintMaterial = Extract<Material, { type: 'paint' }>

type Props = {
  surface: Surface
  layer: SurfaceLayer
  roomDimensions: { length: number; width: number; height: number }
  onChange: (layer: SurfaceLayer) => void
}

export default function SurfaceCard({ surface, layer, roomDimensions, onChange }: Props) {
  const [matType, setMatType] = useState<'tile' | 'paint'>(
    (layer.materials[0]?.material.type as 'tile' | 'paint') ?? 'tile'
  )

  const defaultMaterial: Material =
    matType === 'tile'
      ? { type: 'tile', photoUrl: '', dimensions: { w: 0, h: 0 }, label: '' }
      : { type: 'paint', colour: '#ffffff', finish: 'matt', label: '' }

  const entry = layer.materials[0] ?? { material: defaultMaterial }

  function updateTileMaterial(patch: Partial<TileMaterial>) {
    const base: TileMaterial =
      entry.material.type === 'tile'
        ? entry.material
        : { type: 'tile', photoUrl: '', dimensions: { w: 0, h: 0 }, label: '' }
    const updated: SurfaceLayer = {
      ...layer,
      materials: [{ ...entry, material: { ...base, ...patch } }],
    }
    onChange(updated)
  }

  function updatePaintMaterial(patch: Partial<PaintMaterial>) {
    const base: PaintMaterial =
      entry.material.type === 'paint'
        ? entry.material
        : { type: 'paint', colour: '#ffffff', finish: 'matt', label: '' }
    const updated: SurfaceLayer = {
      ...layer,
      materials: [{ ...entry, material: { ...base, ...patch } }],
    }
    onChange(updated)
  }

  function updateSplit(field: 'aboveMm' | 'belowMm', val: string) {
    const updated: SurfaceLayer = {
      ...layer,
      materials: [{ ...entry, [field]: val ? Number(val) : undefined }],
    }
    onChange(updated)
  }

  async function handleTilePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (!res.ok) {
      console.error('Upload failed:', res.status)
      return
    }
    const { url } = (await res.json()) as { url: string }
    updateTileMaterial({ photoUrl: url })
  }

  const isTile = matType === 'tile'
  const surfaceH = surface.type === 'floor' ? roomDimensions.width : roomDimensions.height
  const surfaceW = surface.type === 'floor' ? roomDimensions.length : roomDimensions.length
  const splitH = entry.belowMm ?? surfaceH

  const tileMat = entry.material.type === 'tile' ? entry.material : null
  const paintMat = entry.material.type === 'paint' ? entry.material : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {surface.label}{' '}
          <span className="text-xs font-normal text-muted-foreground">({surface.type})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button size="sm" variant={isTile ? 'default' : 'outline'} onClick={() => setMatType('tile')}>Tile</Button>
          <Button size="sm" variant={!isTile ? 'default' : 'outline'} onClick={() => setMatType('paint')}>Paint</Button>
        </div>

        {isTile ? (
          <div className="space-y-2">
            <div>
              <Label>Tile reference photo</Label>
              <Input type="file" accept="image/*" onChange={handleTilePhoto} className="mt-1" />
            </div>
            <div className="flex gap-2">
              <div>
                <Label>Width (mm)</Label>
                <Input
                  type="number"
                  placeholder="300"
                  value={tileMat?.dimensions?.w || ''}
                  onChange={(e) =>
                    updateTileMaterial({
                      dimensions: { w: Number(e.target.value), h: tileMat?.dimensions?.h ?? 0 },
                    })
                  }
                  className="w-24"
                />
              </div>
              <div>
                <Label>Height (mm)</Label>
                <Input
                  type="number"
                  placeholder="600"
                  value={tileMat?.dimensions?.h || ''}
                  onChange={(e) =>
                    updateTileMaterial({
                      dimensions: { w: tileMat?.dimensions?.w ?? 0, h: Number(e.target.value) },
                    })
                  }
                  className="w-24"
                />
              </div>
            </div>
            <TileCalculator
              surfaceWidthMm={surfaceW}
              surfaceHeightMm={splitH}
              tileDims={tileMat?.dimensions ?? { w: 0, h: 0 }}
              label={surface.label}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <div>
              <Label>Colour</Label>
              <Input
                type="color"
                value={paintMat?.colour ?? '#ffffff'}
                onChange={(e) => updatePaintMaterial({ colour: e.target.value })}
                className="w-16 h-10 p-1"
              />
            </div>
            <div>
              <Label>Finish</Label>
              <select
                value={paintMat?.finish ?? 'matt'}
                onChange={(e) =>
                  updatePaintMaterial({ finish: e.target.value as 'matt' | 'silk' | 'gloss' })
                }
                className="border rounded px-2 py-1 text-sm mt-1 block"
              >
                <option value="matt">Matt</option>
                <option value="silk">Silk</option>
                <option value="gloss">Gloss</option>
              </select>
            </div>
          </div>
        )}

        {surface.type === 'wall' && (
          <div className="flex gap-2">
            <div>
              <Label>Tiles below (mm)</Label>
              <Input
                type="number"
                placeholder="e.g. 1200"
                value={entry.belowMm ?? 0}
                onChange={(e) => updateSplit('belowMm', e.target.value)}
                className="w-28"
              />
            </div>
            <div>
              <Label>Paint above (mm)</Label>
              <Input
                type="number"
                placeholder="e.g. 1200"
                value={entry.aboveMm ?? 0}
                onChange={(e) => updateSplit('aboveMm', e.target.value)}
                className="w-28"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
