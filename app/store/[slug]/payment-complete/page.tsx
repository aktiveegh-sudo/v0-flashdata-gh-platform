import { Suspense } from 'react'
import { StoreNotFoundState } from '@/components/store/store-not-found-state'
import { StorePaymentCompleteClient } from '@/components/store/store-payment-complete-client'
import { StoreThemeProvider } from '@/components/store/store-theme-provider'
import { getStoreRecordBySlug } from '@/lib/store-tenant'

type StorePaymentCompletePageProps = {
  params: Promise<{ slug: string }>
}

export default async function StorePaymentCompletePage({ params }: StorePaymentCompletePageProps) {
  const { slug } = await params
  const store = await getStoreRecordBySlug(slug)

  if (!store) {
    return (
      <StoreThemeProvider>
        <StoreNotFoundState />
      </StoreThemeProvider>
    )
  }

  return (
    <StoreThemeProvider>
      <Suspense
        fallback={
          <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-500">
            Loading payment details...
          </div>
        }
      >
        <StorePaymentCompleteClient store={store} />
      </Suspense>
    </StoreThemeProvider>
  )
}
