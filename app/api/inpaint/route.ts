// app/api/inpaint/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { isOverLimit, addSpend } from '@/lib/spend'
import { buildPrompt } from '@/lib/mask'
import type { Surface, SurfaceLayer } from '@/lib/types'

const MOCK = !process.env.REPLICATE_API_KEY || process.env.REPLICATE_API_KEY === 'mock'
const COST_PER_IMAGE = 0.005

type InpaintRequest = {
  photoUrl: string
  maskUrl?: string
  visibleSurfaces: Surface[]
  layers: SurfaceLayer[]
  roomDimensions: { length: number; width: number; height: number }
  fixtureNotes: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as InpaintRequest

    try {
      if (await isOverLimit()) {
        return NextResponse.json({ error: 'Monthly spend limit reached' }, { status: 402 })
      }
    } catch (e) {
      console.error('[inpaint] spend check failed:', e)
    }

    const prompt = buildPrompt(body.visibleSurfaces, body.layers, body.roomDimensions, body.fixtureNotes)

    if (MOCK) {
      console.log('[inpaint mock] prompt:', prompt)
      try { await addSpend(COST_PER_IMAGE) } catch { /* blob unavailable in dev */ }
      return NextResponse.json({ resultUrl: body.photoUrl, costUsd: COST_PER_IMAGE })
    }

    const Replicate = (await import('replicate')).default
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_KEY })

    // ponytail: full-white mask = repaint everything; per-surface mask generation is the upgrade path
    const maskUrl = body.maskUrl ?? 'https://placehold.co/1x1/ffffff/ffffff.png'

    const output = await replicate.run(
      'stability-ai/stable-diffusion-inpainting:95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3' as `${string}/${string}:${string}`,
      {
        input: {
          image: body.photoUrl,
          mask: maskUrl,
          prompt,
          num_inference_steps: 25,
          guidance_scale: 7.5,
        },
      }
    )

    // flux-fill yields FileOutput[] — extract the URL string from the first item
    const first = Array.isArray(output) ? (output as unknown[])[0] : output
    // FileOutput has a .url() method; fall back to String() coercion
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resultUrl: string = typeof (first as any)?.url === 'function' ? (first as any).url().toString() : String(first)

    try { await addSpend(COST_PER_IMAGE) } catch { /* non-fatal */ }
    return NextResponse.json({ resultUrl, costUsd: COST_PER_IMAGE })
  } catch (err) {
    console.error('[inpaint] unhandled error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
