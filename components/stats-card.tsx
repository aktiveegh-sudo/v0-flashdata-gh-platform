'use client'

import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react'

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

export function StatsCard({ title, value, icon: Icon, trend }: StatsCardProps) {
  return (
    <div className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-[#0a0a0f]">
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/15 text-amber-600 dark:text-amber-300">
          <Icon className="h-5 w-5" />
        </div>
        {trend ? (
          <div className={`flex items-center gap-1 text-xs font-semibold ${trend.isPositive ? 'text-green-600' : 'text-red-500'}`}>
            {trend.isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        ) : null}
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/50">{title}</p>
      <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}
