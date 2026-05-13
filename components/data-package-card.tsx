"use client"

import { motion } from "framer-motion"
import { Zap, Check } from "lucide-react"

interface DataPackageCardProps {
  id: string
  name: string
  data: string
  price: number
  validity: string
  isPopular?: boolean
  isSelected?: boolean
  onSelect: (id: string) => void
  delay?: number
}

export function DataPackageCard({
  id,
  name,
  data,
  price,
  validity,
  isPopular,
  isSelected,
  onSelect,
  delay = 0
}: DataPackageCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(id)}
      className={`relative w-full p-4 rounded-2xl border-2 text-left transition-all ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 bg-card"
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent text-accent-foreground text-xs font-medium rounded-full flex items-center gap-1">
          <Zap className="w-3 h-3" />
          Popular
        </div>
      )}

      {isSelected && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
          <Check className="w-4 h-4 text-primary-foreground" />
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{name}</p>
        <p className="text-2xl font-bold text-foreground">{data}</p>
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-primary">GH₵{price.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground">{validity}</p>
        </div>
      </div>
    </motion.button>
  )
}
