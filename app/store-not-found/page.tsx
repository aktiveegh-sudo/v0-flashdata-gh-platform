import { StoreNotFoundState } from '@/components/store/store-not-found-state'
import { StoreThemeProvider } from '@/components/store/store-theme-provider'

export default function StoreNotFoundPage() {
  return (
    <StoreThemeProvider>
      <StoreNotFoundState />
    </StoreThemeProvider>
  )
}
