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
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-accent p-6 text-primary-foreground"
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-sm text-primary-foreground/70 mb-1">Available Balance</p>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold">
                {showBalance ? `${currency}${balance.toLocaleString("en-GH", { minimumFractionDigits: 2 })}` : "••••••"}
              </h2>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                {showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <span className="text-2xl font-bold">₵</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/dashboard/wallet" className="flex-1">
            <Button
              variant="secondary"
              className="w-full gap-2 bg-white text-primary hover:bg-white/90"
            >
              <Plus className="w-4 h-4" />
              Add Money
            </Button>
          </Link>
          <Link href="/dashboard/wallet?action=transfer" className="flex-1">
            <Button
              variant="secondary"
              className="w-full gap-2 bg-white/20 text-white hover:bg-white/30 border-0"
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
