"use client"

import { motion } from "framer-motion"
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  gradient?: string
  delay?: number
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  gradient = "from-primary to-accent",
  delay = 0
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#091225] via-[#071222] to-[#050b18] p-6"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10 blur-3xl transition-opacity duration-300 group-hover:opacity-25`} />
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={`rounded-xl bg-gradient-to-br p-3 ${gradient} shadow-lg`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-sm ${trend.isPositive ? "text-green-500" : "text-red-500"}`}>
              {trend.isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        
        <p className="mb-1 text-sm text-slate-400">{title}</p>
        <p className="text-3xl font-black tracking-tight text-slate-100">{value}</p>
      </div>
    </motion.div>
  )
}
