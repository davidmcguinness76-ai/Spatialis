import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const blob = await put(file.name, file, { access: 'public', storeId: process.env.SPATIALIS_STORE_ID })
  return NextResponse.json({ url: blob.url })
}
