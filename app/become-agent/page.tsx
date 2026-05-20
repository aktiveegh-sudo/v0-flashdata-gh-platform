'use client'

import Link from 'next/link'
import { ArrowRight, BadgeCheck, BarChart3, Layers, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'

const benefits = [
  {
    title: 'Agent Dashboard',
    description: 'Manage packages, services, orders, withdrawals, and performance from one place.',
    icon: BarChart3,
  },
  {
    title: 'Set your pricing',
    description: 'Control your margins for data and selected services in your store setup.',
    icon: Wallet,
  },
  {
    title: 'Run your storefront',
    description: 'Get a public storefront to receive customer orders without forcing customer signup.',
    icon: Layers,
  },
]

export default function BecomeAgentPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e0f2fe_0%,#f8fafc_45%,#ffffff_100%)] px-4 py-10 text-zinc-900 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="rounded-3xl border border-zinc-200 bg-white/85 p-8 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Become an Agent</p>
          <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">Grow with FlashData GH</h1>
          <p className="mt-4 max-w-3xl text-base text-zinc-600 sm:text-lg">
            Join as an agent to unlock your Agent Dashboard, manage your pricing, and run your own store on the platform.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/agent/auth">
              <Button className="h-11 rounded-xl px-6">Sign Up as Agent <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
            <Link href="/agent/auth">
              <Button variant="outline" className="h-11 rounded-xl px-6">Already an Agent? Sign In</Button>
            </Link>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit) => (
            <article key={benefit.title} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <benefit.icon className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold">{benefit.title}</h2>
              <p className="mt-2 text-sm text-zinc-600">{benefit.description}</p>
            </article>
          ))}
        </section>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-sm text-emerald-900">
          <p className="flex items-center gap-2 font-semibold"><BadgeCheck className="h-4 w-4" /> After sign in, agents are redirected to the Agent Dashboard automatically.</p>
        </div>
      </div>
    </main>
  )
}
