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
  )

  // replicate.run() returns Promise<object>; flux-dev-inpainting yields FileOutput[].
  // String() coerces FileOutput (which has a url() method) to its URL string.
  const resultUrl = String(Array.isArray(output) ? (output as unknown[])[0] : output)

  await addSpend(COST_PER_IMAGE)
  return NextResponse.json({ resultUrl, costUsd: COST_PER_IMAGE })
}
