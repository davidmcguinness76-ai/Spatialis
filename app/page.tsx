// app/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { getProject, saveProject } from '@/lib/storage'
import type { Project, Room, Photo } from '@/lib/types'
import FloorPlanAnnotator from '@/components/FloorPlanAnnotator'
import PhotoUploader from '@/components/PhotoUploader'
import PhotoGrid from '@/components/PhotoGrid'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

const DEFAULT_ROOM = () => ({
  id: crypto.randomUUID(),
  dimensions: { length: 0, width: 0, height: 0 },
  floorPlan: { imageUrl: '', surfaces: [] },
  photos: [],
})

const DEFAULT_PROJECT = () => ({
  id: crypto.randomUUID(),
  name: 'Bathroom',
  rooms: [DEFAULT_ROOM()],
})

export default function HomePage() {
  const [project, setProject] = useState<Project | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    setProject(getProject() ?? DEFAULT_PROJECT())
  }, [])

  if (!project) return null
  const room: Room = project.rooms[0]

  function update(partial: Partial<Room>) {
    const updated = { ...project!, rooms: [{ ...room, ...partial }] }
    setProject(updated)
    saveProject(updated)
  }

  async function handleFloorPlanUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    setUploading(false)
    if (!res.ok) {
      setUploadError(`Upload failed (${res.status})`)
      return
    }
    const { url } = await res.json()
    update({ floorPlan: { ...room.floorPlan, imageUrl: url } })
  }

  async function handlePhotoUpload(file: File, surfaceIds: string[]) {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (!res.ok) {
      console.error('Upload failed:', res.status)
      return
    }
    const { url } = await res.json()
    const photo: Photo = {
      id: crypto.randomUUID(),
      imageUrl: url,
      surfaces: surfaceIds,
      renders: [],
    }
    update({ photos: [...room.photos, photo] })
  }

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold">Room Setup — {project.name}</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Dimensions (mm)</h2>
        <div className="flex gap-4">
          {(['length', 'width', 'height'] as const).map((dim) => (
            <div key={dim} className="space-y-1">
              <Label className="capitalize">{dim}</Label>
              <Input
                type="number"
                value={room.dimensions[dim] || ''}
                onChange={(e) => update({ dimensions: { ...room.dimensions, [dim]: Number(e.target.value) } })}
                className="w-28"
                placeholder="mm"
              />
            </div>
          ))}
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Floor Plan</h2>
        {!room.floorPlan.imageUrl ? (
          <div className="space-y-1">
            <Label htmlFor="floorplan">Upload floor plan image</Label>
            <Input id="floorplan" type="file" accept="image/*" onChange={handleFloorPlanUpload} className="mt-1" disabled={uploading} />
            {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
            {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
          </div>
        ) : (
          <FloorPlanAnnotator
            imageUrl={room.floorPlan.imageUrl}
            surfaces={room.floorPlan.surfaces}
            onChange={(surfaces) => update({ floorPlan: { ...room.floorPlan, surfaces } })}
          />
        )}
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Photos</h2>
        {room.floorPlan.surfaces.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add surfaces on the floor plan first.</p>
        ) : (
          <PhotoUploader surfaces={room.floorPlan.surfaces} onUpload={handlePhotoUpload} />
        )}
        <PhotoGrid photos={room.photos} surfaces={room.floorPlan.surfaces} />
      </section>
    </div>
  )
}
