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

    // img2img: preserve room structure, restyle surfaces. prompt_strength 0.6 = strong restyle, keeps layout.
    const output = await replicate.run(
      'stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc' as `${string}/${string}:${string}`,
      {
        input: {
          image: body.photoUrl,
          prompt: `Photorealistic bathroom interior, ${prompt}`,
          negative_prompt: 'cartoon, painting, illustration, distorted, ugly, blurry, low quality',
          num_inference_steps: 30,
          guidance_scale: 7.5,
          prompt_strength: 0.6,
          num_outputs: 1,
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
