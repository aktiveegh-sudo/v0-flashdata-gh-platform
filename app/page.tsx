import Link from 'next/link'
import { Bricolage_Grotesque, Space_Grotesk } from 'next/font/google'
import { ArrowRight, BadgeCheck, RadioTower, Rocket, ShieldCheck, Store, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

const headingFont = Bricolage_Grotesque({ subsets: ['latin'], weight: ['700', '800'] })
const bodyFont = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '700'] })

const featureCards = [
  {
    icon: RadioTower,
    title: 'Buy Data Instantly',
    description: 'Complete checkout in seconds from the public Buy Data page. No account needed.',
    href: '/buy-data',
    accent: 'from-sky-300/50 via-cyan-300/25 to-transparent',
  },
  {
    icon: Zap,
    title: 'Other Digital Services',
    description: 'Airtime and additional services are available in one smooth, secure flow.',
    href: '/other-services',
    accent: 'from-emerald-300/45 via-lime-300/20 to-transparent',
  },
  {
    icon: Store,
    title: 'Become an Agent',
    description: 'Launch your own selling channel and manage everything from your Agent Dashboard.',
    href: '/become-agent',
    accent: 'from-amber-300/55 via-yellow-300/28 to-transparent',
  },
]

const trustPoints = ['Fast delivery nationwide', 'Protected payment flow', 'Realtime confirmations', 'Built for Ghana users']

export default function HomePage() {
  return (
    <main className={`min-h-screen overflow-hidden bg-[#050912] text-slate-50 ${bodyFont.className}`}>
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_13%_18%,rgba(255,193,69,0.2),transparent_34%),radial-gradient(circle_at_84%_0%,rgba(26,108,255,0.25),transparent_42%),radial-gradient(circle_at_76%_82%,rgba(21,195,154,0.16),transparent_38%),linear-gradient(165deg,#050912_0%,#060d19_46%,#04070d_100%)]" />

      <section className="mx-auto max-w-7xl px-4 pb-20 pt-8 lg:px-8 lg:pt-10">
        <header className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src="/site-logo.png" alt="FlashData GH" className="h-11 w-11 rounded-xl object-cover ring-2 ring-amber-300/45" />
              <div>
                <p className={`text-xl leading-none text-white ${headingFont.className}`}>FlashData GH</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200/80">Digital Service Hub</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link href="/buy-data"><Button variant="outline" className="border-white/15 bg-white/[0.03] text-slate-100 hover:border-sky-300/55 hover:bg-sky-300/10">Buy Data</Button></Link>
              <Link href="/other-services"><Button variant="outline" className="border-white/15 bg-white/[0.03] text-slate-100 hover:border-emerald-300/55 hover:bg-emerald-300/10">Other Services</Button></Link>
              <Link href="/agent/auth"><Button className="bg-amber-300 text-[#1a1508] hover:bg-amber-200">Agent Login</Button></Link>
            </div>
          </div>
        </header>

        <div className="mt-12 grid items-start gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/35 bg-amber-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
              <Rocket className="h-3.5 w-3.5" />
              Reliable service for everyone
            </div>

            <h1 className={`mt-5 max-w-3xl text-4xl leading-[0.95] text-white sm:text-5xl lg:text-7xl ${headingFont.className}`}>
              The easiest way to buy data and digital services in Ghana.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Skip sign-up friction and buy directly from the public pages. If you want to sell and earn,
              join as an agent and unlock advanced tools.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/buy-data">
                <Button className="h-12 rounded-xl bg-amber-300 px-6 text-base font-bold text-[#18130a] hover:bg-amber-200">
                  Start Buying <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/become-agent">
                <Button variant="outline" className="h-12 rounded-xl border-white/20 bg-white/[0.02] px-6 text-base text-white hover:border-amber-300/55 hover:bg-amber-300/10">
                  Become an Agent
                </Button>
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {trustPoints.map((point) => (
                <div key={point} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-slate-200">
                  <BadgeCheck className="h-4 w-4 text-emerald-300" />
                  {point}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_22px_54px_rgba(0,0,0,0.45)] backdrop-blur-lg sm:p-5">
            <div className="rounded-2xl border border-white/10 bg-[#0a1120] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Live service lanes</p>
              <div className="mt-4 space-y-3">
                {['MTN Data Bundles', 'Telecel Bundles', 'AirtelTigo Bundles', 'Airtime Top-up'].map((item, index) => (
                  <div key={item} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                    <span className="text-sm text-slate-200">{item}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${index % 2 === 0 ? 'bg-emerald-300/20 text-emerald-200' : 'bg-sky-300/20 text-sky-200'}`}>
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/12 p-4 text-amber-100">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4" />
                <p className="text-sm leading-6">
                  Payments are processed securely and orders are created only after verification succeeds.
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-14">
          <div className="flex items-center justify-between gap-3">
            <h2 className={`text-2xl text-white sm:text-3xl ${headingFont.className}`}>Choose your path</h2>
            <p className="text-sm text-slate-400">Built for buyers and agents</p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {featureCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#081121] p-5 transition-transform hover:-translate-y-1"
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accent} opacity-70`} />
                <div className="relative z-10">
                  <div className="inline-flex rounded-xl border border-white/20 bg-white/[0.04] p-2.5">
                    <card.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className={`mt-4 text-2xl text-white ${headingFont.className}`}>{card.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{card.description}</p>
                  <p className="mt-4 inline-flex items-center text-sm font-semibold text-amber-200">
                    Open page <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}
