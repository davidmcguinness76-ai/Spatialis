// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import Image from 'next/image'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Spatialis',
  description: 'Room redesign visualiser',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="sticky top-0 z-50 bg-background border-b px-6 py-3 flex gap-6 items-center">
          <Link href="/"><Image src="/logo.svg" alt="Spatialis" width={120} height={36} priority style={{ mixBlendMode: 'multiply' }} /></Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">Room</Link>
          <Link href="/design" className="text-sm text-muted-foreground hover:text-foreground">Design</Link>
          <Link href="/renders" className="text-sm text-muted-foreground hover:text-foreground">Renders</Link>
          {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA && (
            <span className="ml-auto text-xs text-muted-foreground font-mono">
              {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 7)}
            </span>
          )}
        </nav>
        <main className="p-6">{children}</main>
      </body>
    </html>
  )
}
