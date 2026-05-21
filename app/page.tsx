import Link from 'next/link'
import { ArrowRight, BadgeCheck, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getPublicSiteSettings } from '@/lib/site-settings'

export const dynamic = 'force-dynamic'

const networkCards = [
  { name: 'MTN Bundles', color: 'bg-yellow-300 text-black' },
  { name: 'Telecel Bundles', color: 'bg-red-500 text-white' },
  { name: 'AirtelTigo Bundles', color: 'bg-blue-600 text-white' },
  { name: 'AFA Registration', color: 'bg-black text-white border border-white/20' },
]

export default async function HomePage() {
  const settings = await getPublicSiteSettings()
  const siteName = settings?.site_name?.trim() || 'FlashData GH'
  const heroText = settings?.hero_text?.trim() || 'Fast and simple data buying for everyone.'
  const heroVideoUrl = settings?.hero_video_url?.trim() || ''

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img src="/site-logo.png" alt={siteName} className="h-10 w-10 rounded-xl object-cover" />
            <div>
              <p className="text-lg font-black leading-none">{siteName}</p>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600">Data & Services</p>
            </div>
          </div>
          <nav className="hidden items-center gap-2 sm:flex">
            <Link href="/buy-data"><Button variant="outline" className="rounded-full">Buy Data</Button></Link>
            <Link href="/other-services"><Button variant="outline" className="rounded-full">Other Services</Button></Link>
            <Link href="/agent/auth"><Button className="rounded-full bg-black text-white hover:bg-zinc-800">Agent Login</Button></Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-4 pb-8 pt-8 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-black/10 bg-black p-6 text-center text-white sm:p-10">
          {heroVideoUrl ? (
            <>
              <video
                className="absolute inset-0 h-full w-full object-cover"
                src={heroVideoUrl}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                aria-hidden
              />
              <div className="absolute inset-0 bg-black/65" />
            </>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.35),transparent_45%)]" />
          )}

          <div className="relative z-10 mx-auto max-w-3xl">
            <p className="inline-flex items-center rounded-full bg-yellow-300 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-black">
              Trusted in Ghana
            </p>
            <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">{heroText}</h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-zinc-200 sm:text-base">
              Buy data in seconds. No stress. No complex steps.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link href="/buy-data">
                <Button className="h-11 rounded-full bg-yellow-300 px-6 text-sm font-black text-black hover:bg-yellow-200">
                  Buy Data <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/become-agent">
                <Button variant="outline" className="h-11 rounded-full border-white/35 bg-white/10 px-6 text-sm font-bold text-white hover:bg-white/20">
                  Become Agent
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {networkCards.map((card) => (
            <div key={card.name} className={`rounded-2xl p-4 shadow-sm ${card.color}`}>
              <p className="text-sm font-black">{card.name}</p>
              <p className="mt-1 text-xs opacity-90">Ready for purchase</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2">
          {['Instant order confirmation', 'Simple and easy navigation', 'Secure payment checkout', 'Built for mobile users'].map((point) => (
            <div key={point} className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm">
              <BadgeCheck className="h-4 w-4 text-yellow-500" />
              {point}
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600">For Sellers</p>
              <h2 className="mt-1 text-xl font-black">Launch your own store</h2>
            </div>
            <Link href="/become-agent">
              <Button className="rounded-full bg-black text-white hover:bg-zinc-800">
                <Store className="mr-2 h-4 w-4" /> Become an Agent
              </Button>
            </Link>
          </div>
        </section>
      </section>
    </main>
  )
}
