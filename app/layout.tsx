import type { Metadata, Viewport } from 'next'
import { Poppins } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { GlobalLoader } from '@/components/loader'
import './globals.css'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-poppins',
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
    icon: '/site-logo.png',
    shortcut: '/site-logo.png',
    apple: '/site-logo.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f59e0b' },
    { media: '(prefers-color-scheme: dark)', color: '#030305' },
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
      <body className={`${poppins.variable} font-sans antialiased`}>
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
