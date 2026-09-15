// lib/types.ts
export type Project = {
  id: string
  name: string
  rooms: Room[]
}

export type Room = {
  id: string
  dimensions: { length: number; width: number; height: number } // mm
  floorPlan: { imageUrl: string; surfaces: Surface[] }
  photos: Photo[]
}

export type Surface = {
  id: string
  label: string
  type: 'wall' | 'floor' | 'ceiling' | 'bath' | 'shower' | 'sink' | 'toilet'
}

export type Photo = {
  id: string
  imageUrl: string
  surfaces: Surface['id'][]
  renders: Render[]
}

export type Render = {
  id: string
  designId: string
  resultUrl: string
  createdAt: string
  costUsd: number
}

export type Material =
  | { type: 'tile'; photoUrl: string; dimensions: { w: number; h: number }; label: string }
  | { type: 'paint'; colour: string; finish: 'matt' | 'silk' | 'gloss'; label: string }

export type SurfaceLayer = {
  surfaceId: Surface['id']
  materials: { material: Material; aboveMm?: number; belowMm?: number }[]
}

export type Design = {
  id: string
  name: string
  layers: SurfaceLayer[]
  fixtureNotes: string
}
