# Spatialis MVP Design Spec
**Date:** 2026-09-15
**Status:** Approved

## Overview

A personal room redesign tool. Core use case: bathroom renovation planning. User uploads photos and a floor plan, defines tile/paint materials per surface, and generates AI inpainted mockups showing the room with the new materials applied — at correct real-world scale, grounded by room and tile dimensions.

Deadline: deployed to Vercel before 2026-09-17 (holiday departure).

---

## Problem

AI room visualisers hallucinate proportions and invent fixtures. Grounding generation with real room dimensions, tile sizes, and split heights keeps results realistic. Inpainting (replace only the masked region) is more faithful than full-image generation.

---

## Architecture

Next.js 15 App Router, deployed to Vercel free tier as a 4th project. No database — localStorage behind a single abstraction. Images in Vercel Blob. One serverless API route for inpainting. No auth — Vercel Password Protection via env var.

```
/app
  /                    → Project home (floor plan + photo management)
  /design              → Material palette per surface
  /renders             → Per-photo regeneration and before/after gallery
  /api/inpaint         → Serverless route: builds prompt, calls Replicate, tracks spend

/lib
  storage.ts           → All localStorage access (single file, swap to DB later)
  tiling.ts            → Tile count and grout line calculations
  spend.ts             → Monthly spend tracking against Vercel Blob spend.json
  mask.ts              → Mask/prompt builder from surface materials

/components            → UI components (shadcn/ui + Tailwind)
```

---

## Data Model

```ts
type Project = {
  id: string
  name: string
  rooms: Room[]
}

type Room = {
  id: string
  dimensions: { length: number; width: number; height: number } // mm
  floorPlan: { imageUrl: string; surfaces: Surface[] }
  photos: Photo[]
}

type Surface = {
  id: string
  label: string // e.g. "Wall 1", "Floor", "Ceiling"
  type: 'wall' | 'floor' | 'ceiling'
}

type Photo = {
  id: string
  imageUrl: string
  surfaces: Surface['id'][]  // which surfaces are visible in this photo
  renders: Render[]
}

type Render = {
  id: string
  designId: string
  resultUrl: string
  createdAt: string
  costUsd: number
}

type Material =
  | { type: 'tile'; photoUrl: string; dimensions: { w: number; h: number }; label: string }
  | { type: 'paint'; colour: string; finish: 'matt' | 'silk' | 'gloss'; label: string }

type SurfaceLayer = {
  surfaceId: Surface['id']
  materials: { material: Material; aboveMm?: number; belowMm?: number }[]
  // e.g. paint above 1200mm, tile below 1200mm — split height is a first-class value
}

type Design = {
  id: string
  name: string
  layers: SurfaceLayer[]
}
```

All stored via `lib/storage.ts`. Swap that one file to add a real DB for multi-user.

---

## Pages

### `/` — Project Home
- Upload floor plan image
- Enter room dimensions (length × width × height in mm)
- Annotate floor plan: click to add surface labels (Wall 1, Wall 2, Floor, etc.) using Fabric.js canvas overlay
- Upload bathroom photos; tag each to one or more surfaces
- Photos displayed as a grid with surface tags shown

### `/design` — Material Palette
- One card per surface
- Each card: choose material type (tile or paint)
  - Tile: upload reference photo, enter width × height in mm
  - Paint: colour picker, finish selector (matt/silk/gloss)
- Split height input per surface (e.g. "tiles below 1200mm, paint above") — optional
- Live tile count calculation shown: "approx 47 tiles on Wall 1 below split"
- Fixture notes: free text field (e.g. "replace bath with walk-in shower, new basin TBC")

### `/renders` — Renders Gallery
- Grid of all uploaded photos
- Each card: original photo + latest render side by side (before/after toggle)
- "Regenerate" button per photo — disabled if monthly spend limit reached
- Spend tracker shown: "$1.24 of $10.00 used this month"
- Render history per photo (can revert to earlier design versions)

---

## Inpainting Pipeline

```
User clicks "Regenerate" on a photo
  ↓
Client → POST /api/inpaint
  { photoId, photoUrl, visibleSurfaces[], design, roomDimensions }
  ↓
/api/inpaint:
  1. spend.ts: check monthly spend < MONTHLY_SPEND_LIMIT_USD, else 402
  2. mask.ts: build prompt from visible surfaces + materials + split heights
     e.g. "white metro tiles 100×200mm below 1200mm on walls,
           soft grey matt paint above 1200mm,
           walk-in shower replacing bath, keep all proportions and fixtures"
  3. Call Replicate flux-dev-inpainting with photo + prompt
  4. On success: increment spend.json in Vercel Blob
  5. Return resultUrl
  ↓
Client saves resultUrl to photo.renders[], shows before/after
```

For v1 launch (before API key): `/api/inpaint` returns a mock response (echoes the original photo URL with a console log). UI is fully functional — swap mock for real Replicate call when key is ready.

---

## Spend Control

- `MONTHLY_SPEND_LIMIT_USD` env var (default: 10)
- `REPLICATE_API_KEY` env var
- `spend.json` in Vercel Blob: `{ month: "2026-09", totalUsd: 1.24 }`
- Replicate FLUX-inpaint: ~$0.003–0.008/image → $10 cap ≈ 1,250–3,300 renders/month
- API route resets spend.json on new month automatically

---

## Tech Stack

| Concern | Choice | Reason |
|---------|--------|--------|
| Framework | Next.js 15 App Router | Matches existing Vercel projects |
| Styling | Tailwind + shadcn/ui | Already in your stack |
| Canvas annotation | Fabric.js | Lightweight, handles image overlays |
| Image storage | Vercel Blob | Free tier 1GB, no setup |
| Inpainting | Replicate flux-dev-inpainting | Cheapest, best fidelity for texture replacement |
| State | localStorage via storage.ts | No DB needed for personal tool; one file to swap later |
| Auth | Vercel Password Protection | Free, zero code, one env var |

---

## Deployment Plan

**Today (2026-09-15):**
- Scaffold Next.js project, push to GitHub, link to Vercel
- Build `/` page: floor plan upload, dimension input, Fabric.js surface annotation, photo upload + tagging
- Build `/design` page: material palette with tile/paint inputs, split height, tile count calc
- Build `/renders` page: gallery, mock regenerate, before/after toggle

**Tomorrow (2026-09-16):**
- Wire in Replicate API (once key obtained)
- Wire spend tracking
- End-to-end test with bathroom photos
- Deploy to production, set password protection
- Verify works on mobile (holiday use)

---

## Out of Scope for v1

- Multi-user / accounts
- 3D viewer
- Fixture catalogue / product search
- Wallpaper material type
- Automatic mask drawing (user describes surfaces via tags, not pixel-level masking)
- Multiple projects (UI supports one bathroom project)

---

## Scalability Notes

- `storage.ts` abstraction: swap localStorage → Postgres/Supabase in one file
- Add `userId` to `Project` for multi-user
- `Design[]` array already supports version history
- Vercel Blob scales with no code changes
