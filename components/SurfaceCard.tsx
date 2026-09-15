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

const DEFAULT_TILE: TileMaterial = { type: 'tile', photoUrl: '', dimensions: { w: 0, h: 0 }, label: '' }
const DEFAULT_PAINT: PaintMaterial = { type: 'paint', colour: '#ffffff', finish: 'matt', label: '' }

function MaterialEditor({
  material,
  showGrout,
  onChange,
  onPhotoUpload,
}: {
  material: Material
  showGrout: boolean
  onChange: (m: Material) => void
  onPhotoUpload: (url: string) => void
}) {
  const [matType, setMatType] = useState<'tile' | 'paint'>(material.type)

  function switchType(t: 'tile' | 'paint') {
    setMatType(t)
    onChange(t === 'tile' ? DEFAULT_TILE : DEFAULT_PAINT)
  }

  const tile = material.type === 'tile' ? material : null
  const paint = material.type === 'paint' ? material : null

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (!res.ok) { console.error('Upload failed:', res.status); return }
    const { url } = (await res.json()) as { url: string }
    onPhotoUpload(url)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button size="sm" variant={matType === 'tile' ? 'default' : 'outline'} onClick={() => switchType('tile')}>Tile</Button>
        <Button size="sm" variant={matType === 'paint' ? 'default' : 'outline'} onClick={() => switchType('paint')}>Paint</Button>
      </div>

      {matType === 'tile' ? (
        <div className="space-y-2">
          <div>
            <Label>Tile reference photo</Label>
            <Input type="file" accept="image/*" onChange={handlePhoto} className="mt-1" />
          </div>
          <div className="flex gap-2">
            <div>
              <Label>Width (mm)</Label>
              <Input
                type="number" placeholder="300" className="w-24"
                value={tile?.dimensions?.w || ''}
                onChange={(e) => onChange({ ...(tile ?? DEFAULT_TILE), dimensions: { w: Number(e.target.value), h: tile?.dimensions?.h ?? 0 } })}
              />
            </div>
            <div>
              <Label>Height (mm)</Label>
              <Input
                type="number" placeholder="600" className="w-24"
                value={tile?.dimensions?.h || ''}
                onChange={(e) => onChange({ ...(tile ?? DEFAULT_TILE), dimensions: { w: tile?.dimensions?.w ?? 0, h: Number(e.target.value) } })}
              />
            </div>
          </div>
          {showGrout && (
            <div className="flex gap-2 items-end">
              <div>
                <Label>Grout width (mm)</Label>
                <Input
                  type="number" placeholder="3" className="w-24"
                  value={tile?.groutWidth ?? ''}
                  onChange={(e) => onChange({ ...(tile ?? DEFAULT_TILE), groutWidth: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
              <div>
                <Label>Grout colour</Label>
                <Input
                  type="color" className="w-16 h-10 p-1"
                  value={tile?.groutColour ?? '#cccccc'}
                  onChange={(e) => onChange({ ...(tile ?? DEFAULT_TILE), groutColour: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div>
            <Label>Colour</Label>
            <Input
              type="color" className="w-16 h-10 p-1"
              value={paint?.colour ?? '#ffffff'}
              onChange={(e) => onChange({ ...(paint ?? DEFAULT_PAINT), colour: e.target.value })}
            />
          </div>
          <div>
            <Label>Finish</Label>
            <select
              value={paint?.finish ?? 'matt'}
              onChange={(e) => onChange({ ...(paint ?? DEFAULT_PAINT), finish: e.target.value as 'matt' | 'silk' | 'gloss' })}
              className="border rounded px-2 py-1 text-sm mt-1 block"
            >
              <option value="matt">Matt</option>
              <option value="silk">Silk</option>
              <option value="gloss">Gloss</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SurfaceCard({ surface, layer, roomDimensions, onChange }: Props) {
  const isFixture = ['bath', 'shower', 'sink', 'toilet'].includes(surface.type)
  const isWall = surface.type === 'wall'
  const showGrout = surface.type === 'wall' || surface.type === 'floor'
  const surfaceW = roomDimensions.length
  const surfaceH = surface.type === 'floor' ? roomDimensions.width : roomDimensions.height
  const lower: Material = layer.lower ?? DEFAULT_TILE
  const hasSplit = isWall && (layer.splitHeightMm ?? 0) > 0

  function setLower(m: Material) { onChange({ ...layer, lower: m }) }
  function setUpper(m: Material) { onChange({ ...layer, upper: m }) }
  function setSplitHeight(val: string) {
    const mm = val ? Number(val) : undefined
    onChange({ ...layer, splitHeightMm: mm, upper: mm ? (layer.upper ?? DEFAULT_TILE) : undefined })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {surface.label}{' '}
          <span className="text-xs font-normal text-muted-foreground">({surface.type})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isFixture ? (
          <p className="text-sm text-muted-foreground">Fixture — describe changes in Fixture notes below (e.g. replace with shower).</p>
        ) : (
          <>
            {isWall && (
              <div className="space-y-1">
                <Label>Split height (mm) <span className="text-xs font-normal text-muted-foreground">leave 0 for full wall</span></Label>
                <Input
                  type="number" placeholder="e.g. 1200" className="w-28"
                  value={layer.splitHeightMm ?? 0}
                  onChange={(e) => setSplitHeight(e.target.value)}
                />
              </div>
            )}

            {hasSplit ? (
              <>
                <div className="border rounded p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lower zone (0 to {layer.splitHeightMm}mm)</p>
                  <MaterialEditor
                    material={lower}
                    showGrout={showGrout}
                    onChange={setLower}
                    onPhotoUpload={(url) => setLower({ ...(lower.type === 'tile' ? lower : DEFAULT_TILE), photoUrl: url })}
                  />
                  {lower.type === 'tile' && (
                    <TileCalculator surfaceWidthMm={surfaceW} surfaceHeightMm={layer.splitHeightMm!} tileDims={lower.dimensions} label={surface.label + ' lower'} />
                  )}
                </div>
                <div className="border rounded p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Upper zone ({layer.splitHeightMm}mm to {surfaceH}mm)</p>
                  <MaterialEditor
                    material={layer.upper ?? DEFAULT_TILE}
                    showGrout={showGrout}
                    onChange={setUpper}
                    onPhotoUpload={(url) => setUpper({ ...((layer.upper?.type === 'tile' ? layer.upper : DEFAULT_TILE) as TileMaterial), photoUrl: url })}
                  />
                  {(layer.upper ?? DEFAULT_TILE).type === 'tile' && (
                    <TileCalculator surfaceWidthMm={surfaceW} surfaceHeightMm={surfaceH - layer.splitHeightMm!} tileDims={(layer.upper?.type === 'tile' ? layer.upper : DEFAULT_TILE).dimensions} label={surface.label + ' upper'} />
                  )}
                </div>
              </>
            ) : (
              <>
                <MaterialEditor
                  material={lower}
                  showGrout={showGrout}
                  onChange={setLower}
                  onPhotoUpload={(url) => setLower({ ...(lower.type === 'tile' ? lower : DEFAULT_TILE), photoUrl: url })}
                />
                {lower.type === 'tile' && (
                  <TileCalculator surfaceWidthMm={surfaceW} surfaceHeightMm={surfaceH} tileDims={lower.dimensions} label={surface.label} />
                )}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
