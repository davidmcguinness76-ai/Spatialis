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
  if (!raw) return null
  const d = JSON.parse(raw) as Design
  // migrate old materials[] shape → lower/upper
  d.layers = d.layers.map((l) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const legacy = l as any
    if (!l.lower && Array.isArray(legacy.materials) && legacy.materials.length > 0) {
      return { surfaceId: l.surfaceId, lower: legacy.materials[0].material }
    }
    return l
  })
  return d
}

export function saveDesign(d: Design): void {
  localStorage.setItem(DESIGN_KEY, JSON.stringify(d))
}

// ponytail: no test framework — self-check only
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  const p = getProject()
  console.assert(p === null || typeof p.id === 'string', 'storage: project shape invalid')
}
