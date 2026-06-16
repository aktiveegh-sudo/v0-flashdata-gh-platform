"use client"

import { motion } from "framer-motion"
import { Wifi, Phone, Wallet, CreditCard, Zap, Tv, LucideIcon } from "lucide-react"
import Link from "next/link"

interface QuickAction {
  id: string
  label: string
  icon: LucideIcon
  href: string
  gradient: string
}

const actions: QuickAction[] = [
  { id: "data", label: "Buy Data", icon: Wifi, href: "/dashboard/buy-data", gradient: "from-blue-500 to-blue-600" },
  { id: "airtime", label: "Buy Airtime", icon: Phone, href: "/dashboard/buy-data?tab=airtime", gradient: "from-green-500 to-green-600" },
  { id: "wallet", label: "Fund Wallet", icon: Wallet, href: "/dashboard/wallet", gradient: "from-purple-500 to-purple-600" },
  { id: "transfer", label: "Transfer", icon: CreditCard, href: "/dashboard/wallet?action=transfer", gradient: "from-orange-500 to-orange-600" },
  { id: "electricity", label: "Electricity", icon: Zap, href: "/dashboard/buy-services", gradient: "from-yellow-500 to-yellow-600" },
  { id: "tv", label: "TV Subscription", icon: Tv, href: "/dashboard/buy-services", gradient: "from-pink-500 to-pink-600" }
]

export function QuickActions() {
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
      {actions.map((action, index) => (
        <motion.div
          key={action.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Link
            href={action.href}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-[#f4c532]/45 hover:bg-[#f4c532]/10"
          >
            <div className={`rounded-xl bg-gradient-to-br p-3 ${action.gradient} transition-transform group-hover:scale-110`}>
              <action.icon className="w-5 h-5 text-white" />
            </div>
            <span className="text-center text-sm font-semibold text-slate-100">{action.label}</span>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
