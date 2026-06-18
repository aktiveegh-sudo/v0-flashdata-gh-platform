'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeSwitcher } from '@/components/theme-switcher'

type MainSiteShellProps = {
  children: React.ReactNode
  activeTab?: 'home' | 'buy-data' | 'buy-airtime' | 'track-order' | 'agent'
}

const navItems = [
  { label: 'Home', href: '/', key: 'home' as const },
  { label: 'Buy Data', href: '/buy-data', key: 'buy-data' as const },
  { label: 'Buy Airtime', href: '/buy-airtime', key: 'buy-airtime' as const },
  { label: 'Track Order', href: '/track-order', key: 'track-order' as const },
  { label: 'Agent', href: '/become-agent', key: 'agent' as const },
]

export function MainSiteShell({ children, activeTab = 'home' }: MainSiteShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[#030305] dark:text-white">
      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/80 backdrop-blur-xl dark:border-white/6 dark:bg-[#030305]/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-sm font-black text-black shadow-sm shadow-amber-400/20">
              FD
            </div>
            <div>
              <p className="text-sm font-black leading-none sm:text-base">
                FlashData <span className="text-amber-500">GH</span>
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-white/40">Secure Gateway</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={
                  activeTab === item.key
                    ? 'rounded-full bg-amber-400 px-4 py-2 text-xs font-bold uppercase tracking-wide text-black'
                    : 'rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white'
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <Link href="/dashboard" className="hidden sm:block">
              <Button className="h-9 rounded-full bg-amber-400 px-4 text-xs font-bold uppercase tracking-wide text-black hover:bg-amber-300">
                Dashboard
              </Button>
            </Link>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 lg:hidden dark:border-white/10 dark:bg-white/5 dark:text-white"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Open menu"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="border-t border-gray-200 px-4 py-3 dark:border-white/6 lg:hidden">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold dark:border-white/8 dark:bg-white/[0.03]"
                >
                  {item.label}
                </Link>
              ))}
              <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                <Button className="mt-1 w-full rounded-xl bg-amber-400 text-black hover:bg-amber-300">Dashboard</Button>
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <main>{children}</main>

      <footer className="border-t border-gray-200 bg-white dark:border-white/6 dark:bg-[#030305]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
          <div>
            <p className="text-lg font-black">
              FlashData <span className="text-amber-500">GH</span>
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-white/45">
              Ghana&apos;s #1 data bundle store. Buy MTN, Telecel and AirtelTigo data with instant delivery.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-700 dark:text-white/70">Products</p>
            <div className="mt-3 space-y-2 text-sm text-gray-500 dark:text-white/45">
              <Link href="/buy-data" className="block hover:text-amber-500">MTN Data</Link>
              <Link href="/buy-data?network=telecel" className="block hover:text-amber-500">Telecel Data</Link>
              <Link href="/buy-data?network=airtel-tigo" className="block hover:text-amber-500">AirtelTigo Data</Link>
              <Link href="/other-services" className="block hover:text-amber-500">Digital Services</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-700 dark:text-white/70">Company</p>
            <div className="mt-3 space-y-2 text-sm text-gray-500 dark:text-white/45">
              <Link href="/become-agent" className="block hover:text-amber-500">Become an Agent</Link>
              <Link href="/track-order" className="block hover:text-amber-500">Track Order</Link>
              <Link href="/agent/auth" className="block hover:text-amber-500">Agent Login</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-700 dark:text-white/70">Support</p>
            <div className="mt-3 space-y-2 text-sm text-gray-500 dark:text-white/45">
              <p>Instant help via WhatsApp</p>
              <p>Paystack secured payments</p>
              <p>Delivery in 10-60 minutes</p>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200 px-4 py-4 text-center text-xs text-gray-400 dark:border-white/6 dark:text-white/30">
          © {new Date().getFullYear()} FlashData GH. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
