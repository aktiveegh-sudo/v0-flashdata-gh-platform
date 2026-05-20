import Link from 'next/link'
import { ArrowRight, BadgeCheck, Sparkles, Wallet, Wifi, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#ffe9a9_0%,#fff6db_36%,#fff_70%)] text-zinc-900">
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 lg:px-8 lg:pt-16">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200/70 bg-white/70 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <img src="/site-logo.png" alt="FlashData GH" className="h-10 w-10 rounded-full object-cover" />
            <p className="text-sm font-semibold tracking-wide">FlashData GH</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/buy-data">
              <Button variant="outline" className="rounded-xl">Buy Data</Button>
            </Link>
            <Link href="/other-services">
              <Button variant="outline" className="rounded-xl">Other Services</Button>
            </Link>
            <Link href="/become-agent">
              <Button className="rounded-xl">Become an Agent</Button>
            </Link>
          </div>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-amber-100/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
              <Sparkles className="h-4 w-4" />
              Fast, Trusted, Ghana-ready
            </div>
            <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Data and digital services
              <span className="block text-sky-700">for everyone in Ghana.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
              Buy data and services directly from our public pages with no account required. Want to sell and earn?
              Become an agent and access the Agent Dashboard.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/buy-data">
                <Button className="h-12 rounded-xl px-6 text-base">
                  Buy Data Now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/other-services">
                <Button variant="outline" className="h-12 rounded-xl px-6 text-base">Explore Other Services</Button>
              </Link>
              <Link href="/become-agent">
                <Button variant="secondary" className="h-12 rounded-xl px-6 text-base">Become an Agent</Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-zinc-900"><Wifi className="h-4 w-4 text-sky-600" /> <span className="font-semibold">Public Buy Data</span></div>
              <p className="mt-2 text-sm text-zinc-600">Any user can buy from our public buy-data page without creating an account.</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-zinc-900"><Wrench className="h-4 w-4 text-emerald-600" /> <span className="font-semibold">Other Services</span></div>
              <p className="mt-2 text-sm text-zinc-600">Access additional digital services quickly from the public other-services page.</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-zinc-900"><Wallet className="h-4 w-4 text-amber-600" /> <span className="font-semibold">Agent Opportunity</span></div>
              <p className="mt-2 text-sm text-zinc-600">Sign up to become an agent, get your own pricing controls, store tools, and Agent Dashboard.</p>
            </div>
          </div>
        </div>

        <section className="mt-14 rounded-2xl border border-zinc-200 bg-white/80 p-6">
          <h2 className="text-xl font-bold">Why choose FlashData GH?</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {['Instant checkout', 'Secure payments', 'Realtime updates', 'Agent earnings'].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
                <BadgeCheck className="h-4 w-4 text-green-600" /> {item}
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}
