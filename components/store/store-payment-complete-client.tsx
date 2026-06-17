'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { StoreRecord } from '@/lib/store-tenant'

type StorePaymentCompleteClientProps = {
  store: StoreRecord
}

export function StorePaymentCompleteClient({ store }: StorePaymentCompleteClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

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
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center">
      <Card className="w-full border-yellow-300/20 bg-zinc-950/90 text-zinc-100">
        <CardContent className="space-y-5 p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-yellow-300">Payment Complete</p>
            <h1 className="mt-2 text-2xl font-black text-white">Thank you for your purchase</h1>
            <p className="mt-3 text-sm text-zinc-300">{message}</p>
          </div>

          {reference ? (
            <div className="rounded-xl border border-yellow-300/20 bg-black/40 px-4 py-3 text-left text-sm">
              <p className="text-zinc-400">Reference</p>
              <p className="mt-1 font-semibold text-white">{reference}</p>
            </div>
          ) : null}

          <p className="text-xs text-zinc-400">You will be redirected to {store.name} shortly.</p>

          <Button asChild className="w-full rounded-full bg-yellow-300 text-black hover:bg-yellow-200">
            <Link href={storeHomePath}>Back to {store.name}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
