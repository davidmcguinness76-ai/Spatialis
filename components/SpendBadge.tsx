// components/SpendBadge.tsx
'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'

export default function SpendBadge() {
  const [label, setLabel] = useState('Loading spend...')

  useEffect(() => {
    fetch('/api/spend')
      .then((r) => r.json())
      .then(({ totalUsd, limitUsd }: { totalUsd: number; limitUsd: number }) => {
        setLabel(`$${totalUsd.toFixed(2)} of $${limitUsd.toFixed(2)} used this month`)
      })
      .catch(() => setLabel('Spend unavailable'))
  }, [])

  return <Badge variant="outline">{label}</Badge>
}
