import { Suspense } from 'react'
import { StoreNotFoundState } from '@/components/store/store-not-found-state'
import { StorePaymentCompleteClient } from '@/components/store/store-payment-complete-client'
import { StoreThemeProvider } from '@/components/store/store-theme-provider'
import { fetchStoreBySlug } from '@/lib/store-fetch'

type StorePaymentCompletePageProps = {
  params: Promise<{ slug: string }>
}

export default async function StorePaymentCompletePage({ params }: StorePaymentCompletePageProps) {
  const { slug } = await params
  const store = await fetchStoreBySlug(slug)

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
