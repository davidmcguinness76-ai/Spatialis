// components/PhotoUploader.tsx
'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Surface } from '@/lib/types'

type Props = {
  surfaces: Surface[]
  onUpload: (file: File, surfaceIds: string[]) => void
}

export default function PhotoUploader({ surfaces, onUpload }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<string[]>([])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    onUpload(file, selected)
    setSelected([])
    e.target.value = ''
  }

  function toggleSurface(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Tag surfaces visible in this photo:</p>
      <div className="flex flex-wrap gap-2">
        {surfaces.map((s) => (
          <label key={s.id} className="flex items-center gap-1 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(s.id)}
              onChange={() => toggleSurface(s.id)}
            />
            {s.label}
          </label>
        ))}
      </div>
      <Button size="sm" onClick={() => fileRef.current?.click()}>Upload Photo</Button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}
