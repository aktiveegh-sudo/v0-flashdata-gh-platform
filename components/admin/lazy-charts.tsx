'use client'

import dynamic from 'next/dynamic'
import { FlashPageLoader } from '@/components/flash-loader'

const chartLoading = () => (
  <div className="flex h-72 items-center justify-center">
    <FlashPageLoader />
  </div>
)

export const LazyLineChart = dynamic(
  () => import('recharts').then((mod) => mod.LineChart),
  { loading: chartLoading, ssr: false }
)
export const LazyBarChart = dynamic(() => import('recharts').then((mod) => mod.BarChart), {
  loading: chartLoading,
  ssr: false,
})
export const LazyLine = dynamic(() => import('recharts').then((mod) => mod.Line), { ssr: false })
export const LazyBar = dynamic(() => import('recharts').then((mod) => mod.Bar), { ssr: false })
export const LazyXAxis = dynamic(() => import('recharts').then((mod) => mod.XAxis), { ssr: false })
export const LazyYAxis = dynamic(() => import('recharts').then((mod) => mod.YAxis), { ssr: false })
export const LazyCartesianGrid = dynamic(() => import('recharts').then((mod) => mod.CartesianGrid), {
  ssr: false,
})
export const LazyTooltip = dynamic(() => import('recharts').then((mod) => mod.Tooltip), { ssr: false })
export const LazyResponsiveContainer = dynamic(
  () => import('recharts').then((mod) => mod.ResponsiveContainer),
  { ssr: false }
)
