import Link from 'next/link'
import { ArrowRight, BadgeCheck, Clock3, ShieldCheck, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MainSiteShell } from '@/components/public/main-site-shell'
import { getPublicSiteSettings } from '@/lib/site-settings'

export const dynamic = 'force-dynamic'

const formatStat = [
  { value: '10,287', label: 'Bundles delivered' },
  { value: '99.4%', label: 'Delivery success' },
  { value: '10-60 min', label: 'Average delivery time' },
  { value: '281', label: 'Active resellers' },
]

export default async function HomePage() {
  const settings = await getPublicSiteSettings()
  const siteName = settings?.site_name?.trim() || 'Aktivee Data'
  const heroText = settings?.hero_text?.trim() || 'Cheapest Non-Expiry Data Bundles Ghana'
  const heroVideoUrl = settings?.hero_video_url?.trim() || ''

  return (
    <MainSiteShell activeTab="home" siteName={siteName}>
      <section className="relative overflow-hidden rounded-3xl border border-yellow-300/20 bg-[#0b111f] p-6 sm:p-10">
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
            <div className="absolute inset-0 bg-black/60" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_8%,rgba(250,204,21,0.28),transparent_42%)]" />
        )}

        <div className="relative z-10 max-w-3xl">
          <p className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-200">
            Trusted by 10,000+ Ghanaians
          </p>
          <h1 className="mt-5 text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
            {heroText}
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-zinc-200 sm:text-base">
            Buy MTN, Telecel and AirtelTigo data in seconds. Build your own mini-store and grow daily income.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/buy-data">
              <Button className="h-11 rounded-full bg-yellow-300 px-6 text-sm font-black text-black hover:bg-yellow-200">
                Buy Data Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/become-agent">
              <Button variant="outline" className="h-11 rounded-full border-yellow-300/40 bg-transparent px-6 text-sm font-semibold text-white hover:bg-yellow-300/10">
                Become an Agent
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-3 border-y border-yellow-300/20 py-4 sm:grid-cols-2 lg:grid-cols-4">
        {formatStat.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-yellow-300/15 bg-black/30 p-4">
            <p className="text-xl font-black text-yellow-300">{stat.value}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-zinc-400">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-yellow-300">Why people choose us</p>
        <h2 className="mt-2 text-center text-3xl font-black text-white">Ghana&apos;s Data Bundle Store</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Clock3, title: 'Instant Delivery', text: 'Data and pins delivered in seconds.' },
            { icon: ShieldCheck, title: 'Secure Payments', text: 'Momo and card payments protected.' },
            { icon: TrendingUp, title: 'Agent Economy', text: 'Sell data, build your store, earn profits.' },
            { icon: BadgeCheck, title: 'Real Profits', text: 'Wallet, withdrawals and rewards.' },
          ].map((item) => (
            <article key={item.title} className="rounded-2xl border border-yellow-300/20 bg-[#0a0f1a] p-5">
              <item.icon className="h-5 w-5 text-yellow-300" />
              <h3 className="mt-3 text-lg font-black text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-zinc-400">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-yellow-300/20 bg-yellow-300 p-6 text-black sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">One-time setup fee</p>
            <h2 className="mt-2 text-3xl font-black">Launch your own data store.</h2>
            <p className="mt-2 text-sm text-black/80">Get a mini-store, wallet, referral link, API access and rewards.</p>
          </div>
          <Link href="/become-agent">
            <Button className="rounded-full bg-black px-6 text-sm font-semibold text-yellow-300 hover:bg-zinc-900">Start Earning Today</Button>
          </Link>
        </div>
      </section>
    </MainSiteShell>
  )
}
