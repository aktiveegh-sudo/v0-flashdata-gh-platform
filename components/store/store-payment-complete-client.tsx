'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStoreTheme } from '@/components/store/store-theme-provider'
import type { StoreRecord } from '@/lib/store-tenant'

type StorePaymentCompleteClientProps = {
  store: StoreRecord
}

export function StorePaymentCompleteClient({ store }: StorePaymentCompleteClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isDark } = useStoreTheme()

  const message = searchParams.get('message') || 'Payment complete. Your order is being processed.'
  const reference = searchParams.get('reference') || ''
  const storeHomePath = `/store/${store.slug}`

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      router.replace(storeHomePath)
    }, 8000)

    return () => window.clearTimeout(timeout)
  }, [router, storeHomePath])

  return (
    <div className={`min-h-screen ${isDark ? 'bg-zinc-950 text-white' : 'bg-zinc-50 text-zinc-900'}`}>
      <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-4">
        <div
          className={`w-full rounded-2xl border p-6 text-center shadow-sm ${
            isDark ? 'border-white/10 bg-zinc-900' : 'border-zinc-200 bg-white'
          }`}
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-amber-500">Payment Complete</p>
          <h1 className="mt-2 text-2xl font-black">Thank you for your purchase</h1>
          <p className={`mt-3 text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{message}</p>

          {reference ? (
            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-left text-sm ${
                isDark ? 'border-white/10 bg-zinc-950' : 'border-zinc-200 bg-zinc-50'
              }`}
            >
              <p className={isDark ? 'text-zinc-500' : 'text-zinc-400'}>Reference</p>
              <p className="mt-1 font-semibold">{reference}</p>
            </div>
          ) : null}

          <p className={`mt-4 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Redirecting to {store.name} shortly...
          </p>

          <Button asChild className="mt-5 w-full rounded-full bg-amber-400 font-bold text-black hover:bg-amber-300">
            <Link href={storeHomePath}>Back to {store.name}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
