'use client'

import { cn } from '@/lib/utils'

type FlashLoaderProps = {
  label?: string
  fullscreen?: boolean
  className?: string
}

export function FlashLoader({ label = 'Loading FlashData...', fullscreen = false, className }: FlashLoaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-5',
        fullscreen && 'fixed inset-0 z-[100] bg-gray-50/95 backdrop-blur-md dark:bg-[#030305]/95',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="relative flex h-20 w-20 items-center justify-center">
        <div className="absolute inset-0 rounded-2xl bg-amber-400/20 flash-pulse-ring" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400 text-lg font-black text-black shadow-lg shadow-amber-400/30">
          FD
        </div>
      </div>

      <div className="flex items-end justify-center gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="flash-bar w-2 rounded-full bg-amber-400"
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </div>

      <div className="text-center">
        <p className="text-sm font-bold text-gray-900 dark:text-white">
          Flash<span className="text-amber-500">Data</span> GH
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-white/50">{label}</p>
      </div>
    </div>
  )
}

export function FlashPageLoader() {
  return <FlashLoader className="min-h-[400px] w-full" />
}
