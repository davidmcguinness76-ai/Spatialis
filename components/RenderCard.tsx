// components/RenderCard.tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Photo, Surface, SurfaceLayer } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Props = {
  photo: Photo
  surfaces: Surface[]
  layers: SurfaceLayer[]
  roomDimensions: { length: number; width: number; height: number }
  fixtureNotes: string
  onRenderComplete: (photoId: string, resultUrl: string, costUsd: number) => void
}

export default function RenderCard({ photo, surfaces, layers, roomDimensions, fixtureNotes, onRenderComplete }: Props) {
  const [showRender, setShowRender] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const latestRender = photo.renders.at(-1)
  const visibleSurfaces = surfaces.filter((s) => photo.surfaces.includes(s.id))

  async function regenerate() {
    setLoading(true)
    setError(null)
    setShowRender(false)
    try {
      console.log('[regenerate] using base photo:', photo.imageUrl)
      const res = await fetch('/api/inpaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoUrl: photo.imageUrl,
          visibleSurfaces,
          layers: layers.filter((l) => photo.surfaces.includes(l.surfaceId)),
          roomDimensions,
          fixtureNotes,
        }),
      })
      if (res.status === 402) { setError('Monthly spend limit reached'); return }
      if (!res.ok) { setError('Render failed'); return }
      const { resultUrl, costUsd } = (await res.json()) as { resultUrl: string; costUsd: number }
      onRenderComplete(photo.id, resultUrl, costUsd)
      setShowRender(true)
    } catch {
      setError('Render failed')
    } finally {
      setLoading(false)
    }
  }

  const displayUrl = showRender && latestRender ? latestRender.resultUrl : photo.imageUrl

  return (
    <div className="space-y-2">
      <div className="relative aspect-video rounded overflow-hidden border">
        <Image src={displayUrl} alt="" fill className="object-cover" />
      </div>
      <div className="flex flex-wrap gap-1">
        {visibleSurfaces.map((s) => (
          <Badge key={s.id} variant="secondary">{s.label}</Badge>
        ))}
      </div>
      <div className="flex gap-2 items-center flex-wrap">
        <Button size="sm" onClick={regenerate} disabled={loading}>
          {loading ? 'Generating...' : 'Regenerate'}
        </Button>
        {latestRender && (
          <Button size="sm" variant="outline" onClick={() => setShowRender(!showRender)}>
            {showRender ? 'Show Original' : 'Show Render'}
          </Button>
        )}
        {latestRender && (
          <a href={latestRender.resultUrl} download target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline">Download</Button>
          </a>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
