"use client"

import { motion } from "framer-motion"
import { Gift, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import toast from "react-hot-toast"

interface ReferralBannerProps {
  referralCode: string
  referralLink: string
}

export function ReferralBanner({ referralCode, referralLink }: ReferralBannerProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    toast.success("Referral link copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-accent p-6 text-primary-foreground"
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-shrink-0">
          <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
            <Gift className="w-8 h-8" />
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-xl font-bold mb-1">Invite Friends & Earn</h3>
          <p className="text-primary-foreground/80 text-sm mb-3">
            Share your referral code and earn GH₵5.00 for every friend who signs up and makes their first purchase!
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2 bg-white/20 backdrop-blur rounded-lg">
              <span className="text-sm opacity-80">Your Code:</span>
              <span className="ml-2 font-mono font-bold">{referralCode}</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={copyToClipboard}
              className="gap-2 bg-white text-primary hover:bg-white/90"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
