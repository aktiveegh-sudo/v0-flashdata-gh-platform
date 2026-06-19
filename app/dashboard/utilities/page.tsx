'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, ShoppingBag, Store, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardPageShell, DashboardPanel } from '@/components/dashboard/page-shell'

const cards = [
  {
    title: 'Buy Other Services',
    description: 'Purchase digital services at agent wholesale rates using your wallet balance.',
    href: '/dashboard/buy-services',
    icon: ShoppingBag,
    cta: 'Browse & buy',
  },
  {
    title: 'Store Service Pricing',
    description: 'Add profit margins to platform services and publish them on your agent store.',
    href: '/dashboard/other-services',
    icon: Store,
    cta: 'Set store prices',
  },
]

export default function OtherServicesHubPage() {
  return (
    <DashboardPageShell
      title="Other Services"
      description="Buy services for yourself or configure what your store customers can purchase."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card, index) => (
          <motion.div
            key={card.href}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            <DashboardPanel className="h-full">
              <div className="flex h-full flex-col gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-600 dark:text-amber-300">
                  <card.icon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white">{card.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-gray-500 dark:text-white/55">{card.description}</p>
                </div>
                <Button asChild className="mt-auto w-fit rounded-full bg-amber-400 text-black hover:bg-amber-300">
                  <Link href={card.href} className="gap-2">
                    {card.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </DashboardPanel>
          </motion.div>
        ))}
      </div>

      <DashboardPanel title="How it works" className="mt-6">
        <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-white/60">
          <Zap className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <p>
            FlashData admins publish services with user and agent prices. You buy at agent rates, then set your own
            selling price so customers can purchase from your store checkout.
          </p>
        </div>
      </DashboardPanel>
    </DashboardPageShell>
  )
}
