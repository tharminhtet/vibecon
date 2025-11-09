import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Git Learning Program',
  description: 'Learn from your git commits',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}