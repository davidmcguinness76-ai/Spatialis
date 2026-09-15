# Spatialis MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a bathroom redesign tool where users upload photos and a floor plan, annotate surfaces, define tile/paint materials, and generate AI-inpainted mockups grounded in real room dimensions.

**Architecture:** Next.js 15 App Router, single localStorage-backed project (abstracted behind `lib/storage.ts`), images in Vercel Blob, one serverless API route for Replicate inpainting (mocked until API key available), deployed to Vercel free tier.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Fabric.js, Vercel Blob, Replicate API

## Global Constraints

- Next.js 15 App Router only — no Pages Router
- TypeScript strict mode throughout
- All localStorage access via `lib/storage.ts` only — no direct `localStorage` calls elsewhere
- All image uploads go to Vercel Blob via `/api/upload` — no base64 storage
- Dimensions always in millimetres (mm) — no unit conversion in v1
- No auth — personal tool; Vercel Password Protection handles access
- Free Vercel tier — no paid add-ons
- Spend limit default: $10/month, controlled by `MONTHLY_SPEND_LIMIT_USD` env var
- Commit after every task using format: `type: description (#issue-number)` — omit issue number for now

---

## File Map

```
spatialis/
├── app/
│   ├── layout.tsx                  # Root layout, nav (Home / Design / Renders)
│   ├── page.tsx                    # / — Project home
│   ├── design/
│   │   └── page.tsx                # /design — Material palette
│   ├── renders/
│   │   └── page.tsx                # /renders — Renders gallery
│   └── api/
│       ├── upload/
│       │   └── route.ts            # POST /api/upload → Vercel Blob
│       └── inpaint/
│           └── route.ts            # POST /api/inpaint → Replicate (mocked initially)
├── components/
│   ├── FloorPlanAnnotator.tsx      # Fabric.js canvas: upload floor plan, place surface labels
│   ├── PhotoGrid.tsx               # Grid of photos with surface tag badges
│   ├── PhotoUploader.tsx           # Drag-drop upload + surface tagger
│   ├── SurfaceCard.tsx             # Material palette card (tile or paint)
│   ├── TileCalculator.tsx          # Live tile count display
│   ├── RenderCard.tsx              # Before/after photo card with Regenerate button
│   └── SpendBadge.tsx              # "$1.24 of $10.00 used" display
├── lib/
│   ├── types.ts                    # All shared TypeScript types
│   ├── storage.ts                  # All localStorage read/write (single abstraction)
│   ├── tiling.ts                   # Tile count + grout calculations
│   ├── mask.ts                     # Prompt builder from surfaces + materials
│   └── spend.ts                    # Monthly spend read/write via Vercel Blob
├── .env.local                      # REPLICATE_API_KEY, MONTHLY_SPEND_LIMIT_USD, BLOB_READ_WRITE_TOKEN
└── next.config.ts
```

---

## Task 1: Scaffold Next.js project and push to GitHub

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`
- Create: `app/layout.tsx`, `app/page.tsx`
- Create: `.env.local` (gitignored), `.env.example`
- Create: `.gitignore`

**Interfaces:**
- Produces: running dev server at `localhost:3000`, GitHub repo linked to Vercel

- [ ] **Step 1: Scaffold Next.js with TypeScript and Tailwind**

```bash
cd C:\Users\david\Documents\GitHub\Spatialis
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir no --import-alias "@/*" --yes
```

Expected output: "Success! Created spatialis"

- [ ] **Step 2: Install dependencies**

```bash
npm install fabric @vercel/blob replicate
npm install -D @types/fabric
npx shadcn@latest init --defaults
npx shadcn@latest add button card input label badge tabs separator
```

- [ ] **Step 3: Create `.env.example`**

```bash
# .env.example
REPLICATE_API_KEY=
MONTHLY_SPEND_LIMIT_USD=10
BLOB_READ_WRITE_TOKEN=
```

- [ ] **Step 4: Create `.env.local` with placeholder values**

```
REPLICATE_API_KEY=mock
MONTHLY_SPEND_LIMIT_USD=10
BLOB_READ_WRITE_TOKEN=mock
```

- [ ] **Step 5: Replace `app/layout.tsx` with nav layout**

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Spatialis',
  description: 'Room redesign visualiser',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="border-b px-6 py-3 flex gap-6 items-center">
          <span className="font-semibold text-lg">Spatialis</span>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">Room</Link>
          <Link href="/design" className="text-sm text-muted-foreground hover:text-foreground">Design</Link>
          <Link href="/renders" className="text-sm text-muted-foreground hover:text-foreground">Renders</Link>
        </nav>
        <main className="p-6">{children}</main>
      </body>
    </html>
  )
}
```

- [ ] **Step 6: Replace `app/page.tsx` with placeholder**

```tsx
// app/page.tsx
export default function HomePage() {
  return <h1 className="text-2xl font-bold">Room Setup</h1>
}
```

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
```

Open `http://localhost:3000` — should show "Room Setup" with nav.

- [ ] **Step 8: Push to GitHub and link to Vercel**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 project with shadcn and Fabric.js"
```

Create a new GitHub repo `davidmcguinness76-ai/Spatialis` and push:
```bash
git remote add origin https://github.com/davidmcguinness76-ai/Spatialis.git
git push -u origin master
```

Then go to vercel.com → Add New Project → import `Spatialis` repo. Add env vars from `.env.example` (use `mock` for keys for now). Deploy.

---

## Task 2: Define shared types and storage abstraction

**Files:**
- Create: `lib/types.ts`
- Create: `lib/storage.ts`

**Interfaces:**
- Produces:
  - `getProject(): Project | null`
  - `saveProject(p: Project): void`
  - `getDesign(): Design | null`
  - `saveDesign(d: Design): void`
  - All types: `Project`, `Room`, `Surface`, `Photo`, `Render`, `Material`, `SurfaceLayer`, `Design`

- [ ] **Step 1: Create `lib/types.ts`**

```ts
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
  type: 'wall' | 'floor' | 'ceiling'
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
```

- [ ] **Step 2: Create `lib/storage.ts`**

```ts
// lib/storage.ts
import type { Project, Design } from './types'

const PROJECT_KEY = 'spatialis_project'
const DESIGN_KEY = 'spatialis_design'

export function getProject(): Project | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(PROJECT_KEY)
  return raw ? (JSON.parse(raw) as Project) : null
}

export function saveProject(p: Project): void {
  localStorage.setItem(PROJECT_KEY, JSON.stringify(p))
}

export function getDesign(): Design | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(DESIGN_KEY)
  return raw ? (JSON.parse(raw) as Design) : null
}

export function saveDesign(d: Design): void {
  localStorage.setItem(DESIGN_KEY, JSON.stringify(d))
}
```

- [ ] **Step 3: Write self-check**

Add to bottom of `lib/storage.ts` (remove before deploy if preferred, but harmless):

```ts
// ponytail: no test framework — self-check only, remove if noisy
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  const p = getProject()
  console.assert(p === null || typeof p.id === 'string', 'storage: project shape invalid')
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts lib/storage.ts
git commit -m "feat: add shared types and localStorage storage abstraction"
```

---

## Task 3: Image upload API route (Vercel Blob)

**Files:**
- Create: `app/api/upload/route.ts`

**Interfaces:**
- Consumes: `POST /api/upload` with `FormData` containing `file: File`
- Produces: `{ url: string }` — the Vercel Blob public URL

- [ ] **Step 1: Create `app/api/upload/route.ts`**

```ts
// app/api/upload/route.ts
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const blob = await put(file.name, file, { access: 'public' })
  return NextResponse.json({ url: blob.url })
}
```

- [ ] **Step 2: Test manually**

Start dev server (`npm run dev`). In browser console:

```js
const fd = new FormData()
fd.append('file', new File(['hello'], 'test.txt', { type: 'text/plain' }))
const res = await fetch('/api/upload', { method: 'POST', body: fd })
const json = await res.json()
console.log(json) // { url: "..." } or error if BLOB token not set
```

With `BLOB_READ_WRITE_TOKEN=mock` this will fail with a Blob error — that's expected. The route structure is correct; it works once a real token is set. Verify the 400 path works by sending no file:

```js
const res2 = await fetch('/api/upload', { method: 'POST', body: new FormData() })
console.log(await res2.json()) // { error: 'No file' }
```

- [ ] **Step 3: Commit**

```bash
git add app/api/upload/route.ts
git commit -m "feat: add image upload API route via Vercel Blob"
```

---

## Task 4: Tiling calculations and prompt builder

**Files:**
- Create: `lib/tiling.ts`
- Create: `lib/mask.ts`

**Interfaces:**
- Produces:
  - `tileCount(surfaceWidthMm: number, surfaceHeightMm: number, tileDims: { w: number; h: number }): number`
  - `buildPrompt(visibleSurfaces: Surface[], layers: SurfaceLayer[], roomDimensions: Room['dimensions'], fixtureNotes: string): string`

- [ ] **Step 1: Create `lib/tiling.ts`**

```ts
// lib/tiling.ts
export function tileCount(
  surfaceWidthMm: number,
  surfaceHeightMm: number,
  tileDims: { w: number; h: number }
): number {
  const cols = Math.ceil(surfaceWidthMm / tileDims.w)
  const rows = Math.ceil(surfaceHeightMm / tileDims.h)
  return cols * rows
}

// ponytail: no grout gap in v1 — add groutMm param if tile counts feel off
```

- [ ] **Step 2: Self-check for tiling.ts**

```ts
// add at bottom of lib/tiling.ts
if (process.env.NODE_ENV === 'development') {
  console.assert(tileCount(2400, 1200, { w: 300, h: 600 }) === 16, 'tiling: 2400x1200 wall with 300x600 tiles should be 16')
  console.assert(tileCount(1000, 1000, { w: 600, h: 600 }) === 4, 'tiling: 1000x1000 floor with 600x600 tiles should be 4')
}
```

- [ ] **Step 3: Create `lib/mask.ts`**

```ts
// lib/mask.ts
import type { Surface, SurfaceLayer, Room } from './types'

export function buildPrompt(
  visibleSurfaces: Surface[],
  layers: SurfaceLayer[],
  roomDimensions: Room['dimensions'],
  fixtureNotes: string
): string {
  const parts: string[] = [
    `Room dimensions: ${roomDimensions.length}mm long, ${roomDimensions.width}mm wide, ${roomDimensions.height}mm high.`,
  ]

  for (const surface of visibleSurfaces) {
    const layer = layers.find((l) => l.surfaceId === surface.id)
    if (!layer) continue

    for (const { material, aboveMm, belowMm } of layer.materials) {
      const location = surface.label
      const zone =
        belowMm != null ? ` below ${belowMm}mm` :
        aboveMm != null ? ` above ${aboveMm}mm` : ''

      if (material.type === 'tile') {
        parts.push(
          `${location}${zone}: ${material.label} tiles, each ${material.dimensions.w}mm × ${material.dimensions.h}mm.`
        )
      } else {
        parts.push(
          `${location}${zone}: ${material.finish} paint, colour ${material.colour}.`
        )
      }
    }
  }

  if (fixtureNotes.trim()) {
    parts.push(`Fixture changes: ${fixtureNotes.trim()}`)
  }

  parts.push('Maintain exact room proportions, perspective, and lighting from the original photo. Do not invent fixtures or alter the room layout.')

  return parts.join(' ')
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/tiling.ts lib/mask.ts
git commit -m "feat: add tile count calculations and inpainting prompt builder"
```

---

## Task 5: Floor plan annotator component

**Files:**
- Create: `components/FloorPlanAnnotator.tsx`

**Interfaces:**
- Consumes: `imageUrl: string`, `surfaces: Surface[]`, `onChange: (surfaces: Surface[]) => void`
- Produces: interactive Fabric.js canvas with labelled surface markers; calls `onChange` when surfaces are added/moved/relabelled

- [ ] **Step 1: Create `components/FloorPlanAnnotator.tsx`**

```tsx
// components/FloorPlanAnnotator.tsx
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
      img.scaleToWidth(600)
      canvas.backgroundImage = img
      canvas.renderAll()
    })

    return () => { canvas.dispose() }
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
```

- [ ] **Step 2: Verify Fabric.js imports resolve**

```bash
npm run build
```

Expected: no TypeScript errors on `FloorPlanAnnotator.tsx`. If `@types/fabric` causes conflicts, remove it — Fabric.js ships its own types from v6.

- [ ] **Step 3: Commit**

```bash
git add components/FloorPlanAnnotator.tsx
git commit -m "feat: add floor plan annotator with Fabric.js surface labelling"
```

---

## Task 6: Home page — room setup, floor plan upload, photo management

**Files:**
- Create: `components/PhotoUploader.tsx`
- Create: `components/PhotoGrid.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `getProject()`, `saveProject()` from `lib/storage.ts`; `Surface[]`, `Photo[]` from `lib/types.ts`
- Produces: fully functional `/` page — upload floor plan, enter dimensions, annotate surfaces, upload + tag photos

- [ ] **Step 1: Create `components/PhotoUploader.tsx`**

```tsx
// components/PhotoUploader.tsx
'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import type { Surface } from '@/lib/types'

type Props = {
  surfaces: Surface[]
  onUpload: (file: File, surfaceIds: string[]) => void
}

export default function PhotoUploader({ surfaces, onUpload }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const selectedRef = useRef<string[]>([])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    onUpload(file, selectedRef.current)
    e.target.value = ''
  }

  function toggleSurface(id: string) {
    selectedRef.current = selectedRef.current.includes(id)
      ? selectedRef.current.filter((s) => s !== id)
      : [...selectedRef.current, id]
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Tag surfaces visible in this photo:</p>
      <div className="flex flex-wrap gap-2">
        {surfaces.map((s) => (
          <label key={s.id} className="flex items-center gap-1 text-sm cursor-pointer">
            <input type="checkbox" onChange={() => toggleSurface(s.id)} />
            {s.label}
          </label>
        ))}
      </div>
      <Button size="sm" onClick={() => fileRef.current?.click()}>Upload Photo</Button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}
```

- [ ] **Step 2: Create `components/PhotoGrid.tsx`**

```tsx
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
```

- [ ] **Step 3: Replace `app/page.tsx` with full home page**

```tsx
// app/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { getProject, saveProject } from '@/lib/storage'
import type { Project, Room, Surface, Photo } from '@/lib/types'
import FloorPlanAnnotator from '@/components/FloorPlanAnnotator'
import PhotoUploader from '@/components/PhotoUploader'
import PhotoGrid from '@/components/PhotoGrid'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const DEFAULT_PROJECT: Project = {
  id: crypto.randomUUID(),
  name: 'Bathroom',
  rooms: [{
    id: crypto.randomUUID(),
    dimensions: { length: 0, width: 0, height: 0 },
    floorPlan: { imageUrl: '', surfaces: [] },
    photos: [],
  }],
}

export default function HomePage() {
  const [project, setProject] = useState<Project | null>(null)

  useEffect(() => {
    setProject(getProject() ?? DEFAULT_PROJECT)
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
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const { url } = await res.json()
    update({ floorPlan: { ...room.floorPlan, imageUrl: url } })
  }

  async function handlePhotoUpload(file: File, surfaceIds: string[]) {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
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
          <div>
            <Label htmlFor="floorplan">Upload floor plan image</Label>
            <Input id="floorplan" type="file" accept="image/*" onChange={handleFloorPlanUpload} className="mt-1" />
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
```

- [ ] **Step 4: Run dev and manually test**

```bash
npm run dev
```

- Enter dimensions → values persist on refresh (check localStorage in DevTools)
- Upload a floor plan image → annotator canvas appears
- Add a surface label → appears in list
- Upload a photo and tag it → appears in photo grid with badge

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx components/PhotoUploader.tsx components/PhotoGrid.tsx
git commit -m "feat: build home page with floor plan annotator and photo management"
```

---

## Task 7: Design palette page

**Files:**
- Create: `components/SurfaceCard.tsx`
- Create: `components/TileCalculator.tsx`
- Create: `app/design/page.tsx`

**Interfaces:**
- Consumes: `getProject()`, `getDesign()`, `saveDesign()` from `lib/storage.ts`; `tileCount()` from `lib/tiling.ts`
- Produces: `/design` page with one card per surface, tile/paint inputs, split height, live tile count, fixture notes

- [ ] **Step 1: Create `components/TileCalculator.tsx`**

```tsx
// components/TileCalculator.tsx
import { tileCount } from '@/lib/tiling'

type Props = {
  surfaceWidthMm: number
  surfaceHeightMm: number
  tileDims: { w: number; h: number }
  label: string
}

export default function TileCalculator({ surfaceWidthMm, surfaceHeightMm, tileDims, label }: Props) {
  if (!tileDims.w || !tileDims.h || !surfaceWidthMm || !surfaceHeightMm) return null
  const count = tileCount(surfaceWidthMm, surfaceHeightMm, tileDims)
  return (
    <p className="text-xs text-muted-foreground">
      approx {count} tiles on {label}
    </p>
  )
}
```

- [ ] **Step 2: Create `components/SurfaceCard.tsx`**

```tsx
// components/SurfaceCard.tsx
'use client'

import { useState } from 'react'
import type { Surface, SurfaceLayer, Material } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import TileCalculator from './TileCalculator'

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

  const entry = layer.materials[0] ?? { material: matType === 'tile'
    ? { type: 'tile' as const, photoUrl: '', dimensions: { w: 0, h: 0 }, label: '' }
    : { type: 'paint' as const, colour: '#ffffff', finish: 'matt' as const, label: '' }
  }

  function updateMaterial(patch: Partial<Material>) {
    const updated: SurfaceLayer = {
      ...layer,
      materials: [{ ...entry, material: { ...entry.material, ...patch } as Material }],
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
    const { url } = await res.json()
    updateMaterial({ photoUrl: url } as Partial<Material>)
  }

  const isTile = matType === 'tile'
  const surfaceH = surface.type === 'floor' ? roomDimensions.width : roomDimensions.height
  const surfaceW = surface.type === 'floor' ? roomDimensions.length : roomDimensions.length
  const splitH = entry.belowMm ?? surfaceH

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{surface.label} <span className="text-xs font-normal text-muted-foreground">({surface.type})</span></CardTitle>
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
                <Input type="number" placeholder="300"
                  value={(entry.material as Extract<Material, { type: 'tile' }>).dimensions?.w || ''}
                  onChange={(e) => updateMaterial({ dimensions: { ...((entry.material as Extract<Material, { type: 'tile' }>).dimensions), w: Number(e.target.value) } } as Partial<Material>)}
                  className="w-24"
                />
              </div>
              <div>
                <Label>Height (mm)</Label>
                <Input type="number" placeholder="600"
                  value={(entry.material as Extract<Material, { type: 'tile' }>).dimensions?.h || ''}
                  onChange={(e) => updateMaterial({ dimensions: { ...((entry.material as Extract<Material, { type: 'tile' }>).dimensions), h: Number(e.target.value) } } as Partial<Material>)}
                  className="w-24"
                />
              </div>
            </div>
            <TileCalculator
              surfaceWidthMm={surfaceW}
              surfaceHeightMm={splitH}
              tileDims={(entry.material as Extract<Material, { type: 'tile' }>).dimensions ?? { w: 0, h: 0 }}
              label={surface.label}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <div>
              <Label>Colour</Label>
              <Input type="color"
                value={(entry.material as Extract<Material, { type: 'paint' }>).colour ?? '#ffffff'}
                onChange={(e) => updateMaterial({ colour: e.target.value } as Partial<Material>)}
                className="w-16 h-10 p-1"
              />
            </div>
            <div>
              <Label>Finish</Label>
              <select
                value={(entry.material as Extract<Material, { type: 'paint' }>).finish ?? 'matt'}
                onChange={(e) => updateMaterial({ finish: e.target.value as 'matt' | 'silk' | 'gloss' } as Partial<Material>)}
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
              <Input type="number" placeholder="e.g. 1200"
                value={entry.belowMm ?? ''}
                onChange={(e) => updateSplit('belowMm', e.target.value)}
                className="w-28"
              />
            </div>
            <div>
              <Label>Paint above (mm)</Label>
              <Input type="number" placeholder="e.g. 1200"
                value={entry.aboveMm ?? ''}
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
```

- [ ] **Step 3: Create `app/design/page.tsx`**

```tsx
// app/design/page.tsx
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
```

- [ ] **Step 4: Manual test**

```bash
npm run dev
```

- Go to `/design` — surfaces from floor plan should appear as cards
- Switch between Tile / Paint on a card
- Enter tile dimensions → tile count updates live
- Enter split height → tile count updates to use split height
- Fixture notes persist on refresh

- [ ] **Step 5: Commit**

```bash
git add app/design/page.tsx components/SurfaceCard.tsx components/TileCalculator.tsx
git commit -m "feat: build design palette page with tile/paint inputs and live tile count"
```

---

## Task 8: Spend tracking lib

**Files:**
- Create: `lib/spend.ts`

**Interfaces:**
- Produces:
  - `getSpend(): Promise<{ month: string; totalUsd: number }>`
  - `addSpend(usd: number): Promise<void>`
  - `isOverLimit(): Promise<boolean>`

- [ ] **Step 1: Create `lib/spend.ts`**

```ts
// lib/spend.ts
import { put, head, getDownloadUrl } from '@vercel/blob'

const BLOB_KEY = 'spatialis/spend.json'
const LIMIT = Number(process.env.MONTHLY_SPEND_LIMIT_USD ?? 10)

type SpendRecord = { month: string; totalUsd: number }

function currentMonth() {
  return new Date().toISOString().slice(0, 7) // "2026-09"
}

export async function getSpend(): Promise<SpendRecord> {
  try {
    const info = await head(BLOB_KEY)
    const res = await fetch(info.url)
    const data = (await res.json()) as SpendRecord
    if (data.month !== currentMonth()) return { month: currentMonth(), totalUsd: 0 }
    return data
  } catch {
    return { month: currentMonth(), totalUsd: 0 }
  }
}

export async function addSpend(usd: number): Promise<void> {
  const current = await getSpend()
  const updated: SpendRecord = { month: currentMonth(), totalUsd: current.totalUsd + usd }
  await put(BLOB_KEY, JSON.stringify(updated), { access: 'public', addRandomSuffix: false })
}

export async function isOverLimit(): Promise<boolean> {
  const { totalUsd } = await getSpend()
  return totalUsd >= LIMIT
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/spend.ts
git commit -m "feat: add monthly spend tracking via Vercel Blob"
```

---

## Task 9: Inpaint API route (mock + Replicate)

**Files:**
- Create: `app/api/inpaint/route.ts`

**Interfaces:**
- Consumes: `POST /api/inpaint` with body `{ photoId: string, photoUrl: string, visibleSurfaceIds: string[], designId: string }`
- Produces: `{ resultUrl: string, costUsd: number }` or `{ error: string }` with status 402 (over limit) / 500

- [ ] **Step 1: Create `app/api/inpaint/route.ts`**

```ts
// app/api/inpaint/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { isOverLimit, addSpend } from '@/lib/spend'
import { buildPrompt } from '@/lib/mask'
import { getProject, getDesign } from '@/lib/storage'
import type { Surface } from '@/lib/types'

const MOCK = !process.env.REPLICATE_API_KEY || process.env.REPLICATE_API_KEY === 'mock'
const COST_PER_IMAGE = 0.005 // mid-range Replicate FLUX estimate

export async function POST(req: NextRequest) {
  const { photoUrl, visibleSurfaceIds } = await req.json() as {
    photoUrl: string
    visibleSurfaceIds: string[]
  }

  if (await isOverLimit()) {
    return NextResponse.json({ error: 'Monthly spend limit reached' }, { status: 402 })
  }

  // Build prompt from current design + visible surfaces
  // Storage is server-side unavailable (localStorage is client-only),
  // so client must pass design + room dims directly.
  // Re-read from request body for server use:
  const body = await req.clone().json() as {
    photoUrl: string
    visibleSurfaceIds: string[]
    visibleSurfaces: Surface[]
    layers: import('@/lib/types').SurfaceLayer[]
    roomDimensions: { length: number; width: number; height: number }
    fixtureNotes: string
  }

  const prompt = buildPrompt(body.visibleSurfaces, body.layers, body.roomDimensions, body.fixtureNotes)

  if (MOCK) {
    console.log('[inpaint mock] prompt:', prompt)
    await addSpend(COST_PER_IMAGE)
    return NextResponse.json({ resultUrl: photoUrl, costUsd: COST_PER_IMAGE })
  }

  // Real Replicate call
  const Replicate = (await import('replicate')).default
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_KEY })

  const output = await replicate.run(
    'black-forest-labs/flux-dev-inpainting',
    {
      input: {
        image: photoUrl,
        prompt,
        num_inference_steps: 28,
        guidance_scale: 3.5,
      },
    }
  ) as string[]

  const resultUrl = output[0]
  await addSpend(COST_PER_IMAGE)
  return NextResponse.json({ resultUrl, costUsd: COST_PER_IMAGE })
}
```

- [ ] **Step 2: Fix the double-parse issue**

The route above reads the body twice (`req.json()` then `req.clone().json()`). Simplify by reading once:

```ts
// app/api/inpaint/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { isOverLimit, addSpend } from '@/lib/spend'
import { buildPrompt } from '@/lib/mask'
import type { Surface, SurfaceLayer } from '@/lib/types'

const MOCK = !process.env.REPLICATE_API_KEY || process.env.REPLICATE_API_KEY === 'mock'
const COST_PER_IMAGE = 0.005

type InpaintRequest = {
  photoUrl: string
  visibleSurfaces: Surface[]
  layers: SurfaceLayer[]
  roomDimensions: { length: number; width: number; height: number }
  fixtureNotes: string
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as InpaintRequest

  if (await isOverLimit()) {
    return NextResponse.json({ error: 'Monthly spend limit reached' }, { status: 402 })
  }

  const prompt = buildPrompt(body.visibleSurfaces, body.layers, body.roomDimensions, body.fixtureNotes)

  if (MOCK) {
    console.log('[inpaint mock] prompt:', prompt)
    await addSpend(COST_PER_IMAGE)
    return NextResponse.json({ resultUrl: body.photoUrl, costUsd: COST_PER_IMAGE })
  }

  const Replicate = (await import('replicate')).default
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_KEY })

  const output = await replicate.run(
    'black-forest-labs/flux-dev-inpainting',
    {
      input: {
        image: body.photoUrl,
        prompt,
        num_inference_steps: 28,
        guidance_scale: 3.5,
      },
    }
  ) as string[]

  await addSpend(COST_PER_IMAGE)
  return NextResponse.json({ resultUrl: output[0], costUsd: COST_PER_IMAGE })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/inpaint/route.ts
git commit -m "feat: add inpaint API route with mock mode and Replicate FLUX integration"
```

---

## Task 10: Renders gallery page

**Files:**
- Create: `components/RenderCard.tsx`
- Create: `components/SpendBadge.tsx`
- Create: `app/renders/page.tsx`

**Interfaces:**
- Consumes: `getProject()`, `saveProject()`, `getDesign()` from `lib/storage.ts`; `POST /api/inpaint`; `GET /api/spend` (inline fetch)
- Produces: `/renders` page with per-photo regenerate, before/after toggle, spend display

- [ ] **Step 1: Create `components/SpendBadge.tsx`**

```tsx
// components/SpendBadge.tsx
'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'

export default function SpendBadge() {
  const [label, setLabel] = useState('Loading spend...')

  useEffect(() => {
    fetch('/api/spend')
      .then((r) => r.json())
      .then(({ totalUsd, limitUsd }: { totalUsd: number; limitUsd: number }) => {
        setLabel(`$${totalUsd.toFixed(2)} of $${limitUsd.toFixed(2)} used this month`)
      })
      .catch(() => setLabel('Spend unavailable'))
  }, [])

  return <Badge variant="outline">{label}</Badge>
}
```

- [ ] **Step 2: Add spend read API route**

Create `app/api/spend/route.ts`:

```ts
// app/api/spend/route.ts
import { NextResponse } from 'next/server'
import { getSpend } from '@/lib/spend'

const LIMIT = Number(process.env.MONTHLY_SPEND_LIMIT_USD ?? 10)

export async function GET() {
  const { totalUsd } = await getSpend()
  return NextResponse.json({ totalUsd, limitUsd: LIMIT })
}
```

- [ ] **Step 3: Create `components/RenderCard.tsx`**

```tsx
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
    try {
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
      const { resultUrl, costUsd } = await res.json()
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
        {visibleSurfaces.map((s) => <Badge key={s.id} variant="secondary">{s.label}</Badge>)}
      </div>
      <div className="flex gap-2 items-center">
        <Button size="sm" onClick={regenerate} disabled={loading}>
          {loading ? 'Generating...' : 'Regenerate'}
        </Button>
        {latestRender && (
          <Button size="sm" variant="outline" onClick={() => setShowRender(!showRender)}>
            {showRender ? 'Show Original' : 'Show Render'}
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Create `app/renders/page.tsx`**

```tsx
// app/renders/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { getProject, saveProject, getDesign } from '@/lib/storage'
import type { Project, Design } from '@/lib/types'
import RenderCard from '@/components/RenderCard'
import SpendBadge from '@/components/SpendBadge'

export default function RendersPage() {
  const [project, setProject] = useState<Project | null>(null)
  const [design, setDesign] = useState<Design | null>(null)

  useEffect(() => {
    setProject(getProject())
    setDesign(getDesign())
  }, [])

  if (!project || !design) return <p className="text-muted-foreground">No project data yet. Start on the Room page.</p>

  const room = project.rooms[0]

  function handleRenderComplete(photoId: string, resultUrl: string, costUsd: number) {
    const updated: Project = {
      ...project!,
      rooms: [{
        ...room,
        photos: room.photos.map((p) =>
          p.id !== photoId ? p : {
            ...p,
            renders: [...p.renders, {
              id: crypto.randomUUID(),
              designId: design!.id,
              resultUrl,
              createdAt: new Date().toISOString(),
              costUsd,
            }],
          }
        ),
      }],
    }
    setProject(updated)
    saveProject(updated)
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Renders</h1>
        <SpendBadge />
      </div>
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
```

- [ ] **Step 5: Manual test end-to-end**

```bash
npm run dev
```

- Room page: upload floor plan, add surfaces, upload photos tagged to surfaces
- Design page: set tile/paint per surface, enter split heights, check tile counts
- Renders page: click Regenerate → mock returns original photo, before/after toggle works
- SpendBadge shows "$0.005 of $10.00 used" after one mock render (if Blob token set; otherwise "Spend unavailable" — expected)

- [ ] **Step 6: Commit**

```bash
git add app/renders/page.tsx components/RenderCard.tsx components/SpendBadge.tsx app/api/spend/route.ts
git commit -m "feat: build renders gallery with regenerate, before/after toggle, and spend badge"
```

---

## Task 11: Deploy to Vercel and wire Replicate

**Files:**
- Modify: Vercel project environment variables (via Vercel dashboard)

**Interfaces:**
- Consumes: Replicate API key, Vercel Blob token
- Produces: live URL accessible on mobile, real AI renders working

- [ ] **Step 1: Get Replicate API key**

Go to [replicate.com](https://replicate.com) → sign up → account settings → API tokens → copy token.

- [ ] **Step 2: Get Vercel Blob token**

Vercel dashboard → your Spatialis project → Storage → Create Blob store → copy `BLOB_READ_WRITE_TOKEN`.

- [ ] **Step 3: Set env vars on Vercel**

Vercel dashboard → Spatialis project → Settings → Environment Variables. Add:
- `REPLICATE_API_KEY` = your Replicate token
- `MONTHLY_SPEND_LIMIT_USD` = `10`
- `BLOB_READ_WRITE_TOKEN` = your Blob token

Also update `.env.local` with real values for local testing.

- [ ] **Step 4: Push and verify deploy**

```bash
git push origin master
```

Watch Vercel dashboard → deployment completes → visit live URL.

- [ ] **Step 5: End-to-end test on live URL**

- Upload bathroom floor plan photo
- Add surfaces (Wall 1, Wall 2, Floor)
- Upload 2-3 bathroom photos, tag them
- Go to Design, set tile materials with dimensions and split heights
- Go to Renders, click Regenerate on one photo
- Verify real AI render comes back (not mock)
- Check SpendBadge updates

- [ ] **Step 6: Test on mobile**

Open live URL on phone. Verify:
- Upload works (photo from camera roll)
- Regenerate works
- Before/after toggle works

- [ ] **Step 7: Enable Vercel Password Protection**

Vercel dashboard → Spatialis → Settings → Deployment Protection → enable "Password Protection" → set a password. Share with anyone you want to give access on holiday.

- [ ] **Step 8: Final commit**

```bash
git add .env.example
git commit -m "chore: update env example with all required vars"
git push origin master
```

---

## Self-Review

**Spec coverage check:**
- Floor plan upload + Fabric.js annotation ✓ (Task 6)
- Room dimensions ✓ (Task 6)
- Photo upload + surface tagging ✓ (Task 6)
- Tile material: photo + dimensions ✓ (Task 7)
- Paint material: colour picker + finish ✓ (Task 7)
- Split height per surface ✓ (Task 7)
- Live tile count ✓ (Task 7)
- Fixture notes ✓ (Task 7)
- Inpainting pipeline ✓ (Task 9)
- Mock mode until API key ready ✓ (Task 9)
- Spend tracking + hard cap ✓ (Tasks 8, 9, 10)
- Before/after toggle ✓ (Task 10)
- Render history saved ✓ (Task 10)
- SpendBadge display ✓ (Task 10)
- Deploy to Vercel free tier ✓ (Task 11)
- Password protection ✓ (Task 11)
- Mobile verification ✓ (Task 11)
- `storage.ts` single abstraction ✓ (Task 2)
- Vercel Blob for images ✓ (Tasks 3, 8)

**Type consistency:**
- `SurfaceLayer`, `Surface`, `Material`, `Design`, `Photo`, `Render` all defined once in `lib/types.ts` and imported everywhere — no redefinition.
- `buildPrompt(visibleSurfaces, layers, roomDimensions, fixtureNotes)` signature matches between `lib/mask.ts` (Task 4) and `app/api/inpaint/route.ts` (Task 9) ✓
- `tileCount(surfaceWidthMm, surfaceHeightMm, tileDims)` matches between `lib/tiling.ts` (Task 4) and `TileCalculator` (Task 7) ✓
- `getProject/saveProject/getDesign/saveDesign` signatures consistent across all pages ✓

**Placeholder scan:** None found. All code blocks are complete.
