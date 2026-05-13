"use client"

import { motion } from "framer-motion"
import { ArrowUpRight, ArrowDownLeft, Wifi, Phone, Zap, CreditCard } from "lucide-react"

type TransactionType = "data" | "airtime" | "deposit" | "withdrawal" | "electricity"

interface TransactionItemProps {
  id: string
  type: TransactionType
  title: string
  description: string
  amount: number
  status: "completed" | "pending" | "failed"
  date: string
  isCredit?: boolean
  delay?: number
}

const typeIcons: Record<TransactionType, typeof Wifi> = {
  data: Wifi,
  airtime: Phone,
  deposit: ArrowDownLeft,
  withdrawal: ArrowUpRight,
  electricity: Zap
}

const typeColors: Record<TransactionType, string> = {
  data: "from-blue-500 to-blue-600",
  airtime: "from-green-500 to-green-600",
  deposit: "from-emerald-500 to-emerald-600",
  withdrawal: "from-orange-500 to-orange-600",
  electricity: "from-yellow-500 to-yellow-600"
}

const statusColors: Record<string, string> = {
  completed: "bg-green-500/10 text-green-500",
  pending: "bg-yellow-500/10 text-yellow-500",
  failed: "bg-red-500/10 text-red-500"
}

export function TransactionItem({
  type,
  title,
  description,
  amount,
  status,
  date,
  isCredit = false,
  delay = 0
}: TransactionItemProps) {
  const Icon = typeIcons[type] || CreditCard

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors"
    >
      <div className={`p-3 rounded-xl bg-gradient-to-br ${typeColors[type]}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground truncate">{title}</p>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground truncate">{description}</p>
      </div>

      <div className="text-right">
        <p className={`font-semibold ${isCredit ? "text-green-500" : "text-foreground"}`}>
          {isCredit ? "+" : "-"}GH₵{amount.toFixed(2)}
        </p>
        <p className="text-xs text-muted-foreground">{date}</p>
      </div>
    </motion.div>
  )
}
