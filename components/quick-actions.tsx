'use client'

import { motion } from 'framer-motion'
import {
  Wifi,
  Phone,
  Wallet,
  Share2,
  Sparkles,
  Store,
  ShoppingCart,
  Zap,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'

type QuickAction = {
  id: string
  label: string
  icon: LucideIcon
  href: string
  gradient: string
}

const actions: QuickAction[] = [
  { id: 'data', label: 'Buy Data', icon: Wifi, href: '/dashboard/buy-data/mtn', gradient: 'from-yellow-400 to-amber-500' },
  { id: 'topup', label: 'Top Up', icon: Wallet, href: '/dashboard/wallet', gradient: 'from-emerald-500 to-green-600' },
  { id: 'airtime', label: 'Buy Airtime', icon: Phone, href: '/dashboard/buy-airtime', gradient: 'from-sky-500 to-blue-600' },
  { id: 'afa', label: 'AFA', icon: Sparkles, href: '/dashboard/afa', gradient: 'from-violet-500 to-purple-600' },
  { id: 'store', label: 'My Store', icon: Store, href: '/dashboard/my-store', gradient: 'from-orange-500 to-amber-600' },
  { id: 'orders', label: 'Orders', icon: ShoppingCart, href: '/dashboard/store-orders', gradient: 'from-rose-500 to-red-600' },
  { id: 'utilities', label: 'Services', icon: Zap, href: '/dashboard/utilities', gradient: 'from-cyan-500 to-teal-600' },
  { id: 'referral', label: 'Referral', icon: Share2, href: '/dashboard/referral', gradient: 'from-indigo-500 to-blue-600' },
  { id: 'support', label: 'WhatsApp', icon: MessageCircle, href: '/dashboard/contact-support', gradient: 'from-green-500 to-emerald-600' },
]

export function QuickActions() {
  return (
    <div className="grid grid-cols-3 gap-3 md:grid-cols-5 xl:grid-cols-9">
      {actions.map((action, index) => (
        <motion.div
          key={action.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04 }}
        >
          <Link
            href={action.href}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white p-3 transition-all hover:border-amber-400/40 hover:shadow-md dark:border-white/8 dark:bg-white/[0.03]"
          >
            <div className={`rounded-xl bg-gradient-to-br p-2.5 ${action.gradient} transition-transform group-hover:scale-110`}>
              <action.icon className="h-4 w-4 text-white" />
            </div>
            <span className="text-center text-xs font-semibold text-gray-700 dark:text-white">{action.label}</span>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
