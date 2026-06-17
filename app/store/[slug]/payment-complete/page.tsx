import { Suspense } from 'react'
import { StoreNotFoundState } from '@/components/store/store-not-found-state'
import { StorePaymentCompleteClient } from '@/components/store/store-payment-complete-client'
import { StoreShell } from '@/components/store/store-shell'
import { fetchStoreBySlug } from '@/lib/store-fetch'

type StorePaymentCompletePageProps = {
  params: Promise<{ slug: string }>
}

export default async function StorePaymentCompletePage({ params }: StorePaymentCompletePageProps) {
  const { slug } = await params
  const store = await fetchStoreBySlug(slug)

  if (!store) {
    return <StoreNotFoundState />
  }

  return (
    <StoreShell store={store} slug={store.slug} activeTab="home" framelessContent>
      <Suspense
        fallback={
          <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-300">
            Loading payment details...
          </div>
        }
      >
        <StorePaymentCompleteClient store={store} />
      </Suspense>
    </StoreShell>
  )
}
