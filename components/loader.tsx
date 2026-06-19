'use client'

import { useLoadingStore } from '@/lib/store'
import { FlashLoader } from '@/components/flash-loader'

export function GlobalLoader() {
  const { isLoading } = useLoadingStore()
  if (!isLoading) return null
  return <FlashLoader fullscreen />
}

export function GhanaFlagIcon({ className }: { className?: string }) {
  return <img src="/site-logo.png" alt="FlashData GH logo" className={className} loading="lazy" decoding="async" />
}

export function PageLoader() {
  return <FlashLoader className="min-h-[400px] w-full" />
}
