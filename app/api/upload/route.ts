import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  try {
    const blob = await put(file.name, file, { access: 'public', storeId: process.env.SPATIALIS_STORE_ID })
    return NextResponse.json({ url: blob.url })
  } catch (err) {
    console.error('[upload] blob put failed:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
