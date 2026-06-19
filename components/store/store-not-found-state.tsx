'use client'

import { RefreshCw, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStoreTheme } from '@/components/store/store-theme-provider'

export function StoreNotFoundState() {
  const { isDark } = useStoreTheme()

  return (
    <div className={`min-h-[60vh] grid place-items-center p-6 ${isDark ? 'bg-zinc-950' : 'bg-zinc-50'}`}>
      <div
        className={`max-w-md rounded-2xl border p-10 text-center shadow-sm ${
          isDark ? 'border-white/10 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-900'
        }`}
      >
        <Store className={`mx-auto mb-4 h-12 w-12 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
        <h1 className="text-2xl font-black">Store not found</h1>
        <p className={`mt-2 text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          This store doesn&apos;t exist or has been deactivated.
        </p>
        <Button variant="outline" className="mt-6 gap-2" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4" />
          Reload
        </Button>
      </div>
    </div>
  )
}
