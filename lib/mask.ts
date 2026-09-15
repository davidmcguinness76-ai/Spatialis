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

    function describeMaterial(material: SurfaceLayer['lower'], zone: string) {
      if (material.type === 'tile') {
        parts.push(`${surface.label}${zone}: ${material.label} tiles, each ${material.dimensions.w}mm x ${material.dimensions.h}mm.`)
      } else {
        parts.push(`${surface.label}${zone}: ${material.finish} paint, colour ${material.colour}.`)
      }
    }

    if (layer.splitHeightMm && layer.upper) {
      describeMaterial(layer.lower, ` below ${layer.splitHeightMm}mm`)
      describeMaterial(layer.upper, ` above ${layer.splitHeightMm}mm`)
    } else {
      describeMaterial(layer.lower, '')
    }
  }

  if (fixtureNotes.trim()) {
    parts.push(`Fixture changes: ${fixtureNotes.trim()}`)
  }

  parts.push('Maintain exact room proportions, perspective, and lighting from the original photo. Do not invent fixtures or alter the room layout.')

  return parts.join(' ')
}
