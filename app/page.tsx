import Link from 'next/link'
import { ArrowRight, BadgeCheck, Clock3, ShieldCheck, TrendingUp } from 'lucide-react'
import { HeroVideoBackground } from '@/components/public/hero-video-background'
import { MainSiteShell } from '@/components/public/main-site-shell'
import { HomeHeroActions, LiveOrderTicker, WelcomeModal } from '@/components/public/swift-home-sections'
import { getPublicSiteSettings } from '@/lib/site-settings'
import { getPublicStats } from '@/lib/public-stats'

export const dynamic = 'force-dynamic'

const steps = [
  { step: '01', title: 'Pick Your Network', text: 'Choose MTN, Telecel or AirtelTigo and select your bundle size.' },
  { step: '02', title: 'Pay Securely', text: 'Pay with Mobile Money or card. Every payment is protected by Paystack.' },
  { step: '03', title: 'Receive Instantly', text: 'Data lands on the recipient line in 10 to 60 minutes. No account needed.' },
]

const faqs = [
  {
    q: 'How fast is data delivery on FlashData GH?',
    a: 'Most orders are delivered in 10 to 60 minutes after Paystack confirms payment. Available 24/7.',
  },
  {
    q: 'Are FlashData GH bundles non-expiry?',
    a: 'All data bundles are non-expiry — use them at your own pace, anytime.',
  },
  {
    q: 'Can I pay with Mobile Money (MoMo)?',
    a: 'Yes. Pick a bundle and pay directly with MoMo or card. No sign-up required.',
  },
  {
    q: 'Can I resell data and earn money?',
    a: 'Yes. Become an agent to unlock wholesale prices, your own store, profit tracking, and withdrawals.',
  },
]

export default async function HomePage() {
  const [settings, publicStats] = await Promise.all([getPublicSiteSettings(), getPublicStats()])
  const heroText = settings?.hero_text?.trim() || 'Cheapest Non-Expiry Data Bundles Ghana'
  const heroVideoUrl = settings?.hero_video_url?.trim() || ''

  const stats = [
    { value: `${publicStats.totalDelivered.toLocaleString()}+`, label: 'Bundles delivered' },
    { value: publicStats.successRate, label: 'Delivery success rate' },
    { value: publicStats.avgDelivery, label: 'Average delivery time' },
    { value: `${publicStats.totalAgents.toLocaleString()}+`, label: 'Active resellers' },
  ]

  return (
    <MainSiteShell activeTab="home">
      <WelcomeModal />

      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-4 py-16 md:min-h-[85vh] md:py-24">
        {heroVideoUrl ? (
          <>
            <HeroVideoBackground src={heroVideoUrl} />
            <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_8%,rgba(245,158,11,0.18),transparent_42%)]" />
            <div className="absolute -top-8 left-1/2 h-[200px] w-[900px] -translate-x-1/2 rounded-full bg-amber-400/10 blur-[80px]" />
          </>
        )}

        <div className="relative z-20 mx-auto max-w-5xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3.5 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-300">
            <BadgeCheck className="h-3.5 w-3.5" />
            Join 50,000+ Followers
          </div>
          <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
              {heroText}
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-sm leading-7 text-gray-600 dark:text-white/70 sm:text-base">
            Buy cheap non-expiry MTN, Telecel &amp; AirtelTigo data bundles in Ghana. Safe delivery in 10 to 60 minutes — secured by Paystack. No account needed.
          </p>
          <div className="mt-8">
            <HomeHeroActions />
          </div>
          <div className="mt-10">
            <LiveOrderTicker />
          </div>
        </div>
      </section>

      <section className="border-y border-gray-200 bg-white py-6 dark:border-white/6 dark:bg-white/[0.018]">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 text-center md:grid-cols-4 sm:px-6">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-black text-amber-500 md:text-3xl">{stat.value}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-gray-500 dark:text-white/45">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-16 md:py-24 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-center text-xs font-bold uppercase tracking-[0.16em] text-amber-500">Buy Data in 3 Steps</p>
          <h2 className="mt-2 text-center text-3xl font-black">No Account Needed</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {steps.map((item) => (
              <article key={item.step} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/8 dark:bg-white/[0.025]">
                <p className="text-sm font-black text-amber-500">{item.step}</p>
                <h3 className="mt-2 text-lg font-black">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-gray-500 dark:text-white/55">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-gray-200 px-4 py-16 dark:border-white/6 md:py-24 sm:px-6">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-500">Why people choose us</p>
          <h2 className="mt-2 text-3xl font-black">Ghana&apos;s #1 Data Bundle Store</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-500 dark:text-white/50">
            Fast, secure, and built for Ghana. Everything you need from a modern data vending service.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Clock3, title: 'Instant Delivery', text: 'Data lands in seconds after payment confirmation.' },
              { icon: ShieldCheck, title: 'Paystack Secured', text: 'Every payment protected. Delivery or full refund.' },
              { icon: TrendingUp, title: 'Agent Economy', text: 'Sell data, build your store, and earn profits.' },
              { icon: BadgeCheck, title: 'Non-Expiry Bundles', text: 'Use your bundles at your own pace, anytime.' },
            ].map((item) => (
              <article key={item.title} className="rounded-2xl border border-gray-200 bg-white p-5 text-left dark:border-white/8 dark:bg-white/[0.02]">
                <item.icon className="h-5 w-5 text-amber-500" />
                <h3 className="mt-3 font-black">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-white/50">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:py-24 sm:px-6">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-amber-400/25 bg-gradient-to-br from-amber-400/10 via-transparent to-emerald-400/10 p-8 md:p-14">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-600 dark:text-amber-300">Agent &amp; Reseller Program</p>
              <h2 className="mt-3 text-3xl font-black md:text-4xl">Start Your Data Reselling Business</h2>
              <p className="mt-4 text-sm leading-7 text-gray-600 dark:text-white/65">
                Activate agent access to unlock wholesale MTN, Telecel &amp; AirtelTigo prices, profit tracking, and your own Paystack-powered public store — all in one platform.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {['Wholesale prices', 'Your own store', 'Profit tracking', 'Sub-agents'].map((tag) => (
                  <span key={tag} className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-200">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0d140d]/90 p-5 text-white backdrop-blur-xl">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-300">One-time setup</p>
              <h3 className="mt-2 text-2xl font-black">Launch your own data store.</h3>
              <p className="mt-2 text-sm text-zinc-300">Wallet, referral link, API access, store orders and rewards.</p>
              <Link href="/become-agent" className="mt-5 inline-flex">
                <span className="inline-flex items-center rounded-full bg-amber-400 px-5 py-3 text-sm font-black text-black hover:bg-amber-300">
                  Become a Data Agent <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-200 px-4 py-16 dark:border-white/6 md:py-24 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-black">Frequently Asked Questions</h2>
          <p className="mt-2 text-center text-sm text-gray-500 dark:text-white/45">
            Everything you need to know about buying data bundles in Ghana.
          </p>
          <div className="mt-8 divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-white/6 dark:border-white/8 dark:bg-white/[0.02]">
            {faqs.map((item) => (
              <div key={item.q} className="px-5 py-4">
                <p className="font-bold">{item.q}</p>
                <p className="mt-2 text-sm leading-7 text-gray-500 dark:text-white/55">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MainSiteShell>
  )
}
