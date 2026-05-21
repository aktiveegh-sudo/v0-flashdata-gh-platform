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
    <main className="min-h-screen bg-white px-4 py-10 text-black lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="rounded-3xl border border-zinc-200 bg-black p-8 text-white shadow-sm">
          <p className="inline-flex rounded-full bg-yellow-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-black">Become an Agent</p>
          <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">Grow with FlashData GH</h1>
          <p className="mt-4 max-w-3xl text-base text-zinc-200 sm:text-lg">
            Join as an agent to unlock your Agent Dashboard, manage your pricing, and run your own store on the platform.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/agent/auth">
              <Button className="h-11 rounded-full bg-yellow-300 px-6 text-black hover:bg-yellow-200">Sign Up as Agent <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
            <Link href="/agent/auth">
              <Button variant="outline" className="h-11 rounded-full border-white/40 bg-white/10 px-6 text-white hover:bg-white/20">Already an Agent? Sign In</Button>
            </Link>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit, index) => (
            <article key={benefit.title} className={`rounded-2xl border p-5 shadow-sm ${index === 0 ? 'border-yellow-300 bg-yellow-50' : index === 1 ? 'border-zinc-300 bg-white' : 'border-zinc-900 bg-zinc-100'}`}>
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-black text-yellow-300">
                <benefit.icon className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-black">{benefit.title}</h2>
              <p className="mt-2 text-sm text-zinc-600">{benefit.description}</p>
            </article>
          ))}
        </section>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-800">
          <p className="flex items-center gap-2 font-semibold"><BadgeCheck className="h-4 w-4 text-yellow-500" /> After sign in, agents are redirected to the Agent Dashboard automatically.</p>
        </div>
      </div>
    </main>
  )
}
