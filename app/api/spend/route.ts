// app/api/spend/route.ts
import { NextResponse } from 'next/server'
import { getSpend } from '@/lib/spend'

const LIMIT = Number(process.env.MONTHLY_SPEND_LIMIT_USD ?? 10)

export async function GET() {
  const { totalUsd } = await getSpend()
  return NextResponse.json({ totalUsd, limitUsd: LIMIT })
}
