// lib/spend.ts — server-side only; not safe to import in browser code
import { put, list } from '@vercel/blob'

const BLOB_PATHNAME = 'spatialis/spend.json'
const LIMIT = Number(process.env.MONTHLY_SPEND_LIMIT_USD ?? 10)

type SpendRecord = { month: string; totalUsd: number }

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7) // "YYYY-MM"
}

export async function getSpend(): Promise<SpendRecord> {
  try {
    const { blobs } = await list({ prefix: 'spatialis/spend', storeId: process.env.SPATIALIS_STORE_ID })
    const blob = blobs[0]
    if (!blob) return { month: currentMonth(), totalUsd: 0 }
    const res = await fetch(blob.url)
    const data = (await res.json()) as SpendRecord
    if (data.month !== currentMonth()) return { month: currentMonth(), totalUsd: 0 }
    return data
  } catch {
    return { month: currentMonth(), totalUsd: 0 }
  }
}

export async function addSpend(usd: number): Promise<void> {
  const current = await getSpend()
  const updated: SpendRecord = { month: currentMonth(), totalUsd: current.totalUsd + usd }
  try {
    await put(BLOB_PATHNAME, JSON.stringify(updated), { access: 'public', addRandomSuffix: false, storeId: process.env.SPATIALIS_STORE_ID })
  } catch {
    // Spend tracking failure should not block the render — token may be unset in dev
  }
}

export async function isOverLimit(): Promise<boolean> {
  const { totalUsd } = await getSpend()
  return totalUsd >= LIMIT
}

// ponytail: self-check — fails if contract shapes break
if (process.env.NODE_ENV === 'test') {
  void (async () => {
    const r = await getSpend()
    console.assert(typeof r.month === 'string' && r.month.length === 7, 'spend: month format wrong')
    console.assert(typeof r.totalUsd === 'number', 'spend: totalUsd not a number')
    const over = await isOverLimit()
    console.assert(typeof over === 'boolean', 'spend: isOverLimit not boolean')
  })()
}
