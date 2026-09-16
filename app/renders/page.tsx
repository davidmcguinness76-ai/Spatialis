// app/renders/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { getProject, saveProject, getDesign } from '@/lib/storage'
import type { Project, Design } from '@/lib/types'
import RenderCard from '@/components/RenderCard'

export default function RendersPage() {
  const [project, setProject] = useState<Project | null>(null)
  const [design, setDesign] = useState<Design | null>(null)

  useEffect(() => {
    setProject(getProject())
    setDesign(getDesign())
  }, [])

  if (!project || !design) {
    return <p className="text-muted-foreground">No project data yet. Start on the Room page.</p>
  }

  const room = project.rooms[0]

  function handleRenderComplete(photoId: string, resultUrl: string, costUsd: number) {
    const updated: Project = {
      ...project!,
      rooms: [{
        ...room,
        photos: room.photos.map((p) =>
          p.id !== photoId
            ? p
            : {
                ...p,
                renders: [
                  ...p.renders,
                  {
                    id: crypto.randomUUID(),
                    designId: design!.id,
                    resultUrl,
                    createdAt: new Date().toISOString(),
                    costUsd,
                  },
                ],
              }
        ),
      }],
    }
    setProject(updated)
    saveProject(updated)
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Renders</h1>
      {room.photos.length === 0 ? (
        <p className="text-muted-foreground">No photos yet. Upload them on the Room page.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {room.photos.map((photo) => (
            <RenderCard
              key={photo.id}
              photo={photo}
              surfaces={room.floorPlan.surfaces}
              layers={design.layers}
              roomDimensions={room.dimensions}
              fixtureNotes={design.fixtureNotes}
              onRenderComplete={handleRenderComplete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
