'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

type MainSiteShellProps = {
  children: React.ReactNode
  activeTab?: 'home' | 'products' | 'services' | 'become-agent'
}

const navClass =
  'rounded-full border border-yellow-300/20 bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-[0.11em] text-zinc-200 hover:border-yellow-300/70 hover:bg-yellow-300/10'

const mobileLinkClass =
  'block rounded-xl border border-yellow-300/20 bg-black/40 px-3 py-2 text-xs font-semibold uppercase tracking-[0.11em] text-zinc-100 hover:bg-yellow-300/10'

export function MainSiteShell({ children, activeTab = 'home' }: MainSiteShellProps) {
  return (
    <main className="min-h-screen bg-[#05070b] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_85%_10%,rgba(250,204,21,0.22),transparent_38%),radial-gradient(circle_at_15%_0%,rgba(20,80,180,0.2),transparent_36%),linear-gradient(180deg,#0a0f1d_0%,#06080f_50%,#030407_100%)]" />

      <header className="sticky top-0 z-20 border-b border-yellow-300/20 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-300 text-sm font-black text-black">⚡</div>
            <p className="text-sm font-black sm:text-lg">
              <span className="text-white">FlashData</span>
              <span className="text-yellow-300"> GH</span>
            </p>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <Link href="/" className={activeTab === 'home' ? 'rounded-full bg-yellow-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.11em] text-black' : navClass}>Home</Link>
            <Link href="/buy-data" className={activeTab === 'products' ? 'rounded-full bg-yellow-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.11em] text-black' : navClass}>Products</Link>
            <Link href="/other-services" className={activeTab === 'services' ? 'rounded-full bg-yellow-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.11em] text-black' : navClass}>Services</Link>
            <Link href="/become-agent" className={activeTab === 'become-agent' ? 'rounded-full bg-yellow-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.11em] text-black' : navClass}>Become Agent</Link>
          </nav>

          <div className="flex items-center gap-2">
            <details className="relative md:hidden">
              <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-yellow-300/30 bg-transparent text-lg text-yellow-300">
                <span aria-hidden>☰</span>
                <span className="sr-only">Open menu</span>
              </summary>
              <div className="absolute right-0 z-30 mt-2 w-52 rounded-2xl border border-yellow-300/20 bg-black/95 p-2 shadow-xl backdrop-blur-md">
                <Link href="/" className={mobileLinkClass}>Home</Link>
                <Link href="/buy-data" className={`${mobileLinkClass} mt-2`}>Products</Link>
                <Link href="/other-services" className={`${mobileLinkClass} mt-2`}>Services</Link>
                <Link href="/become-agent" className={`${mobileLinkClass} mt-2`}>Become Agent</Link>
                <Link href="/dashboard" className={`${mobileLinkClass} mt-2`}>Dashboard</Link>
              </div>
            </details>
            <Link href="/dashboard">
              <Button className="h-9 rounded-full bg-yellow-300 px-4 text-xs font-semibold uppercase tracking-[0.11em] text-black hover:bg-yellow-200">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>

      <footer className="border-t border-yellow-300/20 bg-black/70">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 text-sm sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <p className="text-lg font-black text-white">
              <span>FlashData</span>
              <span className="text-yellow-300"> GH</span>
            </p>
            <p className="mt-2 text-zinc-400">Buy data instantly. Earn as an agent.</p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-[0.11em] text-zinc-300">Products</p>
            <div className="mt-2 space-y-1 text-zinc-400">
              <p>MTN Data</p>
              <p>Telecel Data</p>
              <p>AirtelTigo Data</p>
              <p>Result Checkers</p>
            </div>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-[0.11em] text-zinc-300">Company</p>
            <div className="mt-2 space-y-1 text-zinc-400">
              <p>Become an Agent</p>
              <p>Track Order</p>
              <p>Agent Login</p>
            </div>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-[0.11em] text-zinc-300">Support</p>
            <div className="mt-2 space-y-1 text-zinc-400">
              <p>Instant help via WhatsApp</p>
              <p>Fast issue resolution</p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
