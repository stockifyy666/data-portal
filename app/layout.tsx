import type { Metadata } from 'next'
import { Inter, Barlow, Montserrat } from 'next/font/google'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { Toaster } from 'react-hot-toast'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
})

// Ticker symbol names (Chalet-like geometric sans)
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-ticker',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default:  'Stockifyy — Pakistan Stock Market Analytics',
    template: '%s | Stockifyy',
  },
  description:
    'Real-time Pakistan Stock Exchange (PSX) data, charts, ' +
    'and financial analytics powered by Capital Stake.',
  keywords: ['PSX', 'Pakistan Stock Exchange', 'KSE-100', 'stocks', 'heatmap'],
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
      <body className={`${inter.variable} ${barlow.variable} ${montserrat.variable} antialiased`}>
        <ThemeProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 3500,
              style: {
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 500,
              },
              success: {
                iconTheme: { primary: '#FEA500', secondary: '#fff' },
              },
            }}
          />
        </ThemeProvider>
        {/* Vercel Web Analytics — page views only, no cookies or personal data */}
        <Analytics />
      </body>
    </html>
  )
}
