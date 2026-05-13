import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { GlobalLoader } from '@/components/loader'
import './globals.css'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  title: {
    default: 'FlashData GH - Ghana Data & Airtime Vending Platform',
    template: '%s | FlashData GH',
  },
  description: 'Your trusted partner for instant data bundles, airtime, and bill payments in Ghana. Buy MTN, Airtel-Tigo, Telecel data at the best prices.',
  keywords: ['Ghana data', 'airtime', 'MTN Ghana', 'Airtel-Tigo', 'Telecel', 'mobile money', 'data bundles', 'reseller'],
  authors: [{ name: 'FlashData GH' }],
  creator: 'FlashData GH',
  openGraph: {
    type: 'website',
    locale: 'en_GH',
    url: 'https://flashdata.gh',
    siteName: 'FlashData GH',
    title: 'FlashData GH - Ghana Data & Airtime Vending Platform',
    description: 'Your trusted partner for instant data bundles, airtime, and bill payments in Ghana.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FlashData GH - Ghana Data & Airtime Vending Platform',
    description: 'Your trusted partner for instant data bundles, airtime, and bill payments in Ghana.',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#00C853' },
    { media: '(prefers-color-scheme: dark)', color: '#0A2540' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider>
          <GlobalLoader />
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'hsl(var(--card))',
                color: 'hsl(var(--card-foreground))',
                border: '1px solid hsl(var(--border))',
              },
              success: {
                iconTheme: {
                  primary: 'hsl(var(--primary))',
                  secondary: 'white',
                },
              },
              error: {
                iconTheme: {
                  primary: 'hsl(var(--destructive))',
                  secondary: 'white',
                },
              },
            }}
          />
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
