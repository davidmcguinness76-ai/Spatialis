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
