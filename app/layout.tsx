import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default:  'Stockifyy — Pakistan Stock Market Analytics',
    template: '%s | Stockifyy',
  },
  description:
    'Real-time Pakistan Stock Exchange (PSX) data, charts, mutual funds, ' +
    'and financial analytics powered by Capital Stake.',
  keywords: ['PSX', 'Pakistan Stock Exchange', 'KSE-100', 'mutual funds', 'stocks'],
  authors: [{ name: 'Stockifyy' }],
  robots: { index: false, follow: false },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
