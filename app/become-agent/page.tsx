import Link from 'next/link'
import { ArrowRight, BadgeCheck, BarChart3, Layers, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MainSiteShell } from '@/components/public/main-site-shell'

const benefits = [
  {
    title: 'Agent Dashboard',
    description: 'Manage packages, services, orders, withdrawals and performance from one place.',
    icon: BarChart3,
  },
  {
    title: 'Set your pricing',
    description: 'Control your margins for data and selected services in your store setup.',
    icon: Wallet,
  },
  {
    title: 'Run your storefront',
    description: 'Get a public storefront to receive customer orders without forcing signup.',
    icon: Layers,
  },
]

export default function BecomeAgentPage() {
  return (
    <MainSiteShell activeTab="agent">
      <section className="px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-3xl border border-amber-400/25 bg-gradient-to-br from-amber-400/10 via-transparent to-emerald-400/10 p-8 md:p-14">
            <p className="inline-flex rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-black">
              Become an Agent
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">Start Your Data Reselling Business</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-600 dark:text-white/65 sm:text-base">
              Launch your own mini data store, set your prices, and scale your income with FlashData GH agent tools.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/agent/auth">
                <Button className="h-11 rounded-full bg-amber-400 px-6 font-bold text-black hover:bg-amber-300">
                  Sign Up as Agent <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/agent/auth">
                <Button variant="outline" className="h-11 rounded-full px-6 font-semibold">
                  Already an Agent? Sign In
                </Button>
              </Link>
            </div>
          </div>

          <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => (
              <article
                key={benefit.title}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/8 dark:bg-white/[0.025]"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-black">
                  <benefit.icon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-black">{benefit.title}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-white/55">{benefit.description}</p>
              </article>
            ))}
          </section>

          <div className="mt-8 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-5 text-sm text-emerald-800 dark:text-emerald-200">
            <p className="flex items-center gap-2 font-semibold">
              <BadgeCheck className="h-4 w-4" /> After sign in, agents are redirected to the Agent Dashboard automatically.
            </p>
          </div>
        </div>
      </section>
    </MainSiteShell>
  )
}
