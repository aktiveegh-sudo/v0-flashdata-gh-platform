"use client"

import { motion } from "framer-motion"
import { Eye, EyeOff, Plus, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import Link from "next/link"

interface WalletCardProps {
  balance: number
  currency?: string
}

export function WalletCard({ balance, currency = "GH₵" }: WalletCardProps) {
  const [showBalance, setShowBalance] = useState(true)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-3xl border border-amber-400/40 bg-gradient-to-br from-white via-amber-50 to-amber-100 p-6 text-gray-900 shadow-md shadow-amber-400/15 dark:border-amber-400/25 dark:from-[#111827] dark:via-[#0f172a] dark:to-[#0b1220] dark:text-white dark:shadow-amber-400/10"
    >
      <div className="absolute -right-8 top-0 h-52 w-52 rounded-full bg-amber-400/20 blur-3xl dark:bg-amber-400/15" />
      <div className="absolute -left-8 bottom-0 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative z-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="mb-1 text-sm text-gray-500 dark:text-white/60">Account Balance</p>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                {showBalance ? `${currency}${balance.toLocaleString("en-GH", { minimumFractionDigits: 2 })}` : "••••••"}
              </h2>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="rounded-lg border border-gray-200 bg-white/80 p-1.5 transition-colors hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                {showBalance ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-400/20 dark:border-amber-400/30 dark:bg-amber-400/15">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-300">₵</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/dashboard/wallet" className="flex-1">
            <Button className="w-full gap-2 rounded-full bg-amber-400 text-black hover:bg-amber-300">
              <Plus className="h-4 w-4" />
              Top Up Now
            </Button>
          </Link>
          <Link href="/dashboard/wallet?action=transfer" className="flex-1">
            <Button variant="outline" className="w-full gap-2 rounded-full border-gray-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
              <ArrowUpRight className="h-4 w-4" />
              Transfer
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
