import { StoreFront } from '@/components/store/store-front'
import { StoreNotFoundState } from '@/components/store/store-not-found-state'
import { StoreThemeProvider } from '@/components/store/store-theme-provider'
import { fetchStoreBySlug } from '@/lib/store-fetch'

type StorePageProps = {
  params: Promise<{ slug: string }>
}

export default async function PublicAgentStorePage({ params }: StorePageProps) {
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
      <StoreFront store={store} />
    </StoreThemeProvider>
  )
}
