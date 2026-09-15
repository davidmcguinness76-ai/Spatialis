// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
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
        <nav className="border-b px-6 py-3 flex gap-6 items-center">
          <span className="font-semibold text-lg">Spatialis</span>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">Room</Link>
          <Link href="/design" className="text-sm text-muted-foreground hover:text-foreground">Design</Link>
          <Link href="/renders" className="text-sm text-muted-foreground hover:text-foreground">Renders</Link>
        </nav>
        <main className="p-6">{children}</main>
      </body>
    </html>
  )
}
