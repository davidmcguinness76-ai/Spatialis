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

if (process.env.NODE_ENV === 'development') {
  console.assert(tileCount(2400, 1200, { w: 300, h: 600 }) === 16, 'tiling: 2400x1200 wall with 300x600 tiles should be 16')
  console.assert(tileCount(1000, 1000, { w: 600, h: 600 }) === 4, 'tiling: 1000x1000 floor with 600x600 tiles should be 4')
}
