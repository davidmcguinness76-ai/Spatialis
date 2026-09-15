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
