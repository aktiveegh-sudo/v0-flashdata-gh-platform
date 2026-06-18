'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles, Store, Users, Wifi } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function WelcomeModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!sessionStorage.getItem('flashdata-welcome-seen')) {
      const timer = window.setTimeout(() => setOpen(true), 800)
      return () => window.clearTimeout(timer)
    }
  }, [])

  const dismiss = () => {
    sessionStorage.setItem('flashdata-welcome-seen', '1')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && dismiss()}>
      <DialogContent className="max-w-lg overflow-hidden border-amber-400/20 bg-white p-0 text-gray-900 dark:bg-[#0a110d] dark:text-white">
        <div className="border-b border-gray-200 bg-gradient-to-r from-amber-400/10 to-transparent px-6 py-5 dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Welcome to FlashData 👋</DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-zinc-300">What would you like to do?</DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-3 p-6">
          {[
            {
              href: '/buy-data',
              icon: Wifi,
              title: 'Buy a data bundle',
              text: 'Purchase MTN, Telecel or AirtelTigo data — no account needed',
            },
            {
              href: '/become-agent',
              icon: Store,
              title: 'Become a data agent',
              text: 'Get wholesale prices, your own store and earn on every sale',
            },
            {
              href: '/become-agent',
              icon: Users,
              title: 'Become a sub-agent',
              text: 'Join under an existing agent and start your own reselling business',
            },
          ].map((item) => (
            <Link
              key={item.title}
              href={item.href}
              onClick={dismiss}
              className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:border-amber-400/30 hover:bg-amber-400/10 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-600 dark:text-amber-300">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold">{item.title}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">{item.text}</p>
              </div>
            </Link>
          ))}
          <Button variant="ghost" className="w-full text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white" onClick={dismiss}>
            Skip tutorial
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function LiveOrderTicker() {
  const orders = [
    { size: '10GB MTN', time: '1 min ago' },
    { size: '5GB AirtelTigo', time: '2 mins ago' },
    { size: '20GB Telecel', time: '2 mins ago' },
    { size: '15GB MTN', time: '5 mins ago' },
    { size: '2GB Telecel', time: '5 mins ago' },
  ]

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/8 dark:bg-white/[0.02]">
      <div className="flex animate-[marquee_28s_linear_infinite] gap-3 px-4 py-3">
        {[...orders, ...orders].map((order, index) => (
          <div
            key={`${order.size}-${index}`}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-300"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {order.size}
            <span className="text-emerald-500/70">{order.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function HomeHeroActions() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
      <Link href="/buy-data">
        <Button className="h-12 rounded-full bg-amber-400 px-6 text-sm font-black text-black hover:bg-amber-300">
          Buy Data Now <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
      <Link href="/become-agent">
        <Button variant="outline" className="h-12 rounded-full border-gray-300 bg-white px-6 text-sm font-bold dark:border-white/10 dark:bg-white/5">
          Become a Data Agent
        </Button>
      </Link>
    </div>
  )
}
