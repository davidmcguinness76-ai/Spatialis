// components/PhotoGrid.tsx
import type { Photo, Surface } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'

type Props = {
  photos: Photo[]
  surfaces: Surface[]
}

export default function PhotoGrid({ photos, surfaces }: Props) {
  if (photos.length === 0) return <p className="text-sm text-muted-foreground">No photos yet.</p>

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {photos.map((photo) => (
        <div key={photo.id} className="space-y-1">
          <div className="relative aspect-video rounded overflow-hidden border">
            <Image src={photo.imageUrl} alt="" fill className="object-cover" />
          </div>
          <div className="flex flex-wrap gap-1">
            {photo.surfaces.map((sid) => {
              const s = surfaces.find((s) => s.id === sid)
              return s ? <Badge key={sid} variant="secondary">{s.label}</Badge> : null
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
