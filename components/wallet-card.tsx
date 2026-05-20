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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-3xl border border-[#f4c532]/25 bg-gradient-to-br from-[#060d1b] via-[#081328] to-[#070f1d] p-6 text-slate-100"
    >
      {/* Decorative elements */}
      <div className="absolute -right-8 top-0 h-52 w-52 rounded-full bg-[#f4c532]/18 blur-3xl" />
      <div className="absolute -left-8 bottom-0 h-44 w-44 rounded-full bg-emerald-500/14 blur-3xl" />
      <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="mb-1 text-sm text-slate-400">Available Balance</p>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black tracking-tight">
                {showBalance ? `${currency}${balance.toLocaleString("en-GH", { minimumFractionDigits: 2 })}` : "••••••"}
              </h2>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-1.5 transition-colors hover:bg-white/10"
              >
                {showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#f4c532]/30 bg-[#f4c532]/18 backdrop-blur">
            <span className="text-2xl font-bold text-[#f4c532]">₵</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/dashboard/wallet" className="flex-1">
            <Button
              variant="secondary"
              className="w-full gap-2 border border-[#f4c532]/40 bg-[#f4c532] text-[#18120a] hover:bg-[#e2b218]"
            >
              <Plus className="w-4 h-4" />
              Add Money
            </Button>
          </Link>
          <Link href="/dashboard/wallet?action=transfer" className="flex-1">
            <Button
              variant="secondary"
              className="w-full gap-2 border border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.12]"
            >
              <ArrowUpRight className="w-4 h-4" />
              Transfer
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
