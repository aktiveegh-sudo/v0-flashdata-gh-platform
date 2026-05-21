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
    <MainSiteShell activeTab="become-agent">
      <section className="rounded-3xl border border-yellow-300/20 bg-[#0a1223] p-6 sm:p-8">
        <p className="inline-flex rounded-full bg-yellow-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-black">Become an Agent</p>
        <h1 className="mt-3 text-4xl font-black leading-tight text-white sm:text-5xl">Grow with FlashData GH</h1>
        <p className="mt-4 max-w-3xl text-base text-zinc-200 sm:text-lg">
          Launch your own mini data store, set your prices, and scale your income with our agent tools.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/agent/auth">
            <Button className="h-11 rounded-full bg-yellow-300 px-6 text-black hover:bg-yellow-200">Sign Up as Agent <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
          <Link href="/agent/auth">
            <Button variant="outline" className="h-11 rounded-full border-yellow-300/40 bg-transparent px-6 text-zinc-100 hover:bg-yellow-300/10">Already an Agent? Sign In</Button>
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {benefits.map((benefit) => (
          <article key={benefit.title} className="rounded-2xl border border-yellow-300/20 bg-[#0a111d] p-5 shadow-sm">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-300 text-black">
              <benefit.icon className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-black text-white">{benefit.title}</h2>
            <p className="mt-2 text-sm text-zinc-400">{benefit.description}</p>
          </article>
        ))}
      </section>

      <div className="mt-8 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5 text-sm text-emerald-100">
        <p className="flex items-center gap-2 font-semibold"><BadgeCheck className="h-4 w-4" /> After sign in, agents are redirected to the Agent Dashboard automatically.</p>
      </div>
    </MainSiteShell>
  )
}
